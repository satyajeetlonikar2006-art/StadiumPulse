const authService = require('../services/auth.service');
const { success } = require('../utils/response');

exports.register = async (req, res, next) => {
  try {
    const data = await authService.register(req.body);
    success(res, data, 201);
  } catch (err) { next(err); }
};

exports.login = async (req, res, next) => {
  try {
    const data = await authService.login(req.body);
    success(res, data);
  } catch (err) { next(err); }
};

exports.refresh = async (req, res, next) => {
  try {
    const data = await authService.refresh(req.body.refreshToken);
    success(res, data);
  } catch (err) { next(err); }
};

exports.logout = async (req, res, next) => {
  try {
    const data = await authService.logout(req.user.id);
    success(res, data);
  } catch (err) { next(err); }
};

exports.getMe = async (req, res, next) => {
  try {
    const data = await authService.getMe(req.user.id);
    success(res, data);
  } catch (err) { next(err); }
};

exports.updateMe = async (req, res, next) => {
  try {
    const data = await authService.updateMe(req.user.id, req.body);
    success(res, data);
  } catch (err) { next(err); }
};
