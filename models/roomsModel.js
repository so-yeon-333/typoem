// helper: Generate Invite code
const crypto = require('crypto');
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // 6 chars, uppercase + digits, omitting confusable characters (0/O, 1/I/L)
function generateInviteCode(length = 6) { // Just random. Duplicate checks are handled afterwards
    let code = '';
    for (let i = 0; i < length; i++) {
        code += ALPHABET[crypto.randomInt(ALPHABET.length)];
    }
    return code;
}

// helper: throw SQL errors
class InviteCodeGenerationError extends Error {
    constructor() {
        super("Failed to generate a unique invite code");
        this.name = "InviteCodeGenerationError";
    }
}
class AlreadyMemberError extends Error {
    constructor() {
        super("User is already a member of this room");
        this.name = "AlreadyMemberError";
    }
}

const { getDb } = require('../db');

// finders
async function findById(id) { return await getDb().get(`SELECT * FROM rooms WHERE id = ?`, [id]); }
async function findByInviteCode(invite_code) { return await getDb().get(`SELECT * FROM rooms WHERE invite_code = ?`, [invite_code]); }
async function isMember(room_id, user_id) {
    const row = await getDb().get(`SELECT 1 FROM room_members WHERE room_id = ? AND user_id = ?`, [room_id, user_id]);
    return !!row;
}