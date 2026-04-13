const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { generateId } = require('../utils/crypto');
const { authenticate, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { body } = require('express-validator');
const { success } = require('../utils/response');

router.get('/', async (req, res, next) => {
  try {
    const activeEvent = req.query.eventId || db.getActiveEvent()?.id;
    let q = 'SELECT * FROM lost_found_items WHERE status = "OPEN"';
    const params = [];
    if (activeEvent) { q += ' AND event_id = ?'; params.push(activeEvent); }
    if (req.query.type) { q += ' AND type = ?'; params.push(req.query.type); }
    const items = db.getDb().prepare(q).all(...params);
    success(res, { items });
  } catch (e) { next(e); }
});

router.post('/', authenticate, [
  body('type').isIn(['LOST', 'FOUND']),
  body('itemDescription').notEmpty(),
  body('contactInfo').notEmpty()
], validate, async (req, res, next) => {
  try {
    const id = generateId();
    const eventId = db.getActiveEvent()?.id;
    if (!eventId) throw new Error('Active event required');
    db.getDb().prepare('INSERT INTO lost_found_items (id, event_id, reporter_id, type, item_description, location, contact_info, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, eventId, req.user.id, req.body.type, req.body.itemDescription, req.body.location || null, req.body.contactInfo, Date.now());
    const item = db.getDb().prepare('SELECT * FROM lost_found_items WHERE id = ?').get(id);
    success(res, { item }, 201);
  } catch (e) { next(e); }
});

router.patch('/:id/status', authenticate, requireRole('organizer', 'admin'), async (req, res, next) => {
  try {
    db.getDb().prepare('UPDATE lost_found_items SET status = ? WHERE id = ?').run(req.body.status, req.params.id);
    const item = db.getDb().prepare('SELECT * FROM lost_found_items WHERE id = ?').get(req.params.id);
    success(res, { item });
  } catch(e) { next(e); }
});

module.exports = router;
