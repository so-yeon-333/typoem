const sqlite3 = require('sqlite3');
const sqlite = require('sqlite');
const path = require('path');
const fs = require('fs');

const DB_NAME = process.env.DB_PATH || './typoem.db';

let db;

async function initDb() {
  db = await sqlite.open({
    filename: DB_NAME,
    driver: sqlite3.Database
  });

  await db.exec('PRAGMA foreign_keys = ON');

  const schema = fs.readFileSync(path.join(__dirname, 'db/schema.sql'), 'utf8');
  await db.exec(schema);

  return db;
}

function getDb() {
  return db;
}

module.exports = { initDb, getDb };