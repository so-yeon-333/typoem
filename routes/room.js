const express = require("express");
const router = express.Router();
const controller = require("../controllers/roomsController");

const { authenticate } = require("../middleware/authMiddleware"); // for authentication

// add /rooms(prefix) in app.js
// all rooms routes require authentication
router.use(authenticate);

router.post("/", controller.createRoom);
router.get("/mine", controller.listMyRooms);
router.post("/join", controller.joinRoom);
router.get("/:id/members", controller.getMembers);
router.delete("/:id/leave", controller.leaveRoom); // must be above '/:id'
router.delete("/:id", controller.deleteRoom);

module.exports = router;