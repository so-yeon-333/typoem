// routes/dictionary.js
const express = require("express");
const router = express.Router();
const controller = require("../controllers/dictionaryController");
const { authenticate } = require("../middleware/authMiddleware");

// add /api/dictionary (prefix) in app.js
// Depends on P1 auth: only logged-in users can reach this protected route
router.get("/:word", authenticate, controller.getDictionary);

module.exports = router;