// Shared PoetryDB fetch helper.
// Neutral location so todayController and publicController both depend on this,
// not on each other.

const POETRYDB_URL = "https://poetrydb.org/random/1";
const FETCH_TIMEOUT = 4000; // ms

// fetch one random poem from PoetryDB. Returns {title, author, lines} or null on any failure
async function fetchRandomFromApi() {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
    try {
        const res = await fetch(POETRYDB_URL, { signal: controller.signal });
        if (!res.ok) return null;
        const data = await res.json();
        if (!Array.isArray(data) || data.length === 0 || !Array.isArray(data[0].lines)) {
            return null;
        }
        return data[0];
    } catch (err) {
        return null;
    } finally {
        clearTimeout(timer);
    }
}

module.exports = { fetchRandomFromApi };