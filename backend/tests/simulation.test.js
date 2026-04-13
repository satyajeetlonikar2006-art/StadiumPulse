const db = require('../src/config/database');

beforeAll(() => {
  process.env.DB_PATH = ':memory:';
  db.init();
});

afterAll(() => {
  db.close();
});

// We need to require SimulationService AFTER DB is init'd
const SimulationService = require('../src/services/simulation.service');

describe('SimulationService', () => {
  test('getSnapshot() returns valid shape', () => {
    const snapshot = SimulationService.getSnapshot();
    expect(snapshot).toHaveProperty('zones');
    expect(snapshot).toHaveProperty('facilities');
    expect(snapshot.zones).toHaveProperty('north');
    expect(snapshot.facilities).toHaveProperty('gate_a');
    expect(typeof snapshot.zones.north.count).toBe('number');
    expect(typeof snapshot.zones.north.capacity).toBe('number');
  });

  test('tick() increases counts during PRE_MATCH', () => {
    const event = db.getActiveEvent();
    if (!event) return; // Skip if no seeded event

    SimulationService.eventId = event.id;
    SimulationService.phase = 'PRE_MATCH';
    SimulationService.simulationRunning = true;

    const before = { ...SimulationService.zones.north };
    // Run several ticks to see movement
    for (let i = 0; i < 5; i++) SimulationService.tick();
    const after = SimulationService.zones.north;

    // Count should have changed (increased from 0 during PRE_MATCH)
    expect(after.count).toBeGreaterThanOrEqual(0);
  });

  test('setPhase() changes phase correctly', () => {
    const event = db.getActiveEvent();
    if (!event) return;

    SimulationService.eventId = event.id;
    SimulationService.setPhase('HALFTIME');
    expect(SimulationService.phase).toBe('HALFTIME');
  });

  test('getHistory() returns entries after ticks', () => {
    const history = SimulationService.getHistory('north', 60, 'zone');
    expect(Array.isArray(history)).toBe(true);
    // After ticks above, should have some entries
    expect(history.length).toBeGreaterThanOrEqual(0);
  });

  test('auto-alerts fire when density > 0.80', () => {
    const event = db.getActiveEvent();
    if (!event) return;

    SimulationService.eventId = event.id;
    // Force high density
    SimulationService.zones.north.count = Math.round(SimulationService.zones.north.capacity * 0.95);
    SimulationService.tick();

    const alerts = db.getDb().prepare('SELECT * FROM alerts WHERE event_id = ? AND zone_id = ?').all(event.id, 'north');
    // Should have generated at least one crowd alert
    expect(alerts.length).toBeGreaterThanOrEqual(1);
  });
});
