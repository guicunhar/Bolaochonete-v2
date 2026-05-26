const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { db, initializeDatabase } = require('./database');
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
initializeDatabase();

// Static: frontend + uploads
const FRONTEND_DIST = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(FRONTEND_DIST));
app.use('/uploads', express.static(UPLOADS_DIR));

app.get('/api/health', (_, res) => res.json({ ok: true }));

// Auth middleware
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

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username?.toLowerCase());
  if (!user) return res.status(401).json({ error: 'Usuario ou senha incorretos' });
  if (user.is_precadastro) return res.status(400).json({ error: 'first-login' }); // signal to redirect
  if (!bcrypt.compareSync(password, user.password_hash)) return res.status(401).json({ error: 'Usuario ou senha incorretos' });
  const token = jwt.sign({ id: user.id, username: user.username, name: user.name, is_admin: !!user.is_admin }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: { id: user.id, name: user.name, username: user.username, is_admin: !!user.is_admin, avatar_path: user.avatar_path } });
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

app.get('/api/games', auth, (req, res) => {
  res.json(db.prepare('SELECT * FROM games ORDER BY match_date, match_time, match_number').all());
});

// ── BETS ─────────────────────────────────────────────────────────────────────

app.get('/api/bets/mine', auth, (req, res) => {
  res.json(db.prepare(`
    SELECT b.*, g.match_date, g.match_time FROM bets b
    JOIN games g ON b.game_id = g.id WHERE b.user_id = ?
  `).all(req.user.id));
});

app.post('/api/bets', auth, (req, res) => {
  const { game_id, home_score, away_score, is_anonymous } = req.body;
  const game = db.prepare('SELECT * FROM games WHERE id = ?').get(game_id);
  if (!game) return res.status(404).json({ error: 'Jogo não encontrado' });
  const matchStart = new Date(`${game.match_date}T${game.match_time}:00-03:00`);
  if (new Date() >= matchStart) return res.status(400).json({ error: 'Prazo encerrado' });
  db.prepare(`
    INSERT INTO bets (user_id,game_id,home_score,away_score,is_anonymous)
    VALUES (?,?,?,?,?)
    ON CONFLICT(user_id,game_id) DO UPDATE SET
      home_score=excluded.home_score, away_score=excluded.away_score,
      is_anonymous=excluded.is_anonymous, updated_at=CURRENT_TIMESTAMP
  `).run(req.user.id, game_id, home_score, away_score, is_anonymous ? 1 : 0);
  res.json({ ok: true });
});

app.get('/api/bets/all', auth, (req, res) => {
  const now = new Date();
  const bets = db.prepare(`
    SELECT b.*, u.name as user_name, u.username, u.avatar_path,
           g.home_team, g.away_team, g.home_flag, g.away_flag,
           g.match_date, g.match_time, g.phase,
           g.home_score as real_home, g.away_score as real_away
    FROM bets b
    JOIN users u ON b.user_id = u.id
    JOIN games g ON b.game_id = g.id
    ORDER BY g.match_date, g.match_time, u.name
  `).all();

  // Filter: anonymous bets hidden until match starts
  const filtered = bets.map(b => {
    const matchStart = new Date(`${b.match_date}T${b.match_time}:00-03:00`);
    const started = now >= matchStart;
    if (b.is_anonymous && !started) {
      return { ...b, home_score: null, away_score: null, hidden: true };
    }
    return b;
  });
  res.json(filtered);
});

// ── RANKING ──────────────────────────────────────────────────────────────────

app.get('/api/ranking', auth, (req, res) => {
  const users = db.prepare('SELECT id,name,username,avatar_path,champion_pick,best_player_pick,top_scorer_pick FROM users WHERE is_admin=0 AND is_precadastro=0').all();
  const ranking = users.map(user => {
    const bets = db.prepare(`
      SELECT b.*, g.home_score as rh, g.away_score as ra FROM bets b
      JOIN games g ON b.game_id=g.id WHERE b.user_id=?
    `).all(user.id);
    let pts=0, exact=0, p3=0, p1=0;
    for (const b of bets) {
      if (b.rh===null||b.ra===null) continue;
      const p = calculatePoints(b.home_score,b.away_score,b.rh,b.ra);
      pts+=p; if(p===5)exact++; else if(p===3)p3++; else if(p===1)p1++;
    }
    return {...user, total_points:pts, exact, partial3:p3, partial1:p1};
  });
  ranking.sort((a,b)=>b.total_points-a.total_points);
  res.json(ranking);
});

