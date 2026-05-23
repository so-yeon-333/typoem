const bcrypt = require("bcrypt");
const model = require("../models/usersModel");

async function register(req, res) {
    try {
        const { username, password } = req.body;
        if( !username || !password ){
            return res.status(400).json({error: "username and password required"});
        }
        const password_hash = await bcrypt.hash(password, 10);
        const result = await model.create(username, nickname, password_hash);
        const id = result.id
        res.status(201).json({ id: result.lastID, username, nickname });
    } catch (err) {
        if (err instanceof model.UsernameTakenError) {
            return res.status(409).json({error: "username already exists"});
        }
        console.error(err);
        res.status(500).json({error: "Server error"});
    }
}