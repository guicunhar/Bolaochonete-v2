const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const { initializeDatabase, all, get, run } = require('./database');
const { calculatePoints } = require('./scoring');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'bolaochonete-2026-secret';
const BONUS_EDIT_DEADLINE = new Date('2026-05-11T15:59:00-03:00');

// Uploads dir
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `avatar_${req.params.userId || Date.now()}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

app.use(cors());
app.use(express.json());

// Inicializa banco (async) antes de começar a servir
initializeDatabase().then(() => {
  console.log('Banco inicializado.');
}).catch(err => {
  console.error('Erro ao inicializar banco:', err);
  process.exit(1);
});

const FRONTEND_DIST = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(FRONTEND_DIST));

app.get('/api/health', (_, res) => res.json({ ok: true }));

// ── Auth middleware ───────────────────────────────────────────────────────────
function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requerido' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Token inválido' }); }
}
function adminOnly(req, res, next) {
  if (!req.user?.is_admin) return res.status(403).json({ error: 'Acesso negado' });
  next();
}

function isBonusEditClosed() {
  return new Date() >= BONUS_EDIT_DEADLINE;
}

// ── AUTH ─────────────────────────────────────────────────────────────────────

// First login: user pre-registered by admin, sets password + bonus picks
app.post('/api/first-login', (req, res) => {
  const { username, password, champion_pick, best_player_pick, top_scorer_pick } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username?.toLowerCase());
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado. Contate o admin.' });
  if (!user.is_precadastro) return res.status(400).json({ error: 'Conta já ativada. Use o login normal.' });
  if (!password || password.length < 4) return res.status(400).json({ error: 'Senha mínima de 4 caracteres' });

  const hash = bcrypt.hashSync(password, 10);
  const bonusLocked = isBonusEditClosed() ? 1 : 0;
  db.prepare(`UPDATE users SET password_hash=?, is_precadastro=0, champion_pick=?, best_player_pick=?, top_scorer_pick=?, bonus_locked=? WHERE id=?`)
    .run(hash, champion_pick || null, best_player_pick || null, top_scorer_pick || null, bonusLocked, user.id);

  const token = jwt.sign({ id: user.id, username: user.username, name: user.name, is_admin: 0 }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: { id: user.id, name: user.name, username: user.username, is_admin: false, avatar_path: user.avatar_path } });
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await get('SELECT * FROM users WHERE username = ?', [username?.toLowerCase()]);
    if (!user) return res.status(401).json({ error: 'Usuario ou senha incorretos' });
    if (user.is_precadastro) return res.status(400).json({ error: 'first-login' });
    if (!bcrypt.compareSync(password, user.password_hash)) return res.status(401).json({ error: 'Usuario ou senha incorretos' });
    const token = jwt.sign({ id: user.id, username: user.username, name: user.name, is_admin: !!user.is_admin }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: user.id, name: user.name, username: user.username, is_admin: !!user.is_admin, avatar_path: user.avatar_path } });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/me', auth, (req, res) => {
  const user = db.prepare('SELECT id,name,username,is_admin,avatar_path,champion_pick,best_player_pick,top_scorer_pick FROM users WHERE id=?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  const bonus_locked = isBonusEditClosed();
  res.json({ ...user, bonus_locked });
});

app.patch('/api/me/bonus', auth, (req, res) => {
  if (isBonusEditClosed()) return res.status(400).json({ error: 'Prazo para alterar palpites bônus encerrado' });
  const { champion_pick, best_player_pick, top_scorer_pick } = req.body;
  db.prepare(`UPDATE users SET champion_pick=?, best_player_pick=?, top_scorer_pick=? WHERE id=?`)
    .run(champion_pick || null, best_player_pick || null, top_scorer_pick || null, req.user.id);
  res.json({ ok: true });
});

// ── GAMES ─────────────────────────────────────────────────────────────────────

app.get('/api/games', auth, async (req, res) => {
  try {
    res.json(await all('SELECT * FROM games ORDER BY match_date, match_time, match_number'));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── BETS ──────────────────────────────────────────────────────────────────────

app.get('/api/bets/mine', auth, async (req, res) => {
  try {
    res.json(await all(
      `SELECT b.*, g.match_date, g.match_time FROM bets b JOIN games g ON b.game_id = g.id WHERE b.user_id = ?`,
      [req.user.id]
    ));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/bets', auth, async (req, res) => {
  try {
    const { game_id, home_score, away_score, is_anonymous } = req.body;
    const game = await get('SELECT * FROM games WHERE id = ?', [game_id]);
    if (!game) return res.status(404).json({ error: 'Jogo não encontrado' });
    const matchStart = new Date(`${game.match_date}T${game.match_time}:00-03:00`);
    if (new Date() >= matchStart) return res.status(400).json({ error: 'Prazo encerrado' });
    await run(
      `INSERT INTO bets (user_id,game_id,home_score,away_score,is_anonymous)
       VALUES (?,?,?,?,?)
       ON CONFLICT(user_id,game_id) DO UPDATE SET
         home_score=excluded.home_score, away_score=excluded.away_score,
         is_anonymous=excluded.is_anonymous, updated_at=CURRENT_TIMESTAMP`,
      [req.user.id, game_id, home_score, away_score, is_anonymous ? 1 : 0]
    );
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/bets/all', auth, async (req, res) => {
  try {
    const now = new Date();
    const bets = await all(`
      SELECT b.*, u.name as user_name, u.username, u.avatar_path,
             g.home_team, g.away_team, g.home_flag, g.away_flag,
             g.match_date, g.match_time, g.phase,
             g.home_score as real_home, g.away_score as real_away
      FROM bets b
      JOIN users u ON b.user_id = u.id
      JOIN games g ON b.game_id = g.id
      ORDER BY g.match_date, g.match_time, u.name
    `);
    const filtered = bets.map(b => {
      const matchStart = new Date(`${b.match_date}T${b.match_time}:00-03:00`);
      if (b.is_anonymous && now < matchStart) {
        return { ...b, home_score: null, away_score: null, hidden: true };
      }
      return b;
    });
    res.json(filtered);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── RANKING ───────────────────────────────────────────────────────────────────

app.get('/api/ranking', auth, async (req, res) => {
  try {
    const users = await all(
      'SELECT id,name,username,avatar_path,champion_pick,best_player_pick,top_scorer_pick FROM users WHERE is_admin=0 AND is_precadastro=0'
    );
    const awards = await all('SELECT * FROM bonus_awards');
    const bonusResults = await get('SELECT * FROM bonus_results');

    const awardsByUser = {};
    for (const a of awards) {
      if (!awardsByUser[a.user_id]) awardsByUser[a.user_id] = {};
      awardsByUser[a.user_id][a.award_type] = a.points;
    }

    const normalizeStr = s => s?.toLowerCase().trim()
      .replace(/[áàãâ]/g,'a').replace(/[éèê]/g,'e').replace(/[íìî]/g,'i')
      .replace(/[óòõô]/g,'o').replace(/[úùû]/g,'u').replace(/[ç]/g,'c')
      .replace(/\s+/g,' ') || '';

    const ranking = await Promise.all(users.map(async user => {
      const bets = await all(
        `SELECT b.*, g.home_score as rh, g.away_score as ra FROM bets b JOIN games g ON b.game_id=g.id WHERE b.user_id=?`,
        [user.id]
      );
      let pts = 0, exact = 0, p3 = 0, p1 = 0;
      for (const b of bets) {
        if (b.rh === null || b.ra === null) continue;
        const p = calculatePoints(b.home_score, b.away_score, b.rh, b.ra);
        pts += p;
        if (p === 5) exact++; else if (p === 3) p3++; else if (p === 1) p1++;
      }

      const userAwards = awardsByUser[user.id] || {};
      let bonusPts = Object.values(userAwards).reduce((s, v) => s + v, 0);
      const awardDetails = { ...userAwards };

      // Auto-calcular campeã se não foi manualmente premiado
      if (bonusResults?.champion && user.champion_pick && !awardDetails['champion'] && !awardDetails['champion_vice']) {
        if (normalizeStr(user.champion_pick) === normalizeStr(bonusResults.champion)) {
          bonusPts += 50;
          awardDetails['champion'] = 50;
        }
      }

      pts += bonusPts;
      return { ...user, total_points: pts, exact, partial3: p3, partial1: p1, bonus_points: bonusPts, award_details: awardDetails };
    }));

    ranking.sort((a, b) => b.total_points - a.total_points);
    res.json(ranking);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── ADMIN: GAMES ──────────────────────────────────────────────────────────────

app.get('/api/admin/games', auth, adminOnly, async (req, res) => {
  try {
    res.json(await all('SELECT * FROM games ORDER BY match_date, match_time, match_number'));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/admin/games/:id', auth, adminOnly, async (req, res) => {
  try {
    const { home_team,home_flag,away_team,away_flag,match_date,match_time,home_score,away_score,phase,group_name,match_number } = req.body;
    const hs = (home_score !== '' && home_score != null) ? Number(home_score) : null;
    const as_ = (away_score !== '' && away_score != null) ? Number(away_score) : null;
    await run(
      `UPDATE games SET home_team=?,home_flag=?,away_team=?,away_flag=?,match_date=?,match_time=?,home_score=?,away_score=?,phase=?,group_name=?,match_number=? WHERE id=?`,
      [home_team,home_flag,away_team,away_flag,match_date,match_time,hs,as_,phase,group_name||null,match_number||null,req.params.id]
    );
    if (hs !== null) {
      const bets = await all('SELECT * FROM bets WHERE game_id=?', [req.params.id]);
      for (const bet of bets) {
        await run('UPDATE bets SET points=? WHERE id=?', [calculatePoints(bet.home_score, bet.away_score, hs, as_), bet.id]);
      }
    }
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/games', auth, adminOnly, async (req, res) => {
  try {
    const { home_team,home_flag,away_team,away_flag,match_date,match_time,phase,group_name,match_number } = req.body;
    const r = await run(
      `INSERT INTO games (home_team,home_flag,away_team,away_flag,match_date,match_time,phase,group_name,match_number) VALUES (?,?,?,?,?,?,?,?,?)`,
      [home_team||'A definir',home_flag||'',away_team||'A definir',away_flag||'',match_date,match_time,phase||'Grupos',group_name||null,match_number||null]
    );
    res.json({ id: r.lastInsertRowid });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/admin/games/:id', auth, adminOnly, async (req, res) => {
  try {
    await run('DELETE FROM bets WHERE game_id=?', [req.params.id]);
    await run('DELETE FROM games WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── ADMIN: USERS ──────────────────────────────────────────────────────────────

app.get('/api/admin/users', auth, adminOnly, async (req, res) => {
  try {
    const users = await all('SELECT id,name,username,is_admin,is_precadastro,avatar_path,champion_pick,best_player_pick,top_scorer_pick,created_at FROM users ORDER BY id');
    const awards = await all('SELECT * FROM bonus_awards');
    const awardsByUser = {};
    for (const a of awards) {
      if (!awardsByUser[a.user_id]) awardsByUser[a.user_id] = {};
      awardsByUser[a.user_id][a.award_type] = a.points;
    }
    res.json(users.map(u => ({ ...u, awards: awardsByUser[u.id] || {} })));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/users', auth, adminOnly, async (req, res) => {
  try {
    const { name, username } = req.body;
    if (!name || !username) return res.status(400).json({ error: 'Nome e usuário obrigatórios' });
    const exists = await get('SELECT id FROM users WHERE username=?', [username.toLowerCase()]);
    if (exists) return res.status(409).json({ error: 'Usuário já existe' });
    const r = await run('INSERT INTO users (name,username,is_precadastro) VALUES (?,?,1)', [name, username.toLowerCase()]);
    res.json({ id: r.lastInsertRowid });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/admin/users/:id', auth, adminOnly, async (req, res) => {
  try {
    if (req.params.id == req.user.id) return res.status(400).json({ error: 'Não pode deletar a si mesmo' });
    await run('DELETE FROM bets WHERE user_id=?', [req.params.id]);
    await run('DELETE FROM bonus_awards WHERE user_id=?', [req.params.id]);
    await run('DELETE FROM users WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Avatar por URL (sem upload de arquivo)
app.post('/api/admin/users/:userId/avatar-url', auth, adminOnly, async (req, res) => {
  try {
    const { avatar_url } = req.body;
    if (!avatar_url) return res.status(400).json({ error: 'URL obrigatória' });
    await run('UPDATE users SET avatar_path=? WHERE id=?', [avatar_url, req.params.userId]);
    res.json({ avatar_path: avatar_url });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── ADMIN: BONUS RESULTS ──────────────────────────────────────────────────────

app.get('/api/admin/bonus-results', auth, adminOnly, async (req, res) => {
  try {
    res.json(await get('SELECT * FROM bonus_results') || {});
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/admin/bonus-results/champion', auth, adminOnly, async (req, res) => {
  try {
    const { champion } = req.body;
    await run('UPDATE bonus_results SET champion=?, updated_at=CURRENT_TIMESTAMP', [champion || null]);

    const normalizeStr = s => s?.toLowerCase().trim()
      .replace(/[áàãâ]/g,'a').replace(/[éèê]/g,'e').replace(/[íìî]/g,'i')
      .replace(/[óòõô]/g,'o').replace(/[úùû]/g,'u').replace(/[ç]/g,'c')
      .replace(/\s+/g,' ') || '';

    await run(`DELETE FROM bonus_awards WHERE award_type IN ('champion','champion_vice')`);

    if (champion) {
      const users = await all(`SELECT id, champion_pick FROM users WHERE is_admin=0 AND is_precadastro=0 AND champion_pick IS NOT NULL`);
      for (const u of users) {
        if (normalizeStr(u.champion_pick) === normalizeStr(champion)) {
          await run(`INSERT OR REPLACE INTO bonus_awards (user_id, award_type, points) VALUES (?, 'champion', 50)`, [u.id]);
        }
      }
    }
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/admin/bonus-results/vice', auth, adminOnly, async (req, res) => {
  try {
    const { vice } = req.body;
    await run(`DELETE FROM bonus_awards WHERE award_type='champion_vice'`);

    if (vice) {
      const normalizeStr = s => s?.toLowerCase().trim()
        .replace(/[áàãâ]/g,'a').replace(/[éèê]/g,'e').replace(/[íìî]/g,'i')
        .replace(/[óòõô]/g,'o').replace(/[úùû]/g,'u').replace(/[ç]/g,'c')
        .replace(/\s+/g,' ') || '';

      const users = await all(`SELECT id, champion_pick FROM users WHERE is_admin=0 AND is_precadastro=0 AND champion_pick IS NOT NULL`);
      for (const u of users) {
        if (normalizeStr(u.champion_pick) === normalizeStr(vice)) {
          const alreadyChamp = await get(`SELECT id FROM bonus_awards WHERE user_id=? AND award_type='champion'`, [u.id]);
          if (!alreadyChamp) {
            await run(`INSERT OR REPLACE INTO bonus_awards (user_id, award_type, points) VALUES (?, 'champion_vice', 25)`, [u.id]);
          }
        }
      }
    }
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/bonus-awards', auth, adminOnly, async (req, res) => {
  try {
    const { user_id, award_type, points, remove } = req.body;
    const valid = ['best_player','best_player_partial','top_scorer','top_scorer_partial'];
    if (!valid.includes(award_type)) return res.status(400).json({ error: 'Tipo inválido' });
    if (remove) {
      await run('DELETE FROM bonus_awards WHERE user_id=? AND award_type=?', [user_id, award_type]);
    } else {
      await run('INSERT OR REPLACE INTO bonus_awards (user_id, award_type, points) VALUES (?,?,?)', [user_id, award_type, points]);
    }
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/bonus-awards', auth, adminOnly, async (req, res) => {
  try {
    res.json(await all('SELECT * FROM bonus_awards'));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
});

app.listen(PORT, () => console.log(`Bolaochonete rodando na porta ${PORT}`));
