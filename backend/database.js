// database.js — usando @libsql/client (Turso) para persistência na nuvem
// Variáveis de ambiente necessárias:
//   TURSO_URL       = libsql://seu-banco.turso.io
//   TURSO_AUTH_TOKEN = eyJ...
const { createClient } = require('@libsql/client');
const bcrypt = require('bcryptjs');

const db = createClient({
  url:       process.env.TURSO_URL       || 'file:bolao.db', // fallback local p/ dev
  authToken: process.env.TURSO_AUTH_TOKEN || undefined,
});

// Helper: executa SQL sem retorno
async function exec(sql) {
  await db.execute(sql);
}

// Helper: retorna todas as linhas como array de objetos simples
async function all(sql, args = []) {
  const res = await db.execute({ sql, args });
  return res.rows.map(r => Object.fromEntries(Object.entries(r)));
}

// Helper: retorna primeira linha ou undefined
async function get(sql, args = []) {
  const rows = await all(sql, args);
  return rows[0];
}

// Helper: executa INSERT/UPDATE/DELETE, retorna { lastInsertRowid, rowsAffected }
async function run(sql, args = []) {
  const res = await db.execute({ sql, args });
  return { lastInsertRowid: Number(res.lastInsertRowid), rowsAffected: res.rowsAffected };
}

// Helper: executa múltiplos statements em batch (usado no seed)
async function batch(stmts) {
  await db.batch(stmts, 'write');
}

