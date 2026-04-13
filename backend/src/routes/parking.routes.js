const express = require('express');
const router = express.Router();
const parkingController = require('../controllers/parking.controller');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { body } = require('express-validator');

router.get('/zones', parkingController.getZones);
router.get('/zones/:zoneId/bays', parkingController.getBaysByZone);

router.post('/reserve', authenticate, [
  body('zoneId').notEmpty(),
  body('bayId').notEmpty()
], validate, parkingController.reserve);

router.delete('/reserve/:id', authenticate, parkingController.cancelReserve);
router.get('/my-reservation', authenticate, parkingController.getMyReservation);

module.exports = router;
