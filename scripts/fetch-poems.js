// scripts/fetch-poems.js

// One-off script: fetch poems from PoetryDB and save them to data/poems.json 
// as an offline fallback pool.

// Run with:  node scripts/fetch-poems.js

const fs = require('fs/promises'); // file system
const path = require('path'); // secure path making for both Mac(\) and Windows(/)

// helper: filter out inappropriate poems (return true/false)
const MIN_LINES = 4;
const MAX_LINES = 30;
function isAppropriate(poem) {
    if (!poem || !Array.isArray(poem.lines)) return false;
    const lines = poem.lines.filter((l) => l && l.trim().length > 0); // not empty lines
    if (lines.length < MIN_LINES) return false;
    if (lines.length > MAX_LINES) return false;
    return true;
}

async function main() {
    try {
        // fetch 100 poems from PoetryDB API
        const res = await fetch('https://poetrydb.org/random/100');
        if (!res.ok) throw new Error(`PoetryDB failed: ${res.status}`);
        const poems = await res.json();

        // keep only appropriate poems
        const filtered = poems.filter(isAppropriate);

        // save to data/poems.json
        const out = path.join(__dirname, '..', 'data', 'poems.json');
        await fs.mkdir(path.dirname(out), { recursive: true });
        await fs.writeFile(out, JSON.stringify(filtered, null, 2));
        console.log(`Saved ${filtered.length} poems`);

    } catch (err) {
        console.error(err);
    }
}

main();