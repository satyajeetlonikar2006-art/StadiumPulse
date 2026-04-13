const weatherService = require('../services/weather.service');
const { success } = require('../utils/response');

exports.getWeather = async (req, res, next) => {
  try {
    const data = await weatherService.getWeather(req.query.city);
    success(res, data);
  } catch (err) { next(err); }
};
