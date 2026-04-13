const express = require('express');
const router = express.Router();
const broadcastController = require('../controllers/broadcast.controller');
const { authenticate, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { body } = require('express-validator');

router.use(authenticate, requireRole('organizer', 'admin'));

router.get('/', broadcastController.getAll);

router.post('/', [
  body('message').notEmpty().isLength({ max: 280 }),
  body('priority').isIn(['LOW', 'NORMAL', 'HIGH', 'EMERGENCY']),
  body('zones').isArray()
], validate, broadcastController.create);

router.post('/emergency', [
  body('message').notEmpty(),
  body('affectedZones').isArray()
], validate, broadcastController.createEmergency);

router.delete('/emergency', broadcastController.deactivateEmergency);

module.exports = router;
