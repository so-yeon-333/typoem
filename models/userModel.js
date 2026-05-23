const { getDb } = require('../db');

// helper: thrown when a duplicate username is inserted
class UsernameTakenError extends Error {
    constructor(username) {
        super(`Username "${username}" is already taken`);
        this.name = "UsernameTakenError";
    }
}

// finders
async function findById(id) { return await getDb().get(`SELECT * FROM users WHERE id = ?`, [id]); } // for '/me' endpoint
async function findByUsername(username) { return await getDb().get(`SELECT * FROM users WHERE username = ?`, [username]); } // for login

// create new user
async function create({ username, nickname, password_hash }) { // password comes in hashed from controllers
    try {
        return await getDb().run( `INSERT INTO users (username, nickname, password_hash) VALUES (?, ?, ?)`, [username, nickname, password_hash] );  
    } catch (err) {
        if (err.code === "SQLITE_CONSTRAINT") {
            throw new UsernameTakenError(username);
        }
        throw err;
    }
}