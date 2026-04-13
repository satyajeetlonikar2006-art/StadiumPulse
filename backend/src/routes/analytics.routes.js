const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');
const { authenticate, requireRole } = require('../middleware/auth');
const { heavyLimiter } = require('../middleware/rateLimit');

router.use(authenticate, requireRole('organizer', 'admin'));

router.get('/overview', analyticsController.getOverview);
router.get('/crowd-flow', analyticsController.getCrowdFlow);
router.get('/zone-distribution', analyticsController.getZoneDistribution);
router.get('/queue-history', analyticsController.getQueueHistory);
router.get('/entry-rates', analyticsController.getEntryRates);
router.get('/incidents-summary', analyticsController.getIncidentsSummary);
router.get('/export', heavyLimiter, analyticsController.exportAnalytics);

module.exports = router;
