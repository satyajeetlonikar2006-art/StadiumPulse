const alertsService = require('../services/alerts.service');
const { success } = require('../utils/response');

exports.getAll = async (req, res, next) => {
  try {
    const data = await alertsService.getAll(req.query.eventId, req.query.resolved, req.query.severity, req.query.limit);
    success(res, data);
  } catch (err) { next(err); }
};

exports.getById = async (req, res, next) => {
  try {
    const data = await alertsService.getById(req.params.id);
    success(res, data);
  } catch (err) { next(err); }
};

exports.resolve = async (req, res, next) => {
  try {
    const data = await alertsService.resolve(req.params.id, req.user.id);
    success(res, data);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const data = await alertsService.remove(req.params.id);
    success(res, data);
  } catch (err) { next(err); }
};
