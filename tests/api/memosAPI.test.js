const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../../app");

// Replace the models with auto-mocks. jest.mock is hoisted above the app
// require, so it runs before app.js finishes loading the controllers.
// The memo controller leans on two model layers:
//   - memosModel: the resource itself (create / list / find / update / delete)
//   - roomsModel: borrowed for permission checks (findById + isMember)
jest.mock("../../models/memosModel");
jest.mock("../../models/roomsModel");
jest.mock("../../models/usersModel");
const memosModel = require("../../models/memosModel");
const roomsModel = require("../../models/roomsModel");
const usersModel = require("../../models/usersModel");

// Sign a valid token once. JWT_SECRET is set by tests/setup.js before this
// file loads. Payload { id, username } matches the auth middleware (req.user.id).
const token = jwt.sign(
  { id: 1, username: "alice" },
  process.env.JWT_SECRET,
  { expiresIn: "1h" }
);

// Reusable fixtures: a room the user belongs to, and a poem assigned today.
const room = { id: 5, name: "poetry-room", owner_id: 1 };
const TODAY_POEM_ID = 3;

// Reset mock state between tests so calls/return values don't leak.
beforeEach(() => {
  jest.clearAllMocks();
  usersModel.findById.mockResolvedValue({ id: 1, username: "alice", nickname: "Alice" });
});

// -----------------------------------------------------------------------------
// POST /api/rooms/:id/memos
// -----------------------------------------------------------------------------
describe("POST /api/rooms/:id/memos", () => {
  const validBody = { content: "What a lovely line." };

  test("returns 401 when no Authorization header is sent", async () => {
    // Act
    const res = await request(app).post("/api/rooms/5/memos").send(validBody);

    // Assert
    expect(res.statusCode).toBe(401);
    expect(memosModel.createMemo).not.toHaveBeenCalled();
    expect(roomsModel.findById).not.toHaveBeenCalled();
  });

  test("returns 404 when the room does not exist", async () => {
    // Arrange: valid token, but the room lookup comes back empty.
    roomsModel.findById.mockResolvedValue(undefined);

    // Act
    const res = await request(app)
      .post("/api/rooms/5/memos")
      .set("Authorization", `Bearer ${token}`)
      .send(validBody);

    // Assert
    expect(res.statusCode).toBe(404);
    // Membership is never checked once the room is missing.
    expect(roomsModel.isMember).not.toHaveBeenCalled();
    expect(memosModel.createMemo).not.toHaveBeenCalled();
  });

  test("returns 403 when the user is not a member of the room", async () => {
    // Arrange: room exists, but the user is not a member. Permission is
    // checked BEFORE content validation, so the body can be valid here.
    roomsModel.findById.mockResolvedValue(room);
    roomsModel.isMember.mockResolvedValue(false);

    // Act
    const res = await request(app)
      .post("/api/rooms/5/memos")
      .set("Authorization", `Bearer ${token}`)
      .send(validBody);

    // Assert
    expect(res.statusCode).toBe(403);
    expect(memosModel.createMemo).not.toHaveBeenCalled();
  });

  test("returns 400 when content is missing", async () => {
    // Arrange: a member, but no content in the body.
    roomsModel.findById.mockResolvedValue(room);
    roomsModel.isMember.mockResolvedValue(true);

    // Act
    const res = await request(app)
      .post("/api/rooms/5/memos")
      .set("Authorization", `Bearer ${token}`)
      .send({});

    // Assert
    expect(res.statusCode).toBe(400);
    expect(memosModel.createMemo).not.toHaveBeenCalled();
  });

  test("returns 400 when content is only whitespace", async () => {
    // Arrange: member, but content trims to empty.
    roomsModel.findById.mockResolvedValue(room);
    roomsModel.isMember.mockResolvedValue(true);

    // Act
    const res = await request(app)
      .post("/api/rooms/5/memos")
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "    " });

    // Assert
    expect(res.statusCode).toBe(400);
    expect(memosModel.createMemo).not.toHaveBeenCalled();
  });

  test("returns 404 when no poem is assigned to the room today", async () => {
    // Arrange: member with valid content, but there's no poem for today.
    roomsModel.findById.mockResolvedValue(room);
    roomsModel.isMember.mockResolvedValue(true);
    memosModel.findTodayPoemId.mockResolvedValue(null);

    // Act
    const res = await request(app)
      .post("/api/rooms/5/memos")
      .set("Authorization", `Bearer ${token}`)
      .send(validBody);

    // Assert
    expect(res.statusCode).toBe(404);
    expect(memosModel.createMemo).not.toHaveBeenCalled();
  });

  test("returns 201 with the created memo when everything is valid", async () => {
    // Arrange: member, poem assigned, model returns the full created row.
    roomsModel.findById.mockResolvedValue(room);
    roomsModel.isMember.mockResolvedValue(true);
    memosModel.findTodayPoemId.mockResolvedValue(TODAY_POEM_ID);

    const created = {
      id: 42,
      user_id: 1,
      room_id: 5,
      poem_id: TODAY_POEM_ID,
      content: "What a lovely line.",
      created_at: "2026-06-01T00:00:00.000Z",
      username: "alice",
    };
    memosModel.createMemo.mockResolvedValue(created);

    // Act
    const res = await request(app)
      .post("/api/rooms/5/memos")
      .set("Authorization", `Bearer ${token}`)
      .send(validBody);

    // Assert
    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual(created);
    // The controller derives user_id from the token, not the body, and
    // passes the trimmed content + today's poem id to the model.
    expect(memosModel.createMemo).toHaveBeenCalledWith({
      user_id: 1,
      room_id: 5,
      poem_id: TODAY_POEM_ID,
      content: "What a lovely line.",
    });
  });

  test("trims surrounding whitespace before storing", async () => {
    // Arrange: content padded with whitespace; the stored value must be clean.
    roomsModel.findById.mockResolvedValue(room);
    roomsModel.isMember.mockResolvedValue(true);
    memosModel.findTodayPoemId.mockResolvedValue(TODAY_POEM_ID);
    memosModel.createMemo.mockResolvedValue({ id: 43 });

    // Act
    await request(app)
      .post("/api/rooms/5/memos")
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "   spaced out   " });

    // Assert
    expect(memosModel.createMemo).toHaveBeenCalledWith(
      expect.objectContaining({ content: "spaced out" })
    );
  });
});

