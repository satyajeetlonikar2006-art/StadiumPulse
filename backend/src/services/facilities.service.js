const fs = require('fs');
const path = require('path');
const db = require('../config/database');
const { generateId } = require('../utils/crypto');
const SimulationService = require('./simulation.service');

const facilitiesData = JSON.parse(fs.readFileSync(path.join(__dirname, '../../data/facilities.json'), 'utf8'));
const activeWatchers = new Map();

class NotFoundError extends Error {
  constructor(message) { super(message); this.name = 'NotFoundError'; }
}

exports.getAll = async (typeFilter) => {
  const currentSnapshot = SimulationService.getSnapshot();
  let facs = facilitiesData;
  if (typeFilter) facs = facs.filter(f => f.type === typeFilter);
  
  const res = facs.map(f => {
    const current = currentSnapshot.facilities[f.id] || { queueLength: 0, waitTime: 0, density: 0, trend: 'stable' };
    return { ...f, current };
  });
  return { facilities: res };
};

exports.getById = async (id) => {
  const meta = facilitiesData.find(f => f.id === id);
  if (!meta) throw new NotFoundError('Facility not found');
  const sim = SimulationService.getFacilityState(id) || { queue: 0, capacity: meta.capacity };
  const waitMinutes = Math.round(sim.queue / Math.max(1, meta.processingRate));
  return { facility: { ...meta, queueLength: sim.queue, waitTime: waitMinutes } };
};

exports.getHistory = async (id, minutes) => {
  const history = SimulationService.getHistory(id, minutes, 'facility');
  return { history: history.map(h => ({ timestamp: h.timestamp, waitTime: h.wait_time, queueLength: h.queue_length })) };
};

exports.getForecast = async (id) => {
  const history = SimulationService.getHistory(id, 30, 'facility');
  const sim = SimulationService.getFacilityState(id);
  const meta = facilitiesData.find(f => f.id === id);
  if (history.length < 2 || !sim || !meta) return { forecast: [{ minutesFromNow: 30, predictedWait: 0 }] };
  
  const first = history[0];
  const last = history[history.length - 1];
  const slope = (last.wait_time - first.wait_time) / (last.timestamp - first.timestamp); 
  
  const forecast = [];
  for (let i = 1; i <= 6; i++) {
    const mins = i * 5;
    const timeDelta = mins * 60000;
    const predictWait = Math.max(0, Math.round(last.wait_time + (slope * timeDelta)));
    forecast.push({ minutesFromNow: mins, predictedWait: predictWait });
  }
  return { forecast };
};

exports.setNotify = async (facId, userId, thresholdMinutes) => {
  const watcherId = generateId();
  activeWatchers.set(watcherId, { facId, userId, thresholdMinutes });
  // Note: True implementation would have SimulationService check activeWatchers every tick
  // and trigger WS notifications.
  return { watcherId, message: 'Notification set' };
};

exports.cancelNotify = async (watcherId) => {
  activeWatchers.delete(watcherId);
  return { message: 'Notification cancelled' };
};

// Virtual Queue basic implementation
exports.joinQueue = async (facId, userId) => {
  const meta = facilitiesData.find(f => f.id === facId);
  if (!meta) throw new NotFoundError('Facility not found');
  const dbConn = db.getDb();
  const event = db.getActiveEvent();
  
  const existing = dbConn.prepare('SELECT id FROM virtual_queue_entries WHERE event_id = ? AND facility_id = ? AND user_id = ? AND status = "WAITING"').get(event.id, facId, userId);
  if (existing) throw new Error('Already in queue');

  const currentMax = dbConn.prepare('SELECT MAX(position) as maxPos FROM virtual_queue_entries WHERE event_id = ? AND facility_id = ?').get(event.id, facId).maxPos || 0;
  const position = currentMax + 1;
  const simState = SimulationService.getFacilityState(facId);
  const waitMinutes = simState ? Math.round(simState.queue / Math.max(1, meta.processingRate)) : 0;
  
  const estimatedCallTime = Date.now() + (waitMinutes * 60000);
  const qId = generateId();
  
  dbConn.prepare('INSERT INTO virtual_queue_entries (id, user_id, facility_id, event_id, position, status, estimated_call_time, joined_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(qId, userId, facId, event.id, position, 'WAITING', estimatedCallTime, Date.now());
    
  return { entry: { position, estimatedCallTime } };
};

exports.leaveQueue = async (facId, userId) => {
  db.getDb().prepare('UPDATE virtual_queue_entries SET status = "CANCELLED" WHERE facility_id = ? AND user_id = ? AND status = "WAITING"').run(facId, userId);
  return { message: 'Left queue' };
};

exports.queueStatus = async (facId, userId) => {
  const entry = db.getDb().prepare('SELECT * FROM virtual_queue_entries WHERE facility_id = ? AND user_id = ? AND status = "WAITING" ORDER BY joined_at DESC LIMIT 1').get(facId, userId);
  if (!entry) return null;
  const servedPos = db.getDb().prepare('SELECT MAX(position) as maxPos FROM virtual_queue_entries WHERE facility_id = ? AND status = "CALLED"').get(facId).maxPos || 0;
  const ahead = entry.position - servedPos;
  return { position: entry.position, estimatedCallTime: entry.estimated_call_time, aheadOfYou: Math.max(0, ahead - 1) };
};
