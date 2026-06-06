const jwt = require("jsonwebtoken"); //jwt
const usersModel = require("../models/usersModel"); // to verify the token's user still exists

// authentication
async function authenticate(req, res, next) {
    // check header and extract tokens
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) return res.status(401).json({error: "missing token"});
    const token = header.slice(7);

    // verify token signature / expiry
    let payload;
    try {
        payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        return res.status(401).json({error: "invalid or expired token"});
    }

    // ensure the token's user still exists in the DB.
    // Render's free tier wipes SQLite and recycles AUTOINCREMENT ids on redeploy,
    // so an old JWT (same secret) could otherwise point to a different/new user.
    try {
        const user = await usersModel.findById(payload.id);
        if (!user) return res.status(401).json({error: "account no longer exists"});
        req.user = { id: user.id, username: user.username };
        next();
    } catch (err) {
        console.error(err);
        return res.status(500).json({error: "Server error"});
    }
}

module.exports = { authenticate };