const communityService = require('../services/community.service');
const { success } = require('../utils/response');

exports.getTips = async (req, res, next) => {
  try {
    const data = await communityService.getTips(req.query.eventId, req.query.zoneId, req.query.limit, req.query.offset);
    success(res, data);
  } catch (err) { next(err); }
};

exports.createTip = async (req, res, next) => {
  try {
    const data = await communityService.createTip(req.user.id, req.body);
    success(res, data, 201);
  } catch (err) { next(err); }
};

exports.voteTip = async (req, res, next) => {
  try {
    const data = await communityService.voteTip(req.params.id, req.user.id, req.body.vote);
    success(res, data);
  } catch (err) { next(err); }
};

exports.reportTip = async (req, res, next) => {
  try {
    const data = await communityService.reportTip(req.params.id);
    success(res, data);
  } catch (err) { next(err); }
};

exports.getLeaderboard = async (req, res, next) => {
  try {
    const data = await communityService.getLeaderboard(req.query.eventId, req.query.period);
    success(res, data);
  } catch (err) { next(err); }
};
