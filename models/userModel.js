const { getDb } = require('../db');

// finders
async function findById(id) { return await getDb().get(`SELECT * FROM users WHERE id = ?`, [id]); } // for '/me' endpoint
async function findByUsername(username) { return await getDb().get(`SELECT * FROM users WHERE username = ?`, [username]); } // for login

// create new user
async function create({ username, nickname, password_hash }) { // password comes in hashed from controllers
    return await getDb().run(`INSERT INTO users (username, nickname, password_hash) VALUES (?, ?, ?)`, [username, nickname, password_hash]);
}