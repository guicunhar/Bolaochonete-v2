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
      password_hash TEXT,
      is_admin INTEGER DEFAULT 0,
      is_precadastro INTEGER DEFAULT 1,
      avatar_path TEXT,
      champion_pick TEXT,
      best_player_pick TEXT,
      top_scorer_pick TEXT,
      bonus_locked INTEGER DEFAULT 0,
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
      home_score INTEGER,
      away_score INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS bets (
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
    );
  `);

  // Create admin
  const admin = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!admin) {
    const hash = bcrypt.hashSync('admin2026', 10);
    db.prepare(`INSERT INTO users (name, username, password_hash, is_admin, is_precadastro, bonus_locked) VALUES (?, ?, ?, 1, 0, 1)`)
      .run('Administrador', 'admin', hash);
    console.log('Admin: admin / admin2026');
  }

  const gameCount = db.prepare('SELECT COUNT(*) as c FROM games').get();
  if (gameCount.c === 0) {
    seedGames();
    console.log('Jogos criados!');
  }
}

function seedGames() {
  const ins = db.prepare(`
    INSERT INTO games (match_number, phase, group_name, home_team, home_flag, away_team, away_flag, match_date, match_time)
    VALUES (@n, @phase, @g, @ht, @hf, @at, @af, @date, @time)
  `);

  const games = [
    // GRUPOS
    {n:1,phase:'Grupos',g:'A',ht:'Mexico',hf:'MX',at:'Estados Unidos',af:'US',date:'2026-06-11',time:'22:00'},
    {n:2,phase:'Grupos',g:'A',ht:'Canada',hf:'CA',at:'Arabia Saudita',af:'SA',date:'2026-06-12',time:'16:00'},
    {n:3,phase:'Grupos',g:'A',ht:'Mexico',hf:'MX',at:'Canada',af:'CA',date:'2026-06-16',time:'22:00'},
    {n:4,phase:'Grupos',g:'A',ht:'Estados Unidos',hf:'US',at:'Arabia Saudita',af:'SA',date:'2026-06-16',time:'16:00'},
    {n:5,phase:'Grupos',g:'A',ht:'Estados Unidos',hf:'US',at:'Canada',af:'CA',date:'2026-06-20',time:'22:00'},
    {n:6,phase:'Grupos',g:'A',ht:'Arabia Saudita',hf:'SA',at:'Mexico',af:'MX',date:'2026-06-20',time:'22:00'},

    {n:7,phase:'Grupos',g:'B',ht:'Argentina',hf:'AR',at:'Peru',af:'PE',date:'2026-06-13',time:'16:00'},
    {n:8,phase:'Grupos',g:'B',ht:'Chile',hf:'CL',at:'Australia',af:'AU',date:'2026-06-13',time:'19:00'},
    {n:9,phase:'Grupos',g:'B',ht:'Argentina',hf:'AR',at:'Chile',af:'CL',date:'2026-06-17',time:'22:00'},
    {n:10,phase:'Grupos',g:'B',ht:'Peru',hf:'PE',at:'Australia',af:'AU',date:'2026-06-17',time:'16:00'},
    {n:11,phase:'Grupos',g:'B',ht:'Argentina',hf:'AR',at:'Australia',af:'AU',date:'2026-06-21',time:'22:00'},
    {n:12,phase:'Grupos',g:'B',ht:'Australia',hf:'AU',at:'Chile',af:'CL',date:'2026-06-21',time:'22:00'},

    {n:13,phase:'Grupos',g:'C',ht:'Brasil',hf:'BR',at:'Alemanha',af:'DE',date:'2026-06-14',time:'16:00'},
    {n:14,phase:'Grupos',g:'C',ht:'Japao',hf:'JP',at:'Nigeria',af:'NG',date:'2026-06-14',time:'19:00'},
    {n:15,phase:'Grupos',g:'C',ht:'Brasil',hf:'BR',at:'Japao',af:'JP',date:'2026-06-18',time:'22:00'},
    {n:16,phase:'Grupos',g:'C',ht:'Alemanha',hf:'DE',at:'Nigeria',af:'NG',date:'2026-06-18',time:'16:00'},
    {n:17,phase:'Grupos',g:'C',ht:'Brasil',hf:'BR',at:'Nigeria',af:'NG',date:'2026-06-22',time:'22:00'},
    {n:18,phase:'Grupos',g:'C',ht:'Nigeria',hf:'NG',at:'Alemanha',af:'DE',date:'2026-06-22',time:'22:00'},

    {n:19,phase:'Grupos',g:'D',ht:'Franca',hf:'FR',at:'Equador',af:'EC',date:'2026-06-15',time:'22:00'},
    {n:20,phase:'Grupos',g:'D',ht:'Senegal',hf:'SN',at:'Venezuela',af:'VE',date:'2026-06-15',time:'16:00'},
    {n:21,phase:'Grupos',g:'D',ht:'Franca',hf:'FR',at:'Senegal',af:'SN',date:'2026-06-19',time:'22:00'},
    {n:22,phase:'Grupos',g:'D',ht:'Equador',hf:'EC',at:'Venezuela',af:'VE',date:'2026-06-19',time:'16:00'},
    {n:23,phase:'Grupos',g:'D',ht:'Franca',hf:'FR',at:'Venezuela',af:'VE',date:'2026-06-23',time:'22:00'},
    {n:24,phase:'Grupos',g:'D',ht:'Venezuela',hf:'VE',at:'Equador',af:'EC',date:'2026-06-23',time:'22:00'},

    {n:25,phase:'Grupos',g:'E',ht:'Espanha',hf:'ES',at:'Egito',af:'EG',date:'2026-06-12',time:'13:00'},
    {n:26,phase:'Grupos',g:'E',ht:'Nova Zelandia',hf:'NZ',at:'Bielorrussia',af:'BY',date:'2026-06-12',time:'19:00'},
    {n:27,phase:'Grupos',g:'E',ht:'Espanha',hf:'ES',at:'Nova Zelandia',af:'NZ',date:'2026-06-16',time:'13:00'},
    {n:28,phase:'Grupos',g:'E',ht:'Egito',hf:'EG',at:'Bielorrussia',af:'BY',date:'2026-06-16',time:'19:00'},
    {n:29,phase:'Grupos',g:'E',ht:'Espanha',hf:'ES',at:'Bielorrussia',af:'BY',date:'2026-06-20',time:'13:00'},
    {n:30,phase:'Grupos',g:'E',ht:'Bielorrussia',hf:'BY',at:'Nova Zelandia',af:'NZ',date:'2026-06-20',time:'13:00'},

    {n:31,phase:'Grupos',g:'F',ht:'Portugal',hf:'PT',at:'Costa Rica',af:'CR',date:'2026-06-13',time:'13:00'},
    {n:32,phase:'Grupos',g:'F',ht:'Marrocos',hf:'MA',at:'Tanzania',af:'TZ',date:'2026-06-13',time:'22:00'},
    {n:33,phase:'Grupos',g:'F',ht:'Portugal',hf:'PT',at:'Marrocos',af:'MA',date:'2026-06-17',time:'13:00'},
    {n:34,phase:'Grupos',g:'F',ht:'Costa Rica',hf:'CR',at:'Tanzania',af:'TZ',date:'2026-06-17',time:'19:00'},
    {n:35,phase:'Grupos',g:'F',ht:'Portugal',hf:'PT',at:'Tanzania',af:'TZ',date:'2026-06-21',time:'13:00'},
    {n:36,phase:'Grupos',g:'F',ht:'Tanzania',hf:'TZ',at:'Costa Rica',af:'CR',date:'2026-06-21',time:'13:00'},

    {n:37,phase:'Grupos',g:'G',ht:'Italia',hf:'IT',at:'Honduras',af:'HN',date:'2026-06-14',time:'13:00'},
    {n:38,phase:'Grupos',g:'G',ht:'Colombia',hf:'CO',at:'Rep. Tcheca',af:'CZ',date:'2026-06-14',time:'22:00'},
    {n:39,phase:'Grupos',g:'G',ht:'Italia',hf:'IT',at:'Colombia',af:'CO',date:'2026-06-18',time:'13:00'},
    {n:40,phase:'Grupos',g:'G',ht:'Honduras',hf:'HN',at:'Rep. Tcheca',af:'CZ',date:'2026-06-18',time:'19:00'},
    {n:41,phase:'Grupos',g:'G',ht:'Italia',hf:'IT',at:'Rep. Tcheca',af:'CZ',date:'2026-06-22',time:'13:00'},
    {n:42,phase:'Grupos',g:'G',ht:'Rep. Tcheca',hf:'CZ',at:'Colombia',af:'CO',date:'2026-06-22',time:'13:00'},

    {n:43,phase:'Grupos',g:'H',ht:'Paises Baixos',hf:'NL',at:'Quirguistao',af:'KG',date:'2026-06-15',time:'13:00'},
    {n:44,phase:'Grupos',g:'H',ht:'Suica',hf:'CH',at:'Camaroes',af:'CM',date:'2026-06-15',time:'19:00'},
    {n:45,phase:'Grupos',g:'H',ht:'Paises Baixos',hf:'NL',at:'Suica',af:'CH',date:'2026-06-19',time:'13:00'},
    {n:46,phase:'Grupos',g:'H',ht:'Quirguistao',hf:'KG',at:'Camaroes',af:'CM',date:'2026-06-19',time:'19:00'},
    {n:47,phase:'Grupos',g:'H',ht:'Paises Baixos',hf:'NL',at:'Camaroes',af:'CM',date:'2026-06-23',time:'13:00'},
    {n:48,phase:'Grupos',g:'H',ht:'Camaroes',hf:'CM',at:'Suica',af:'CH',date:'2026-06-23',time:'13:00'},

    {n:49,phase:'Grupos',g:'I',ht:'Croacia',hf:'HR',at:'Tailandia',af:'TH',date:'2026-06-12',time:'22:00'},
    {n:50,phase:'Grupos',g:'I',ht:'Belgica',hf:'BE',at:'Eslovaquia',af:'SK',date:'2026-06-12',time:'13:00'},
    {n:51,phase:'Grupos',g:'I',ht:'Croacia',hf:'HR',at:'Belgica',af:'BE',date:'2026-06-16',time:'22:00'},
    {n:52,phase:'Grupos',g:'I',ht:'Tailandia',hf:'TH',at:'Eslovaquia',af:'SK',date:'2026-06-16',time:'13:00'},
    {n:53,phase:'Grupos',g:'I',ht:'Croacia',hf:'HR',at:'Eslovaquia',af:'SK',date:'2026-06-20',time:'22:00'},
    {n:54,phase:'Grupos',g:'I',ht:'Eslovaquia',hf:'SK',at:'Tailandia',af:'TH',date:'2026-06-20',time:'22:00'},

    {n:55,phase:'Grupos',g:'J',ht:'Uruguai',hf:'UY',at:'Coreia do Sul',af:'KR',date:'2026-06-13',time:'22:00'},
    {n:56,phase:'Grupos',g:'J',ht:'Polonia',hf:'PL',at:'Afeganistao',af:'AF',date:'2026-06-13',time:'16:00'},
    {n:57,phase:'Grupos',g:'J',ht:'Uruguai',hf:'UY',at:'Polonia',af:'PL',date:'2026-06-17',time:'22:00'},
    {n:58,phase:'Grupos',g:'J',ht:'Coreia do Sul',hf:'KR',at:'Afeganistao',af:'AF',date:'2026-06-17',time:'16:00'},
    {n:59,phase:'Grupos',g:'J',ht:'Uruguai',hf:'UY',at:'Afeganistao',af:'AF',date:'2026-06-21',time:'22:00'},
    {n:60,phase:'Grupos',g:'J',ht:'Afeganistao',hf:'AF',at:'Coreia do Sul',af:'KR',date:'2026-06-21',time:'22:00'},

    {n:61,phase:'Grupos',g:'K',ht:'Inglaterra',hf:'GB-ENG',at:'Tunisia',af:'TN',date:'2026-06-14',time:'22:00'},
    {n:62,phase:'Grupos',g:'K',ht:'Panama',hf:'PA',at:'Georgia',af:'GE',date:'2026-06-14',time:'16:00'},
    {n:63,phase:'Grupos',g:'K',ht:'Inglaterra',hf:'GB-ENG',at:'Panama',af:'PA',date:'2026-06-18',time:'22:00'},
    {n:64,phase:'Grupos',g:'K',ht:'Tunisia',hf:'TN',at:'Georgia',af:'GE',date:'2026-06-18',time:'16:00'},
    {n:65,phase:'Grupos',g:'K',ht:'Inglaterra',hf:'GB-ENG',at:'Georgia',af:'GE',date:'2026-06-22',time:'22:00'},
    {n:66,phase:'Grupos',g:'K',ht:'Georgia',hf:'GE',at:'Panama',af:'PA',date:'2026-06-22',time:'22:00'},

    {n:67,phase:'Grupos',g:'L',ht:'Ira',hf:'IR',at:'Venezuela',af:'VE',date:'2026-06-15',time:'22:00'},
    {n:68,phase:'Grupos',g:'L',ht:'Turquia',hf:'TR',at:'China',af:'CN',date:'2026-06-15',time:'16:00'},
    {n:69,phase:'Grupos',g:'L',ht:'Ira',hf:'IR',at:'Turquia',af:'TR',date:'2026-06-19',time:'22:00'},
    {n:70,phase:'Grupos',g:'L',ht:'Venezuela',hf:'VE',at:'China',af:'CN',date:'2026-06-19',time:'16:00'},
    {n:71,phase:'Grupos',g:'L',ht:'Ira',hf:'IR',at:'China',af:'CN',date:'2026-06-23',time:'22:00'},
    {n:72,phase:'Grupos',g:'L',ht:'China',hf:'CN',at:'Venezuela',af:'VE',date:'2026-06-23',time:'22:00'},

    // PRE-OITAVAS (32 -> 16)
    {n:73,phase:'Pre-Oitavas',g:null,ht:'A definir',hf:'',at:'A definir',af:'',date:'2026-06-28',time:'16:00'},
    {n:74,phase:'Pre-Oitavas',g:null,ht:'A definir',hf:'',at:'A definir',af:'',date:'2026-06-28',time:'20:00'},
    {n:75,phase:'Pre-Oitavas',g:null,ht:'A definir',hf:'',at:'A definir',af:'',date:'2026-06-29',time:'16:00'},
    {n:76,phase:'Pre-Oitavas',g:null,ht:'A definir',hf:'',at:'A definir',af:'',date:'2026-06-29',time:'20:00'},
    {n:77,phase:'Pre-Oitavas',g:null,ht:'A definir',hf:'',at:'A definir',af:'',date:'2026-06-30',time:'16:00'},
    {n:78,phase:'Pre-Oitavas',g:null,ht:'A definir',hf:'',at:'A definir',af:'',date:'2026-06-30',time:'20:00'},
    {n:79,phase:'Pre-Oitavas',g:null,ht:'A definir',hf:'',at:'A definir',af:'',date:'2026-07-01',time:'16:00'},
    {n:80,phase:'Pre-Oitavas',g:null,ht:'A definir',hf:'',at:'A definir',af:'',date:'2026-07-01',time:'20:00'},
    {n:81,phase:'Pre-Oitavas',g:null,ht:'A definir',hf:'',at:'A definir',af:'',date:'2026-07-02',time:'16:00'},
    {n:82,phase:'Pre-Oitavas',g:null,ht:'A definir',hf:'',at:'A definir',af:'',date:'2026-07-02',time:'20:00'},
    {n:83,phase:'Pre-Oitavas',g:null,ht:'A definir',hf:'',at:'A definir',af:'',date:'2026-07-03',time:'16:00'},
    {n:84,phase:'Pre-Oitavas',g:null,ht:'A definir',hf:'',at:'A definir',af:'',date:'2026-07-03',time:'20:00'},
    {n:85,phase:'Pre-Oitavas',g:null,ht:'A definir',hf:'',at:'A definir',af:'',date:'2026-07-04',time:'16:00'},
    {n:86,phase:'Pre-Oitavas',g:null,ht:'A definir',hf:'',at:'A definir',af:'',date:'2026-07-04',time:'20:00'},
    {n:87,phase:'Pre-Oitavas',g:null,ht:'A definir',hf:'',at:'A definir',af:'',date:'2026-07-05',time:'16:00'},
    {n:88,phase:'Pre-Oitavas',g:null,ht:'A definir',hf:'',at:'A definir',af:'',date:'2026-07-05',time:'20:00'},

    // OITAVAS (16 -> 8)
    {n:89,phase:'Oitavas',g:null,ht:'A definir',hf:'',at:'A definir',af:'',date:'2026-07-08',time:'16:00'},
    {n:90,phase:'Oitavas',g:null,ht:'A definir',hf:'',at:'A definir',af:'',date:'2026-07-08',time:'20:00'},
    {n:91,phase:'Oitavas',g:null,ht:'A definir',hf:'',at:'A definir',af:'',date:'2026-07-09',time:'16:00'},
    {n:92,phase:'Oitavas',g:null,ht:'A definir',hf:'',at:'A definir',af:'',date:'2026-07-09',time:'20:00'},
    {n:93,phase:'Oitavas',g:null,ht:'A definir',hf:'',at:'A definir',af:'',date:'2026-07-10',time:'16:00'},
    {n:94,phase:'Oitavas',g:null,ht:'A definir',hf:'',at:'A definir',af:'',date:'2026-07-10',time:'20:00'},
    {n:95,phase:'Oitavas',g:null,ht:'A definir',hf:'',at:'A definir',af:'',date:'2026-07-11',time:'16:00'},
    {n:96,phase:'Oitavas',g:null,ht:'A definir',hf:'',at:'A definir',af:'',date:'2026-07-11',time:'20:00'},

    // QUARTAS
    {n:97,phase:'Quartas',g:null,ht:'A definir',hf:'',at:'A definir',af:'',date:'2026-07-14',time:'16:00'},
    {n:98,phase:'Quartas',g:null,ht:'A definir',hf:'',at:'A definir',af:'',date:'2026-07-14',time:'20:00'},
    {n:99,phase:'Quartas',g:null,ht:'A definir',hf:'',at:'A definir',af:'',date:'2026-07-15',time:'16:00'},
    {n:100,phase:'Quartas',g:null,ht:'A definir',hf:'',at:'A definir',af:'',date:'2026-07-15',time:'20:00'},

    // SEMI
    {n:101,phase:'Semi',g:null,ht:'A definir',hf:'',at:'A definir',af:'',date:'2026-07-18',time:'20:00'},
    {n:102,phase:'Semi',g:null,ht:'A definir',hf:'',at:'A definir',af:'',date:'2026-07-19',time:'20:00'},

    // 3o LUGAR
    {n:103,phase:'Terceiro Lugar',g:null,ht:'A definir',hf:'',at:'A definir',af:'',date:'2026-07-22',time:'16:00'},

    // FINAL
    {n:104,phase:'Final',g:null,ht:'A definir',hf:'',at:'A definir',af:'',date:'2026-07-22',time:'20:00'},
  ];

  const tx = db.transaction(list => {
    for (const g of list) ins.run({n:g.n,phase:g.phase,g:g.g,ht:g.ht,hf:g.hf,at:g.at,af:g.af,date:g.date,time:g.time});
  });
  tx(games);
}

module.exports = { db, initializeDatabase };
