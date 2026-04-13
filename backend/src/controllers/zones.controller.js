const zonesService = require('../services/zones.service');
const { success } = require('../utils/response');

exports.getAll = async (req, res, next) => {
  try {
    const data = await zonesService.getAll();
    success(res, data);
  } catch (err) { next(err); }
};

exports.getById = async (req, res, next) => {
  try {
    const data = await zonesService.getById(req.params.id);
    success(res, data);
  } catch (err) { next(err); }
};

exports.getHistory = async (req, res, next) => {
  try {
    const data = await zonesService.getHistory(req.params.id, parseInt(req.query.minutes || '60', 10));
    success(res, data);
  } catch (err) { next(err); }
};

exports.getForecast = async (req, res, next) => {
  try {
    const data = await zonesService.getForecast(req.params.id);
    success(res, data);
  } catch (err) { next(err); }
};

exports.getFacilities = async (req, res, next) => {
  try {
    const data = await zonesService.getFacilities(req.params.id);
    success(res, data);
  } catch (err) { next(err); }
};
