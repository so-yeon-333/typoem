const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../../app");

jest.mock("../../models/poemsModel");
jest.mock("../../models/roomsModel");
jest.mock("../../models/usersModel");
const poemsModel = require("../../models/poemsModel");
const roomsModel = require("../../models/roomsModel");
const usersModel = require("../../models/usersModel");

const token = jwt.sign(
  { id: 1, username: "alice" },
  process.env.JWT_SECRET,
  { expiresIn: "1h" }
);

const room = { id: 5, name: "English Lit Study", owner_id: 1 };

beforeEach(() => {
  jest.clearAllMocks();
  usersModel.findById.mockResolvedValue({ id: 1, username: "alice", nickname: "Alice" });
});

describe("GET /api/rooms/:id/history", () => {
  test("returns 401 when no Authorization header is sent", async () => {
    const res = await request(app).get("/api/rooms/5/history");

    expect(res.statusCode).toBe(401);
    expect(poemsModel.listRoomHistory).not.toHaveBeenCalled();
  });

  test("returns 400 when the room id is not a positive integer", async () => {
    const res = await request(app)
      .get("/api/rooms/abc/history")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(400);
    expect(poemsModel.listRoomHistory).not.toHaveBeenCalled();
  });

  test("returns 404 when the room does not exist", async () => {
    roomsModel.findById.mockResolvedValue(undefined);

    const res = await request(app)
      .get("/api/rooms/5/history")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(404);
    expect(roomsModel.isMember).not.toHaveBeenCalled();
    expect(poemsModel.listRoomHistory).not.toHaveBeenCalled();
  });

  test("returns 403 when the user is not a member of the room", async () => {
    roomsModel.findById.mockResolvedValue(room);
    roomsModel.isMember.mockResolvedValue(false);

    const res = await request(app)
      .get("/api/rooms/5/history")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(403);
    expect(poemsModel.listRoomHistory).not.toHaveBeenCalled();
  });

  test("returns 200 with the room history for a member", async () => {
    roomsModel.findById.mockResolvedValue(room);
    roomsModel.isMember.mockResolvedValue(true);

    const history = [
      { date: "2026-06-08", poem_id: 3, title: "Now We Are Six", author: "A. A. Milne", contributor_count: 2, contributors: "Soyeon,Jiseop" },
      { date: "2026-06-07", poem_id: 2, title: "The Brook", author: "Alfred Tennyson", contributor_count: 0, contributors: null },
    ];
    poemsModel.listRoomHistory.mockResolvedValue(history);

    const res = await request(app)
      .get("/api/rooms/5/history")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      room: { id: 5, name: "English Lit Study" },
      history,
    });
    expect(poemsModel.listRoomHistory).toHaveBeenCalledWith(5);
  });
});