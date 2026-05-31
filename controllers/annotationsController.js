const model = require("../models/annotationsModel");
const roomsModel = require("../models/roomsModel");

// helper: parse a path param and validate it as a positive integer
function parseId(raw) {
    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0) return null;
    return id;
}

// helper: today's date as YYYY-MM-DD
function today() {
    return new Date().toISOString().slice(0, 10);
}