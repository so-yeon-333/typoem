// GET /api/public/poem - a single short poem for the non-member landing page.
// resemble todayController logic - but no auth

const { fetchRandomFromApi } = require("./todayController");

const PUBLIC_MIN = 4;
const PUBLIC_MAX = 12;
const RETRIES = 10; // short poems are rarer from PoetryDB, so re-roll generously

// acceptable for the landing page = a poem with 4-12 non-empty lines.
function isAcceptablePoem(poem) {
    if (!poem || !Array.isArray(poem.lines)) return false;
    const count = poem.lines.filter((l) => l && l.trim().length > 0).length;
    return count >= PUBLIC_MIN && count <= PUBLIC_MAX;
}

// GET /api/public/poem
async function getRandomPoem(req, res) {
    try {
        // try live PoetryDB first, re-roll until short-enough poem
        for (let i = 0; i < RETRIES; i++) {
            const poem = await fetchRandomFromApi();
            if (!poem) break; // live unavailable -> fallback
            if (isAcceptablePoem(poem)) {
                return res.status(200).json({ poem });
            }
        }

        // fallback: a random short poem from the offline pool
        const pool = require("../data/poems.json").filter(isAcceptablePoem);
        if (pool.length === 0) {
            return res.status(503).json({ error: "No poem available right now" });
        }
        const poem = pool[Math.floor(Math.random() * pool.length)];
        return res.status(200).json({ poem });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Server error" });
    }
}

module.exports = { getRandomPoem };