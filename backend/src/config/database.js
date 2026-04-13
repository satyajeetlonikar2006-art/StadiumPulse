const Database = require('better-sqlite3');
const config = require('./index');
const fs = require('fs');
const bcrypt = require('bcryptjs');

let db;

const init = () => {
  console.log(`Connecting to SQLite at ${config.dbPath}...`);
  db = new Database(config.dbPath);

  // Enable WAL mode for better concurrency performance
  db.pragma('journal_mode = WAL');

  createSchema();
  seedData();
  
  return db;
};

const createSchema = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'attendee',
      seat TEXT,
      language TEXT DEFAULT 'en',
      accessibility INTEGER DEFAULT 0,
      created_at INTEGER,
      last_login INTEGER
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      venue TEXT NOT NULL,
      team_home TEXT,
      team_away TEXT,
      start_time INTEGER NOT NULL,
      phase TEXT DEFAULT 'PRE_MATCH',
      match_minute INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 0,
      created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS zone_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id TEXT NOT NULL,
      zone_id TEXT NOT NULL,
      count INTEGER NOT NULL,
      capacity INTEGER NOT NULL,
      density REAL NOT NULL,
      timestamp INTEGER
    );

    CREATE TABLE IF NOT EXISTS facility_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id TEXT NOT NULL,
      facility_id TEXT NOT NULL,
      queue_length INTEGER NOT NULL,
      wait_time INTEGER NOT NULL,
      density REAL NOT NULL,
      timestamp INTEGER
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      type TEXT NOT NULL,
      severity INTEGER NOT NULL,
      zone_id TEXT,
      facility_id TEXT,
      message TEXT NOT NULL,
      is_resolved INTEGER DEFAULT 0,
      resolved_at INTEGER,
      resolved_by TEXT,
      created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS incidents (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      type TEXT NOT NULL,
      severity INTEGER NOT NULL,
      zone_id TEXT,
      description TEXT NOT NULL,
      status TEXT DEFAULT 'NEW',
      assigned_to TEXT,
      action_log TEXT DEFAULT '[]',
      created_at INTEGER,
      updated_at INTEGER,
      resolved_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS broadcasts (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      message TEXT NOT NULL,
      priority TEXT DEFAULT 'NORMAL',
      zones TEXT DEFAULT '["all"]',
      created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      event_id TEXT NOT NULL,
      stall_id TEXT NOT NULL,
      items TEXT NOT NULL,
      total_amount REAL NOT NULL,
      status TEXT DEFAULT 'PLACED',
      seat TEXT,
      payment_method TEXT,
      pickup_code TEXT,
      pickup_time INTEGER,
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS parking_reservations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      event_id TEXT NOT NULL,
      zone_id TEXT NOT NULL,
      bay_id TEXT NOT NULL,
      vehicle_number TEXT,
      status TEXT DEFAULT 'ACTIVE',
      reserved_at INTEGER,
      released_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS virtual_queue_entries (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      facility_id TEXT NOT NULL,
      event_id TEXT NOT NULL,
      position INTEGER NOT NULL,
      status TEXT DEFAULT 'WAITING',
      estimated_call_time INTEGER,
      joined_at INTEGER,
      called_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS community_tips (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      message TEXT NOT NULL,
      zone_id TEXT,
      facility_id TEXT,
      upvotes INTEGER DEFAULT 0,
      downvotes INTEGER DEFAULT 0,
      is_flagged INTEGER DEFAULT 0,
      created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS tip_votes (
      user_id TEXT NOT NULL,
      tip_id TEXT NOT NULL,
      vote INTEGER NOT NULL,
      PRIMARY KEY(user_id, tip_id)
    );

    CREATE TABLE IF NOT EXISTS lost_found_items (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      reporter_id TEXT NOT NULL,
      type TEXT NOT NULL,
      item_description TEXT NOT NULL,
      location TEXT,
      contact_info TEXT NOT NULL,
      status TEXT DEFAULT 'OPEN',
      created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS feedback (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      overall_rating INTEGER NOT NULL,
      crowd_management INTEGER,
      food_quality INTEGER,
      facilities INTEGER,
      safety INTEGER,
      comment TEXT,
      created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS refresh_tokens (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_zone_snapshots_event_time ON zone_snapshots(event_id, timestamp);
    CREATE INDEX IF NOT EXISTS idx_facility_snapshots_event_time ON facility_snapshots(event_id, timestamp);
    CREATE INDEX IF NOT EXISTS idx_alerts_event ON alerts(event_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_incidents_event_status ON incidents(event_id, status);
    CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id, event_id);
    CREATE INDEX IF NOT EXISTS idx_community_tips_event ON community_tips(event_id, created_at);
  `);
};

const seedData = () => {
  const usersCount = db.prepare('SELECT count(*) as count FROM users').get().count;
  if (usersCount > 0) return; // Already seeded

  console.log('Seeding initial data...');
  const salt = bcrypt.genSaltSync(12);
  const hash = bcrypt.hashSync('Stadium@123', salt);
  const now = Date.now();

  const insertUser = db.prepare('INSERT INTO users (id, name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)');
  insertUser.run('u1', 'Organizer', 'organizer@stadiumpulse.com', hash, 'organizer', now);
  insertUser.run('u2', 'Attendee', 'attendee@stadiumpulse.com', hash, 'attendee', now);

  const insertEvent = db.prepare('INSERT INTO events (id, name, venue, team_home, team_away, start_time, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  // Start time 1 hour from now for PRE_MATCH
  insertEvent.run('evt_1', 'IPL Finals 2026 | MI vs CSK', 'Wankhede Stadium', 'MI', 'CSK', now + 3600000, 1, now);

  const insertTip = db.prepare('INSERT INTO community_tips (id, event_id, user_id, message, zone_id, created_at) VALUES (?, ?, ?, ?, ?, ?)');
  insertTip.run('tip_1', 'evt_1', 'u2', 'Gate 2 is completely free right now, walk straight in!', 'south', now - 10000);
  insertTip.run('tip_2', 'evt_1', 'u2', 'Try the Vada Pav at North stand, it is fresh 😋', 'north', now - 50000);
  
  const insertAlert = db.prepare('INSERT INTO alerts (id, event_id, type, severity, zone_id, message, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
  insertAlert.run('alert_1', 'evt_1', 'WEATHER', 2, null, 'Light drizzles expected in 30 mins', now - 20000);
  
  const insertIncident = db.prepare('INSERT INTO incidents (id, event_id, type, severity, zone_id, description, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  insertIncident.run('inc_1', 'evt_1', 'MEDICAL', 3, 'east', 'Fan feels dizzy near East Gate', 'NEW', now - 6000);

  console.log('Seed complete.');
};

const getDb = () => db;

const close = () => {
  if (db) db.close();
};

const getActiveEvent = () => {
  return db.prepare('SELECT * FROM events WHERE is_active = 1 ORDER BY start_time DESC LIMIT 1').get();
};

module.exports = {
  init,
  getDb,
  close,
  getActiveEvent
};
