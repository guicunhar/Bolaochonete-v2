const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { initializeDatabase, all, get, run } = require('./database');
const { calculatePoints, calculateKnockoutPoints, KNOCKOUT_PHASES } = require('./scoring');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'bolaochonete-2026-secret';
const BONUS_EDIT_DEADLINE = new Date('2026-06-11T15:59:00-03:00');

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
app.post('/api/first-login', async (req, res) => {
  try {
    const { username, password, champion_pick, best_player_pick, top_scorer_pick } = req.body;
    const user = await get('SELECT * FROM users WHERE username = ?', [username?.toLowerCase()]);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado. Contate o admin.' });
    if (!user.is_precadastro) return res.status(400).json({ error: 'Conta já ativada. Use o login normal.' });
    if (!password || password.length < 4) return res.status(400).json({ error: 'Senha mínima de 4 caracteres' });

    const hash = bcrypt.hashSync(password, 10);
    const bonusLocked = isBonusEditClosed() ? 1 : 0;
    await run(
      `UPDATE users SET password_hash=?, is_precadastro=0, champion_pick=?, best_player_pick=?, top_scorer_pick=?, bonus_locked=? WHERE id=?`,
      [hash, champion_pick || null, best_player_pick || null, top_scorer_pick || null, bonusLocked, user.id]
    );

    const token = jwt.sign({ id: user.id, username: user.username, name: user.name, is_admin: 0 }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: user.id, name: user.name, username: user.username, is_admin: false, avatar_path: user.avatar_path } });
  } catch(e) { res.status(500).json({ error: e.message }); }
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

