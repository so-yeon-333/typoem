const express = require("express");
const controller = require("../controllers/annotationsController");
const { authenticate } = require("../middleware/authMiddleware");

// Router mounted at /api/rooms — handles annotations nested under a room+line.
// POST /api/rooms/:roomId/lines/:lineId/annotations
// GET  /api/rooms/:roomId/lines/:lineId/annotations
const roomAnnotationsRouter = express.Router();
roomAnnotationsRouter.use(authenticate);
roomAnnotationsRouter.post("/:roomId/lines/:lineId/annotations", controller.createAnnotation);
roomAnnotationsRouter.get("/:roomId/lines/:lineId/annotations", controller.listAnnotations);

// Router mounted at /api/annotations — handles an annotation by its own id.
// PATCH /api/annotations/:id   DELETE /api/annotations/:id
const annotationsRouter = express.Router();
annotationsRouter.use(authenticate);
annotationsRouter.patch("/:id", controller.updateAnnotation);
annotationsRouter.delete("/:id", controller.deleteAnnotation);

module.exports = { roomAnnotationsRouter, annotationsRouter };