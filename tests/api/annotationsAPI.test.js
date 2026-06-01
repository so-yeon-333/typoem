const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../../app");

// Replace the models with auto-mocks. jest.mock is hoisted above the app
// require, so it runs before app.js finishes loading the controllers.
// The annotation controller leans on two model layers:
//   - annotationsModel: the resource itself + the line guard + duplicate check
//   - roomsModel: borrowed for permission checks (findById + isMember)
jest.mock("../../models/annotationsModel");
jest.mock("../../models/roomsModel");
const annotationsModel = require("../../models/annotationsModel");
const roomsModel = require("../../models/roomsModel");

// Sign a valid token once. JWT_SECRET is set by tests/setup.js before this
// file loads. Payload { id, username } matches the auth middleware (req.user.id).
const token = jwt.sign(
  { id: 1, username: "alice" },
  process.env.JWT_SECRET,
  { expiresIn: "1h" }
);

// Reusable fixtures: a room the user belongs to, and a valid line of the
// room's poem today.
const room = { id: 5, name: "poetry-room", owner_id: 1 };
const line = { id: 9, poem_id: 3 };
const BASE = "/api/rooms/5/lines/9/annotations";

// Reset mock state between tests so calls/return values don't leak.
beforeEach(() => {
  jest.clearAllMocks();
});

// -----------------------------------------------------------------------------
// POST /api/rooms/:roomId/lines/:lineId/annotations
// -----------------------------------------------------------------------------
describe("POST /api/rooms/:roomId/lines/:lineId/annotations", () => {
  const validBody = { content: "This metaphor is striking." };

  // Helper: arrange the room + membership for the happy-path setup.
  function arrangeMember() {
    roomsModel.findById.mockResolvedValue(room);
    roomsModel.isMember.mockResolvedValue(true);
  }

  test("returns 401 when no Authorization header is sent", async () => {
    const res = await request(app).post(BASE).send(validBody);

    expect(res.statusCode).toBe(401);
    expect(annotationsModel.createAnnotation).not.toHaveBeenCalled();
    expect(roomsModel.findById).not.toHaveBeenCalled();
  });

  test("returns 404 when the room does not exist", async () => {
    roomsModel.findById.mockResolvedValue(undefined);

    const res = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send(validBody);

    expect(res.statusCode).toBe(404);
    expect(annotationsModel.createAnnotation).not.toHaveBeenCalled();
  });

  test("returns 403 when the user is not a member of the room", async () => {
    roomsModel.findById.mockResolvedValue(room);
    roomsModel.isMember.mockResolvedValue(false);

    const res = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send(validBody);

    expect(res.statusCode).toBe(403);
    expect(annotationsModel.createAnnotation).not.toHaveBeenCalled();
  });

  test("returns 400 when content is missing or whitespace-only", async () => {
    arrangeMember();

    const res = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "   " });

    expect(res.statusCode).toBe(400);
    expect(annotationsModel.createAnnotation).not.toHaveBeenCalled();
  });

  test("returns 404 when the line is not part of the room's poem today", async () => {
    // Arrange: member with valid content, but the line guard returns null —
    // i.e. someone tried to annotate a line that isn't in today's poem.
    arrangeMember();
    annotationsModel.findLineForRoomDate.mockResolvedValue(null);

    // Act
    const res = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send(validBody);

    // Assert
    expect(res.statusCode).toBe(404);
    expect(annotationsModel.createAnnotation).not.toHaveBeenCalled();
  });

  test("returns 409 when the user already annotated this line", async () => {
    // Arrange: everything valid, but a prior annotation by this user on this
    // line already exists — enforces UNIQUE(line_id, room_id, user_id).
    arrangeMember();
    annotationsModel.findLineForRoomDate.mockResolvedValue(line);
    annotationsModel.findByUserLine.mockResolvedValue({ id: 50, user_id: 1, line_id: 9 });

    // Act
    const res = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send(validBody);

    // Assert
    expect(res.statusCode).toBe(409);
    expect(annotationsModel.createAnnotation).not.toHaveBeenCalled();
  });

  test("returns 201 with the created annotation when everything is valid", async () => {
    // Arrange: member, valid line, no existing annotation by this user.
    arrangeMember();
    annotationsModel.findLineForRoomDate.mockResolvedValue(line);
    annotationsModel.findByUserLine.mockResolvedValue(undefined);

    const created = {
      id: 77,
      line_id: 9,
      room_id: 5,
      user_id: 1,
      content: "This metaphor is striking.",
      created_at: "2026-06-01T00:00:00.000Z",
      line_number: 4,
      author_nickname: "alice",
    };
    annotationsModel.createAnnotation.mockResolvedValue(created);

    // Act
    const res = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send(validBody);

    // Assert
    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual(created);
    // user_id comes from the token; line_id/room_id from the path; content trimmed.
    expect(annotationsModel.createAnnotation).toHaveBeenCalledWith(
      expect.objectContaining({
        line_id: 9,
        room_id: 5,
        user_id: 1,
        content: "This metaphor is striking.",
      })
    );
  });
});

