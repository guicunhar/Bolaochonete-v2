const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'bolao.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      is_admin INTEGER DEFAULT 0,
      champion_pick TEXT,
      best_player_pick TEXT,
      top_scorer_pick TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      match_number INTEGER,
      phase TEXT NOT NULL DEFAULT 'Grupos',
      group_name TEXT,
      home_team TEXT NOT NULL,
      home_flag TEXT NOT NULL,
      away_team TEXT NOT NULL,
      away_flag TEXT NOT NULL,
      match_date TEXT NOT NULL,
      match_time TEXT NOT NULL,
      venue TEXT,
      home_score INTEGER,
      away_score INTEGER,
      status TEXT DEFAULT 'upcoming',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS bets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      game_id INTEGER NOT NULL,
      home_score INTEGER NOT NULL,
      away_score INTEGER NOT NULL,
      points INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (game_id) REFERENCES games(id),
      UNIQUE(user_id, game_id)
    );
  `);

  // Create admin if not exists
  const admin = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!admin) {
    const hash = bcrypt.hashSync('admin2026', 10);
    db.prepare(`INSERT INTO users (name, username, password_hash, is_admin) VALUES (?, ?, ?, 1)`)
      .run('Administrador', 'admin', hash);
    console.log('Admin created: admin / admin2026');
  }

  // Seed games if empty
  const gameCount = db.prepare('SELECT COUNT(*) as c FROM games').get();
  if (gameCount.c === 0) {
    seedGames();
    console.log('Games seeded!');
  }
}

function seedGames() {
  const insert = db.prepare(`
    INSERT INTO games (match_number, phase, group_name, home_team, home_flag, away_team, away_flag, match_date, match_time, venue)
    VALUES (@match_number, @phase, @group_name, @home_team, @home_flag, @away_team, @away_flag, @match_date, @match_time, @venue)
  `);

  const games = [
    // Group A
    { match_number: 1, phase: 'Grupos', group_name: 'A', home_team: 'México', home_flag: '🇲🇽', away_team: 'Estados Unidos', away_flag: '🇺🇸', match_date: '2026-06-11', match_time: '22:00', venue: 'Azteca, Cidade do México' },
    { match_number: 2, phase: 'Grupos', group_name: 'A', home_team: 'Canadá', home_flag: '🇨🇦', away_team: 'Arábia Saudita', away_flag: '🇸🇦', match_date: '2026-06-12', match_time: '19:00', venue: 'Toronto' },
    { match_number: 3, phase: 'Grupos', group_name: 'A', home_team: 'México', home_flag: '🇲🇽', away_team: 'Canadá', away_flag: '🇨🇦', match_date: '2026-06-16', match_time: '22:00', venue: 'Azteca, Cidade do México' },
    { match_number: 4, phase: 'Grupos', group_name: 'A', home_team: 'Estados Unidos', home_flag: '🇺🇸', away_team: 'Arábia Saudita', away_flag: '🇸🇦', match_date: '2026-06-16', match_time: '19:00', venue: 'Los Angeles' },
    { match_number: 5, phase: 'Grupos', group_name: 'A', home_team: 'Estados Unidos', home_flag: '🇺🇸', away_team: 'Canadá', away_flag: '🇨🇦', match_date: '2026-06-20', match_time: '22:00', venue: 'Nova York' },
    { match_number: 6, phase: 'Grupos', group_name: 'A', home_team: 'Arábia Saudita', home_flag: '🇸🇦', away_team: 'México', away_flag: '🇲🇽', match_date: '2026-06-20', match_time: '22:00', venue: 'Los Angeles' },
    // Group B
    { match_number: 7, phase: 'Grupos', group_name: 'B', home_team: 'Argentina', home_flag: '🇦🇷', away_team: 'Peru', away_flag: '🇵🇪', match_date: '2026-06-13', match_time: '19:00', venue: 'Miami' },
    { match_number: 8, phase: 'Grupos', group_name: 'B', home_team: 'Chile', home_flag: '🇨🇱', away_team: 'Austrália', away_flag: '🇦🇺', match_date: '2026-06-13', match_time: '22:00', venue: 'Dallas' },
    { match_number: 9, phase: 'Grupos', group_name: 'B', home_team: 'Argentina', home_flag: '🇦🇷', away_team: 'Chile', away_flag: '🇨🇱', match_date: '2026-06-17', match_time: '22:00', venue: 'Nova York' },
    { match_number: 10, phase: 'Grupos', group_name: 'B', home_team: 'Peru', home_flag: '🇵🇪', away_team: 'Austrália', away_flag: '🇦🇺', match_date: '2026-06-17', match_time: '19:00', venue: 'Los Angeles' },
    { match_number: 11, phase: 'Grupos', group_name: 'B', home_team: 'Argentina', home_flag: '🇦🇷', away_team: 'Austrália', away_flag: '🇦🇺', match_date: '2026-06-21', match_time: '22:00', venue: 'Miami' },
    { match_number: 12, phase: 'Grupos', group_name: 'B', home_team: 'Austrália', home_flag: '🇦🇺', away_team: 'Chile', away_flag: '🇨🇱', match_date: '2026-06-21', match_time: '22:00', venue: 'Dallas' },
    // Group C
    { match_number: 13, phase: 'Grupos', group_name: 'C', home_team: 'Brasil', home_flag: '🇧🇷', away_team: 'Alemanha', away_flag: '🇩🇪', match_date: '2026-06-14', match_time: '19:00', venue: 'Los Angeles' },
    { match_number: 14, phase: 'Grupos', group_name: 'C', home_team: 'Japão', home_flag: '🇯🇵', away_team: 'Nigéria', away_flag: '🇳🇬', match_date: '2026-06-14', match_time: '22:00', venue: 'São Francisco' },
    { match_number: 15, phase: 'Grupos', group_name: 'C', home_team: 'Brasil', home_flag: '🇧🇷', away_team: 'Japão', away_flag: '🇯🇵', match_date: '2026-06-18', match_time: '22:00', venue: 'Los Angeles' },
    { match_number: 16, phase: 'Grupos', group_name: 'C', home_team: 'Alemanha', home_flag: '🇩🇪', away_team: 'Nigéria', away_flag: '🇳🇬', match_date: '2026-06-18', match_time: '19:00', venue: 'Nova York' },
    { match_number: 17, phase: 'Grupos', group_name: 'C', home_team: 'Brasil', home_flag: '🇧🇷', away_team: 'Nigéria', away_flag: '🇳🇬', match_date: '2026-06-22', match_time: '22:00', venue: 'Houston' },
    { match_number: 18, phase: 'Grupos', group_name: 'C', home_team: 'Nigéria', home_flag: '🇳🇬', away_team: 'Alemanha', away_flag: '🇩🇪', match_date: '2026-06-22', match_time: '22:00', venue: 'Los Angeles' },
    // Group D
    { match_number: 19, phase: 'Grupos', group_name: 'D', home_team: 'França', home_flag: '🇫🇷', away_team: 'México', away_flag: '🇲🇽', match_date: '2026-06-15', match_time: '22:00', venue: 'Cidade do México' },
    { match_number: 20, phase: 'Grupos', group_name: 'D', home_team: 'Equador', home_flag: '🇪🇨', away_team: 'Senegal', away_flag: '🇸🇳', match_date: '2026-06-15', match_time: '19:00', venue: 'Atlanta' },
    { match_number: 21, phase: 'Grupos', group_name: 'D', home_team: 'França', home_flag: '🇫🇷', away_team: 'Equador', away_flag: '🇪🇨', match_date: '2026-06-19', match_time: '22:00', venue: 'Nova York' },
    { match_number: 22, phase: 'Grupos', group_name: 'D', home_team: 'México', home_flag: '🇲🇽', away_team: 'Senegal', away_flag: '🇸🇳', match_date: '2026-06-19', match_time: '19:00', venue: 'Dallas' },
    { match_number: 23, phase: 'Grupos', group_name: 'D', home_team: 'França', home_flag: '🇫🇷', away_team: 'Senegal', away_flag: '🇸🇳', match_date: '2026-06-23', match_time: '22:00', venue: 'Los Angeles' },
    { match_number: 24, phase: 'Grupos', group_name: 'D', home_team: 'Senegal', home_flag: '🇸🇳', away_team: 'Equador', away_flag: '🇪🇨', match_date: '2026-06-23', match_time: '22:00', venue: 'Seattle' },
    // Group E
    { match_number: 25, phase: 'Grupos', group_name: 'E', home_team: 'Espanha', home_flag: '🇪🇸', away_team: 'Egito', away_flag: '🇪🇬', match_date: '2026-06-12', match_time: '16:00', venue: 'Kansas City' },
    { match_number: 26, phase: 'Grupos', group_name: 'E', home_team: 'Nova Zelândia', home_flag: '🇳🇿', away_team: 'Bielorrússia', away_flag: '🇧🇾', match_date: '2026-06-12', match_time: '13:00', venue: 'Vancouver' },
    { match_number: 27, phase: 'Grupos', group_name: 'E', home_team: 'Espanha', home_flag: '🇪🇸', away_team: 'Nova Zelândia', away_flag: '🇳🇿', match_date: '2026-06-16', match_time: '16:00', venue: 'Los Angeles' },
    { match_number: 28, phase: 'Grupos', group_name: 'E', home_team: 'Egito', home_flag: '🇪🇬', away_team: 'Bielorrússia', away_flag: '🇧🇾', match_date: '2026-06-16', match_time: '13:00', venue: 'Miami' },
    { match_number: 29, phase: 'Grupos', group_name: 'E', home_team: 'Espanha', home_flag: '🇪🇸', away_team: 'Bielorrússia', away_flag: '🇧🇾', match_date: '2026-06-20', match_time: '16:00', venue: 'Dallas' },
    { match_number: 30, phase: 'Grupos', group_name: 'E', home_team: 'Bielorrússia', home_flag: '🇧🇾', away_team: 'Nova Zelândia', away_flag: '🇳🇿', match_date: '2026-06-20', match_time: '16:00', venue: 'Seattle' },
    // Group F
    { match_number: 31, phase: 'Grupos', group_name: 'F', home_team: 'Portugal', home_flag: '🇵🇹', away_team: 'Costa Rica', away_flag: '🇨🇷', match_date: '2026-06-13', match_time: '16:00', venue: 'Boston' },
    { match_number: 32, phase: 'Grupos', group_name: 'F', home_team: 'Marrocos', home_flag: '🇲🇦', away_team: 'Tanzânia', away_flag: '🇹🇿', match_date: '2026-06-13', match_time: '13:00', venue: 'Filadélfia' },
    { match_number: 33, phase: 'Grupos', group_name: 'F', home_team: 'Portugal', home_flag: '🇵🇹', away_team: 'Marrocos', away_flag: '🇲🇦', match_date: '2026-06-17', match_time: '16:00', venue: 'Atlanta' },
    { match_number: 34, phase: 'Grupos', group_name: 'F', home_team: 'Costa Rica', home_flag: '🇨🇷', away_team: 'Tanzânia', away_flag: '🇹🇿', match_date: '2026-06-17', match_time: '13:00', venue: 'Kansas City' },
    { match_number: 35, phase: 'Grupos', group_name: 'F', home_team: 'Portugal', home_flag: '🇵🇹', away_team: 'Tanzânia', away_flag: '🇹🇿', match_date: '2026-06-21', match_time: '16:00', venue: 'Boston' },
    { match_number: 36, phase: 'Grupos', group_name: 'F', home_team: 'Tanzânia', home_flag: '🇹🇿', away_team: 'Costa Rica', away_flag: '🇨🇷', match_date: '2026-06-21', match_time: '16:00', venue: 'Dallas' },
    // Group G
    { match_number: 37, phase: 'Grupos', group_name: 'G', home_team: 'Itália', home_flag: '🇮🇹', away_team: 'Honduras', away_flag: '🇭🇳', match_date: '2026-06-14', match_time: '16:00', venue: 'Seattle' },
    { match_number: 38, phase: 'Grupos', group_name: 'G', home_team: 'Colômbia', home_flag: '🇨🇴', away_team: 'República Tcheca', away_flag: '🇨🇿', match_date: '2026-06-14', match_time: '13:00', venue: 'Chicago' },
    { match_number: 39, phase: 'Grupos', group_name: 'G', home_team: 'Itália', home_flag: '🇮🇹', away_team: 'Colômbia', away_flag: '🇨🇴', match_date: '2026-06-18', match_time: '16:00', venue: 'Miami' },
    { match_number: 40, phase: 'Grupos', group_name: 'G', home_team: 'Honduras', home_flag: '🇭🇳', away_team: 'República Tcheca', away_flag: '🇨🇿', match_date: '2026-06-18', match_time: '13:00', venue: 'Houston' },
    { match_number: 41, phase: 'Grupos', group_name: 'G', home_team: 'Itália', home_flag: '🇮🇹', away_team: 'República Tcheca', away_flag: '🇨🇿', match_date: '2026-06-22', match_time: '16:00', venue: 'Nova York' },
    { match_number: 42, phase: 'Grupos', group_name: 'G', home_team: 'República Tcheca', home_flag: '🇨🇿', away_team: 'Colômbia', away_flag: '🇨🇴', match_date: '2026-06-22', match_time: '16:00', venue: 'Boston' },
    // Group H
    { match_number: 43, phase: 'Grupos', group_name: 'H', home_team: 'Países Baixos', home_flag: '🇳🇱', away_team: 'Quirguistão', away_flag: '🇰🇬', match_date: '2026-06-15', match_time: '16:00', venue: 'Los Angeles' },
    { match_number: 44, phase: 'Grupos', group_name: 'H', home_team: 'Suíça', home_flag: '🇨🇭', away_team: 'Camarões', away_flag: '🇨🇲', match_date: '2026-06-15', match_time: '13:00', venue: 'Dallas' },
    { match_number: 45, phase: 'Grupos', group_name: 'H', home_team: 'Países Baixos', home_flag: '🇳🇱', away_team: 'Suíça', away_flag: '🇨🇭', match_date: '2026-06-19', match_time: '16:00', venue: 'Los Angeles' },
    { match_number: 46, phase: 'Grupos', group_name: 'H', home_team: 'Quirguistão', home_flag: '🇰🇬', away_team: 'Camarões', away_flag: '🇨🇲', match_date: '2026-06-19', match_time: '13:00', venue: 'Houston' },
    { match_number: 47, phase: 'Grupos', group_name: 'H', home_team: 'Países Baixos', home_flag: '🇳🇱', away_team: 'Camarões', away_flag: '🇨🇲', match_date: '2026-06-23', match_time: '16:00', venue: 'Nova York' },
    { match_number: 48, phase: 'Grupos', group_name: 'H', home_team: 'Camarões', home_flag: '🇨🇲', away_team: 'Suíça', away_flag: '🇨🇭', match_date: '2026-06-23', match_time: '16:00', venue: 'Seattle' },
    // Group I
    { match_number: 49, phase: 'Grupos', group_name: 'I', home_team: 'Croácia', home_flag: '🇭🇷', away_team: 'Tailândia', away_flag: '🇹🇭', match_date: '2026-06-12', match_time: '22:00', venue: 'Miami' },
    { match_number: 50, phase: 'Grupos', group_name: 'I', home_team: 'Bélgica', home_flag: '🇧🇪', away_team: 'Eslováquia', away_flag: '🇸🇰', match_date: '2026-06-12', match_time: '19:00', venue: 'Los Angeles' },
    { match_number: 51, phase: 'Grupos', group_name: 'I', home_team: 'Croácia', home_flag: '🇭🇷', away_team: 'Bélgica', away_flag: '🇧🇪', match_date: '2026-06-16', match_time: '22:00', venue: 'Dallas' },
    { match_number: 52, phase: 'Grupos', group_name: 'I', home_team: 'Tailândia', home_flag: '🇹🇭', away_team: 'Eslováquia', away_flag: '🇸🇰', match_date: '2026-06-16', match_time: '19:00', venue: 'Boston' },
    { match_number: 53, phase: 'Grupos', group_name: 'I', home_team: 'Croácia', home_flag: '🇭🇷', away_team: 'Eslováquia', away_flag: '🇸🇰', match_date: '2026-06-20', match_time: '22:00', venue: 'Seattle' },
    { match_number: 54, phase: 'Grupos', group_name: 'I', home_team: 'Eslováquia', home_flag: '🇸🇰', away_team: 'Tailândia', away_flag: '🇹🇭', match_date: '2026-06-20', match_time: '22:00', venue: 'Chicago' },
    // Group J
    { match_number: 55, phase: 'Grupos', group_name: 'J', home_team: 'Uruguai', home_flag: '🇺🇾', away_team: 'Coréia do Sul', away_flag: '🇰🇷', match_date: '2026-06-13', match_time: '22:00', venue: 'Kansas City' },
    { match_number: 56, phase: 'Grupos', group_name: 'J', home_team: 'Polônia', home_flag: '🇵🇱', away_team: 'Afeganistão', away_flag: '🇦🇫', match_date: '2026-06-13', match_time: '19:00', venue: 'Vancouver' },
    { match_number: 57, phase: 'Grupos', group_name: 'J', home_team: 'Uruguai', home_flag: '🇺🇾', away_team: 'Polônia', away_flag: '🇵🇱', match_date: '2026-06-17', match_time: '22:00', venue: 'Houston' },
    { match_number: 58, phase: 'Grupos', group_name: 'J', home_team: 'Coréia do Sul', home_flag: '🇰🇷', away_team: 'Afeganistão', away_flag: '🇦🇫', match_date: '2026-06-17', match_time: '19:00', venue: 'Dallas' },
    { match_number: 59, phase: 'Grupos', group_name: 'J', home_team: 'Uruguai', home_flag: '🇺🇾', away_team: 'Afeganistão', away_flag: '🇦🇫', match_date: '2026-06-21', match_time: '22:00', venue: 'Miami' },
    { match_number: 60, phase: 'Grupos', group_name: 'J', home_team: 'Afeganistão', home_flag: '🇦🇫', away_team: 'Coréia do Sul', away_flag: '🇰🇷', match_date: '2026-06-21', match_time: '22:00', venue: 'Boston' },
    // Group K
    { match_number: 61, phase: 'Grupos', group_name: 'K', home_team: 'Inglaterra', home_flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', away_team: 'Tunísia', away_flag: '🇹🇳', match_date: '2026-06-14', match_time: '22:00', venue: 'Nova York' },
    { match_number: 62, phase: 'Grupos', group_name: 'K', home_team: 'Panamá', home_flag: '🇵🇦', away_team: 'Geórgia', away_flag: '🇬🇪', match_date: '2026-06-14', match_time: '19:00', venue: 'Los Angeles' },
    { match_number: 63, phase: 'Grupos', group_name: 'K', home_team: 'Inglaterra', home_flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', away_team: 'Panamá', away_flag: '🇵🇦', match_date: '2026-06-18', match_time: '22:00', venue: 'Boston' },
    { match_number: 64, phase: 'Grupos', group_name: 'K', home_team: 'Tunísia', home_flag: '🇹🇳', away_team: 'Geórgia', away_flag: '🇬🇪', match_date: '2026-06-18', match_time: '19:00', venue: 'Chicago' },
    { match_number: 65, phase: 'Grupos', group_name: 'K', home_team: 'Inglaterra', home_flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', away_team: 'Geórgia', away_flag: '🇬🇪', match_date: '2026-06-22', match_time: '22:00', venue: 'Los Angeles' },
    { match_number: 66, phase: 'Grupos', group_name: 'K', home_team: 'Geórgia', home_flag: '🇬🇪', away_team: 'Panamá', away_flag: '🇵🇦', match_date: '2026-06-22', match_time: '22:00', venue: 'Atlanta' },
    // Group L
    { match_number: 67, phase: 'Grupos', group_name: 'L', home_team: 'Irão', home_flag: '🇮🇷', away_team: 'Venezuela', away_flag: '🇻🇪', match_date: '2026-06-15', match_time: '22:00', venue: 'Guadalajara' },
    { match_number: 68, phase: 'Grupos', group_name: 'L', home_team: 'Turquia', home_flag: '🇹🇷', away_team: 'China', away_flag: '🇨🇳', match_date: '2026-06-15', match_time: '19:00', venue: 'Toronto' },
    { match_number: 69, phase: 'Grupos', group_name: 'L', home_team: 'Irão', home_flag: '🇮🇷', away_team: 'Turquia', away_flag: '🇹🇷', match_date: '2026-06-19', match_time: '22:00', venue: 'Guadalajara' },
    { match_number: 70, phase: 'Grupos', group_name: 'L', home_team: 'Venezuela', home_flag: '🇻🇪', away_team: 'China', away_flag: '🇨🇳', match_date: '2026-06-19', match_time: '19:00', venue: 'Boston' },
    { match_number: 71, phase: 'Grupos', group_name: 'L', home_team: 'Irão', home_flag: '🇮🇷', away_team: 'China', away_flag: '🇨🇳', match_date: '2026-06-23', match_time: '22:00', venue: 'Los Angeles' },
    { match_number: 72, phase: 'Grupos', group_name: 'L', home_team: 'China', home_flag: '🇨🇳', away_team: 'Venezuela', away_flag: '🇻🇪', match_date: '2026-06-23', match_time: '22:00', venue: 'Toronto' },
    // Oitavas de final (placeholders)
    { match_number: 73, phase: 'Oitavas', group_name: null, home_team: 'A definir', home_flag: '🏳️', away_team: 'A definir', away_flag: '🏳️', match_date: '2026-07-04', match_time: '16:00', venue: 'A definir' },
    { match_number: 74, phase: 'Oitavas', group_name: null, home_team: 'A definir', home_flag: '🏳️', away_team: 'A definir', away_flag: '🏳️', match_date: '2026-07-04', match_time: '22:00', venue: 'A definir' },
    { match_number: 75, phase: 'Oitavas', group_name: null, home_team: 'A definir', home_flag: '🏳️', away_team: 'A definir', away_flag: '🏳️', match_date: '2026-07-05', match_time: '16:00', venue: 'A definir' },
    { match_number: 76, phase: 'Oitavas', group_name: null, home_team: 'A definir', home_flag: '🏳️', away_team: 'A definir', away_flag: '🏳️', match_date: '2026-07-05', match_time: '22:00', venue: 'A definir' },
    { match_number: 77, phase: 'Oitavas', group_name: null, home_team: 'A definir', home_flag: '🏳️', away_team: 'A definir', away_flag: '🏳️', match_date: '2026-07-06', match_time: '16:00', venue: 'A definir' },
    { match_number: 78, phase: 'Oitavas', group_name: null, home_team: 'A definir', home_flag: '🏳️', away_team: 'A definir', away_flag: '🏳️', match_date: '2026-07-06', match_time: '22:00', venue: 'A definir' },
    { match_number: 79, phase: 'Oitavas', group_name: null, home_team: 'A definir', home_flag: '🏳️', away_team: 'A definir', away_flag: '🏳️', match_date: '2026-07-07', match_time: '16:00', venue: 'A definir' },
    { match_number: 80, phase: 'Oitavas', group_name: null, home_team: 'A definir', home_flag: '🏳️', away_team: 'A definir', away_flag: '🏳️', match_date: '2026-07-07', match_time: '22:00', venue: 'A definir' },
    // Quartas
    { match_number: 81, phase: 'Quartas', group_name: null, home_team: 'A definir', home_flag: '🏳️', away_team: 'A definir', away_flag: '🏳️', match_date: '2026-07-11', match_time: '16:00', venue: 'A definir' },
    { match_number: 82, phase: 'Quartas', group_name: null, home_team: 'A definir', home_flag: '🏳️', away_team: 'A definir', away_flag: '🏳️', match_date: '2026-07-11', match_time: '22:00', venue: 'A definir' },
    { match_number: 83, phase: 'Quartas', group_name: null, home_team: 'A definir', home_flag: '🏳️', away_team: 'A definir', away_flag: '🏳️', match_date: '2026-07-12', match_time: '16:00', venue: 'A definir' },
    { match_number: 84, phase: 'Quartas', group_name: null, home_team: 'A definir', home_flag: '🏳️', away_team: 'A definir', away_flag: '🏳️', match_date: '2026-07-12', match_time: '22:00', venue: 'A definir' },
    // Semi
    { match_number: 85, phase: 'Semi', group_name: null, home_team: 'A definir', home_flag: '🏳️', away_team: 'A definir', away_flag: '🏳️', match_date: '2026-07-15', match_time: '22:00', venue: 'A definir' },
    { match_number: 86, phase: 'Semi', group_name: null, home_team: 'A definir', home_flag: '🏳️', away_team: 'A definir', away_flag: '🏳️', match_date: '2026-07-16', match_time: '22:00', venue: 'A definir' },
    // Terceiro
    { match_number: 87, phase: 'Terceiro', group_name: null, home_team: 'A definir', home_flag: '🏳️', away_team: 'A definir', away_flag: '🏳️', match_date: '2026-07-19', match_time: '18:00', venue: 'Miami' },
    // Final
    { match_number: 88, phase: 'Final', group_name: null, home_team: 'A definir', home_flag: '🏳️', away_team: 'A definir', away_flag: '🏳️', match_date: '2026-07-19', match_time: '22:00', venue: 'MetLife, Nova York' },
  ];

  const insertMany = db.transaction((games) => {
    for (const g of games) insert.run(g);
  });
  insertMany(games);
}

module.exports = { db, initializeDatabase };
