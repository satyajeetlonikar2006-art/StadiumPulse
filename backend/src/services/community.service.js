const db = require('../config/database');
const { generateId } = require('../utils/crypto');

class NotFoundError extends Error {
  constructor(message) { super(message); this.name = 'NotFoundError'; }
}
class ValidationError extends Error {
  constructor(message) { super(message); this.name = 'ValidationError'; }
}

exports.getTips = async (eventId, zoneId, limit = 20, offset = 0) => {
  const activeEvent = eventId || db.getActiveEvent()?.id;
  let query = 'SELECT t.*, u.name as userName FROM community_tips t JOIN users u ON t.user_id = u.id WHERE is_flagged = 0';
  const params = [];
  
  if (activeEvent) { query += ' AND event_id = ?'; params.push(activeEvent); }
  if (zoneId) { query += ' AND zone_id = ?'; params.push(zoneId); }
  
  query += ' ORDER BY (upvotes - downvotes) DESC, created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit, 10), parseInt(offset, 10));

  const tips = db.getDb().prepare(query).all(...params);
  
  let totalQ = 'SELECT count(*) as cnt FROM community_tips WHERE is_flagged = 0';
  let totalParams = [];
  if (activeEvent) { totalQ += ' AND event_id = ?'; totalParams.push(activeEvent); }
  if (zoneId) { totalQ += ' AND zone_id = ?'; totalParams.push(zoneId); }
  
  const total = db.getDb().prepare(totalQ).get(...totalParams).cnt;

  return { tips, total };
};

exports.createTip = async (userId, data) => {
  const id = generateId();
  const eventId = db.getActiveEvent()?.id;
  if (!eventId) throw new Error('No active event');

  db.getDb().prepare('INSERT INTO community_tips (id, event_id, user_id, message, zone_id, facility_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(id, eventId, userId, data.message, data.zoneId || null, data.facilityId || null, Date.now());

  const tip = db.getDb().prepare('SELECT * FROM community_tips WHERE id = ?').get(id);
  return { tip };
};

exports.voteTip = async (tipId, userId, vote) => {
  const dbConn = db.getDb();
  
  const tx = dbConn.transaction(() => {
    const existing = dbConn.prepare('SELECT vote FROM tip_votes WHERE user_id = ? AND tip_id = ?').get(userId, tipId);
    if (existing) {
      if (existing.vote === vote) throw new ValidationError('Already voted this way');
      // Reverting old vote
      const upAdjust = existing.vote === 1 ? -1 : (vote === 1 ? 1 : 0);
      const downAdjust = existing.vote === -1 ? -1 : (vote === -1 ? 1 : 0);
      
      dbConn.prepare('UPDATE community_tips SET upvotes = upvotes + ?, downvotes = downvotes + ? WHERE id = ?').run(upAdjust, downAdjust, tipId);
      dbConn.prepare('UPDATE tip_votes SET vote = ? WHERE user_id = ? AND tip_id = ?').run(vote, userId, tipId);
    } else {
      const upAdjust = vote === 1 ? 1 : 0;
      const downAdjust = vote === -1 ? 1 : 0;
      dbConn.prepare('UPDATE community_tips SET upvotes = upvotes + ?, downvotes = downvotes + ? WHERE id = ?').run(upAdjust, downAdjust, tipId);
      dbConn.prepare('INSERT INTO tip_votes (user_id, tip_id, vote) VALUES (?, ?, ?)').run(userId, tipId, vote);
    }
  });

  try {
    tx();
  } catch (err) {
    if (err.name === 'ValidationError') throw err;
    throw new Error('Vote failed');
  }

  const tip = dbConn.prepare('SELECT * FROM community_tips WHERE id = ?').get(tipId);
  return { tip };
};

exports.reportTip = async (tipId) => {
  db.getDb().prepare('UPDATE community_tips SET is_flagged = 1 WHERE id = ?').run(tipId);
  return { message: 'Reported' };
};

exports.getLeaderboard = async (eventId, period) => {
  // Simplified logic
  const query = `
    SELECT u.id as userId, u.name, count(t.id) as tips, sum(t.upvotes) as votes, (count(t.id)*5 + sum(t.upvotes)*2) as points
    FROM users u JOIN community_tips t ON u.id = t.user_id
    GROUP BY u.id
    ORDER BY points DESC LIMIT 10
  `;
  const leaders = db.getDb().prepare(query).all();
  const leaderboard = leaders.map((l, i) => ({
    rank: i + 1,
    userId: l.userId,
    name: l.name,
    tips: l.tips,
    votes: l.votes || 0,
    points: l.points || 0,
    badge: i === 0 ? '🏆' : i < 3 ? '🎖️' : '⭐'
  }));
  return { leaderboard };
};
