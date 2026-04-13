const express = require('express');
const router = express.Router();
const incidentsController = require('../controllers/incidents.controller');
const { authenticate, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { body } = require('express-validator');

// All incident routes are organizer only
router.use(authenticate, requireRole('organizer', 'admin'));

router.get('/', incidentsController.getAll);
router.get('/:id', incidentsController.getById);

router.post('/', [
  body('type').notEmpty(),
  body('severity').isInt({ min: 1, max: 5 }),
  body('description').notEmpty()
], validate, incidentsController.create);

router.patch('/:id/status', [
  body('status').isIn(['NEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED'])
], validate, incidentsController.updateStatus);

router.patch('/:id/assign', [
  body('staffName').notEmpty()
], validate, incidentsController.assign);

module.exports = router;
