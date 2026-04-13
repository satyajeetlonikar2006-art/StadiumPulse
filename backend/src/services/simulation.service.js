const db = require('../config/database');
const { generateId } = require('../utils/crypto');
const wsServer = require('../websocket'); // Will be implemented in websocket.js

class SimulationService {
  constructor() {
    this.interval = null;
    this.eventId = null;
    this.phase = 'PRE_MATCH';
    this.matchMinute = 0;
    this.tickRate = parseInt(process.env.SIMULATION_TICK_RATE_MS || '5000', 10);
    this.simulationRunning = false;

    // Load static constraints
    this.zones = {
      north: { capacity: 8000, count: 0 },
      south: { capacity: 8000, count: 0 },
      east: { capacity: 6000, count: 0 },
      west: { capacity: 6000, count: 0 },
      vip: { capacity: 2000, count: 0 },
      media: { capacity: 500, count: 0 }
    };

    // Keep queues instead of simple counts for facilities waiting queue
    this.facilities = {
      gate_a: { type: 'gate', capacity: 200, queue: 0, processingRate: 20 },
      gate_b: { type: 'gate', capacity: 200, queue: 0, processingRate: 20 },
      gate_c: { type: 'gate', capacity: 200, queue: 0, processingRate: 20 },
      gate_d: { type: 'gate', capacity: 200, queue: 0, processingRate: 20 },
      food_f1: { type: 'food', capacity: 50, queue: 0, processingRate: 4 },
      food_f2: { type: 'food', capacity: 50, queue: 0, processingRate: 4 },
      food_f3: { type: 'food', capacity: 50, queue: 0, processingRate: 4 },
      food_f4: { type: 'food', capacity: 50, queue: 0, processingRate: 4 },
      food_f5: { type: 'food', capacity: 40, queue: 0, processingRate: 4 },
      food_f6: { type: 'food', capacity: 40, queue: 0, processingRate: 4 },
      wc_w1: { type: 'washroom', capacity: 30, queue: 0, processingRate: 8 },
      wc_w2: { type: 'washroom', capacity: 30, queue: 0, processingRate: 8 },
      wc_w3: { type: 'washroom', capacity: 30, queue: 0, processingRate: 8 },
      wc_w4: { type: 'washroom', capacity: 30, queue: 0, processingRate: 8 },
      parking_p1: { type: 'parking', capacity: 300, queue: 0, processingRate: 15 },
      parking_p2: { type: 'parking', capacity: 300, queue: 0, processingRate: 15 }
    };

    this.MULTIPLIERS = {
      PRE_MATCH: { gates: 0.8, food: 0.1, wc: 0.1, zones: 0.6, drainGates: false },
      IN_PLAY_1: { gates: 0.2, food: 0.3, wc: 0.3, zones: 0.1, drainGates: false },
      DRINKS_BREAK: { gates: 0.1, food: 1.0, wc: 0.9, zones: -0.1, drainGates: false },
      HALFTIME: { gates: 0.15, food: 1.5, wc: 1.2, zones: -0.3, drainGates: false },
      IN_PLAY_2: { gates: 0.1, food: 0.3, wc: 0.3, zones: 0.1, drainGates: false },
      POST_MATCH: { gates: 2.0, food: 0.1, wc: 0.5, zones: -0.8, drainGates: true }
    };
    
    this.tickCounter = 0;
  }

  start(eventId) {
    if (this.simulationRunning) return;
    this.eventId = eventId;
    this.simulationRunning = true;
    
    // Load event setup from DB
    const event = db.getDb().prepare('SELECT * FROM events WHERE id = ?').get(eventId);
    if (event) {
      this.phase = event.phase;
      this.matchMinute = event.match_minute;
    }

    this.interval = setInterval(() => this.tick(), this.tickRate);
    console.log(`Simulation started for event ${eventId}`);
  }

  stop() {
    if (this.interval) clearInterval(this.interval);
    this.simulationRunning = false;
    console.log('Simulation stopped');
  }

