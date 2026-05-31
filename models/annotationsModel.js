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