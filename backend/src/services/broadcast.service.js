const db = require('../config/database');
const { generateId } = require('../utils/crypto');
const wsServer = require('../websocket');
const alertsService = require('./alerts.service');

exports.getAll = async (eventId, limit = 50) => {
  const activeEvent = eventId || db.getActiveEvent()?.id;
  let query = 'SELECT * FROM broadcasts';
  const params = [];
  
  if (activeEvent) {
    query += ' WHERE event_id = ?';
    params.push(activeEvent);
  }
  
  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(parseInt(limit, 10));

  const broadcasts = db.getDb().prepare(query).all(...params);
  broadcasts.forEach(b => {
    try { b.zones = JSON.parse(b.zones || '[]'); } catch(e) { b.zones = []; }
  });
  
  return { broadcasts };
};

exports.create = async (data) => {
  const id = generateId();
  const dbConn = db.getDb();
  const activeEvent = db.getActiveEvent()?.id;
  if (!activeEvent) throw new Error('No active event');
  
  const now = Date.now();
  dbConn.prepare('INSERT INTO broadcasts (id, event_id, sender_id, message, priority, zones, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(id, activeEvent, data.senderId, data.message, data.priority, JSON.stringify(data.zones), now);

  const payload = { id, message: data.message, priority: data.priority, zones: data.zones, senderName: data.senderName };

  if (wsServer) {
    if (data.priority === 'EMERGENCY' || data.zones.includes('all')) {
      wsServer.broadcast({ type: 'BROADCAST', payload, timestamp: now });
    } else {
      wsServer.broadcastToZones(data.zones, { type: 'BROADCAST', payload, timestamp: now });
    }
  }

  const broadcast = dbConn.prepare('SELECT * FROM broadcasts WHERE id = ?').get(id);
  broadcast.zones = JSON.parse(broadcast.zones);
  return { broadcast };
};

exports.createEmergency = async (data) => {
  // Trigger EMERGENCY payload to ALL clients natively via ws
  const eventId = db.getActiveEvent()?.id;
  if (!eventId) throw new Error('No active event');
  
  if (wsServer && wsServer.broadcast) {
    wsServer.broadcast({
      type: 'EMERGENCY',
      payload: { active: true, message: data.message, affectedZones: data.affectedZones },
      timestamp: Date.now()
    });
  }

  // Create severity 5 alerts for each affected zone
  const dbConn = db.getDb();
  const alertsCreated = [];
  
  for (const zoneId of data.affectedZones) {
    const alertId = generateId();
    dbConn.prepare('INSERT INTO alerts (id, event_id, type, severity, zone_id, facility_id, message, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(alertId, eventId, 'CROWD', 5, zoneId, null, data.message, Date.now());
    alertsCreated.push(alertId);
  }

  // Also log it as a broadcast
  const broadcastRes = await this.create({
    senderId: data.senderId,
    senderName: 'SYSTEM',
    message: `EMERGENCY: ${data.message}`,
    priority: 'EMERGENCY',
    zones: data.affectedZones
  });

  return { broadcast: broadcastRes.broadcast, alertsCreated };
};

exports.deactivateEmergency = async () => {
  if (wsServer && wsServer.broadcast) {
    wsServer.broadcast({
      type: 'EMERGENCY',
      payload: { active: false, message: 'Emergency deactivated. Resume normal operations.' },
      timestamp: Date.now()
    });
  }
  return { message: 'Emergency deactivated' };
};