  tick() {
    this.tickCounter++;
    const multipliers = this.MULTIPLIERS[this.phase] || this.MULTIPLIERS['PRE_MATCH'];
    
    const dbConn = db.getDb();
    const now = Date.now();
    const tx = dbConn.transaction(() => {
      // 1. Process Zones
      for (const [zoneId, state] of Object.entries(this.zones)) {
        let baseChange = state.capacity * multipliers.zones * 0.02;
        // Invert for emptying
        if (multipliers.zones < 0 && state.count > 0) baseChange = state.capacity * multipliers.zones * 0.02;
        
        const randomVariance = Math.abs(baseChange) * (Math.random() - 0.45);
        state.count = Math.max(0, Math.min(state.capacity, Math.round(state.count + baseChange + randomVariance)));
        
        const density = state.capacity > 0 ? (state.count / state.capacity) : 0;
        
        // Persist
        dbConn.prepare('INSERT INTO zone_snapshots (event_id, zone_id, count, capacity, density, timestamp) VALUES (?, ?, ?, ?, ?, ?)')
          .run(this.eventId, zoneId, state.count, state.capacity, density, now);

        // Alert Triggers
        if (density > 0.90) {
          this._triggerAlert(zoneId, null, 'CROWD', 4, `Critical density in ${zoneId.toUpperCase()} zone. Redirect crowd immediately.`);
        } else if (density > 0.80) {
          this._triggerAlert(zoneId, null, 'CROWD', 2, `High density approaching in ${zoneId.toUpperCase()} zone.`);
        }
      }

      // 2. Process Facilities
      for (const [facId, state] of Object.entries(this.facilities)) {
        let multi = multipliers[state.type] || 0.1;
        if (state.type === 'gate' && multipliers.drainGates) {
          // Emptying stadium gates have huge queues
          multi = multipliers.gates;
        }

        // Random arrival
        let arrivalRate = Math.round(state.capacity * multi * 0.1 * (0.8 + Math.random() * 0.4));
        
        // Processing (removing from queue)
        let processRate = Math.round(state.processingRate * (this.tickRate / 60000));
        
        state.queue = Math.max(0, state.queue + arrivalRate - processRate);
        const densityFactor = state.queue > state.capacity ? 1.5 : 1.0;
        const waitMinutes = Math.round((state.queue / Math.max(1, state.processingRate)) * densityFactor);
        const facDensity = state.queue > 0 ? Math.min(1.0, state.queue / (state.capacity * 2)) : 0;

        // Persist
        dbConn.prepare('INSERT INTO facility_snapshots (event_id, facility_id, queue_length, wait_time, density, timestamp) VALUES (?, ?, ?, ?, ?, ?)')
          .run(this.eventId, facId, state.queue, waitMinutes, facDensity, now);

        // Alert Triggers
        if (waitMinutes > 25) {
          this._triggerAlert(null, facId, 'FACILITY', 3, `Excessive wait time (${waitMinutes}m) at ${facId}. Dispatch staff.`);
        } else if (waitMinutes > 15) {
          this._triggerAlert(null, facId, 'FACILITY', 2, `Long queue forming (${waitMinutes}m) at ${facId}.`);
        }
      }
    });

    tx(); // Execute transaction

    // Send WebSockets
    this._broadcastUpdates();

    // Random Incident Triggers based on ticks (assume ~5s ticks, 45 min = 540 ticks)
    if (this.tickCounter % 540 === 0 && Math.random() < 0.15) {
      this.triggerIncident('MEDICAL');
    }
  }

  setPhase(phase) {
    if (!this.MULTIPLIERS[phase]) throw new Error('Invalid phase');
    const prevPhase = this.phase;
    this.phase = phase;
    db.getDb().prepare('UPDATE events SET phase = ? WHERE id = ?').run(phase, this.eventId);
    
    // Broadcast via WS
    if (wsServer && wsServer.broadcast) {
      wsServer.broadcast({
        type: 'PHASE_CHANGE',
        payload: { phase, previousPhase: prevPhase, matchMinute: this.matchMinute },
        timestamp: Date.now()
      });
    }
    console.log(`Phase changed to ${phase}`);
  }

