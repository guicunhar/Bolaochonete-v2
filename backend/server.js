const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const { db, initializeDatabase } = require('./database');
const { calculatePoints } = require('./scoring');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'bolao-chonete-2026-super-secret';

app.use(cors());
app.use(express.json());

initializeDatabase();

const FRONTEND_DIST = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(FRONTEND_DIST));

app.get('/api/health', (req, res) => res.json({ ok: true }));

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

app.post('/api/register', (req, res) => {
  const { name, username, password, champion_pick, best_player_pick, top_scorer_pick } = req.body;
  if (!name || !username || !password) return res.status(400).json({ error: 'Campos obrigatórios' });
  if (password.length < 4) return res.status(400).json({ error: 'Senha mínima de 4 caracteres' });
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username.toLowerCase());
  if (existing) return res.status(409).json({ error: 'Nome de usuário já existe' });
  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(`INSERT INTO users (name, username, password_hash, champion_pick, best_player_pick, top_scorer_pick) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(name, username.toLowerCase(), hash, champion_pick || null, best_player_pick || null, top_scorer_pick || null);
  const token = jwt.sign({ id: result.lastInsertRowid, username: username.toLowerCase(), name, is_admin: 0 }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: { id: result.lastInsertRowid, name, username: username.toLowerCase(), is_admin: false } });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username?.toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.password_hash))
    return res.status(401).json({ error: 'Usuário ou senha incorretos' });
  const token = jwt.sign({ id: user.id, username: user.username, name: user.name, is_admin: user.is_admin }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: { id: user.id, name: user.name, username: user.username, is_admin: !!user.is_admin } });
});

app.get('/api/me', auth, (req, res) => {
  const user = db.prepare('SELECT id, name, username, is_admin, champion_pick, best_player_pick, top_scorer_pick FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  res.json(user);
});

app.put('/api/me/picks', auth, (req, res) => {
  const { champion_pick, best_player_pick, top_scorer_pick } = req.body;
  db.prepare('UPDATE users SET champion_pick=?, best_player_pick=?, top_scorer_pick=? WHERE id=?')
    .run(champion_pick, best_player_pick, top_scorer_pick, req.user.id);
  res.json({ ok: true });
});

app.get('/api/games', auth, (req, res) => {
  res.json(db.prepare('SELECT * FROM games ORDER BY match_date, match_time, match_number').all());
});

app.get('/api/bets/mine', auth, (req, res) => {
  res.json(db.prepare(`SELECT b.*, g.match_date, g.match_time, g.home_team, g.away_team FROM bets b JOIN games g ON b.game_id = g.id WHERE b.user_id = ?`).all(req.user.id));
});

app.post('/api/bets', auth, (req, res) => {
  const { game_id, home_score, away_score } = req.body;
  if (home_score === undefined || away_score === undefined) return res.status(400).json({ error: 'Placar obrigatório' });
  const game = db.prepare('SELECT * FROM games WHERE id = ?').get(game_id);
  if (!game) return res.status(404).json({ error: 'Jogo não encontrado' });
  const matchStart = new Date(`${game.match_date}T${game.match_time}:00-03:00`);
  if (new Date() >= matchStart) return res.status(400).json({ error: 'Prazo encerrado para este jogo' });
  db.prepare(`INSERT INTO bets (user_id, game_id, home_score, away_score) VALUES (?, ?, ?, ?) ON CONFLICT(user_id, game_id) DO UPDATE SET home_score=excluded.home_score, away_score=excluded.away_score, updated_at=CURRENT_TIMESTAMP`)
    .run(req.user.id, game_id, home_score, away_score);
  res.json({ ok: true });
});

app.get('/api/bets/all', auth, (req, res) => {
  res.json(db.prepare(`SELECT b.*, u.name as user_name, u.username, g.home_team, g.away_team, g.home_flag, g.away_flag, g.match_date, g.match_time, g.phase, g.home_score as real_home, g.away_score as real_away FROM bets b JOIN users u ON b.user_id = u.id JOIN games g ON b.game_id = g.id ORDER BY g.match_date, g.match_time, u.name`).all());
});

app.get('/api/ranking', auth, (req, res) => {
  const users = db.prepare(`SELECT id, name, username, champion_pick, best_player_pick, top_scorer_pick FROM users WHERE is_admin = 0`).all();
  const ranking = users.map(user => {
    const bets = db.prepare('SELECT b.*, g.home_score as real_home, g.away_score as real_away FROM bets b JOIN games g ON b.game_id = g.id WHERE b.user_id = ?').all(user.id);
    let total_points = 0, exact = 0, partial3 = 0, partial1 = 0;
    for (const bet of bets) {
      if (bet.real_home === null || bet.real_away === null) continue;
      const pts = calculatePoints(bet.home_score, bet.away_score, bet.real_home, bet.real_away);
      total_points += pts;
      if (pts === 5) exact++;
      else if (pts === 3) partial3++;
      else if (pts === 1) partial1++;
    }
    return { id: user.id, name: user.name, username: user.username, champion_pick: user.champion_pick, best_player_pick: user.best_player_pick, top_scorer_pick: user.top_scorer_pick, total_points, exact, partial3, partial1 };
  });
  ranking.sort((a, b) => b.total_points - a.total_points);
  res.json(ranking);
});

app.get('/api/admin/games', auth, adminOnly, (req, res) => {
  res.json(db.prepare('SELECT * FROM games ORDER BY match_date, match_time, match_number').all());
});

app.put('/api/admin/games/:id', auth, adminOnly, (req, res) => {
  const { home_team, home_flag, away_team, away_flag, match_date, match_time, venue, home_score, away_score, phase, group_name, match_number } = req.body;
  const hs = home_score !== '' && home_score !== null && home_score !== undefined ? Number(home_score) : null;
  const as_ = away_score !== '' && away_score !== null && away_score !== undefined ? Number(away_score) : null;
  db.prepare(`UPDATE games SET home_team=?, home_flag=?, away_team=?, away_flag=?, match_date=?, match_time=?, venue=?, home_score=?, away_score=?, phase=?, group_name=?, match_number=? WHERE id=?`)
    .run(home_team, home_flag, away_team, away_flag, match_date, match_time, venue, hs, as_, phase, group_name || null, match_number || null, req.params.id);
  if (hs !== null) {
    for (const bet of db.prepare('SELECT * FROM bets WHERE game_id = ?').all(req.params.id)) {
      db.prepare('UPDATE bets SET points = ? WHERE id = ?').run(calculatePoints(bet.home_score, bet.away_score, hs, as_), bet.id);
    }
  }
  res.json({ ok: true });
});

app.post('/api/admin/games', auth, adminOnly, (req, res) => {
  const { home_team, home_flag, away_team, away_flag, match_date, match_time, venue, phase, group_name, match_number } = req.body;
  const result = db.prepare(`INSERT INTO games (home_team, home_flag, away_team, away_flag, match_date, match_time, venue, phase, group_name, match_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(home_team, home_flag, away_team, away_flag, match_date, match_time, venue || '', phase || 'Grupos', group_name || null, match_number || null);
  res.json({ id: result.lastInsertRowid });
});

app.delete('/api/admin/games/:id', auth, adminOnly, (req, res) => {
  db.prepare('DELETE FROM bets WHERE game_id = ?').run(req.params.id);
  db.prepare('DELETE FROM games WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

app.get('/api/admin/users', auth, adminOnly, (req, res) => {
  res.json(db.prepare('SELECT id, name, username, is_admin, champion_pick, best_player_pick, top_scorer_pick, created_at FROM users').all());
});

app.get('*', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
});

app.listen(PORT, () => console.log(`🚀 Bolão Chonete rodando na porta ${PORT}`));
