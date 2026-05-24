const express = require("express");
const router = express.Router();
const controller = require("../controllers/userController");

const { authenticate } = require("../middleware/authMiddleware"); // for authentication

// add /users(prefix) in app.js
router.get("/me", authenticate, controller.getMe);

module.exports = router;