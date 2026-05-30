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

// list memos for a room scoped to one poem, newest first.
// joined with the author's nickname so the frontend can show who wrote it.
async function listForRoomPoem(room_id, poem_id) {
    return await getDb().all(
        `SELECT m.id, m.user_id, m.room_id, m.poem_id, m.content, m.created_at,
                u.nickname AS author_nickname
         FROM memos m
         JOIN users u ON u.id = m.user_id
         WHERE m.room_id = ? AND m.poem_id = ?
         ORDER BY m.created_at DESC, m.id DESC`,
        [room_id, poem_id]
    );
}