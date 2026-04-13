const usersService = require('../services/users.service');
const { success } = require('../utils/response');

exports.getAll = async (req, res, next) => {
  try {
    const data = await usersService.getAll(req.query.role, req.query.limit, req.query.offset);
    success(res, data);
  } catch (err) { next(err); }
};

exports.getById = async (req, res, next) => {
  try {
    const data = await usersService.getById(req.params.id);
    success(res, data);
  } catch (err) { next(err); }
};

exports.updateRole = async (req, res, next) => {
  try {
    const data = await usersService.updateRole(req.params.id, req.body.role);
    success(res, data);
  } catch (err) { next(err); }
};
