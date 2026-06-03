const Database = require('better-sqlite3');
const path = require('path');
const aiConfig = require('../config/ai');

// Simple SQLite wrapper used by VectorMemory and other services.
// Database file lives beside other data files.
const dbPath = process.env.MEMORY_DB_PATH || path.join(path.dirname(aiConfig.data.memoryPath), 'memory.db');
const db = new Database(dbPath);

// Ensure tables exist
function init() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      userId TEXT PRIMARY KEY
    );
    CREATE TABLE IF NOT EXISTS facts (
      id TEXT PRIMARY KEY,
      userId TEXT,
      text TEXT,
      vector TEXT,
      createdAt TEXT,
      updatedAt TEXT,
      FOREIGN KEY(userId) REFERENCES users(userId) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS turns (
      id TEXT PRIMARY KEY,
      userId TEXT,
      userName TEXT,
      userText TEXT,
      botText TEXT,
      vector TEXT,
      t TEXT,
      FOREIGN KEY(userId) REFERENCES users(userId) ON DELETE CASCADE
    );
  `);
}

init();

module.exports = {
  db,
  run: (sql, params) => db.prepare(sql).run(params),
  get: (sql, params) => db.prepare(sql).get(params),
  all: (sql, params) => db.prepare(sql).all(params),
};
