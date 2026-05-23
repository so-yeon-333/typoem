const bcrypt = require("bcrypt");
const model = require("../models/usersModel");

const jwt = require("jsonwebtoken");

// register
// [POST] /api/auth/register
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

// login
// POST /api/auth/login
async function login(req, res) {
    try {
        const { username, nickname, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: "username and password required" })

        const user = await model.findByUsername(username); // find user
        if (!user) return res.status(401).json({error: "Invalid usename"});

        const ok = await bcrypt.compare(password, user.password_hash); // Check password
        if(!ok) return res.status(401).json({error: "Wrong password"});

        // if success; provide tokens
        const token = jwt.sign( // sign a JWT containing the user’s id and username
             {id: user.id, username: user.username },
             process.env.JWT_SECRET,
             { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        res.status(200).json({token, username: user.username});
    } catch (err) {
        console.error(err);
        res.status(500).json({error:"Server error"});
    }
}

module.exports = { register, login };