const request = require('supertest');
const app = require('../app');

describe('Sanity check', () => {
  test('basic math works', () => {
    expect(1 + 1).toBe(2);
  });

  test('GET /api/health returns 200', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.app).toBe('Typoem');
  });
});