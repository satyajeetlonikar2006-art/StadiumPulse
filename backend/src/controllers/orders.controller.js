const ordersService = require('../services/orders.service');
const { success } = require('../utils/response');

exports.getAll = async (req, res, next) => {
  try {
    const data = await ordersService.getAll(req.user, req.query.eventId);
    success(res, data);
  } catch (err) { next(err); }
};

exports.getById = async (req, res, next) => {
  try {
    const data = await ordersService.getById(req.params.id, req.user);
    success(res, data);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const data = await ordersService.create(req.user.id, req.body);
    success(res, data, 201);
  } catch (err) { next(err); }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const data = await ordersService.updateStatus(req.params.id, req.body.status);
    success(res, data);
  } catch (err) { next(err); }
};

exports.cancelOrder = async (req, res, next) => {
  try {
    const data = await ordersService.cancelOrder(req.params.id, req.user);
    success(res, data);
  } catch (err) { next(err); }
};
