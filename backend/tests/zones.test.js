const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/database');

beforeAll(() => {
  process.env.DB_PATH = ':memory:';
  db.init();
});

afterAll(() => {
  db.close();
});

describe('Zones API', () => {
  test('GET /api/zones — returns all zones', async () => {
    const res = await request(app).get('/api/zones');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.zones).toBeDefined();
    expect(Array.isArray(res.body.data.zones)).toBe(true);
  });

  test('GET /api/zones/:id — returns single zone', async () => {
    const res = await request(app).get('/api/zones/north');
    expect(res.status).toBe(200);
    expect(res.body.data.zone).toBeDefined();
    expect(res.body.data.zone.id).toBe('north');
  });

  test('GET /api/zones/:id/history — returns array', async () => {
    const res = await request(app).get('/api/zones/north/history?minutes=30');
    expect(res.status).toBe(200);
    expect(res.body.data.history).toBeDefined();
    expect(Array.isArray(res.body.data.history)).toBe(true);
  });

  test('GET /api/zones/invalid — 404', async () => {
    const res = await request(app).get('/api/zones/nonexistent');
    expect(res.status).toBe(404);
  });
});
