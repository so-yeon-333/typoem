// Public: unauthenticated routes
// No auth middleware here on purpose - these must work for logged-out visitors.

const express = require("express");
const router = express.Router();
const controller = require("../controllers/publicController");

// GET /api/public/poem - one short random poem, no login required
router.get("/poem", controller.getRandomPoem);

module.exports = router;