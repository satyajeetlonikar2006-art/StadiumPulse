const fs = require('fs');
const path = require('path');
const db = require('../config/database');
const { generateId } = require('../utils/crypto');
const wsServer = require('../websocket');
const SimulationService = require('./simulation.service');

const menuData = JSON.parse(fs.readFileSync(path.join(__dirname, '../../data/menu.json'), 'utf8'));

class ValidationError extends Error {
  constructor(message) { super(message); this.name = 'ValidationError'; }
}
class ForbiddenError extends Error {
  constructor(message) { super(message); this.name = 'ForbiddenError'; }
}
class NotFoundError extends Error {
  constructor(message) { super(message); this.name = 'NotFoundError'; }
}

exports.getAll = async (user, overrideEventId) => {
  const eventId = overrideEventId || db.getActiveEvent()?.id;
  let query = 'SELECT * FROM orders WHERE event_id = ?';
  const params = [eventId];

  if (user.role !== 'organizer' && user.role !== 'admin') {
    query += ' AND user_id = ?';
    params.push(user.id);
  }

  query += ' ORDER BY created_at DESC';
  
  const orders = db.getDb().prepare(query).all(...params);
  orders.forEach(o => { try { o.items = JSON.parse(o.items); } catch(e) {} });
  
  return { orders };
};

exports.getById = async (id, user) => {
  const order = db.getDb().prepare('SELECT * FROM orders WHERE id = ?').get(id);
  if (!order) throw new NotFoundError('Order not found');
  
  if (user.role !== 'organizer' && user.role !== 'admin' && order.user_id !== user.id) {
    throw new ForbiddenError('Access denied');
  }

  try { order.items = JSON.parse(order.items); } catch(e) {}
  return { order };
};

exports.create = async (userId, data) => {
  const stall = menuData.find(s => s.stallId === data.stallId);
  if (!stall) throw new ValidationError('Invalid stallId');

  let totalAmount = 0;
  const processedItems = [];

  for (const itemReq of data.items) {
    const menuItem = stall.items.find(i => i.id === itemReq.itemId);
    if (!menuItem) throw new ValidationError(`Invalid itemId ${itemReq.itemId}`);
    totalAmount += menuItem.price * itemReq.qty;
    processedItems.push({ itemId: menuItem.id, name: menuItem.name, qty: itemReq.qty, price: menuItem.price });
  }

  const simState = SimulationService.getFacilityState(data.stallId);
  // Assume wait time + 5 mins prep for stall orders
  const currentWait = simState ? Math.round(simState.queue / Math.max(1, simState.capacity)) : 2;
  const estimatedTime = Date.now() + ((currentWait + processedItems.length * 2) * 60000);
  
  const pickupCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  const id = generateId();
  const eventId = db.getActiveEvent()?.id;
  if (!eventId) throw new Error('No active event');
  const now = Date.now();

  db.getDb().prepare('INSERT INTO orders (id, user_id, event_id, stall_id, items, total_amount, status, seat, payment_method, pickup_code, pickup_time, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, userId, eventId, data.stallId, JSON.stringify(processedItems), totalAmount, 'PLACED', data.seat || null, data.paymentMethod, pickupCode, estimatedTime, now, now);

  const { order } = await this.getById(id, { role: 'organizer' });
  
  if (wsServer && wsServer.sendToUser) {
    wsServer.sendToUser(userId, {
      type: 'ORDER_UPDATE',
      payload: { orderId: id, status: 'PLACED', pickupCode, estimatedTime },
      timestamp: now
    });
  }

  return { order };
};

exports.updateStatus = async (id, status) => {
  const dbConn = db.getDb();
  const now = Date.now();
  dbConn.prepare('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?').run(status, now, id);
  const order = dbConn.prepare('SELECT user_id, pickup_code, pickup_time FROM orders WHERE id = ?').get(id);
  
  if (wsServer && wsServer.sendToUser && order) {
    wsServer.sendToUser(order.user_id, {
      type: 'ORDER_UPDATE',
      payload: { orderId: id, status, pickupCode: order.pickup_code, estimatedTime: order.pickup_time },
      timestamp: now
    });
  }

  return this.getById(id, { role: 'organizer' });
};

exports.cancelOrder = async (id, user) => {
  const { order } = await this.getById(id, user);
  if (order.status !== 'PLACED') {
    throw new ValidationError('Can only cancel PLACED orders');
  }
  
  db.getDb().prepare('DELETE FROM orders WHERE id = ?').run(id);
  return { message: 'Order cancelled' };
};
