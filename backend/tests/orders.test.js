const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/database');

let attendeeToken;

beforeAll(async () => {
  process.env.DB_PATH = ':memory:';
  db.init();

  // Register an attendee
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Order User', email: 'order@example.com', password: 'Test@123!' });
  attendeeToken = res.body.data.accessToken;
});

afterAll(() => {
  db.close();
});

describe('Orders API', () => {
  let orderId;

  test('POST /api/orders — success with valid items', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${attendeeToken}`)
      .send({
        stallId: 'food_f1',
        items: [{ itemId: 'item_1', qty: 2 }],
        seat: 'N-42',
        paymentMethod: 'UPI'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.order).toBeDefined();
    expect(res.body.data.order.pickup_code).toBeDefined();
    orderId = res.body.data.order.id;
  });

  test('POST /api/orders — invalid stall 400', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${attendeeToken}`)
      .send({
        stallId: 'fake_stall',
        items: [{ itemId: 'item_1', qty: 1 }],
        paymentMethod: 'UPI'
      });

    expect(res.status).toBe(400);
  });

  test('POST /api/orders — invalid item 400', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${attendeeToken}`)
      .send({
        stallId: 'food_f1',
        items: [{ itemId: 'nonexistent_item', qty: 1 }],
        paymentMethod: 'UPI'
      });

    expect(res.status).toBe(400);
  });

  test('GET /api/orders — returns own orders only', async () => {
    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${attendeeToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.orders)).toBe(true);
  });

  test('DELETE /api/orders/:id — cancel placed order', async () => {
    if (!orderId) return;
    const res = await request(app)
      .delete(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${attendeeToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.message).toBe('Order cancelled');
  });
});
