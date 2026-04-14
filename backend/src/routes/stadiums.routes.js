const express = require('express');
const router = express.Router();
const geofenceService = require('../services/geofence.service');
const { getDb } = require('../config/database');
const { success, error } = require('../utils/response');

router.post('/detect', (req, res) => {
  const { lat, lng } = req.body;
  if (typeof lat !== 'number' || typeof lng !== 'number' || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return error(res, 'Invalid coordinates', 400);
  }

  const stadium = geofenceService.detectStadium(lat, lng);
  const db = getDb();

  if (stadium) {
    const activeEvent = db.prepare('SELECT * FROM events WHERE is_active = 1 LIMIT 1').get();
    stadium.activeEvent = activeEvent || null;
    return success(res, { stadium });
  } else {
    const nearest = geofenceService.getNearestStadium(lat, lng);
    if (nearest) {
      nearest.distanceKm = (nearest.distance / 1000).toFixed(1);
    }
    return success(res, {
      stadium: null,
      nearest: nearest || null
    });
  }
});

router.get('/', (req, res) => {
  const db = getDb();
  const stadiums = db.prepare('SELECT * FROM stadiums WHERE is_active = 1').all();
  return success(res, stadiums);
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const stadium = db.prepare('SELECT * FROM stadiums WHERE id = ?').get(req.params.id);
  if (!stadium) return error(res, 'Stadium not found', 404);
  const activeEvent = db.prepare('SELECT * FROM events WHERE is_active = 1 LIMIT 1').get();
  stadium.activeEvent = activeEvent || null;
  return success(res, stadium);
});

module.exports = router;
