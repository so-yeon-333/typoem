const request = require('supertest');

// Mock the network at the global.fetch boundary rather than mocking the
// todayController module. This keeps the test decoupled from how publicController
// happens to obtain its fetch helper, and it exercises the real
// fetchRandomFromApi (timeout/abort/shape handling) end to end.
const app = require('../../app');

// Build a PoetryDB-shaped Response stub for global.fetch.
function fetchOk(poem) {
  return {
    ok: true,
    json: async () => [poem],
  };
}

describe('GET /api/public/poem', () => {
  const realFetch = global.fetch;

  afterEach(() => {
    global.fetch = realFetch;
    jest.restoreAllMocks();
  });

  test('200 - returns a poem to a visitor with no auth token (live path)', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      fetchOk({
        title: 'Fragment',
        author: 'Percy Bysshe Shelley',
        lines: ['line one', 'line two', 'line three', 'line four'],
      })
    );

    // no Authorization header on purpose: this endpoint must be public
    const res = await request(app).get('/api/public/poem');

    expect(res.status).toBe(200);
    expect(res.body.poem).toMatchObject({
      title: 'Fragment',
      author: 'Percy Bysshe Shelley',
    });
    expect(Array.isArray(res.body.poem.lines)).toBe(true);
  });

  test('200 - falls back to the local pool when live PoetryDB is unavailable', async () => {
    // every live attempt fails -> controller should break and use data/poems.json
    global.fetch = jest.fn().mockRejectedValue(new Error('network down'));

    const res = await request(app).get('/api/public/poem');

    expect(res.status).toBe(200);
    expect(res.body.poem).toBeDefined();
    const nonEmpty = res.body.poem.lines.filter((l) => l && l.trim().length > 0).length;
    expect(nonEmpty).toBeGreaterThanOrEqual(4);
    expect(nonEmpty).toBeLessThanOrEqual(12);
  });
});