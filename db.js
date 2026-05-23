const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DB_PATH || './typoem.db';
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Run schema on startup
const schema = fs.readFileSync(path.join(__dirname, 'db/schema.sql'), 'utf8');
db.exec(schema);

module.exports = db;