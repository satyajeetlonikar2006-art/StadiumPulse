'use strict';

const express     = require('express');
const router      = express.Router();
const passport    = require('passport');
const { body, validationResult } = require('express-validator');
const AuthService = require('../services/auth.service');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { success, error } = require('../utils/response');
const { authLimiter } = require('../middleware/rateLimit');

// AuthService is initialized in app.js and passed via app.locals
function getAuthService(req) {
  return req.app.locals.authService;
}

// ─── VALIDATION CHAINS ────────────────────────────

const registerValidation = [
  body('name')
    .trim().notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 60 }).withMessage('Name must be 2–60 chars'),
  body('email')
    .trim().isEmail().withMessage('Valid email required')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 }).withMessage('Password min 8 characters')
    .matches(/[A-Z]/).withMessage('Password needs an uppercase letter')
    .matches(/[0-9]/).withMessage('Password needs a number')
    .matches(/[^A-Za-z0-9]/).withMessage('Password needs a special character'),
  body('seat').optional().trim()
];

const loginValidation = [
  body('email').trim().isEmail().normalizeEmail(),
  body('password').notEmpty().withMessage('Password required')
];

function validate(req, res, next) {
  const errs = validationResult(req);
  if (!errs.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: errs.array().map(e => ({ field: e.path, msg: e.msg }))
      }
    });
  }
  next();
}

// ─── EMAIL + PASSWORD ─────────────────────────────

// POST /api/auth/register
router.post('/register',
  authLimiter,
  registerValidation, validate,
  async (req, res, next) => {
    try {
      const result = await getAuthService(req).register(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      if (err.code === 'CONFLICT')
        return res.status(409).json({
          success: false,
          error: { code: 'CONFLICT', message: err.message }
        });
      next(err);
    }
  }
);

// POST /api/auth/login
router.post('/login',
  authLimiter,
  loginValidation, validate,
  async (req, res, next) => {
    try {
      const result = await getAuthService(req).login(req.body);
      res.json({ success: true, data: result });
    } catch (err) {
      if (err.code === 'UNAUTHORIZED')
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: err.message }
        });
      next(err);
    }
  }
);

// POST /api/auth/refresh
router.post('/refresh', (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({
      success: false,
      error: { code: 'BAD_REQUEST', message: 'Refresh token required' }
    });
    const result = getAuthService(req).refreshToken(refreshToken);
    res.json({ success: true, data: result });
  } catch (err) {
    if (err.code === 'UNAUTHORIZED')
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: err.message }
      });
    next(err);
  }
});

// POST /api/auth/logout
router.post('/logout', authenticate, (req, res) => {
  const token = req.body.refreshToken;
  if (token) getAuthService(req).logout(token);
  res.json({ success: true, data: { message: 'Logged out successfully' } });
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res, next) => {
  try {
    const user = getAuthService(req).getMe(req.user.id);
    res.json({ success: true, data: { user } });
  } catch (err) { next(err); }
});

// PATCH /api/auth/me
router.patch('/me', authenticate, [
  body('name').optional().trim()
    .isLength({ min:2, max:60 }),
  body('seat').optional().trim(),
  body('language').optional()
    .isIn(['en','hi','mr']),
  body('accessibility').optional().isBoolean()
], validate, (req, res, next) => {
  try {
    const user = getAuthService(req).updateProfile(req.user.id, req.body);
    res.json({ success: true, data: { user } });
  } catch (err) { next(err); }
});

// ─── MAGIC LINK ───────────────────────────────────

// POST /api/auth/magic/send
router.post('/magic/send',
  authLimiter,
  [body('email').trim().isEmail().normalizeEmail()], validate,
  async (req, res, next) => {
    try {
      const result = await getAuthService(req)
        .sendMagicLink(req.body.email);
      res.json({ success: true, data: result });
    } catch (err) {
      if (err.code === 'SERVICE_UNAVAILABLE')
        return res.status(503).json({
          success: false,
          error: { code: 'SERVICE_UNAVAILABLE', message: err.message }
        });
      next(err);
    }
  }
);

// GET /api/auth/magic/verify?token=xxx
// User clicks this link from their email
router.get('/magic/verify', (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.redirect(
      `${process.env.FRONTEND_URL}?auth_error=missing_token`
    );

    const result = req.app.locals.authService.verifyMagicLink(token);

    // Redirect to frontend with token in URL params
    // Dynamic redirect for mobile support
    const origin = req.headers.host.includes('localhost') || req.headers.host.includes('127.0.0.1')
      ? 'http://localhost:3000'
      : `http://${req.headers.host.split(':')[0]}:3000`;

    res.redirect(`${origin}?${params.toString()}`);

  } catch (err) {
    res.redirect(
      `${process.env.FRONTEND_URL}?auth_error=link_expired`
    );
  }
});

// ─── GOOGLE OAUTH ─────────────────────────────────

// GET /api/auth/google
// Frontend links to this URL to start Google flow
router.get('/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false
  })
);

// GET /api/auth/google/callback
// Google redirects here after user approves
router.get('/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL}?auth_error=google_failed`
  }),
  (req, res) => {
    try {
      const result = req.app.locals.authService
        .handleGoogleUser(req.user);

      const origin = req.headers.host.includes('localhost') || req.headers.host.includes('127.0.0.1')
        ? 'http://localhost:3000'
        : `http://${req.headers.host.split(':')[0]}:3000`;

      const params = new URLSearchParams({
        token:   result.accessToken,
        refresh: result.refreshToken,
        user:    JSON.stringify(result.user)
      });
      res.redirect(`${origin}?${params.toString()}`);
    } catch (err) {
      res.redirect(
        `${process.env.FRONTEND_URL}?auth_error=server_error`
      );
    }
  }
);

module.exports = router;