// -----------------------------------------------------------------------------
// GET /api/rooms/:id/memos
// -----------------------------------------------------------------------------
describe("GET /api/rooms/:id/memos", () => {
  test("returns 401 when no Authorization header is sent", async () => {
    const res = await request(app).get("/api/rooms/5/memos");

    expect(res.statusCode).toBe(401);
    expect(memosModel.listForRoomPoem).not.toHaveBeenCalled();
  });

  test("returns 403 when the user is not a member of the room", async () => {
    roomsModel.findById.mockResolvedValue(room);
    roomsModel.isMember.mockResolvedValue(false);

    const res = await request(app)
      .get("/api/rooms/5/memos")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(403);
    expect(memosModel.listForRoomPoem).not.toHaveBeenCalled();
  });

  test("returns 200 with the list of memos for a member", async () => {
    // Arrange
    roomsModel.findById.mockResolvedValue(room);
    roomsModel.isMember.mockResolvedValue(true);
    memosModel.findTodayPoemId.mockResolvedValue(TODAY_POEM_ID);

    const memos = [
      { id: 1, content: "first", username: "alice" },
      { id: 2, content: "second", username: "bob" },
    ];
    memosModel.listForRoomPoem.mockResolvedValue(memos);

    // Act
    const res = await request(app)
      .get("/api/rooms/5/memos")
      .set("Authorization", `Bearer ${token}`);

    // Assert
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(memos);
  });
});

