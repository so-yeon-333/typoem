const model = require("../models/memosModel");
const roomsModel = require("../models/roomsModel");

// helper: parse ':id' path param and validate (same as roomsController)
function parseId(raw) {
    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0) return null;
    return id;
}

// helper: today's date as YYYY-MM-DD
function today() {
    return new Date().toISOString().slice(0, 10);
}

// create a memo on the room's poem of the day
// [POST] /api/rooms/:id/memos
// create a memo on the room's poem of the day
// [POST] /api/rooms/:id/memos
async function createMemo(req, res) {
    try {
        const room_id = parseId(req.params.id);
        if (!room_id) return res.status(400).json({ error: "invalid room id" });

        // must be a member of the room (check permission before validating input)
        const room = await roomsModel.findById(room_id);
        if (!room) return res.status(404).json({ error: "Room not found" });

        const isMember = await roomsModel.isMember(room_id, req.user.id);
        if (!isMember) return res.status(403).json({ error: "You are not a member of this room" });

        // validate content (trim so whitespace-only memos are rejected)
        const { content } = req.body;
        if (!content || typeof content !== "string") {
            return res.status(400).json({ error: "content required" });
        }
        const trimmed = content.trim();
        if (trimmed.length < 1 || trimmed.length > 1000) {
            return res.status(400).json({ error: "content must be 1-1000 characters" });
        }

        // find the room's poem for today
        const poem_id = await model.findTodayPoemId(room_id, today());
        if (!poem_id) return res.status(404).json({ error: "No poem assigned to this room today" });

        const memo = await model.createMemo({
            user_id: req.user.id,
            room_id,
            poem_id,
            content: trimmed,
        });
        res.status(201).json(memo);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
}