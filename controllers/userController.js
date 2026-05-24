const model = require('../models/usersModel');

async function getMe(req, res) {
    try{
        const user = await model.findById(req.user.id); // provided after checking from middleware
        if(!user) return res.status(404).json({error: "User not found"});
        res.status(200).json({id: user.id, username: user.username, nickname: user.nickname}); // remove hash password
    } catch(err){
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
}

module.exports = { getMe };