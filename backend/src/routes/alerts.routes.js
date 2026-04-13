const express = require('express');
const router = express.Router();
const alertsController = require('../controllers/alerts.controller');
const { authenticate, requireRole } = require('../middleware/auth');

router.get('/', authenticate, alertsController.getAll);
router.get('/:id', authenticate, alertsController.getById);
router.patch('/:id/resolve', authenticate, requireRole('organizer', 'admin'), alertsController.resolve);
router.delete('/:id', authenticate, requireRole('organizer', 'admin'), alertsController.remove);

module.exports = router;
