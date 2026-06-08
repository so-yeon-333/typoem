const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../../app");

jest.mock("../../models/vocabModel");
jest.mock("../../models/usersModel");
const vocabModel = require("../../models/vocabModel");
const usersModel = require("../../models/usersModel");

const token = jwt.sign(
  { id: 1, username: "alice" },
  process.env.JWT_SECRET,
  { expiresIn: "1h" }
);

beforeEach(() => {
  jest.clearAllMocks();
  usersModel.findById.mockResolvedValue({ id: 1, username: "alice", nickname: "Alice" });
});

describe("GET /api/vocab", () => {
  test("returns 401 when no Authorization header is sent", async () => {
    const res = await request(app).get("/api/vocab");

    expect(res.statusCode).toBe(401);
    expect(vocabModel.listForUser).not.toHaveBeenCalled();
  });

  test("returns 200 with the current user's saved words", async () => {
    const words = [
      { id: 2, word: "clever", phonetic: "/ˈklɛvə/", definition: "quick to learn", created_at: "2026-06-08 09:00:00" },
      { id: 1, word: "brook", phonetic: null, definition: "a small stream", created_at: "2026-06-07 09:00:00" },
    ];
    vocabModel.listForUser.mockResolvedValue(words);

    const res = await request(app)
      .get("/api/vocab")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(words);
    expect(vocabModel.listForUser).toHaveBeenCalledWith(1);
  });
});

describe("POST /api/vocab", () => {
  const validBody = {
    word: "clever",
    phonetic: "/ˈklɛvə/",
    definition: "Quick to understand, learn, and devise or apply ideas.",
  };

  test("returns 401 when no Authorization header is sent", async () => {
    const res = await request(app).post("/api/vocab").send(validBody);

    expect(res.statusCode).toBe(401);
    expect(vocabModel.add).not.toHaveBeenCalled();
  });

  test("returns 400 when the word is missing", async () => {
    const res = await request(app)
      .post("/api/vocab")
      .set("Authorization", `Bearer ${token}`)
      .send({ definition: "some definition" });

    expect(res.statusCode).toBe(400);
    expect(vocabModel.add).not.toHaveBeenCalled();
  });

  test("returns 400 when the word contains invalid characters", async () => {
    const res = await request(app)
      .post("/api/vocab")
      .set("Authorization", `Bearer ${token}`)
      .send({ word: "clever123", definition: "quick to learn" });

    expect(res.statusCode).toBe(400);
    expect(vocabModel.add).not.toHaveBeenCalled();
  });

  test("returns 400 when the definition is missing", async () => {
    const res = await request(app)
      .post("/api/vocab")
      .set("Authorization", `Bearer ${token}`)
      .send({ word: "clever" });

    expect(res.statusCode).toBe(400);
    expect(vocabModel.add).not.toHaveBeenCalled();
  });

  test("returns 201 and saves the word for a valid body", async () => {
    vocabModel.add.mockResolvedValue({ lastID: 5, changes: 1 });

    const res = await request(app)
      .post("/api/vocab")
      .set("Authorization", `Bearer ${token}`)
      .send(validBody);

    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({
      word: "clever",
      phonetic: "/ˈklɛvə/",
      definition: "Quick to understand, learn, and devise or apply ideas.",
    });
    expect(vocabModel.add).toHaveBeenCalledWith(
      1,
      "clever",
      "/ˈklɛvə/",
      "Quick to understand, learn, and devise or apply ideas."
    );
  });

  test("ignores a duplicate word without error", async () => {
    vocabModel.add.mockResolvedValue({ lastID: 0, changes: 0 });

    const res = await request(app)
      .post("/api/vocab")
      .set("Authorization", `Bearer ${token}`)
      .send(validBody);

    expect(res.statusCode).toBe(201);
    expect(vocabModel.add).toHaveBeenCalledTimes(1);
  });
});

describe("DELETE /api/vocab/:id", () => {
  test("returns 401 when no Authorization header is sent", async () => {
    const res = await request(app).delete("/api/vocab/1");

    expect(res.statusCode).toBe(401);
    expect(vocabModel.remove).not.toHaveBeenCalled();
  });

  test("returns 400 when the id is not a positive integer", async () => {
    const res = await request(app)
      .delete("/api/vocab/abc")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(400);
    expect(vocabModel.remove).not.toHaveBeenCalled();
  });

  test("returns 204 with an empty body when the word is deleted", async () => {
    vocabModel.remove.mockResolvedValue({ changes: 1 });

    const res = await request(app)
      .delete("/api/vocab/1")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(204);
    expect(res.body).toEqual({});
    expect(vocabModel.remove).toHaveBeenCalledWith(1, 1);
  });
});