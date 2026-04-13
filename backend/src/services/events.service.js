const db = require('../config/database');
const { generateId } = require('../utils/crypto');
const SimulationService = require('./simulation.service');

class NotFoundError extends Error {
  constructor(message) { super(message); this.name = 'NotFoundError'; }
}

exports.getAll = async () => {
  const events = db.getDb().prepare('SELECT * FROM events ORDER BY start_time DESC').all();
  const activeCount = db.getDb().prepare('SELECT count(*) as count FROM events WHERE is_active = 1').get().count;
  return { events, total: events.length, active: activeCount };
};

exports.getActive = async () => {
  const event = db.getActiveEvent();
  if (!event) throw new NotFoundError('No active events');
  return { event };
};

exports.getById = async (id) => {
  const event = db.getDb().prepare('SELECT * FROM events WHERE id = ?').get(id);
  if (!event) throw new NotFoundError('Event not found');
  return { event };
};

exports.create = async (body) => {
  const id = generateId();
  db.getDb().prepare('INSERT INTO events (id, name, venue, team_home, team_away, start_time, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(id, body.name, body.venue, body.teamHome, body.teamAway, body.start_time, Date.now());
  const event = db.getDb().prepare('SELECT * FROM events WHERE id = ?').get(id);
  return { event };
};

exports.updatePhase = async (id, phase) => {
  const event = await this.getById(id);
  SimulationService.setPhase(phase); // This persists and broadcasts
  const updatedEvent = await this.getById(id);
  return updatedEvent;
};

exports.fastForward = async (id, minutes) => {
  const snapshot = SimulationService.fastForward(minutes);
  return { snapshot };
};

exports.getTimeline = async (id, from, to) => {
  // Aggregate snapshot counts at specific intervals
  const dbConn = db.getDb();
  let query = 'SELECT timestamp, SUM(count) as totalCount FROM zone_snapshots WHERE event_id = ?';
  const params = [id];
  
  if (from) { query += ' AND timestamp >= ?'; params.push(from); }
  if (to) { query += ' AND timestamp <= ?'; params.push(to); }
  
  // Basic grouping by 15 min approx (needs more complex SQLite datetime logic, simplified here)
  query += ' GROUP BY (timestamp / 900000) ORDER BY timestamp ASC';
  
  const timeline = dbConn.prepare(query).all(...params);
  return { timeline };
};
