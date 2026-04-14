const express = require('express');
const router = express.Router();
const matchService = require('../services/match.service');
const { success, error } = require('../utils/response');

router.get('/live', async (req, res) => {
  try {
    const { matchId } = req.query;
    const score = await matchService.getLiveScore(matchId || 'default');
    return success(res, score);
  } catch (err) {
    return error(res, err.message, 500);
  }
});

router.get('/current', async (req, res) => {
  try {
    const matches = await matchService.getCurrentMatches();
    return success(res, matches);
  } catch (err) {
    return error(res, err.message, 500);
  }
});

module.exports = router;
