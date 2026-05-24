const express = require("express");
const router = express.Router();
const controller = require("../controllers/userController");

// add /users(prefix) in app.js
router.get("/me", controller.getMe);

module.exports = router;