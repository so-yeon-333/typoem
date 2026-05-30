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

// find one memo by id. used for ownership checks on PATCH/DELETE.
async function findById(id) {
    return await getDb().get(`SELECT * FROM memos WHERE id = ?`, [id]);
}

// create a memo and return the full inserted row.
async function createMemo({ user_id, room_id, poem_id, content }) {
    const result = await getDb().run(
        `INSERT INTO memos (user_id, room_id, poem_id, content) VALUES (?, ?, ?, ?)`,
        [user_id, room_id, poem_id, content]
    );
    return await findById(result.lastID);
}

// update a memo's content and return the updated row.
async function updateMemo(id, content) {
    await getDb().run(`UPDATE memos SET content = ? WHERE id = ?`, [content, id]);
    return await findById(id);
}

// delete a memo.
async function deleteMemo(id) {
    return await getDb().run(`DELETE FROM memos WHERE id = ?`, [id]);
}