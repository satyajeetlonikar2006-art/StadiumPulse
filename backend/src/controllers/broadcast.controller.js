const broadcastService = require('../services/broadcast.service');
const { success } = require('../utils/response');

exports.getAll = async (req, res, next) => {
  try {
    const data = await broadcastService.getAll(req.query.eventId, req.query.limit);
    success(res, data);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const payload = { ...req.body, senderId: req.user.id, senderName: req.user.name };
    const data = await broadcastService.create(payload);
    success(res, data, 201);
  } catch (err) { next(err); }
};

exports.createEmergency = async (req, res, next) => {
  try {
    const payload = { ...req.body, senderId: req.user.id };
    const data = await broadcastService.createEmergency(payload);
    success(res, data, 201);
  } catch (err) { next(err); }
};

exports.deactivateEmergency = async (req, res, next) => {
  try {
    const data = await broadcastService.deactivateEmergency();
    success(res, data);
  } catch (err) { next(err); }
};
