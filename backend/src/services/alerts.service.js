const db = require('../config/database');
const wsServer = require('../websocket');

class NotFoundError extends Error {
  constructor(message) { super(message); this.name = 'NotFoundError'; }
}

exports.getAll = async (eventId, resolved, severity, limit = 50) => {
  let query = 'SELECT * FROM alerts WHERE 1=1';
  const params = [];
  
  if (eventId) { query += ' AND event_id = ?'; params.push(eventId); }
  if (resolved !== undefined) { query += ' AND is_resolved = ?'; params.push(resolved === 'true' ? 1 : 0); }
  if (severity) { query += ' AND severity = ?'; params.push(severity); }
  
  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(parseInt(limit, 10));

  const alerts = db.getDb().prepare(query).all(...params);
  
  let totalQuery = 'SELECT count(*) as cnt FROM alerts';
  let totalUnresQuery = 'SELECT count(*) as cnt FROM alerts WHERE is_resolved = 0';
  if (eventId) {
    totalQuery += ' WHERE event_id = ?';
    totalUnresQuery += ' AND event_id = ?';
  }
  
  const total = db.getDb().prepare(totalQuery).get(eventId ? [eventId] : []).cnt;
  const unresolved = db.getDb().prepare(totalUnresQuery).get(eventId ? [eventId] : []).cnt;

  return { alerts, total, unresolved };
};

exports.getById = async (id) => {
  const alert = db.getDb().prepare('SELECT * FROM alerts WHERE id = ?').get(id);
  if (!alert) throw new NotFoundError('Alert not found');
  return { alert };
};

exports.resolve = async (id, userId) => {
  const dbConn = db.getDb();
  dbConn.prepare('UPDATE alerts SET is_resolved = 1, resolved_at = ?, resolved_by = ? WHERE id = ?')
    .run(Date.now(), userId, id);
    
  if (wsServer && wsServer.broadcastToRole) {
    wsServer.broadcastToRole('organizer', {
      type: 'ALERT_RESOLVED',
      payload: { id, resolvedAt: Date.now(), resolvedBy: userId },
      timestamp: Date.now()
    });
  }
  
  const alert = dbConn.prepare('SELECT * FROM alerts WHERE id = ?').get(id);
  return { alert, broadcastedViaWS: true };
};

exports.remove = async (id) => {
  const info = db.getDb().prepare('DELETE FROM alerts WHERE id = ?').run(id);
  if (info.changes === 0) throw new NotFoundError('Alert not found');
  return { message: 'Alert deleted' };
};