  fastForward(minutes) {
    console.log(`Fast forwarding ${minutes} minutes...`);
    const ticks = Math.round((minutes * 60000) / this.tickRate);
    for (let i = 0; i < ticks; i++) {
      this.tick();
    }
    return this.getSnapshot();
  }

  triggerIncident(type) {
    const zonesArray = Object.keys(this.zones);
    const z = zonesArray[Math.floor(Math.random() * zonesArray.length)];
    const dbConn = db.getDb();
    
    let description = 'Unknown incident';
    let severity = 2;
    if (type === 'MEDICAL') { description = 'Fan required medical attention'; severity = 3; }
    else if (type === 'GATE') { description = 'Technical issue at turnstile'; severity = 2; }
    else if (type === 'CROWD') { description = 'Crowd pushing reported'; severity = 4; }

    const id = generateId();
    dbConn.prepare('INSERT INTO incidents (id, event_id, type, severity, zone_id, description, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, this.eventId, type, severity, z, description, 'NEW', Date.now());

    if (wsServer && wsServer.broadcastToRole) {
      wsServer.broadcastToRole('organizer', {
        type: 'INCIDENT_UPDATE',
        payload: { id, status: 'NEW', assignedTo: null, updatedAt: Date.now() },
        timestamp: Date.now()
      });
    }
  }

  getSnapshot() {
    const payload = { zones: {}, facilities: {} };
    for (const [id, z] of Object.entries(this.zones)) {
      payload.zones[id] = { count: z.count, capacity: z.capacity, density: z.capacity > 0 ? (z.count / z.capacity) : 0, trend: 'stable', waitTime: 0 };
    }
    for (const [id, f] of Object.entries(this.facilities)) {
      const wait = Math.round(f.queue / Math.max(1, f.processingRate));
      payload.facilities[id] = { queueLength: f.queue, waitTime: wait, density: f.queue / f.capacity, trend: 'stable' };
    }
    return payload;
  }

  getZoneState(zoneId) { return this.zones[zoneId] || null; }
  getFacilityState(id) { return this.facilities[id] || null; }

  resetToPhase(phase) {
    // Reset back to zero logic could go here depending on requirements
    this.setPhase(phase);
  }

  getHistory(entityId, minutes, type = 'zone') {
    const timestampCutoff = Date.now() - (minutes * 60000);
    const table = type === 'zone' ? 'zone_snapshots' : 'facility_snapshots';
    const idField = type === 'zone' ? 'zone_id' : 'facility_id';
    
    return db.getDb().prepare(`SELECT * FROM ${table} WHERE event_id = ? AND ${idField} = ? AND timestamp >= ? ORDER BY timestamp ASC`)
      .all(this.eventId, entityId, timestampCutoff);
  }

  _triggerAlert(zoneId, facilityId, type, severity, message) {
    const dbConn = db.getDb();
    // Throttle duplicate active alerts for the same entity
    const existing = dbConn.prepare(`SELECT id FROM alerts WHERE event_id = ? AND type = ? AND severity = ? AND is_resolved = 0 AND (zone_id = ? OR facility_id = ?) LIMIT 1`)
      .get(this.eventId, type, severity, zoneId || '', facilityId || '');
    
    if (existing) return; // Alert already active

    const id = generateId();
    const now = Date.now();
    dbConn.prepare('INSERT INTO alerts (id, event_id, type, severity, zone_id, facility_id, message, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, this.eventId, type, severity, zoneId, facilityId, message, now);

    if (wsServer && wsServer.broadcastToRole) {
      wsServer.broadcastToRole('organizer', {
        type: 'ALERT_NEW',
        payload: { id, type, severity, zoneId, facilityId, message, timestamp: now },
        timestamp: now
      });
    }
  }

  _broadcastUpdates() {
    if (!wsServer || !wsServer.broadcast) return;
    const snap = this.getSnapshot();
    
    wsServer.broadcast({
      type: 'ZONE_UPDATE',
      payload: { zones: snap.zones },
      timestamp: Date.now()
    });

    wsServer.broadcast({
      type: 'FACILITY_UPDATE',
      payload: { facilities: snap.facilities },
      timestamp: Date.now()
    });
  }
}

// Export a singleton instance
const instance = new SimulationService();
module.exports = instance;
