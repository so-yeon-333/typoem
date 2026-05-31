const { getDb } = require('../db');

// helper: confirm a poem line exists and belongs to the room's poem of the day.
// returns the line row { id, poem_id } if valid for that room+date, else null.
// this prevents annotating a line that isn't part of the room's current poem.
async function findLineForRoomDate(line_id, room_id, date) {
    return await getDb().get(
        `SELECT pl.id, pl.poem_id
         FROM poem_lines pl
         JOIN daily_room_poems drp
           ON drp.poem_id = pl.poem_id
         WHERE pl.id = ? AND drp.room_id = ? AND drp.date = ?`,
        [line_id, room_id, date]
    );
}

// list annotations for one line within a room, newest first.
// joined with the author's nickname so the frontend can show who wrote it.
async function listForLine(room_id, line_id) {
    return await getDb().all(
        `SELECT a.id, a.line_id, pl.line_number, a.room_id, a.user_id,
                a.content, a.created_at, u.nickname AS author_nickname
         FROM line_annotations a
         JOIN poem_lines pl ON pl.id = a.line_id
         JOIN users u ON u.id = a.user_id
         WHERE a.room_id = ? AND a.line_id = ?
         ORDER BY a.created_at DESC, a.id DESC`,
        [room_id, line_id]
    );
}

// find one annotation by id, joined with author nickname.
// used for ownership checks on PATCH/DELETE, and as the response shape
// for create/update so it matches listForLine.
async function findById(id) {
    return await getDb().get(
        `SELECT a.id, a.line_id, pl.line_number, a.room_id, a.user_id,
                a.content, a.created_at, u.nickname AS author_nickname
         FROM line_annotations a
         JOIN poem_lines pl ON pl.id = a.line_id
         JOIN users u ON u.id = a.user_id
         WHERE a.id = ?`,
        [id]
    );
}

async function findByUserLine(line_id, room_id, user_id) {
    return await getDb().get(
        `SELECT id FROM line_annotations
         WHERE line_id = ? AND room_id = ? AND user_id = ?`,
        [line_id, room_id, user_id]
    );
}

// create an annotation and return the full inserted row.
async function createAnnotation({ line_id, room_id, user_id, content }) {
    const result = await getDb().run(
        `INSERT INTO line_annotations (line_id, room_id, user_id, content)
         VALUES (?, ?, ?, ?)`,
        [line_id, room_id, user_id, content]
    );
    return await findById(result.lastID);
}

// update an annotation's content and return the updated row.
async function updateAnnotation(id, content) {
    await getDb().run(
        `UPDATE line_annotations SET content = ? WHERE id = ?`,
        [content, id]
    );
    return await findById(id);
}

// delete an annotation.
async function deleteAnnotation(id) {
    return await getDb().run(`DELETE FROM line_annotations WHERE id = ?`, [id]);
}

module.exports = {
    findLineForRoomDate,
    listForLine,
    findById,
    findByUserLine,
    createAnnotation,
    updateAnnotation,
    deleteAnnotation,
};