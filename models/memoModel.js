const { getDb } = require('../db');

// helper: find the poem assigned to a room "today" (YYYY-MM-DD).
// returns the poem_id, or null if the room has no poem for that date.
async function findTodayPoemId(room_id, date) {
    const row = await getDb().get(
        `SELECT poem_id FROM daily_room_poems WHERE room_id = ? AND date = ?`,
        [room_id, date]
    );
    return row ? row.poem_id : null;
}