const jwt = require('jsonwebtoken');
const { authenticate } = require('../middleware/authMiddleware');

const SECRET = 'test-secret';

// mock req/res/next helpers
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

describe('authenticate middleware', () => {
  test('passes with a valid Bearer token', () => {
    const token = jwt.sign({ id: 1, username: 'alice' }, SECRET);
    const req = makeReq(`Bearer ${token}`);
    const res = makeRes();
    const next = jest.fn();

    authenticate(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toMatchObject({ id: 1, username: 'alice' });
    expect(res.status).not.toHaveBeenCalled();
  });

  test('returns 401 when Authorization header is missing', () => {
    const req = makeReq(undefined);
    const res = makeRes();
    const next = jest.fn();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 401 when header does not start with Bearer', () => {
    const token = jwt.sign({ id: 1, username: 'alice' }, SECRET);
    const req = makeReq(`Token ${token}`);
    const res = makeRes();
    const next = jest.fn();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 401 when token is invalid (garbage string)', () => {
    const req = makeReq('Bearer not.a.real.token');
    const res = makeRes();
    const next = jest.fn();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 401 when token is expired', () => {
    const token = jwt.sign({ id: 1, username: 'alice' }, SECRET, { expiresIn: -1 });
    const req = makeReq(`Bearer ${token}`);
    const res = makeRes();
    const next = jest.fn();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 401 when token is signed with a different secret', () => {
    const token = jwt.sign({ id: 1, username: 'alice' }, 'wrong-secret');
    const req = makeReq(`Bearer ${token}`);
    const res = makeRes();
    const next = jest.fn();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});