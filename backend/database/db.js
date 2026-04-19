// backend/database/db.js
// ---------------------------------------------------------------
// Initialises the SQLite database and exports a ready-to-use db
// instance. Import this module anywhere you need database access.
//
// Usage:
//   const db = require('../database/db');
//   const row = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
// ---------------------------------------------------------------

const Database = require('better-sqlite3');
const path     = require('path');
const fs       = require('fs');

// ------------------------------------------------------------------
// Config
// ------------------------------------------------------------------
const DB_DIR  = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DB_DIR, 'boardium.db');
const SCHEMA  = path.join(__dirname, 'schema.sql');

// Ensure the data/ directory exists (gitignored — never commit the db file)
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// ------------------------------------------------------------------
// Open / create database
// ------------------------------------------------------------------
const db = new Database(DB_PATH);

// Apply PRAGMAs for safety and performance
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

// ------------------------------------------------------------------
// Run schema migrations
// Reads schema.sql and executes it. All CREATE statements use
// IF NOT EXISTS so this is safe to call on every startup.
// ------------------------------------------------------------------
function initialise() {
  const schema = fs.readFileSync(SCHEMA, 'utf8');
  db.exec(schema);
  console.log('[db] Database initialised at', DB_PATH);
}

initialise();

module.exports = db;