// -----------------------------------------------------------------------------
// GET /api/rooms/:roomId/lines/:lineId/annotations
// -----------------------------------------------------------------------------
describe("GET /api/rooms/:roomId/lines/:lineId/annotations", () => {
  test("returns 401 when no Authorization header is sent", async () => {
    const res = await request(app).get(BASE);

    expect(res.statusCode).toBe(401);
    expect(annotationsModel.listForLine).not.toHaveBeenCalled();
  });

  test("returns 403 when the user is not a member of the room", async () => {
    roomsModel.findById.mockResolvedValue(room);
    roomsModel.isMember.mockResolvedValue(false);

    const res = await request(app)
      .get(BASE)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(403);
    expect(annotationsModel.listForLine).not.toHaveBeenCalled();
  });

  test("returns 200 with the annotations on the line for a member", async () => {
    // Arrange
    roomsModel.findById.mockResolvedValue(room);
    roomsModel.isMember.mockResolvedValue(true);
    annotationsModel.findLineForRoomDate.mockResolvedValue(line);

    const list = [
      { id: 1, content: "note one", author_nickname: "alice" },
      { id: 2, content: "note two", author_nickname: "bob" },
    ];
    annotationsModel.listForLine.mockResolvedValue(list);

    // Act
    const res = await request(app)
      .get(BASE)
      .set("Authorization", `Bearer ${token}`);

    // Assert
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(list);
  });
});

// -----------------------------------------------------------------------------
// PATCH /api/annotations/:id  — author-only
// -----------------------------------------------------------------------------
describe("PATCH /api/annotations/:id", () => {
  const patchBody = { content: "revised annotation" };

  test("returns 401 when no Authorization header is sent", async () => {
    const res = await request(app).patch("/api/annotations/7").send(patchBody);

    expect(res.statusCode).toBe(401);
    expect(annotationsModel.updateAnnotation).not.toHaveBeenCalled();
  });

  test("returns 404 when the annotation does not exist", async () => {
    annotationsModel.findById.mockResolvedValue(undefined);

    const res = await request(app)
      .patch("/api/annotations/999")
      .set("Authorization", `Bearer ${token}`)
      .send(patchBody);

    expect(res.statusCode).toBe(404);
    expect(annotationsModel.updateAnnotation).not.toHaveBeenCalled();
  });

  test("returns 403 when the user is not the author", async () => {
    annotationsModel.findById.mockResolvedValue({ id: 7, user_id: 2, content: "x" });

    const res = await request(app)
      .patch("/api/annotations/7")
      .set("Authorization", `Bearer ${token}`)
      .send(patchBody);

    expect(res.statusCode).toBe(403);
    expect(annotationsModel.updateAnnotation).not.toHaveBeenCalled();
  });

  test("returns 400 when the new content is only whitespace", async () => {
    annotationsModel.findById.mockResolvedValue({ id: 7, user_id: 1, content: "x" });

    const res = await request(app)
      .patch("/api/annotations/7")
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "   " });

    expect(res.statusCode).toBe(400);
    expect(annotationsModel.updateAnnotation).not.toHaveBeenCalled();
  });

  test("returns 200 with the updated annotation for the author", async () => {
    annotationsModel.findById.mockResolvedValue({ id: 7, user_id: 1, content: "old" });
    const updated = { id: 7, user_id: 1, content: "revised annotation" };
    annotationsModel.updateAnnotation.mockResolvedValue(updated);

    const res = await request(app)
      .patch("/api/annotations/7")
      .set("Authorization", `Bearer ${token}`)
      .send(patchBody);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(updated);
    expect(annotationsModel.updateAnnotation).toHaveBeenCalledWith(7, "revised annotation");
  });
});

// -----------------------------------------------------------------------------
// DELETE /api/annotations/:id  — author-only
// -----------------------------------------------------------------------------
describe("DELETE /api/annotations/:id", () => {
  test("returns 401 when no Authorization header is sent", async () => {
    const res = await request(app).delete("/api/annotations/7");

    expect(res.statusCode).toBe(401);
    expect(annotationsModel.deleteAnnotation).not.toHaveBeenCalled();
  });

  test("returns 404 when the annotation does not exist", async () => {
    annotationsModel.findById.mockResolvedValue(undefined);

    const res = await request(app)
      .delete("/api/annotations/999")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(404);
    expect(annotationsModel.deleteAnnotation).not.toHaveBeenCalled();
  });

  test("returns 403 when the user is not the author", async () => {
    annotationsModel.findById.mockResolvedValue({ id: 7, user_id: 2 });

    const res = await request(app)
      .delete("/api/annotations/7")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(403);
    expect(annotationsModel.deleteAnnotation).not.toHaveBeenCalled();
  });

  test("returns 204 with an empty body when the author deletes the annotation", async () => {
    annotationsModel.findById.mockResolvedValue({ id: 7, user_id: 1 });
    annotationsModel.deleteAnnotation.mockResolvedValue({ changes: 1 });

    const res = await request(app)
      .delete("/api/annotations/7")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(204);
    expect(res.body).toEqual({});
    expect(annotationsModel.deleteAnnotation).toHaveBeenCalledWith(7);
  });
});