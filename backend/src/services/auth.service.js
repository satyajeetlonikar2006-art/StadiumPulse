'use strict';

const bcrypt      = require('bcryptjs');
const crypto      = require('crypto');
const { v4: uuid} = require('uuid');
const jwt         = require('../utils/jwt');
const emailSvc    = require('./email.service');

class AuthService {
  constructor(db) {
    this.db = db;
  }

  // ─── SHARED ─────────────────────────────────────

  _safeUser(user) {
    // Never return password_hash to client
    const { password_hash, ...safe } = user;
    return safe;
  }

  _generateTokenPair(userId, role) {
    const accessToken = jwt.signAccessToken(
      { id: userId, role }
    );
    const refreshToken = crypto.randomBytes(40).toString('hex');
    const expiresAt = Math.floor(Date.now() / 1000) + 7 * 24 * 3600;

    this.db.prepare(`
      INSERT INTO refresh_tokens (token, user_id, expires_at)
      VALUES (?, ?, ?)
    `).run(refreshToken, userId, expiresAt);

    return { accessToken, refreshToken, expiresIn: 86400 };
  }

  // ─── AUTH 1: EMAIL + PASSWORD ────────────────────

  async register({ name, email, password, seat }) {
    // Duplicate email check
    const existing = this.db.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).get(email);
    if (existing) {
      const err = new Error('An account with this email already exists');
      err.code = 'CONFLICT'; throw err;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const userId = uuid();
    const now = Math.floor(Date.now() / 1000);

    this.db.prepare(`
      INSERT INTO users
        (id, name, email, password_hash, role, seat, created_at, last_login)
      VALUES (?, ?, ?, ?, 'attendee', ?, ?, ?)
    `).run(userId, name.trim(), email.toLowerCase(), 
           passwordHash, seat || null, now, now);

    const user = this.db.prepare(
      'SELECT * FROM users WHERE id = ?'
    ).get(userId);

    const tokens = this._generateTokenPair(userId, user.role);
    return { user: this._safeUser(user), ...tokens };
  }

  async login({ email, password }) {
    const user = this.db.prepare(
      'SELECT * FROM users WHERE email = ?'
    ).get(email.toLowerCase());

    if (!user) {
      const err = new Error('Invalid email or password');
      err.code = 'UNAUTHORIZED'; throw err;
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      const err = new Error('Invalid email or password');
      err.code = 'UNAUTHORIZED'; throw err;
    }

    this.db.prepare(
      'UPDATE users SET last_login = ? WHERE id = ?'
    ).run(Math.floor(Date.now() / 1000), user.id);

    const tokens = this._generateTokenPair(user.id, user.role);
    return { user: this._safeUser(user), ...tokens };
  }

  refreshToken(token) {
    const now = Math.floor(Date.now() / 1000);
    const record = this.db.prepare(`
      SELECT * FROM refresh_tokens
      WHERE token = ? AND expires_at > ?
    `).get(token, now);

    if (!record) {
      const err = new Error('Invalid or expired refresh token');
      err.code = 'UNAUTHORIZED'; throw err;
    }

    const user = this.db.prepare(
      'SELECT * FROM users WHERE id = ?'
    ).get(record.user_id);

    const accessToken = jwt.signAccessToken(
      { id: user.id, role: user.role }
    );
    return { accessToken, expiresIn: 86400 };
  }

  logout(token) {
    this.db.prepare(
      'DELETE FROM refresh_tokens WHERE token = ?'
    ).run(token);
  }

  // ─── AUTH 2: MAGIC LINK ──────────────────────────

  async sendMagicLink(email, baseUrl = null) {
    if (!emailSvc.isAvailable()) {
      const err = new Error(
        'Magic link is not configured on this server'
      );
      err.code = 'SERVICE_UNAVAILABLE'; throw err;
    }

    email = email.toLowerCase().trim();

    // Find or create user
    let user = this.db.prepare(
      'SELECT * FROM users WHERE email = ?'
    ).get(email);

    if (!user) {
      const userId = uuid();
      const now = Math.floor(Date.now() / 1000);
      this.db.prepare(`
        INSERT INTO users
          (id, name, email, password_hash, role, created_at)
        VALUES (?, ?, ?, ?, 'attendee', ?)
      `).run(
        userId,
        email.split('@')[0], // use email prefix as default name
        email,
        await bcrypt.hash(uuid(), 12),
        now
      );
      user = this.db.prepare(
        'SELECT * FROM users WHERE id = ?'
      ).get(userId);
    }

    // Delete any existing unused tokens for this email
    this.db.prepare(
      'DELETE FROM magic_links WHERE email = ? AND used = 0'
    ).run(email);

    // Generate secure token
    const token     = crypto.randomBytes(32).toString('hex');
    const expiresAt = Math.floor(Date.now() / 1000) + 900; // 15 min

    this.db.prepare(`
      INSERT INTO magic_links (token, user_id, email, expires_at)
      VALUES (?, ?, ?, ?)
    `).run(token, user.id, email, expiresAt);

    const effectiveBase = baseUrl || process.env.BACKEND_URL || '';
    const magicLink = 
      `${effectiveBase}/api/auth/magic/verify?token=${token}`;
    
    await emailSvc.sendMagicLink(email, magicLink, user.name);
    return { sent: true, message: 'Login link sent to your email' };
  }

  verifyMagicLink(token) {
    const now = Math.floor(Date.now() / 1000);
    const link = this.db.prepare(`
      SELECT * FROM magic_links
      WHERE token = ? AND expires_at > ? AND used = 0
    `).get(token, now);

    if (!link) {
      const err = new Error('This link has expired or already been used');
      err.code = 'UNAUTHORIZED'; throw err;
    }

    // Mark as used immediately (single use)
    this.db.prepare(
      'UPDATE magic_links SET used = 1 WHERE token = ?'
    ).run(token);

    const user = this.db.prepare(
      'SELECT * FROM users WHERE id = ?'
    ).get(link.user_id);

    // Update last_login
    this.db.prepare(
      'UPDATE users SET last_login = ? WHERE id = ?'
    ).run(now, user.id);

    const tokens = this._generateTokenPair(user.id, user.role);
    return { user: this._safeUser(user), ...tokens };
  }

  // ─── AUTH 3: GOOGLE OAUTH ────────────────────────
  // (Handled by passport strategy in passport.js)
  // This method is called AFTER passport verifies Google token

  handleGoogleUser(googleUser) {
    const tokens = this._generateTokenPair(
      googleUser.id, googleUser.role
    );
    return { user: this._safeUser(googleUser), ...tokens };
  }

  // ─── SHARED HELPERS ──────────────────────────────

  getMe(userId) {
    const user = this.db.prepare(
      'SELECT * FROM users WHERE id = ?'
    ).get(userId);
    if (!user) {
      const err = new Error('User not found');
      err.code = 'NOT_FOUND'; throw err;
    }
    return this._safeUser(user);
  }

  updateProfile(userId, { name, seat, language, accessibility }) {
    const updates = [];
    const values  = [];
    if (name !== undefined)          { updates.push('name = ?');          values.push(name); }
    if (seat !== undefined)          { updates.push('seat = ?');          values.push(seat); }
    if (language !== undefined)      { updates.push('language = ?');      values.push(language); }
    if (accessibility !== undefined) { updates.push('accessibility = ?'); values.push(accessibility ? 1 : 0); }
    if (updates.length === 0) throw new Error('No fields to update');
    values.push(userId);
    this.db.prepare(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`
    ).run(...values);
    return this.getMe(userId);
  }
}

module.exports = AuthService;
