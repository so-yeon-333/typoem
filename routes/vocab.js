const express = require("express");
const router = express.Router();
const controller = require("../controllers/vocabController");
const { authenticate } = require("../middleware/authMiddleware");

// add /api/vocab (prefix) in app.js
// All vocab routes are protected: only logged-in users manage their own notebook.
router.use(authenticate);

router.get("/", controller.listVocab);
router.post("/", controller.addVocab);
router.delete("/:id", controller.deleteVocab);

module.exports = router;