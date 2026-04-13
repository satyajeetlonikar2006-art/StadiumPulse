const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/database');

let organizerToken;

beforeAll(async () => {
  process.env.DB_PATH = ':memory:';
  db.init();

  // Register as organizer
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Org User', email: 'org@example.com', password: 'Test@123!', role: 'organizer' });
  organizerToken = res.body.data.accessToken;
});

afterAll(() => {
  db.close();
});

describe('Analytics API', () => {
  test('GET /api/analytics/overview — organizer only', async () => {
    const res = await request(app)
      .get('/api/analytics/overview')
      .set('Authorization', `Bearer ${organizerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('currentInside');
    expect(res.body.data).toHaveProperty('totalOrders');
  });

  test('GET /api/analytics/overview — attendee gets 403', async () => {
    // Register an attendee
    const attRes = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Att', email: 'att_analytics@example.com', password: 'Test@123!' });
    const attToken = attRes.body.data.accessToken;

    const res = await request(app)
      .get('/api/analytics/overview')
      .set('Authorization', `Bearer ${attToken}`);

    expect(res.status).toBe(403);
  });

  test('GET /api/analytics/export — returns CSV content-type', async () => {
    const res = await request(app)
      .get('/api/analytics/export')
      .set('Authorization', `Bearer ${organizerToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
  });

  test('GET /api/analytics/crowd-flow — returns series array', async () => {
    const res = await request(app)
      .get('/api/analytics/crowd-flow')
      .set('Authorization', `Bearer ${organizerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('series');
    expect(Array.isArray(res.body.data.series)).toBe(true);
  });
});
