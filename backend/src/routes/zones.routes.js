const express = require('express');
const router = express.Router();
const zonesController = require('../controllers/zones.controller');

router.get('/', zonesController.getAll);
router.get('/:id', zonesController.getById);
router.get('/:id/history', zonesController.getHistory);
router.get('/:id/forecast', zonesController.getForecast);
router.get('/:id/facilities', zonesController.getFacilities);

module.exports = router;