async function initializeDatabase() {
  // Criar tabelas
  await db.batch([
    { sql: `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      is_admin INTEGER DEFAULT 0,
      is_precadastro INTEGER DEFAULT 1,
      avatar_path TEXT,
      champion_pick TEXT,
      best_player_pick TEXT,
      top_scorer_pick TEXT,
      bonus_locked INTEGER DEFAULT 0,
      bonus_extra_points INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, args: [] },
    { sql: `CREATE TABLE IF NOT EXISTS games (
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
      home_score INTEGER,
      away_score INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, args: [] },
    { sql: `CREATE TABLE IF NOT EXISTS bets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      game_id INTEGER NOT NULL,
      home_score INTEGER NOT NULL,
      away_score INTEGER NOT NULL,
      is_anonymous INTEGER DEFAULT 0,
      points INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (game_id) REFERENCES games(id),
      UNIQUE(user_id, game_id)
    )`, args: [] },
    { sql: `CREATE TABLE IF NOT EXISTS bonus_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      champion TEXT,
      best_player TEXT,
      top_scorer TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, args: [] },
    { sql: `CREATE TABLE IF NOT EXISTS bonus_awards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      award_type TEXT NOT NULL,
      points INTEGER NOT NULL,
      awarded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(user_id, award_type)
    )`, args: [] },
  ], 'write');

  // Migration: adiciona coluna se não existir (ignora erro se já existe)
  try { await exec(`ALTER TABLE users ADD COLUMN bonus_extra_points INTEGER DEFAULT 0`); } catch(e) {}

  // Criar admin se não existir
  const admin = await get('SELECT id FROM users WHERE username = ?', ['admin']);
  if (!admin) {
    const hash = bcrypt.hashSync('admin2026', 10);
    await run(
      `INSERT INTO users (name, username, password_hash, is_admin, is_precadastro, bonus_locked) VALUES (?, ?, ?, 1, 0, 1)`,
      ['Administrador', 'admin', hash]
    );
    console.log('Admin criado: admin / admin2026');
  }

  // Garantir linha em bonus_results
  const br = await get('SELECT id FROM bonus_results');
  if (!br) {
    await run(`INSERT INTO bonus_results (champion, best_player, top_scorer) VALUES (NULL, NULL, NULL)`);
  }

  // Seed dos jogos se tabela vazia
  const { c } = await get('SELECT COUNT(*) as c FROM games');
  if (Number(c) === 0) {
    await seedGames();
    console.log('Jogos criados!');
  }
}

async function seedGames() {
  const games = [
    // ── GRUPO A: México, África do Sul, Coreia do Sul, Rep. Tcheca ──
    {n:1, phase:'Grupos',g:'A',ht:'México',        hf:'MX',at:'África do Sul',  af:'ZA',date:'2026-06-11',time:'16:00'},
    {n:2, phase:'Grupos',g:'A',ht:'Coreia do Sul',  hf:'KR',at:'Rep. Tcheca',    af:'CZ',date:'2026-06-11',time:'23:00'},
    {n:3, phase:'Grupos',g:'A',ht:'México',        hf:'MX',at:'Coreia do Sul',  af:'KR',date:'2026-06-18',time:'22:00'},
    {n:4, phase:'Grupos',g:'A',ht:'Rep. Tcheca',   hf:'CZ',at:'África do Sul',  af:'ZA',date:'2026-06-18',time:'13:00'},
    {n:5, phase:'Grupos',g:'A',ht:'Rep. Tcheca',   hf:'CZ',at:'México',         af:'MX',date:'2026-06-24',time:'22:00'},
    {n:6, phase:'Grupos',g:'A',ht:'África do Sul', hf:'ZA',at:'Coreia do Sul',  af:'KR',date:'2026-06-24',time:'22:00'},

    // ── GRUPO B: Canadá, Suíça, Catar, Bósnia ──
    {n:7, phase:'Grupos',g:'B',ht:'Canadá',hf:'CA',at:'Bósnia',af:'BA',date:'2026-06-12',time:'16:00'},
    {n:8, phase:'Grupos',g:'B',ht:'Suíça', hf:'CH',at:'Catar', af:'QA',date:'2026-06-13',time:'16:00'},
    {n:9, phase:'Grupos',g:'B',ht:'Canadá',hf:'CA',at:'Catar', af:'QA',date:'2026-06-19',time:'19:00'},
    {n:10,phase:'Grupos',g:'B',ht:'Suíça', hf:'CH',at:'Bósnia',af:'BA',date:'2026-06-24',time:'16:00'},
    {n:11,phase:'Grupos',g:'B',ht:'Suíça', hf:'CH',at:'Canadá',af:'CA',date:'2026-06-24',time:'16:00'},
    {n:12,phase:'Grupos',g:'B',ht:'Bósnia',hf:'BA',at:'Catar', af:'QA',date:'2026-06-24',time:'16:00'},

    // ── GRUPO C: Brasil, Marrocos, Escócia, Haiti ──
    {n:13,phase:'Grupos',g:'C',ht:'Brasil',  hf:'BR',    at:'Marrocos', af:'MA',    date:'2026-06-13',time:'19:00'},
    {n:14,phase:'Grupos',g:'C',ht:'Haiti',   hf:'HT',    at:'Escócia',  af:'GB-SCT',date:'2026-06-13',time:'22:00'},
    {n:15,phase:'Grupos',g:'C',ht:'Brasil',  hf:'BR',    at:'Haiti',    af:'HT',    date:'2026-06-19',time:'22:00'},
    {n:16,phase:'Grupos',g:'C',ht:'Escócia', hf:'GB-SCT',at:'Marrocos', af:'MA',    date:'2026-06-19',time:'19:00'},
    {n:17,phase:'Grupos',g:'C',ht:'Escócia', hf:'GB-SCT',at:'Brasil',   af:'BR',    date:'2026-06-24',time:'19:00'},
    {n:18,phase:'Grupos',g:'C',ht:'Marrocos',hf:'MA',    at:'Haiti',    af:'HT',    date:'2026-06-24',time:'19:00'},

    // ── GRUPO D: Estados Unidos, Paraguai, Austrália, Turquia ──
    {n:19,phase:'Grupos',g:'D',ht:'Estados Unidos',hf:'US',at:'Paraguai', af:'PY',date:'2026-06-12',time:'22:00'},
    {n:20,phase:'Grupos',g:'D',ht:'Austrália',     hf:'AU',at:'Turquia',  af:'TR',date:'2026-06-13',time:'01:00'},
    {n:21,phase:'Grupos',g:'D',ht:'Estados Unidos',hf:'US',at:'Austrália',af:'AU',date:'2026-06-19',time:'16:00'},
    {n:22,phase:'Grupos',g:'D',ht:'Turquia',       hf:'TR',at:'Paraguai', af:'PY',date:'2026-06-19',time:'01:00'},
    {n:23,phase:'Grupos',g:'D',ht:'Turquia',       hf:'TR',at:'Estados Unidos',af:'US',date:'2026-06-25',time:'23:00'},
    {n:24,phase:'Grupos',g:'D',ht:'Paraguai',      hf:'PY',at:'Austrália',af:'AU',date:'2026-06-25',time:'23:00'},

    // ── GRUPO E: Alemanha, Curaçao, Costa do Marfim, Equador ──
    {n:25,phase:'Grupos',g:'E',ht:'Alemanha',       hf:'DE',at:'Curaçao',        af:'CW',date:'2026-06-14',time:'14:00'},
    {n:26,phase:'Grupos',g:'E',ht:'Costa do Marfim',hf:'CI',at:'Equador',        af:'EC',date:'2026-06-14',time:'20:00'},
    {n:27,phase:'Grupos',g:'E',ht:'Alemanha',       hf:'DE',at:'Costa do Marfim',af:'CI',date:'2026-06-20',time:'17:00'},
    {n:28,phase:'Grupos',g:'E',ht:'Equador',        hf:'EC',at:'Curaçao',        af:'CW',date:'2026-06-21',time:'21:00'},
    {n:29,phase:'Grupos',g:'E',ht:'Equador',        hf:'EC',at:'Alemanha',       af:'DE',date:'2026-06-25',time:'17:00'},
    {n:30,phase:'Grupos',g:'E',ht:'Curaçao',        hf:'CW',at:'Costa do Marfim',af:'CI',date:'2026-06-25',time:'17:00'},

    // ── GRUPO F: Países Baixos, Japão, Suécia, Tunísia ──
    {n:31,phase:'Grupos',g:'F',ht:'Países Baixos',hf:'NL',at:'Japão',        af:'JP',date:'2026-06-14',time:'17:00'},
    {n:32,phase:'Grupos',g:'F',ht:'Tunísia',      hf:'TN',at:'Suécia',       af:'SE',date:'2026-06-14',time:'23:00'},
    {n:33,phase:'Grupos',g:'F',ht:'Países Baixos',hf:'NL',at:'Suécia',       af:'SE',date:'2026-06-20',time:'20:00'},
    {n:34,phase:'Grupos',g:'F',ht:'Japão',        hf:'JP',at:'Tunísia',      af:'TN',date:'2026-06-21',time:'01:00'},
    {n:35,phase:'Grupos',g:'F',ht:'Japão',        hf:'JP',at:'Suécia',       af:'SE',date:'2026-06-25',time:'20:00'},
    {n:36,phase:'Grupos',g:'F',ht:'Tunísia',      hf:'TN',at:'Países Baixos',af:'NL',date:'2026-06-25',time:'20:00'},

    // ── GRUPO G: Bélgica, Egito, Irã, Nova Zelândia ──
    {n:37,phase:'Grupos',g:'G',ht:'Bélgica',      hf:'BE',at:'Egito',        af:'EG',date:'2026-06-15',time:'16:00'},
    {n:38,phase:'Grupos',g:'G',ht:'Irã',          hf:'IR',at:'Nova Zelândia',af:'NZ',date:'2026-06-15',time:'22:00'},
    {n:39,phase:'Grupos',g:'G',ht:'Bélgica',      hf:'BE',at:'Irã',          af:'IR',date:'2026-06-21',time:'16:00'},
    {n:40,phase:'Grupos',g:'G',ht:'Nova Zelândia',hf:'NZ',at:'Egito',        af:'EG',date:'2026-06-21',time:'22:00'},
    {n:41,phase:'Grupos',g:'G',ht:'Nova Zelândia',hf:'NZ',at:'Bélgica',      af:'BE',date:'2026-06-27',time:'00:00'},
    {n:42,phase:'Grupos',g:'G',ht:'Egito',        hf:'EG',at:'Irã',          af:'IR',date:'2026-06-27',time:'00:00'},

    // ── GRUPO H: Espanha, Uruguai, Arábia Saudita, Cabo Verde ──
    {n:43,phase:'Grupos',g:'H',ht:'Espanha',       hf:'ES',at:'Uruguai',        af:'UY',date:'2026-06-15',time:'19:00'},
    {n:44,phase:'Grupos',g:'H',ht:'Arábia Saudita',hf:'SA',at:'Cabo Verde',     af:'CV',date:'2026-06-15',time:'13:00'},
    {n:45,phase:'Grupos',g:'H',ht:'Espanha',       hf:'ES',at:'Arábia Saudita', af:'SA',date:'2026-06-21',time:'13:00'},
    {n:46,phase:'Grupos',g:'H',ht:'Uruguai',       hf:'UY',at:'Cabo Verde',     af:'CV',date:'2026-06-21',time:'19:00'},
    {n:47,phase:'Grupos',g:'H',ht:'Cabo Verde',    hf:'CV',at:'Arábia Saudita', af:'SA',date:'2026-06-26',time:'21:00'},
    {n:48,phase:'Grupos',g:'H',ht:'Uruguai',       hf:'UY',at:'Espanha',        af:'ES',date:'2026-06-26',time:'21:00'},

    // ── GRUPO I: França, Senegal, Noruega, Iraque ──
    {n:49,phase:'Grupos',g:'I',ht:'França',  hf:'FR',at:'Senegal',af:'SN',date:'2026-06-16',time:'16:00'},
    {n:50,phase:'Grupos',g:'I',ht:'Iraque',  hf:'IQ',at:'Noruega',af:'NO',date:'2026-06-19',time:'19:00'},
    {n:51,phase:'Grupos',g:'I',ht:'França',  hf:'FR',at:'Iraque', af:'IQ',date:'2026-06-22',time:'18:00'},
    {n:52,phase:'Grupos',g:'I',ht:'Noruega', hf:'NO',at:'Senegal',af:'SN',date:'2026-06-22',time:'21:00'},
    {n:53,phase:'Grupos',g:'I',ht:'Noruega', hf:'NO',at:'França', af:'FR',date:'2026-06-26',time:'16:00'},
    {n:54,phase:'Grupos',g:'I',ht:'Senegal', hf:'SN',at:'Iraque', af:'IQ',date:'2026-06-26',time:'16:00'},

    // ── GRUPO J: Argentina, Argélia, Áustria, Jordânia ──
    {n:55,phase:'Grupos',g:'J',ht:'Argentina',hf:'AR',at:'Áustria', af:'AT',date:'2026-06-16',time:'14:00'},
    {n:56,phase:'Grupos',g:'J',ht:'Jordânia', hf:'JO',at:'Argélia', af:'DZ',date:'2026-06-16',time:'00:00'},
    {n:57,phase:'Grupos',g:'J',ht:'Argentina',hf:'AR',at:'Argélia', af:'DZ',date:'2026-06-22',time:'14:00'},
    {n:58,phase:'Grupos',g:'J',ht:'Áustria',  hf:'AT',at:'Jordânia',af:'JO',date:'2026-06-22',time:'17:00'},
    {n:59,phase:'Grupos',g:'J',ht:'Jordânia', hf:'JO',at:'Argentina',af:'AR',date:'2026-06-27',time:'23:00'},
    {n:60,phase:'Grupos',g:'J',ht:'Argélia',  hf:'DZ',at:'Áustria', af:'AT',date:'2026-06-27',time:'23:00'},

    // ── GRUPO K: Portugal, Colômbia, Uzbequistão, RD Congo ──
    {n:61,phase:'Grupos',g:'K',ht:'Portugal',    hf:'PT',at:'RD Congo',    af:'CD',date:'2026-06-17',time:'14:00'},
    {n:62,phase:'Grupos',g:'K',ht:'Uzbequistão', hf:'UZ',at:'Colômbia',   af:'CO',date:'2026-06-17',time:'23:00'},
    {n:63,phase:'Grupos',g:'K',ht:'Portugal',    hf:'PT',at:'Uzbequistão', af:'UZ',date:'2026-06-23',time:'14:00'},
    {n:64,phase:'Grupos',g:'K',ht:'Colômbia',    hf:'CO',at:'RD Congo',    af:'CD',date:'2026-06-23',time:'23:00'},
    {n:65,phase:'Grupos',g:'K',ht:'Colômbia',    hf:'CO',at:'Portugal',    af:'PT',date:'2026-06-27',time:'20:30'},
    {n:66,phase:'Grupos',g:'K',ht:'RD Congo',    hf:'CD',at:'Uzbequistão', af:'UZ',date:'2026-06-27',time:'20:30'},

    // ── GRUPO L: Inglaterra, Croácia, Gana, Panamá ──
    {n:67,phase:'Grupos',g:'L',ht:'Inglaterra',hf:'GB-ENG',at:'Croácia',   af:'HR',    date:'2026-06-17',time:'17:00'},
    {n:68,phase:'Grupos',g:'L',ht:'Gana',      hf:'GH',    at:'Panamá',    af:'PA',    date:'2026-06-17',time:'20:00'},
    {n:69,phase:'Grupos',g:'L',ht:'Inglaterra',hf:'GB-ENG',at:'Gana',      af:'GH',    date:'2026-06-23',time:'17:00'},
    {n:70,phase:'Grupos',g:'L',ht:'Panamá',    hf:'PA',    at:'Croácia',   af:'HR',    date:'2026-06-23',time:'20:00'},
    {n:71,phase:'Grupos',g:'L',ht:'Panamá',    hf:'PA',    at:'Inglaterra',af:'GB-ENG',date:'2026-06-27',time:'18:00'},
    {n:72,phase:'Grupos',g:'L',ht:'Croácia',   hf:'HR',    at:'Gana',      af:'GH',    date:'2026-06-27',time:'18:00'},

    // ── RODADA DE 32 (Pré-Oitavas): 29 jun – 6 jul ──
    {n:73, phase:'Pre-Oitavas',g:null,ht:'A definir',hf:'',at:'A definir',af:'',date:'2026-06-29',time:'16:00'},
    {n:74, phase:'Pre-Oitavas',g:null,ht:'A definir',hf:'',at:'A definir',af:'',date:'2026-06-29',time:'20:00'},
    {n:75, phase:'Pre-Oitavas',g:null,ht:'A definir',hf:'',at:'A definir',af:'',date:'2026-06-30',time:'16:00'},
    {n:76, phase:'Pre-Oitavas',g:null,ht:'A definir',hf:'',at:'A definir',af:'',date:'2026-06-30',time:'20:00'},
    {n:77, phase:'Pre-Oitavas',g:null,ht:'A definir',hf:'',at:'A definir',af:'',date:'2026-07-01',time:'16:00'},
    {n:78, phase:'Pre-Oitavas',g:null,ht:'A definir',hf:'',at:'A definir',af:'',date:'2026-07-01',time:'20:00'},
    {n:79, phase:'Pre-Oitavas',g:null,ht:'A definir',hf:'',at:'A definir',af:'',date:'2026-07-02',time:'16:00'},
    {n:80, phase:'Pre-Oitavas',g:null,ht:'A definir',hf:'',at:'A definir',af:'',date:'2026-07-02',time:'20:00'},
    {n:81, phase:'Pre-Oitavas',g:null,ht:'A definir',hf:'',at:'A definir',af:'',date:'2026-07-03',time:'16:00'},
    {n:82, phase:'Pre-Oitavas',g:null,ht:'A definir',hf:'',at:'A definir',af:'',date:'2026-07-03',time:'20:00'},
    {n:83, phase:'Pre-Oitavas',g:null,ht:'A definir',hf:'',at:'A definir',af:'',date:'2026-07-04',time:'16:00'},
    {n:84, phase:'Pre-Oitavas',g:null,ht:'A definir',hf:'',at:'A definir',af:'',date:'2026-07-04',time:'20:00'},
    {n:85, phase:'Pre-Oitavas',g:null,ht:'A definir',hf:'',at:'A definir',af:'',date:'2026-07-05',time:'16:00'},
    {n:86, phase:'Pre-Oitavas',g:null,ht:'A definir',hf:'',at:'A definir',af:'',date:'2026-07-05',time:'20:00'},
    {n:87, phase:'Pre-Oitavas',g:null,ht:'A definir',hf:'',at:'A definir',af:'',date:'2026-07-06',time:'16:00'},
    {n:88, phase:'Pre-Oitavas',g:null,ht:'A definir',hf:'',at:'A definir',af:'',date:'2026-07-06',time:'20:00'},

    // ── OITAVAS: 8–11 jul ──
    {n:89, phase:'Oitavas',g:null,ht:'A definir',hf:'',at:'A definir',af:'',date:'2026-07-08',time:'17:00'},
    {n:90, phase:'Oitavas',g:null,ht:'A definir',hf:'',at:'A definir',af:'',date:'2026-07-08',time:'20:00'},
    {n:91, phase:'Oitavas',g:null,ht:'A definir',hf:'',at:'A definir',af:'',date:'2026-07-09',time:'17:00'},
    {n:92, phase:'Oitavas',g:null,ht:'A definir',hf:'',at:'A definir',af:'',date:'2026-07-09',time:'20:00'},
    {n:93, phase:'Oitavas',g:null,ht:'A definir',hf:'',at:'A definir',af:'',date:'2026-07-10',time:'17:00'},
    {n:94, phase:'Oitavas',g:null,ht:'A definir',hf:'',at:'A definir',af:'',date:'2026-07-10',time:'20:00'},
    {n:95, phase:'Oitavas',g:null,ht:'A definir',hf:'',at:'A definir',af:'',date:'2026-07-11',time:'17:00'},
    {n:96, phase:'Oitavas',g:null,ht:'A definir',hf:'',at:'A definir',af:'',date:'2026-07-11',time:'20:00'},

    // ── QUARTAS: 14–15 jul ──
    {n:97, phase:'Quartas',g:null,ht:'A definir',hf:'',at:'A definir',af:'',date:'2026-07-14',time:'16:00'},
    {n:98, phase:'Quartas',g:null,ht:'A definir',hf:'',at:'A definir',af:'',date:'2026-07-14',time:'20:00'},
    {n:99, phase:'Quartas',g:null,ht:'A definir',hf:'',at:'A definir',af:'',date:'2026-07-15',time:'16:00'},
    {n:100,phase:'Quartas',g:null,ht:'A definir',hf:'',at:'A definir',af:'',date:'2026-07-15',time:'20:00'},

    // ── SEMIFINAIS: 18–19 jul ──
    {n:101,phase:'Semi',g:null,ht:'A definir',hf:'',at:'A definir',af:'',date:'2026-07-18',time:'16:00'},
    {n:102,phase:'Semi',g:null,ht:'A definir',hf:'',at:'A definir',af:'',date:'2026-07-19',time:'16:00'},

    // ── 3º LUGAR: 18 jul ──
    {n:103,phase:'Terceiro Lugar',g:null,ht:'A definir',hf:'',at:'A definir',af:'',date:'2026-07-18',time:'17:00'},

    // ── FINAL: 19 jul (MetLife, Nova Jersey) ──
    {n:104,phase:'Final',g:null,ht:'A definir',hf:'',at:'A definir',af:'',date:'2026-07-19',time:'16:00'},
  ];

  const stmts = games.map(g => ({
    sql: `INSERT INTO games (match_number, phase, group_name, home_team, home_flag, away_team, away_flag, match_date, match_time)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [g.n, g.phase, g.g ?? null, g.ht, g.hf, g.at, g.af, g.date, g.time],
  }));
  await db.batch(stmts, 'write');
}

module.exports = { db, initializeDatabase, all, get, run };
