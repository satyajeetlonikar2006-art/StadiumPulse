const parkingService = require('../services/parking.service');
const { success } = require('../utils/response');

exports.getZones = async (req, res, next) => {
  try {
    const data = await parkingService.getZones();
    success(res, data);
  } catch (err) { next(err); }
};

exports.getBaysByZone = async (req, res, next) => {
  try {
    const data = await parkingService.getBaysByZone(req.params.zoneId);
    success(res, data);
  } catch (err) { next(err); }
};

exports.reserve = async (req, res, next) => {
  try {
    const data = await parkingService.reserve(req.user.id, req.body.zoneId, req.body.bayId, req.body.vehicleNumber);
    success(res, data);
  } catch (err) { next(err); }
};

exports.cancelReserve = async (req, res, next) => {
  try {
    const data = await parkingService.cancelReserve(req.params.id, req.user.id);
    success(res, data);
  } catch (err) { next(err); }
};

exports.getMyReservation = async (req, res, next) => {
  try {
    const data = await parkingService.getMyReservation(req.user.id);
    success(res, data);
  } catch (err) { next(err); }
};