// -----------------------------------------------------------------------------
// PATCH /api/memos/:id  — author-only
// -----------------------------------------------------------------------------
describe("PATCH /api/memos/:id", () => {
  const patchBody = { content: "edited content" };

  test("returns 401 when no Authorization header is sent", async () => {
    const res = await request(app).patch("/api/memos/7").send(patchBody);

    expect(res.statusCode).toBe(401);
    expect(memosModel.updateMemo).not.toHaveBeenCalled();
  });

  test("returns 404 when the memo does not exist", async () => {
    // Arrange: lookup returns nothing.
    memosModel.findById.mockResolvedValue(undefined);

    // Act
    const res = await request(app)
      .patch("/api/memos/999")
      .set("Authorization", `Bearer ${token}`)
      .send(patchBody);

    // Assert
    expect(res.statusCode).toBe(404);
    expect(memosModel.updateMemo).not.toHaveBeenCalled();
  });

  test("returns 403 when the user is not the author", async () => {
    // Arrange: memo belongs to user 2, but the token is user 1.
    memosModel.findById.mockResolvedValue({ id: 7, user_id: 2, content: "x" });

    // Act
    const res = await request(app)
      .patch("/api/memos/7")
      .set("Authorization", `Bearer ${token}`)
      .send(patchBody);

    // Assert
    expect(res.statusCode).toBe(403);
    expect(memosModel.updateMemo).not.toHaveBeenCalled();
  });

  test("returns 400 when the new content is only whitespace", async () => {
    // Arrange: author matches, but the replacement content is empty.
    memosModel.findById.mockResolvedValue({ id: 7, user_id: 1, content: "x" });

    // Act
    const res = await request(app)
      .patch("/api/memos/7")
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "   " });

    // Assert
    expect(res.statusCode).toBe(400);
    expect(memosModel.updateMemo).not.toHaveBeenCalled();
  });

  test("returns 200 with the updated memo for the author", async () => {
    // Arrange: author matches; model returns the updated row.
    memosModel.findById.mockResolvedValue({ id: 7, user_id: 1, content: "old" });
    const updated = { id: 7, user_id: 1, content: "edited content" };
    memosModel.updateMemo.mockResolvedValue(updated);

    // Act
    const res = await request(app)
      .patch("/api/memos/7")
      .set("Authorization", `Bearer ${token}`)
      .send(patchBody);

    // Assert — update is a modification of an existing resource, so 200 (not 201).
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(updated);
    expect(memosModel.updateMemo).toHaveBeenCalledWith(7, "edited content");
  });
});

// -----------------------------------------------------------------------------
// DELETE /api/memos/:id  — author-only
// -----------------------------------------------------------------------------
describe("DELETE /api/memos/:id", () => {
  test("returns 401 when no Authorization header is sent", async () => {
    const res = await request(app).delete("/api/memos/7");

    expect(res.statusCode).toBe(401);
    expect(memosModel.deleteMemo).not.toHaveBeenCalled();
  });

  test("returns 404 when the memo does not exist", async () => {
    memosModel.findById.mockResolvedValue(undefined);

    const res = await request(app)
      .delete("/api/memos/999")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(404);
    expect(memosModel.deleteMemo).not.toHaveBeenCalled();
  });

  test("returns 403 when the user is not the author", async () => {
    memosModel.findById.mockResolvedValue({ id: 7, user_id: 2 });

    const res = await request(app)
      .delete("/api/memos/7")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(403);
    expect(memosModel.deleteMemo).not.toHaveBeenCalled();
  });

  test("returns 204 with an empty body when the author deletes the memo", async () => {
    memosModel.findById.mockResolvedValue({ id: 7, user_id: 1 });
    memosModel.deleteMemo.mockResolvedValue({ changes: 1 });

    const res = await request(app)
      .delete("/api/memos/7")
      .set("Authorization", `Bearer ${token}`);

    // 204 No Content → body must be empty.
    expect(res.statusCode).toBe(204);
    expect(res.body).toEqual({});
    expect(memosModel.deleteMemo).toHaveBeenCalledWith(7);
  });
});