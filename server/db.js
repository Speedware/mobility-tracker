const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { DATA_DIR } = require('./config');

fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new DatabaseSync(path.join(DATA_DIR, 'mobility.db'));

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    photo TEXT,
    blocked INTEGER NOT NULL DEFAULT 0,
    rating INTEGER,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ'))
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS bikes (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    speed INTEGER NOT NULL,
    battery TEXT NOT NULL,
    rate INTEGER NOT NULL,
    image TEXT NOT NULL,
    sort INTEGER NOT NULL DEFAULT 0,
    availability TEXT NOT NULL DEFAULT 'available'
  );
  CREATE TABLE IF NOT EXISTS rentals (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    bike_id INTEGER NOT NULL REFERENCES bikes(id),
    rate INTEGER NOT NULL,
    started_at TEXT NOT NULL,
    ended_at TEXT,
    orders INTEGER,
    total INTEGER,
    pay_status TEXT NOT NULL DEFAULT 'pending',
    closed_by_block INTEGER NOT NULL DEFAULT 0
  );
  CREATE UNIQUE INDEX IF NOT EXISTS one_active_per_bike ON rentals(bike_id) WHERE ended_at IS NULL;
  CREATE UNIQUE INDEX IF NOT EXISTS one_active_per_user ON rentals(user_id) WHERE ended_at IS NULL;
  CREATE TABLE IF NOT EXISTS repairs (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    bike_id INTEGER NOT NULL REFERENCES bikes(id),
    parts TEXT NOT NULL,
    comment TEXT,
    created_at TEXT NOT NULL,
    resolved_at TEXT
  );
  CREATE TABLE IF NOT EXISTS courier_bikes (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bike_id INTEGER NOT NULL REFERENCES bikes(id) ON DELETE CASCADE,
    rate INTEGER,
    hidden INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, bike_id)
  );
  CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
`);

const hasColumn = (table, column) => db.prepare(`PRAGMA table_info(${table})`).all().some(c => c.name === column);
const addColumn = (table, column, def) => {
  if (hasColumn(table, column)) return false;
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${def}`);
  return true;
};
addColumn('users', 'blocked', 'INTEGER NOT NULL DEFAULT 0');
addColumn('users', 'rating', 'INTEGER');
addColumn('rentals', 'closed_by_block', 'INTEGER NOT NULL DEFAULT 0');
addColumn('bikes', 'availability', "TEXT NOT NULL DEFAULT 'available'");
if (addColumn('rentals', 'pay_status', "TEXT NOT NULL DEFAULT 'pending'") && hasColumn('rentals', 'paid')) {
  db.exec("UPDATE rentals SET pay_status = 'paid' WHERE paid = 1");
}

if (db.prepare('SELECT COUNT(*) AS n FROM bikes').get().n === 0) {
  const seed = [
    ['Smart', 40, '30ah', 27, 'smart.png'],
    ['King', 40, '30ah', 26, 'king.png'],
    ['Locomotive', 45, '20ah', 24, 'locomotive.png'],
    ['Uno', 40, '20ah', 23, 'uno.png'],
    ['Legend', 50, '20ah', 22, 'legend.png'],
  ];
  const ins = db.prepare('INSERT INTO bikes (name, speed, battery, rate, image, sort) VALUES (?, ?, ?, ?, ?, ?)');
  seed.forEach((b, i) => ins.run(...b, i));
}

const getSetting = (key, def) => db.prepare('SELECT value FROM settings WHERE key = ?').get(key)?.value ?? def;
const setSetting = (key, value) => db.prepare(
  'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, String(value));
const registrationOpen = () => getSetting('registration_open', '1') === '1';
const setRegistrationOpen = open => setSetting('registration_open', open ? '1' : '0');

const now = () => new Date().toISOString();

module.exports = { db, now, registrationOpen, setRegistrationOpen };
