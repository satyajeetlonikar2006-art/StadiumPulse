const db = require('../config/database');
const { hashPassword, comparePassword, generateId } = require('../utils/crypto');
const { signAccessToken, signRefreshToken, verifyToken } = require('../utils/jwt');
const config = require('../config');

class AuthError extends Error {
  constructor(message) { super(message); this.name = 'AuthError'; }
}
class ConflictError extends Error {
  constructor(message) { super(message); this.name = 'ConflictError'; }
}
class NotFoundError extends Error {
  constructor(message) { super(message); this.name = 'NotFoundError'; }
}

exports.register = async (body) => {
  const dbConn = db.getDb();
  const existing = dbConn.prepare('SELECT id FROM users WHERE email = ?').get(body.email);
  if (existing) throw new ConflictError('Email already in use');

  const id = generateId();
  const passHash = await hashPassword(body.password);
  const now = Date.now();

  let role = body.role || 'attendee';
  
  dbConn.prepare('INSERT INTO users (id, name, email, password_hash, role, seat, created_at, last_login) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, body.name, body.email, passHash, role, body.seat || null, now, now);

  return generateTokensForUser(dbConn, id, { id, name: body.name, email: body.email, role, seat: body.seat });
};

exports.login = async (body) => {
  const dbConn = db.getDb();
  const user = dbConn.prepare('SELECT * FROM users WHERE email = ?').get(body.email);
  if (!user) throw new AuthError('Invalid credentials');

  const isValid = await comparePassword(body.password, user.password_hash);
  if (!isValid) throw new AuthError('Invalid credentials');

  dbConn.prepare('UPDATE users SET last_login = ? WHERE id = ?').run(Date.now(), user.id);

  const u = { id: user.id, name: user.name, email: user.email, role: user.role, seat: user.seat };
  return generateTokensForUser(dbConn, user.id, u);
};

exports.refresh = async (tokenStr) => {
  const dbConn = db.getDb();
  const stored = dbConn.prepare('SELECT * FROM refresh_tokens WHERE token = ?').get(tokenStr);
  if (!stored || stored.expires_at < Date.now()) {
    if (stored) dbConn.prepare('DELETE FROM refresh_tokens WHERE token = ?').run(tokenStr);
    throw new AuthError('Invalid or expired refresh token');
  }

  const user = dbConn.prepare('SELECT id, name, email, role, seat FROM users WHERE id = ?').get(stored.user_id);
  if (!user) throw new AuthError('User not found');

  const payload = { id: user.id, name: user.name, email: user.email, role: user.role, seat: user.seat };
  const accessToken = signAccessToken(payload);
  
  return { accessToken, expiresIn: config.jwt.expiresIn };
};

exports.logout = async (userId) => {
  db.getDb().prepare('DELETE FROM refresh_tokens WHERE user_id = ?').run(userId);
  return { message: 'Logged out' };
};

exports.getMe = async (userId) => {
  const user = db.getDb().prepare('SELECT id, name, email, role, seat, language, accessibility, created_at, last_login FROM users WHERE id = ?').get(userId);
  if (!user) throw new NotFoundError('User not found');
  return { user };
};

exports.updateMe = async (userId, body) => {
  const u = await this.getMe(userId);
  const dbConn = db.getDb();
  
  const name = body.name || u.user.name;
  const seat = body.seat !== undefined ? body.seat : u.user.seat;
  const language = body.language || u.user.language;
  const accessibility = body.accessibility !== undefined ? body.accessibility : u.user.accessibility;

  dbConn.prepare('UPDATE users SET name = ?, seat = ?, language = ?, accessibility = ? WHERE id = ?')
    .run(name, seat, language, accessibility, userId);
    
  return this.getMe(userId);
};

function generateTokensForUser(dbConn, userId, userObj) {
  const accessToken = signAccessToken(userObj);
  const refreshToken = signRefreshToken({ id: userId });
  
  // Store refresh token (clean up old ones usually, but keeping simple here)
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
  dbConn.prepare('INSERT INTO refresh_tokens (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)')
    .run(refreshToken, userId, expiresAt, Date.now());

  return {
    user: userObj,
    accessToken,
    refreshToken,
    expiresIn: config.jwt.expiresIn
  };
}
