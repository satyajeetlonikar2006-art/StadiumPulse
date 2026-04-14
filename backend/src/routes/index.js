const express = require('express');
const router = express.Router();

// Routers will be mounted here
router.use('/auth', require('./auth.routes'));
router.use('/events', require('./events.routes'));
router.use('/zones', require('./zones.routes'));
router.use('/facilities', require('./facilities.routes'));
router.use('/alerts', require('./alerts.routes'));
router.use('/incidents', require('./incidents.routes'));
router.use('/orders', require('./orders.routes'));
router.use('/parking', require('./parking.routes'));
router.use('/broadcasts', require('./broadcast.routes'));
router.use('/analytics', require('./analytics.routes'));
router.use('/community', require('./community.routes'));
router.use('/weather', require('./weather.routes'));
router.use('/users', require('./users.routes'));
router.use('/lost-found', require('./lost-found.routes'));
router.use('/feedback', require('./feedback.routes'));
router.use('/stadiums', require('./stadiums.routes'));
router.use('/match', require('./match.routes'));

router.get('/health', (req, res) => {
  res.json({ success: true, message: 'StadiumPulse API is running' });
});

module.exports = router;
