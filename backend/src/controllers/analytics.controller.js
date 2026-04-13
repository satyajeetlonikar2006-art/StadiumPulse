const analyticsService = require('../services/analytics.service');
const { success } = require('../utils/response');

exports.getOverview = async (req, res, next) => {
  try {
    const data = await analyticsService.getOverview(req.query.eventId);
    success(res, data);
  } catch (err) { next(err); }
};

exports.getCrowdFlow = async (req, res, next) => {
  try {
    const data = await analyticsService.getCrowdFlow(req.query.eventId, req.query.interval);
    success(res, data);
  } catch (err) { next(err); }
};

exports.getZoneDistribution = async (req, res, next) => {
  try {
    const data = await analyticsService.getZoneDistribution(req.query.eventId, req.query.timestamp);
    success(res, data);
  } catch (err) { next(err); }
};

exports.getQueueHistory = async (req, res, next) => {
  try {
    const data = await analyticsService.getQueueHistory(req.query.eventId, req.query.facilityType);
    success(res, data);
  } catch (err) { next(err); }
};

exports.getEntryRates = async (req, res, next) => {
  try {
    const data = await analyticsService.getEntryRates(req.query.eventId);
    success(res, data);
  } catch (err) { next(err); }
};

exports.getIncidentsSummary = async (req, res, next) => {
  try {
    const data = await analyticsService.getIncidentsSummary(req.query.eventId);
    success(res, data);
  } catch (err) { next(err); }
};

exports.exportAnalytics = async (req, res, next) => {
  try {
    const csvContent = await analyticsService.exportCSV(req.query.eventId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="analytics_export_${Date.now()}.csv"`);
    res.send(csvContent);
  } catch (err) { next(err); }
};
