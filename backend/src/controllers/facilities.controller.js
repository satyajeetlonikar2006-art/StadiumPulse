const facilitiesService = require('../services/facilities.service');
const { success } = require('../utils/response');

exports.getAll = async (req, res, next) => {
  try {
    const data = await facilitiesService.getAll(req.query.type);
    success(res, data);
  } catch (err) { next(err); }
};

exports.getById = async (req, res, next) => {
  try {
    const data = await facilitiesService.getById(req.params.id);
    success(res, data);
  } catch (err) { next(err); }
};

exports.getHistory = async (req, res, next) => {
  try {
    const data = await facilitiesService.getHistory(req.params.id, parseInt(req.query.minutes || '30', 10));
    success(res, data);
  } catch (err) { next(err); }
};

exports.getForecast = async (req, res, next) => {
  try {
    const data = await facilitiesService.getForecast(req.params.id);
    success(res, data);
  } catch (err) { next(err); }
};

exports.setNotify = async (req, res, next) => {
  try {
    const data = await facilitiesService.setNotify(req.params.id, req.user.id, req.body.thresholdMinutes);
    success(res, data);
  } catch (err) { next(err); }
};

exports.cancelNotify = async (req, res, next) => {
  try {
    const data = await facilitiesService.cancelNotify(req.params.watcherId);
    success(res, data);
  } catch (err) { next(err); }
};

const queueService = require('../services/queue.service');

exports.joinQueue = async (req, res, next) => {
  try {
    const data = queueService.joinQueue(req.params.id, req.user.id, 'gate');
    success(res, data);
  } catch (err) { next(err); }
};

exports.leaveQueue = async (req, res, next) => {
  try {
    const data = queueService.leaveQueue(req.params.id, req.user.id);
    success(res, { message: 'Left queue', success: data });
  } catch (err) { next(err); }
};

exports.queueStatus = async (req, res, next) => {
  try {
    const data = queueService.getPosition(req.params.id, req.user.id);
    success(res, data);
  } catch (err) { next(err); }
};

