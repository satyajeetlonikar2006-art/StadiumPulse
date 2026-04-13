const db = require('../config/database');
const { generateId } = require('../utils/crypto');
const wsServer = require('../websocket');

class NotFoundError extends Error {
  constructor(message) { super(message); this.name = 'NotFoundError'; }
}

exports.getAll = async (status, eventId) => {
  const activeEvent = eventId || db.getActiveEvent()?.id;
  let query = 'SELECT * FROM incidents WHERE 1=1';
  const params = [];
  
  if (activeEvent) { query += ' AND event_id = ?'; params.push(activeEvent); }
  if (status) { query += ' AND status = ?'; params.push(status); }
  
  query += ' ORDER BY created_at DESC';
  
  const incidentsList = db.getDb().prepare(query).all(...params);
  
  // Group them for kanban
  const incidents = {
    NEW: [],
    ASSIGNED: [],
    IN_PROGRESS: [],
    RESOLVED: []
  };

  incidentsList.forEach(inc => {
    try { inc.action_log = JSON.parse(inc.action_log || '[]'); } catch(e) { inc.action_log = []; }
    if (incidents[inc.status]) incidents[inc.status].push(inc);
  });
  
  return { incidents };
};

exports.getById = async (id) => {
  const incident = db.getDb().prepare('SELECT * FROM incidents WHERE id = ?').get(id);
  if (!incident) throw new NotFoundError('Incident not found');
  try { incident.action_log = JSON.parse(incident.action_log || '[]'); } catch(e) { incident.action_log = []; }
  return { incident };
};

exports.create = async (body) => {
  const id = generateId();
  const dbConn = db.getDb();
  const activeEvent = db.getActiveEvent()?.id;
  if (!activeEvent) throw new Error('No active event');
  
  const now = Date.now();
  const initialLog = JSON.stringify([{ time: now, user: body.createdBy, note: 'Incident reported' }]);

  dbConn.prepare('INSERT INTO incidents (id, event_id, type, severity, zone_id, description, status, assigned_to, action_log, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, activeEvent, body.type, body.severity, body.zoneId || null, body.description, 'NEW', body.assignedTo || null, initialLog, now, now);

  const { incident } = await this.getById(id);
  
  if (wsServer && wsServer.broadcastToRole) {
    wsServer.broadcastToRole('organizer', {
      type: 'INCIDENT_UPDATE',
      payload: { id, status: 'NEW', assignedTo: body.assignedTo || null, updatedAt: now },
      timestamp: now
    });
  }

  return { incident };
};

exports.updateStatus = async (id, status, note, user) => {
  const { incident } = await this.getById(id);
  const now = Date.now();
  
  const log = incident.action_log;
  log.push({ time: now, user, note: note || `Status changed to ${status}` });
  
  const dbConn = db.getDb();
  let query = 'UPDATE incidents SET status = ?, action_log = ?, updated_at = ?';
  const params = [status, JSON.stringify(log), now];
  
  if (status === 'RESOLVED') {
    query += ', resolved_at = ?';
    params.push(now);
  }
  
  query += ' WHERE id = ?';
  params.push(id);
  
  dbConn.prepare(query).run(...params);
  
  if (wsServer && wsServer.broadcastToRole) {
    wsServer.broadcastToRole('organizer', {
      type: 'INCIDENT_UPDATE',
      payload: { id, status, assignedTo: incident.assigned_to, updatedAt: now },
      timestamp: now
    });
  }
  
  return this.getById(id);
};

exports.assign = async (id, staffName) => {
  const { incident } = await this.getById(id);
  const now = Date.now();
  
  const log = incident.action_log;
  log.push({ time: now, user: 'System', note: `Assigned to ${staffName}` });
  
  db.getDb().prepare('UPDATE incidents SET assigned_to = ?, status = "ASSIGNED", action_log = ?, updated_at = ? WHERE id = ?')
    .run(staffName, JSON.stringify(log), now, id);

  if (wsServer && wsServer.broadcastToRole) {
    wsServer.broadcastToRole('organizer', {
      type: 'INCIDENT_UPDATE',
      payload: { id, status: 'ASSIGNED', assignedTo: staffName, updatedAt: now },
      timestamp: now
    });
  }
  
  return this.getById(id);
};
