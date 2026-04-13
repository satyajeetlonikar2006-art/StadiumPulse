const fs = require('fs');
const path = require('path');
const db = require('../config/database');
const { generateId } = require('../utils/crypto');

const parkingData = JSON.parse(fs.readFileSync(path.join(__dirname, '../../data/parking.json'), 'utf8'));

class ValidationError extends Error {
  constructor(message) { super(message); this.name = 'ValidationError'; }
}
class NotFoundError extends Error {
  constructor(message) { super(message); this.name = 'NotFoundError'; }
}

exports.getZones = async () => {
  const eventId = db.getActiveEvent()?.id;
  const dbConn = db.getDb();
  
  const zones = parkingData.map(z => {
    const reserved = dbConn.prepare('SELECT count(*) as cnt FROM parking_reservations WHERE event_id = ? AND zone_id = ? AND status = "ACTIVE"').get(eventId, z.zoneId).cnt;
    return {
      ...z,
      availableCount: Math.max(0, z.capacity - reserved)
    };
  });
  
  return { zones };
};

exports.getBaysByZone = async (zoneId) => {
  const zone = parkingData.find(z => z.zoneId === zoneId);
  if (!zone) throw new NotFoundError('Zone not found');
  
  const eventId = db.getActiveEvent()?.id;
  const reservedBays = db.getDb().prepare('SELECT bay_id, user_id FROM parking_reservations WHERE event_id = ? AND zone_id = ? AND status = "ACTIVE"').all(eventId, zoneId);
  
  const reservedSet = new Map();
  reservedBays.forEach(rb => reservedSet.set(rb.bay_id, rb.user_id));

  const bays = [];
  for (let i = 1; i <= zone.capacity; i++) {
    const bayId = `${zone.prefix}-${i.toString().padStart(3, '0')}`;
    const isReserved = reservedSet.has(bayId);
    bays.push({
      bayId,
      status: isReserved ? 'OCCUPIED' : 'AVAILABLE',
      reservedBy: isReserved ? '***' + reservedSet.get(bayId).substring(0, 4) : null
    });
  }
  
  return { bays };
};

exports.reserve = async (userId, zoneId, bayId, vehicleNumber) => {
  const eventId = db.getActiveEvent()?.id;
  if (!eventId) throw new Error('No active event');
  
  const dbConn = db.getDb();
  const existingUserRes = dbConn.prepare('SELECT id FROM parking_reservations WHERE user_id = ? AND event_id = ? AND status = "ACTIVE"').get(userId, eventId);
  if (existingUserRes) throw new ValidationError('You already have an active parking reservation');

  const bayTaken = dbConn.prepare('SELECT id FROM parking_reservations WHERE event_id = ? AND zone_id = ? AND bay_id = ? AND status = "ACTIVE"').get(eventId, zoneId, bayId);
  if (bayTaken) throw new ValidationError('Bay is already reserved');

  const id = generateId();
  dbConn.prepare('INSERT INTO parking_reservations (id, user_id, event_id, zone_id, bay_id, vehicle_number, status, reserved_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, userId, eventId, zoneId, bayId, vehicleNumber || null, 'ACTIVE', Date.now());

  const reservation = dbConn.prepare('SELECT * FROM parking_reservations WHERE id = ?').get(id);
  return { reservation };
};

exports.cancelReserve = async (id, userId) => {
  const dbConn = db.getDb();
  const res = dbConn.prepare('SELECT user_id FROM parking_reservations WHERE id = ?').get(id);
  if (!res) throw new NotFoundError('Reservation not found');
  if (res.user_id !== userId) throw new Error('Access denied');
  
  dbConn.prepare('UPDATE parking_reservations SET status = "RELEASED", released_at = ? WHERE id = ?').run(Date.now(), id);
  return { message: 'Reservation released' };
};

exports.getMyReservation = async (userId) => {
  const eventId = db.getActiveEvent()?.id;
  const reservation = db.getDb().prepare('SELECT * FROM parking_reservations WHERE user_id = ? AND event_id = ? AND status = "ACTIVE" ORDER BY reserved_at DESC LIMIT 1').get(userId, eventId);
  return { reservation: reservation || null };
};
