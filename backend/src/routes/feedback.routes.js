const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { generateId } = require('../utils/crypto');
const { authenticate, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { body } = require('express-validator');
const { success } = require('../utils/response');

router.post('/', authenticate, [
  body('eventId').notEmpty(),
  body('overallRating').isInt({ min: 1, max: 5 }),
  body('comment').optional().isLength({ max: 500 })
], validate, async (req, res, next) => {
  try {
    const existing = db.getDb().prepare('SELECT id FROM feedback WHERE event_id = ? AND user_id = ?').get(req.body.eventId, req.user.id);
    if (existing) return res.status(409).json({ success: false, error: { message: 'Feedback already submitted' }});
    
    const id = generateId();
    db.getDb().prepare(`INSERT INTO feedback (id, event_id, user_id, overall_rating, crowd_management, food_quality, facilities, safety, comment, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(id, req.body.eventId, req.user.id, req.body.overallRating, req.body.crowdManagement||0, req.body.foodQuality||0, req.body.facilities||0, req.body.safety||0, req.body.comment||null, Date.now());
      
    const feedback = db.getDb().prepare('SELECT * FROM feedback WHERE id = ?').get(id);
    success(res, { feedback }, 201);
  } catch (e) { next(e); }
});

router.get('/summary', authenticate, requireRole('organizer', 'admin'), async (req, res, next) => {
  try {
    const activeEvent = req.query.eventId || db.getActiveEvent()?.id;
    const stats = db.getDb().prepare(`
      SELECT count(*) as totalResponses,
        avg(overall_rating) as overall, avg(crowd_management) as crowd,
        avg(food_quality) as food, avg(facilities) as facilities, avg(safety) as safety
      FROM feedback WHERE event_id = ?
    `).get(activeEvent);
    
    const comments = db.getDb().prepare('SELECT comment, created_at FROM feedback WHERE event_id = ? AND comment IS NOT NULL ORDER BY created_at DESC LIMIT 10').all(activeEvent);
    
    success(res, {
      totalResponses: stats.totalResponses,
      avgRatings: { overall: stats.overall, crowdManagement: stats.crowd, foodQuality: stats.food, facilities: stats.facilities, safety: stats.safety },
      comments
    });
  } catch(e) { next(e); }
});

module.exports = router;
