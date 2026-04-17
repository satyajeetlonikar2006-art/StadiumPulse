'use strict';

const passport       = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { v4: uuid }   = require('uuid');
const bcrypt         = require('bcryptjs');

module.exports = function initPassport(db) {

  passport.use(new GoogleStrategy(
    {
      clientID:     process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:  process.env.BACKEND_URL + '/api/auth/google/callback',
      scope:        ['profile', 'email']
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const googleId = profile.id;
        const email    = profile.emails?.[0]?.value;
        const name     = profile.displayName;
        const avatar   = profile.photos?.[0]?.value || null;

        if (!email) return done(new Error('No email from Google'), null);

        // Check if OAuth account already linked
        const existing = db.prepare(`
          SELECT u.* FROM users u
          JOIN oauth_accounts o ON o.user_id = u.id
          WHERE o.provider = 'google' AND o.provider_id = ?
        `).get(googleId);

        if (existing) {
          // Update last_login
          db.prepare(
            'UPDATE users SET last_login = ? WHERE id = ?'
          ).run(Math.floor(Date.now() / 1000), existing.id);
          return done(null, existing);
        }

        // Check if user exists by email (merge accounts)
        let user = db.prepare(
          'SELECT * FROM users WHERE email = ?'
        ).get(email);

        if (!user) {
          // Brand new user — create account
          const userId = uuid();
          db.prepare(`
            INSERT INTO users
              (id, name, email, password_hash, role, created_at, last_login)
            VALUES (?, ?, ?, ?, 'attendee', ?, ?)
          `).run(
            userId, name, email,
            await bcrypt.hash(uuid(), 12), // random unusable password
            Math.floor(Date.now() / 1000),
            Math.floor(Date.now() / 1000)
          );
          user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
        }

        // Link OAuth account to user
        db.prepare(`
          INSERT OR IGNORE INTO oauth_accounts
            (id, user_id, provider, provider_id, email, name, avatar)
          VALUES (?, ?, 'google', ?, ?, ?, ?)
        `).run(uuid(), user.id, googleId, email, name, avatar);

        // Update last_login
        db.prepare(
          'UPDATE users SET last_login = ? WHERE id = ?'
        ).run(Math.floor(Date.now() / 1000), user.id);

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  ));

  // Session serialization (needed even with JWT strategy)
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser((id, done) => {
    const user = db.prepare(
      'SELECT id, name, email, role, seat FROM users WHERE id = ?'
    ).get(id);
    done(null, user || null);
  });

  return passport;
};
