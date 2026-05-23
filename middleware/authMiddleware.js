const jwt = require("jsonwebtoken"); //jwt

// authentication
function authenticate(req, res, next) {
    // check header and extract tokens
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) return res.status(401).json({error: "missing token"});
    const token = header.slice(7);

    // verify token
    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.user = payload;
        next();
    } catch (err) {
        console.error(err);
        return res.status(401).json({error: "invalid or expired token"});
    }
}

module.exports = { authenticate };