// ── ADMIN ────────────────────────────────────────────────────────────────────

app.get('/api/admin/games', auth, adminOnly, (req, res) => {
  res.json(db.prepare('SELECT * FROM games ORDER BY match_date, match_time, match_number').all());
});

app.put('/api/admin/games/:id', auth, adminOnly, (req, res) => {
  const { home_team,home_flag,away_team,away_flag,match_date,match_time,home_score,away_score,phase,group_name,match_number } = req.body;
  const hs = (home_score!==''&&home_score!=null) ? Number(home_score) : null;
  const as_ = (away_score!==''&&away_score!=null) ? Number(away_score) : null;
  db.prepare(`UPDATE games SET home_team=?,home_flag=?,away_team=?,away_flag=?,match_date=?,match_time=?,home_score=?,away_score=?,phase=?,group_name=?,match_number=? WHERE id=?`)
    .run(home_team,home_flag,away_team,away_flag,match_date,match_time,hs,as_,phase,group_name||null,match_number||null,req.params.id);
  if (hs!==null) {
    for (const bet of db.prepare('SELECT * FROM bets WHERE game_id=?').all(req.params.id)) {
      db.prepare('UPDATE bets SET points=? WHERE id=?').run(calculatePoints(bet.home_score,bet.away_score,hs,as_),bet.id);
    }
  }
  res.json({ ok: true });
});

app.post('/api/admin/games', auth, adminOnly, (req, res) => {
  const { home_team,home_flag,away_team,away_flag,match_date,match_time,phase,group_name,match_number } = req.body;
  const r = db.prepare(`INSERT INTO games (home_team,home_flag,away_team,away_flag,match_date,match_time,phase,group_name,match_number) VALUES (?,?,?,?,?,?,?,?,?)`)
    .run(home_team||'A definir',home_flag||'',away_team||'A definir',away_flag||'',match_date,match_time,phase||'Grupos',group_name||null,match_number||null);
  res.json({ id: r.lastInsertRowid });
});

app.delete('/api/admin/games/:id', auth, adminOnly, (req, res) => {
  db.prepare('DELETE FROM bets WHERE game_id=?').run(req.params.id);
  db.prepare('DELETE FROM games WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// Admin: user management
app.get('/api/admin/users', auth, adminOnly, (req, res) => {
  res.json(db.prepare('SELECT id,name,username,is_admin,is_precadastro,avatar_path,champion_pick,best_player_pick,top_scorer_pick,created_at FROM users ORDER BY id').all());
});

app.post('/api/admin/users', auth, adminOnly, (req, res) => {
  const { name, username } = req.body;
  if (!name||!username) return res.status(400).json({ error: 'Nome e usuário obrigatórios' });
  const exists = db.prepare('SELECT id FROM users WHERE username=?').get(username.toLowerCase());
  if (exists) return res.status(409).json({ error: 'Usuário já existe' });
  const r = db.prepare('INSERT INTO users (name,username,is_precadastro) VALUES (?,?,1)').run(name, username.toLowerCase());
  res.json({ id: r.lastInsertRowid });
});

app.delete('/api/admin/users/:id', auth, adminOnly, (req, res) => {
  if (req.params.id == req.user.id) return res.status(400).json({ error: 'Não pode deletar a si mesmo' });
  db.prepare('DELETE FROM bets WHERE user_id=?').run(req.params.id);
  db.prepare('DELETE FROM users WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// Admin: upload avatar for user
app.post('/api/admin/users/:userId/avatar', auth, adminOnly, upload.single('avatar'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  const avatarPath = `/uploads/${req.file.filename}`;
  db.prepare('UPDATE users SET avatar_path=? WHERE id=?').run(avatarPath, req.params.userId);
  res.json({ avatar_path: avatarPath });
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
});

app.listen(PORT, () => console.log(`Bolaochonete rodando na porta ${PORT}`));
