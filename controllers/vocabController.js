// controllers/vocabController.js
const model = require("../models/vocabModel");

function parseId(raw) {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// [GET] /api/vocab — list the current user's saved words
async function listVocab(req, res) {
  try {
    const list = await model.listForUser(req.user.id);
    res.status(200).json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
}

// [POST] /api/vocab — save a word to the current user's notebook
async function addVocab(req, res) {
  try {
    const word = String(req.body.word || "").toLowerCase().trim();
    const definition = String(req.body.definition || "").trim();

    // Same word validation as the dictionary lookup
    if (!word || !/^[a-z'-]+$/.test(word)) {
      return res.status(400).json({ error: "invalid word" });
    }
    if (!definition) {
      return res.status(400).json({ error: "definition required" });
    }

    const phonetic = req.body.phonetic ? String(req.body.phonetic).trim() : null;
    await model.add(req.user.id, word, phonetic, definition);
    res.status(201).json({ word, phonetic, definition });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
}

// [DELETE] /api/vocab/:id — remove one of the user's own words
async function deleteVocab(req, res) {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "invalid id" });

    await model.remove(id, req.user.id);
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
}

module.exports = { listVocab, addVocab, deleteVocab };