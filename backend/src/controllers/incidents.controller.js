const incidentsService = require('../services/incidents.service');
const { success } = require('../utils/response');

exports.getAll = async (req, res, next) => {
  try {
    const data = await incidentsService.getAll(req.query.status, req.query.eventId);
    success(res, data);
  } catch (err) { next(err); }
};

exports.getById = async (req, res, next) => {
  try {
    const data = await incidentsService.getById(req.params.id);
    success(res, data);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    // Add user info
    const payload = { ...req.body, createdBy: req.user.name };
    const data = await incidentsService.create(payload);
    success(res, data, 201);
  } catch (err) { next(err); }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const data = await incidentsService.updateStatus(req.params.id, req.body.status, req.body.note, req.user.name);
    success(res, data);
  } catch (err) { next(err); }
};

exports.assign = async (req, res, next) => {
  try {
    const data = await incidentsService.assign(req.params.id, req.body.staffName);
    success(res, data);
  } catch (err) { next(err); }
};
