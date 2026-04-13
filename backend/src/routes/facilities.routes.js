const express = require('express');
const router = express.Router();
const facilitiesController = require('../controllers/facilities.controller');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { body } = require('express-validator');

router.get('/', facilitiesController.getAll);
router.get('/:id', facilitiesController.getById);
router.get('/:id/history', facilitiesController.getHistory);
router.get('/:id/forecast', facilitiesController.getForecast);

// Notify functionality
router.post('/:id/notify', authenticate, [
  body('thresholdMinutes').isInt({ min: 1, max: 120 })
], validate, facilitiesController.setNotify);

router.delete('/:id/notify/:watcherId', authenticate, facilitiesController.cancelNotify);

// Virtual queue (delegated to Phase 7 mostly, but mounted here)
router.post('/:id/queue/join', authenticate, facilitiesController.joinQueue);
router.delete('/:id/queue/leave', authenticate, facilitiesController.leaveQueue);
router.get('/:id/queue/status', authenticate, facilitiesController.queueStatus);

module.exports = router;
