const { getDb } = require("../db");

// List all saved words for a user (DESC)
async function listForUser(user_id) {
  return getDb().all(
    `SELECT id, word, phonetic, definition, created_at
       FROM vocab WHERE user_id = ? ORDER BY created_at DESC`,
    [user_id]
  );
}

// Save a word (ignored if this user already saved the same word).
async function add(user_id, word, phonetic, definition) {
  return getDb().run(
    `INSERT OR IGNORE INTO vocab (user_id, word, phonetic, definition)
     VALUES (?, ?, ?, ?)`,
    [user_id, word, phonetic, definition]
  );
}

// Delete words
async function remove(id, user_id) {
  return getDb().run(
    `DELETE FROM vocab WHERE id = ? AND user_id = ?`,
    [id, user_id]
  );
}

module.exports = { listForUser, add, remove };