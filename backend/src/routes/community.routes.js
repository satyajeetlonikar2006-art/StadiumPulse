const express = require('express');
const router = express.Router();
const communityController = require('../controllers/community.controller');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { body } = require('express-validator');

router.get('/tips', communityController.getTips);

router.post('/tips', authenticate, [
  body('message').isLength({ min: 10, max: 200 })
], validate, communityController.createTip);

router.post('/tips/:id/vote', authenticate, [
  body('vote').isIn([1, -1])
], validate, communityController.voteTip);

router.post('/tips/:id/report', authenticate, communityController.reportTip);

router.get('/leaderboard', communityController.getLeaderboard);

module.exports = router;
