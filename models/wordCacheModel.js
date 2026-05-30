// Data-access layer for the word_cache table.
const { getDb } = require("../db");

// Find a cached word, or undefined if not cached
async function findByWord(word) {
  return getDb().get(
    "SELECT word, phonetic, definitions FROM word_cache WHERE word = ?",
    [word]
  );
}

// Insert a word into the cache (ignored if it already exists).
// Stores definitions as a JSON string.
async function upsert(word, phonetic, definitions) {
  return getDb().run(
    "INSERT OR IGNORE INTO word_cache (word, phonetic, definitions) VALUES (?, ?, ?)",
    [word, phonetic, JSON.stringify(definitions)]
  );
}

module.exports = { findByWord, upsert };