const jwt = require('jsonwebtoken');

// authMiddleware now confirms the token's user still exists in the DB (issue #41),
// so the users model is mocked here to keep this a pure unit test.
jest.mock('../../models/usersModel');
const usersModel = require('../../models/usersModel');
const { authenticate } = require('../../middleware/authMiddleware');

const SECRET = 'test-secret';

function makeReq(authHeader) {
  return { headers: { authorization: authHeader } };
}

function makeRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

beforeAll(() => {
  process.env.JWT_SECRET = SECRET;
});

beforeEach(() => {
  jest.clearAllMocks();
  // by default the token's user exists
  usersModel.findById.mockResolvedValue({ id: 1, username: 'alice', nickname: 'Alice' });
});

describe('authenticate middleware', () => {
  test('passes with a valid Bearer token whose user exists', async () => {
    const token = jwt.sign({ id: 1, username: 'alice' }, SECRET);
    const req = makeReq(`Bearer ${token}`);
    const res = makeRes();
    const next = jest.fn();

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toMatchObject({ id: 1, username: 'alice' });
    expect(res.status).not.toHaveBeenCalled();
  });

  test('returns 401 when the token user no longer exists in the DB', async () => {
    usersModel.findById.mockResolvedValue(undefined);
    const token = jwt.sign({ id: 999, username: 'ghost' }, SECRET);
    const req = makeReq(`Bearer ${token}`);
    const res = makeRes();
    const next = jest.fn();

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 401 when Authorization header is missing', async () => {
    const req = makeReq(undefined);
    const res = makeRes();
    const next = jest.fn();

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
    expect(next).not.toHaveBeenCalled();
    expect(usersModel.findById).not.toHaveBeenCalled();
  });

  test('returns 401 when header does not start with Bearer', async () => {
    const token = jwt.sign({ id: 1, username: 'alice' }, SECRET);
    const req = makeReq(`Token ${token}`);
    const res = makeRes();
    const next = jest.fn();

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 401 when token is invalid (garbage string)', async () => {
    const req = makeReq('Bearer not.a.real.token');
    const res = makeRes();
    const next = jest.fn();

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
    expect(next).not.toHaveBeenCalled();
    expect(usersModel.findById).not.toHaveBeenCalled();
  });

  test('returns 401 when token is expired', async () => {
    const token = jwt.sign({ id: 1, username: 'alice' }, SECRET, { expiresIn: -1 });
    const req = makeReq(`Bearer ${token}`);
    const res = makeRes();
    const next = jest.fn();

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 401 when token is signed with a different secret', async () => {
    const token = jwt.sign({ id: 1, username: 'alice' }, 'wrong-secret');
    const req = makeReq(`Bearer ${token}`);
    const res = makeRes();
    const next = jest.fn();

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});