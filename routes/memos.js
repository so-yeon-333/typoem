const express = require("express");
const controller = require("../controllers/memosController");
const { authenticate } = require("../middleware/authMiddleware");

// Router mounted at /api/rooms — handles memos nested under a room.
// POST /api/rooms/:id/memos   GET /api/rooms/:id/memos
const roomMemosRouter = express.Router();
roomMemosRouter.use(authenticate);
roomMemosRouter.post("/:id/memos", controller.createMemo);
roomMemosRouter.get("/:id/memos", controller.listMemos);

// Router mounted at /api/memos — handles a memo by its own id.
// PATCH /api/memos/:id   DELETE /api/memos/:id
const memosRouter = express.Router();
memosRouter.use(authenticate);
memosRouter.patch("/:id", controller.updateMemo);
memosRouter.delete("/:id", controller.deleteMemo);
memosRouter.patch("/:id", controller.updateMemo);
memosRouter.post("/:id/like", controller.toggleLike);

module.exports = { roomMemosRouter, memosRouter };
