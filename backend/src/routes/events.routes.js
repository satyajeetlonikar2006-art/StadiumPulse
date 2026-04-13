const express = require('express');
const router = express.Router();
const eventsController = require('../controllers/events.controller');
const { authenticate, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { body } = require('express-validator');

router.get('/', eventsController.getAll);
router.get('/active', eventsController.getActive);
router.get('/:id', eventsController.getById);

router.post('/', authenticate, requireRole('organizer', 'admin'), [
  body('name').notEmpty(),
  body('venue').notEmpty(),
  body('start_time').isInt()
], validate, eventsController.create);

router.patch('/:id/phase', authenticate, requireRole('organizer', 'admin'), [
  body('phase').isIn(['PRE_MATCH', 'IN_PLAY_1', 'DRINKS_BREAK', 'HALFTIME', 'IN_PLAY_2', 'POST_MATCH'])
], validate, eventsController.updatePhase);

router.post('/:id/simulate/fast-forward', authenticate, requireRole('organizer', 'admin'), [
  body('minutes').isInt({ min: 1, max: 120 })
], validate, eventsController.fastForward);

router.get('/:id/timeline', eventsController.getTimeline);

module.exports = router;
