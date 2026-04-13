const eventsService = require('../services/events.service');
const { success } = require('../utils/response');

exports.getAll = async (req, res, next) => {
  try {
    const data = await eventsService.getAll();
    success(res, data);
  } catch (err) { next(err); }
};

exports.getActive = async (req, res, next) => {
  try {
    const data = await eventsService.getActive();
    success(res, data);
  } catch (err) { next(err); }
};

exports.getById = async (req, res, next) => {
  try {
    const data = await eventsService.getById(req.params.id);
    success(res, data);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const data = await eventsService.create(req.body);
    success(res, data, 201);
  } catch (err) { next(err); }
};

exports.updatePhase = async (req, res, next) => {
  try {
    const data = await eventsService.updatePhase(req.params.id, req.body.phase);
    success(res, data);
  } catch (err) { next(err); }
};

exports.fastForward = async (req, res, next) => {
  try {
    const data = await eventsService.fastForward(req.params.id, req.body.minutes);
    success(res, data);
  } catch (err) { next(err); }
};

exports.getTimeline = async (req, res, next) => {
  try {
    const data = await eventsService.getTimeline(req.params.id, req.query.from, req.query.to);
    success(res, data);
  } catch (err) { next(err); }
};