app.get('/api/me', auth, async (req, res) => {
  try {
    const user = await get('SELECT id,name,username,is_admin,avatar_path,champion_pick,best_player_pick,top_scorer_pick FROM users WHERE id=?', [req.user.id]);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    const bonus_locked = isBonusEditClosed();
    res.json({ ...user, bonus_locked });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/me/bonus', auth, async (req, res) => {
  try {
    if (isBonusEditClosed()) return res.status(400).json({ error: 'Prazo para alterar palpites bônus encerrado' });
    const { champion_pick, best_player_pick, top_scorer_pick } = req.body;
    await run(
      `UPDATE users SET champion_pick=?, best_player_pick=?, top_scorer_pick=? WHERE id=?`,
      [champion_pick || null, best_player_pick || null, top_scorer_pick || null, req.user.id]
    );
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
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
    const { game_id, home_score, away_score, is_anonymous, penalty_pick } = req.body;
    const game = await get('SELECT * FROM games WHERE id = ?', [game_id]);
    if (!game) return res.status(404).json({ error: 'Jogo não encontrado' });
    const matchStart = new Date(`${game.match_date}T${game.match_time}:00-03:00`);
    if (new Date() >= matchStart) return res.status(400).json({ error: 'Prazo encerrado' });
    // penalty_pick só é válido em fases mata-mata e quando o placar é empate
    const isKnockout = KNOCKOUT_PHASES.has(game.phase);
    const isDraw = Number(home_score) === Number(away_score);
    const validPenaltyPick = isKnockout && isDraw && (penalty_pick === 'home' || penalty_pick === 'away') ? penalty_pick : null;
    await run(
      `INSERT INTO bets (user_id,game_id,home_score,away_score,is_anonymous,penalty_pick)
       VALUES (?,?,?,?,?,?)
       ON CONFLICT(user_id,game_id) DO UPDATE SET
         home_score=excluded.home_score, away_score=excluded.away_score,
         is_anonymous=excluded.is_anonymous, penalty_pick=excluded.penalty_pick,
         updated_at=CURRENT_TIMESTAMP`,
      [req.user.id, game_id, home_score, away_score, is_anonymous ? 1 : 0, validPenaltyPick]
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
        `SELECT b.*, g.home_score as rh, g.away_score as ra, g.match_date, g.match_time, g.phase, g.penalty_winner FROM bets b JOIN games g ON b.game_id=g.id WHERE b.user_id=?`,
        [user.id]
      );
      let pts = 0, exact = 0, p3 = 0, p1 = 0;
      for (const b of bets) {
        if (b.rh === null || b.ra === null) continue;
        const p = KNOCKOUT_PHASES.has(b.phase)
          ? calculateKnockoutPoints(b.home_score, b.away_score, b.rh, b.ra, b.penalty_winner, b.penalty_pick)
          : calculatePoints(b.home_score, b.away_score, b.rh, b.ra);
        pts += p;
        if (p >= 5) exact++; else if (p >= 3) p3++; else if (p >= 1) p1++;
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

      // Streak: jogos encerrados consecutivos com 3 ou 5 pts
      const finished = bets
        .filter(b => b.rh !== null && b.ra !== null)
        .sort((a, b) => (a.match_date + a.match_time) > (b.match_date + b.match_time) ? 1 : -1);
      let streak = 0;
      for (let i = finished.length - 1; i >= 0; i--) {
        const f = finished[i];
        const p = KNOCKOUT_PHASES.has(f.phase)
          ? calculateKnockoutPoints(f.home_score, f.away_score, f.rh, f.ra, f.penalty_winner, f.penalty_pick)
          : calculatePoints(f.home_score, f.away_score, f.rh, f.ra);
        if (p >= 3) streak++; else break;
      }

      return { ...user, total_points: pts, exact, partial3: p3, partial1: p1, bonus_points: bonusPts, award_details: awardDetails, streak };
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
    const { home_team,home_flag,away_team,away_flag,match_date,match_time,home_score,away_score,phase,group_name,match_number,penalty_winner } = req.body;
    const hs = (home_score !== '' && home_score != null) ? Number(home_score) : null;
    const as_ = (away_score !== '' && away_score != null) ? Number(away_score) : null;
    const pw = (penalty_winner === 'home' || penalty_winner === 'away') ? penalty_winner : null;
    await run(
      `UPDATE games SET home_team=?,home_flag=?,away_team=?,away_flag=?,match_date=?,match_time=?,home_score=?,away_score=?,phase=?,group_name=?,match_number=?,penalty_winner=? WHERE id=?`,
      [home_team,home_flag,away_team,away_flag,match_date,match_time,hs,as_,phase,group_name||null,match_number||null,pw,req.params.id]
    );
    if (hs !== null) {
      const bets = await all('SELECT * FROM bets WHERE game_id=?', [req.params.id]);
      const isKnockout = KNOCKOUT_PHASES.has(phase);
      for (const bet of bets) {
        const pts = isKnockout
          ? calculateKnockoutPoints(bet.home_score, bet.away_score, hs, as_, pw, bet.penalty_pick)
          : calculatePoints(bet.home_score, bet.away_score, hs, as_);
        await run('UPDATE bets SET points=? WHERE id=?', [pts, bet.id]);
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

// ── STATS ─────────────────────────────────────────────────────────────────────

// Helper: compute per-round cumulative ranking stats for all users
async function computeRankingData() {
  const users = await all('SELECT id, name, username, avatar_path FROM users WHERE is_admin=0 AND is_precadastro=0');

  // All finished games in CHRONOLOGICAL order — this is the "rodada" order for the bolão
  const allBets = await all(`
    SELECT b.user_id, b.points, g.id as game_id, g.match_number, g.phase,
           g.match_date, g.match_time
    FROM bets b JOIN games g ON b.game_id = g.id
    JOIN users u ON b.user_id = u.id
    WHERE g.home_score IS NOT NULL AND u.is_admin=0 AND u.is_precadastro=0
    ORDER BY g.match_date, g.match_time, g.match_number
  `);

  const allBonus = await all('SELECT user_id, SUM(points) as total FROM bonus_awards GROUP BY user_id');
  const bonusMap = {};
  for (const b of allBonus) bonusMap[b.user_id] = Number(b.total);

  // Distinct finished games in chronological order, each with a 1-based chrono index
  const seenGames = new Map(); // game_id -> chronoIndex (1-based)
  for (const b of allBets) {
    if (!seenGames.has(b.game_id)) seenGames.set(b.game_id, seenGames.size + 1);
  }
  const chronoGameIds = [...seenGames.keys()]; // ordered chronologically
  const totalFinishedGames = chronoGameIds.length;

  // Group bets by game_id
  const betsByGame = {};
  for (const b of allBets) {
    if (!betsByGame[b.game_id]) betsByGame[b.game_id] = [];
    betsByGame[b.game_id].push(b);
  }

  // Cumulative per-round stats (position after each finished game, chronologically)
  const cumulative = {};
  for (const u of users) cumulative[u.id] = bonusMap[u.id] || 0;
  const userStats = {};
  for (const u of users) userStats[u.id] = { rodadasLider: 0, rodadasTop3: 0, rodadasTop6: 0, rodadasBot6: 0, rodadasBot3: 0, rodadasLanterna: 0, posicaoTotal: 0, posicaoCount: 0 };
  const n = users.length;

  for (const gid of chronoGameIds) {
    for (const b of (betsByGame[gid] || [])) {
      cumulative[b.user_id] = (cumulative[b.user_id] || 0) + (b.points || 0);
    }
    const sorted = users.map(u => ({ id: u.id, pts: cumulative[u.id] || 0 })).sort((a, b) => b.pts - a.pts);
    sorted.forEach((u, idx) => {
      const rank = idx + 1;
      userStats[u.id].posicaoTotal += rank;
      userStats[u.id].posicaoCount++;
      if (rank === 1) userStats[u.id].rodadasLider++;
      if (rank <= 3) userStats[u.id].rodadasTop3++;
      if (rank <= 6) userStats[u.id].rodadasTop6++;
      if (rank >= n - 5) userStats[u.id].rodadasBot6++;
      if (rank >= n - 2) userStats[u.id].rodadasBot3++;
      if (rank === n) userStats[u.id].rodadasLanterna++;
    });
  }

  const usersWithStats = users.map(u => ({
    ...u,
    ...userStats[u.id],
    posicaoMedia: userStats[u.id].posicaoCount > 0 ? Number((userStats[u.id].posicaoTotal / userStats[u.id].posicaoCount).toFixed(1)) : null,
  }));

  // Last N rounds rankings — last N games in chronological order, points only in those games
  const rankingLast = {};
  for (const n of [5, 10, 15]) {
    const lastNIds = chronoGameIds.slice(-n);
    if (lastNIds.length < n) { rankingLast[n] = null; continue; }
    const userPts = {};
    for (const u of users) userPts[u.id] = 0;
    for (const gid of lastNIds) for (const b of (betsByGame[gid] || [])) userPts[b.user_id] = (userPts[b.user_id] || 0) + (b.points || 0);
    rankingLast[n] = users.map(u => ({ ...u, pts: userPts[u.id] || 0 })).sort((a, b) => b.pts - a.pts);
  }

  // Phase rankings — based on CHRONOLOGICAL position (1st 24 finished = fase1, etc.)
  // Not by match_number, because games from different groups interleave chronologically
  const phaseTotals = { fase1: 24, fase2: 24, fase3: 24, mataMata: 32 };
  const phaseSlices = {
    fase1:    chronoGameIds.slice(0, 24),
    fase2:    chronoGameIds.slice(24, 48),
    fase3:    chronoGameIds.slice(48, 72),
    mataMata: chronoGameIds.slice(72),
  };
  // Total games per phase (including not-yet-finished ones)
  const phaseTotalGames = {
    fase1: 24, fase2: 24, fase3: 24,
    mataMata: allBets.reduce((max, b) => {
      // count total mata-mata games from game info — approximate by phase
      return max;
    }, 32),
  };

  const rankingFase = {};
  for (const [fase, gameIds] of Object.entries(phaseSlices)) {
    const gamesFinished = gameIds.length;
    const gamesTotal = phaseTotals[fase];
    if (gamesFinished === 0) { rankingFase[fase] = null; continue; }
    const userPts = {};
    for (const u of users) userPts[u.id] = 0;
    for (const gid of gameIds) for (const b of (betsByGame[gid] || [])) userPts[b.user_id] = (userPts[b.user_id] || 0) + (b.points || 0);
    rankingFase[fase] = {
      rows: users.map(u => ({ ...u, pts: userPts[u.id] || 0 })).sort((a, b) => b.pts - a.pts),
      gamesFinished,
      gamesTotal,
      complete: gamesFinished >= gamesTotal,
    };
  }

  return { users, usersWithStats, totalFinishedGames, rankingLast, rankingFase };
}

app.get('/api/stats/ranking', auth, async (req, res) => {
  try {
    const { usersWithStats, totalFinishedGames, rankingLast, rankingFase } = await computeRankingData();
    if (totalFinishedGames === 0) {
      return res.json({ top5Leaders: [], top5Lanterns: [], top5Top3: [], top5Bot3: [], rankingLast: { 5: null, 10: null, 15: null }, rankingFase: { fase1: null, fase2: null, fase3: null, mataMata: null } });
    }
    const top5Leaders  = [...usersWithStats].sort((a, b) => b.rodadasLider    - a.rodadasLider).slice(0, 5);
    const top5Lanterns = [...usersWithStats].sort((a, b) => b.rodadasLanterna - a.rodadasLanterna).slice(0, 5);
    const top5Top3     = [...usersWithStats].sort((a, b) => b.rodadasTop3     - a.rodadasTop3).slice(0, 5);
    const top5Bot3     = [...usersWithStats].sort((a, b) => b.rodadasBot3     - a.rodadasBot3).slice(0, 5);
    res.json({ top5Leaders, top5Lanterns, top5Top3, top5Bot3, rankingLast, rankingFase, totalRodadas: totalFinishedGames });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/stats/:userId', auth, async (req, res) => {
  try {
    const targetId = Number(req.params.userId);
    const targetUser = await get('SELECT id,name,username,avatar_path FROM users WHERE id=? AND is_admin=0 AND is_precadastro=0', [targetId]);
    if (!targetUser) return res.status(404).json({ error: 'Usuário não encontrado' });

    // Palpites do usuário alvo, com info do jogo
    const myBets = await all(`
      SELECT b.*, g.home_team, g.away_team, g.home_flag, g.away_flag,
             g.home_score as rh, g.away_score as ra, g.match_date, g.match_time
      FROM bets b JOIN games g ON b.game_id = g.id
      WHERE b.user_id = ?
      ORDER BY g.match_date, g.match_time
    `, [targetId]);

    // Todos os palpites de todos os usuários (jogos encerrados apenas para comparação de grupo)
    const allBets = await all(`
      SELECT b.user_id, b.game_id, b.home_score, b.away_score,
             g.home_score as rh, g.away_score as ra
      FROM bets b JOIN games g ON b.game_id = g.id
      JOIN users u ON b.user_id = u.id
      WHERE u.is_admin=0 AND u.is_precadastro=0
    `);

    // Agrupar todos os palpites por jogo
    const betsByGame = {};
    for (const b of allBets) {
      if (!betsByGame[b.game_id]) betsByGame[b.game_id] = [];
      betsByGame[b.game_id].push(b);
    }

    // Jogos com resultado
    const finishedBets = myBets.filter(b => b.rh !== null && b.ra !== null);

    // ── Por 1 gol ──
    let missedByOneGoal = 0;
    for (const b of finishedBets) {
      const pts = calculatePoints(b.home_score, b.away_score, b.rh, b.ra);
      if (pts < 5) {
        const diffH = Math.abs(b.home_score - b.rh);
        const diffA = Math.abs(b.away_score - b.ra);
        if ((diffH === 1 && diffA === 0) || (diffH === 0 && diffA === 1)) {
          missedByOneGoal++;
        }
      }
    }

    // ── Empates chutados ──
    const drawsBet = finishedBets.filter(b => b.home_score === b.away_score).length;

    // ── Corajoso (4+ gols na partida chutada) ──
    const boldBets = finishedBets.filter(b => (b.home_score + b.away_score) >= 4).length;

    // ── Goleadas chutadas (diferença 3+ gols) ──
    const thrashingsBet = finishedBets.filter(b => Math.abs(b.home_score - b.away_score) >= 3).length;

    // ── Placar favorito (2x1 e 1x2 contam como mesmo placar) ──
    const scoreCounts = {};
    for (const b of finishedBets) {
      const lo = Math.min(b.home_score, b.away_score);
      const hi = Math.max(b.home_score, b.away_score);
      const key = `${hi}x${lo}`;
      scoreCounts[key] = (scoreCounts[key] || 0) + 1;
    }
    const topScores = Object.entries(scoreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([score, count]) => ({ score, count }));

    // ── Contra a maioria / O único / Raro / Seguidor ──
    let againstMajority = 0, theOnlyOne = 0, followerCount = 0, followerTotal = 0;
    for (const b of finishedBets) {
      const gameBets = betsByGame[b.game_id] || [];
      if (gameBets.length < 2) continue;

      const winner = (score) => score.home_score > score.away_score ? 'h' : score.home_score < score.away_score ? 'a' : 'd';
      const myWinner = winner(b);

      // Contagem de vencedores
      const winnerCounts = { h: 0, a: 0, d: 0 };
      for (const gb of gameBets) winnerCounts[winner(gb)]++;
      const majorityWinner = Object.entries(winnerCounts).sort((a, b) => b[1] - a[1])[0][0];
      if (myWinner !== majorityWinner) againstMajority++;
      if (myWinner === majorityWinner) { followerCount++; }
      followerTotal++;

      // O único (único com esse vencedor)
      if (winnerCounts[myWinner] === 1) theOnlyOne++;
    }
    const followerPct = followerTotal > 0 ? Math.round((followerCount / followerTotal) * 100) : 0;

    // ── Melhor sequência / Pior sequência ──
    let bestStreak = 0, worstStreak = 0, curBest = 0, curWorst = 0;
    for (const b of finishedBets) {
      const pts = calculatePoints(b.home_score, b.away_score, b.rh, b.ra);
      if (pts > 0) { curBest++; curWorst = 0; }
      else { curWorst++; curBest = 0; }
      if (curBest > bestStreak) bestStreak = curBest;
      if (curWorst > worstStreak) worstStreak = curWorst;
    }

    // ── Time favorito / Time maldito ──
    const teamStats = {};
    for (const b of finishedBets) {
      const pts = calculatePoints(b.home_score, b.away_score, b.rh, b.ra);
      for (const team of [b.home_team, b.away_team]) {
        if (!teamStats[team]) teamStats[team] = { points: 0, games: 0, misses: 0 };
        teamStats[team].games++;
        teamStats[team].points += pts;
        if (pts === 0) teamStats[team].misses++;
      }
    }
    let favoriteTeam = null, favoriteTeamPoints = -1;
    let cursedTeam = null, cursedTeamMisses = -1;
    for (const [team, s] of Object.entries(teamStats)) {
      if (s.games < 2) continue;
      if (s.points > favoriteTeamPoints) { favoriteTeam = team; favoriteTeamPoints = s.points; }
      if (s.misses > cursedTeamMisses) { cursedTeam = team; cursedTeamMisses = s.misses; }
    }

    // ── Tabela por tipo de palpite ──
    const betTypes = [
      { key: 'empate',   label: 'Empate',            test: b => b.home_score === b.away_score },
      { key: 'diff1',    label: 'Diferença de 1 gol', test: b => Math.abs(b.home_score - b.away_score) === 1 },
      { key: 'diff2',    label: 'Diferença de 2 gols',test: b => Math.abs(b.home_score - b.away_score) === 2 },
      { key: 'diff3',    label: 'Diferença de 3+ gols',test: b => Math.abs(b.home_score - b.away_score) >= 3 },
      { key: 'ambasmarcam', label: 'Ambas marcam',   test: b => Math.min(b.home_score, b.away_score) >= 1 },
    ];
    const betTypeTable = betTypes.map(({ key, label, test }) => {
      const subset = finishedBets.filter(test);
      const total = subset.length;
      const exatos = subset.filter(b => calculatePoints(b.home_score, b.away_score, b.rh, b.ra) === 5).length;
      const parc3  = subset.filter(b => calculatePoints(b.home_score, b.away_score, b.rh, b.ra) === 3).length;
      const basico = subset.filter(b => calculatePoints(b.home_score, b.away_score, b.rh, b.ra) === 1).length;
      const erro   = subset.filter(b => calculatePoints(b.home_score, b.away_score, b.rh, b.ra) === 0).length;
      return { key, label, total, exatos, parc3, basico, erro };
    });

    // ── Taxa de aproveitamento, média de pontos, últimas 5, gols chutados ──
    const totalPts = finishedBets.reduce((s, b) => s + calculatePoints(b.home_score, b.away_score, b.rh, b.ra), 0);
    const aproveitamento = finishedBets.length > 0
      ? Math.round((finishedBets.filter(b => calculatePoints(b.home_score, b.away_score, b.rh, b.ra) > 0).length / finishedBets.length) * 100)
      : 0;
    const avgPoints = finishedBets.length > 0
      ? (totalPts / finishedBets.length).toFixed(1)
      : null;
    const last5 = finishedBets.slice(-5);
    const avg5Points = last5.length > 0
      ? (last5.reduce((s, b) => s + calculatePoints(b.home_score, b.away_score, b.rh, b.ra), 0) / last5.length).toFixed(1)
      : null;
    const avgGoals = finishedBets.length > 0
      ? ((finishedBets.reduce((s, b) => s + b.home_score + b.away_score, 0)) / finishedBets.length).toFixed(1)
      : null;

    // ── Diferença para o líder ──
    const allUsersForLeader = await all('SELECT id FROM users WHERE is_admin=0 AND is_precadastro=0');
    const allBonus = await all('SELECT user_id, SUM(points) as total FROM bonus_awards GROUP BY user_id');
    const bonusMap = {};
    for (const b of allBonus) bonusMap[b.user_id] = Number(b.total);
    let leaderPoints = 0;
    for (const u of allUsersForLeader) {
      const ubets = await all('SELECT points FROM bets b JOIN games g ON b.game_id=g.id WHERE b.user_id=? AND g.home_score IS NOT NULL', [u.id]);
      const uTotal = ubets.reduce((s, b) => s + (b.points || 0), 0) + (bonusMap[u.id] || 0);
      if (uTotal > leaderPoints) leaderPoints = uTotal;
    }
    const diffToLeader = totalPts - leaderPoints;

    // ── Estatísticas de Classificação (ordem cronológica) ──
    const rankingBets = await all(`
      SELECT b.user_id, b.points, g.id as game_id
      FROM bets b JOIN games g ON b.game_id = g.id
      JOIN users u ON b.user_id = u.id
      WHERE g.home_score IS NOT NULL AND u.is_admin=0 AND u.is_precadastro=0
      ORDER BY g.match_date, g.match_time, g.match_number
    `);
    const seenRankGames = new Map();
    for (const b of rankingBets) if (!seenRankGames.has(b.game_id)) seenRankGames.set(b.game_id, seenRankGames.size);
    const rankingBetsByGame = {};
    for (const b of rankingBets) {
      if (!rankingBetsByGame[b.game_id]) rankingBetsByGame[b.game_id] = [];
      rankingBetsByGame[b.game_id].push(b);
    }
    const cumRank = {};
    for (const u of allUsersForLeader) cumRank[u.id] = bonusMap[u.id] || 0;
    const nUsers = allUsersForLeader.length;
    let rodadasLider = 0, rodadasTop3 = 0, rodadasTop6 = 0, rodadasBot6 = 0, rodadasLanterna = 0;
    let posTotal = 0, posCount = 0;
    for (const gid of seenRankGames.keys()) {
      for (const b of (rankingBetsByGame[gid] || [])) cumRank[b.user_id] = (cumRank[b.user_id] || 0) + (b.points || 0);
      const sorted = allUsersForLeader.map(u => ({ id: u.id, pts: cumRank[u.id] || 0 })).sort((a, b) => b.pts - a.pts);
      const myIdx = sorted.findIndex(u => u.id === targetId);
      if (myIdx === -1) continue;
      const myRank = myIdx + 1;
      posTotal += myRank; posCount++;
      if (myRank === 1) rodadasLider++;
      if (myRank <= 3) rodadasTop3++;
      if (myRank <= 6) rodadasTop6++;
      if (myRank >= nUsers - 5) rodadasBot6++;
      if (myRank === nUsers) rodadasLanterna++;
    }
    const posicaoMedia = posCount > 0 ? Number((posTotal / posCount).toFixed(1)) : null;

    // ── Melhor amigo ──
    const allUsers = await all('SELECT id,name,username,avatar_path FROM users WHERE is_admin=0 AND is_precadastro=0 AND id!=?', [targetId]);
    const myBetsByGame = {};
    for (const b of finishedBets) myBetsByGame[b.game_id] = b;

    const friendScores = [];
    for (const u of allUsers) {
      const theirBets = allBets.filter(b => b.user_id === u.id && b.rh !== null && b.ra !== null);
      let score = 0, shared = 0;
      for (const tb of theirBets) {
        const mine = myBetsByGame[tb.game_id];
        if (!mine) continue;
        shared++;
        if (mine.home_score === tb.home_score && mine.away_score === tb.away_score) score += 2;
        else {
          const myW = mine.home_score > mine.away_score ? 'h' : mine.home_score < mine.away_score ? 'a' : 'd';
          const thW = tb.home_score > tb.away_score ? 'h' : tb.home_score < tb.away_score ? 'a' : 'd';
          if (myW === thW) score += 1;
        }
      }
      if (shared > 0) friendScores.push({ ...u, similarity: score, shared });
    }
    friendScores.sort((a, b) => b.similarity - a.similarity);
    const bestFriends = friendScores.slice(0, 3);
    const worstFriends = [...friendScores].filter(f => f.shared >= 3).sort((a, b) => a.similarity - b.similarity).slice(0, 3);

    res.json({
      user: targetUser,
      stats: {
        missedByOneGoal,
        drawsBet,
        boldBets,
        thrashingsBet,
        topScores,
        againstMajority,
        theOnlyOne,
        followerPct,
        bestStreak,
        worstStreak,
        favoriteTeam,
        favoriteTeamPoints,
        cursedTeam,
        cursedTeamMisses,
        totalFinished: finishedBets.length,
        totalBets: myBets.length,
        aproveitamento,
        avgPoints,
        avg5Points,
        avgGoals,
        diffToLeader,
      },
      bestFriends,
      worstFriends,
      betTypeTable,
      rankingStats: { rodadasLider, rodadasTop3, rodadasTop6, rodadasBot6, rodadasLanterna, posicaoMedia, totalRodadas: seenRankGames.size },
    });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/users/list', auth, async (req, res) => {
  try {
    const users = await all('SELECT id,name,username,avatar_path FROM users WHERE is_admin=0 AND is_precadastro=0 ORDER BY name');
    res.json(users);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
});

app.listen(PORT, () => console.log(`Bolaochonete rodando na porta ${PORT}`));
