const { logError } = require('./logger');

const errorHandler = (err, req, res, next) => {
  // Always log internal errors to file
  logError(err);
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: err.message, details: err.details } });
  }
  if (err.name === 'AuthError') {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: err.message } });
  }
  if (err.name === 'ForbiddenError') {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: err.message } });
  }
  if (err.name === 'NotFoundError') {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: err.message } });
  }
  if (err.name === 'ConflictError') {
    return res.status(409).json({ success: false, error: { code: 'CONFLICT', message: err.message } });
  }
  
  // Default to 500
  const isProduction = process.env.NODE_ENV === 'production';
  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred on the server',
      details: isProduction ? null : err.message
    }
  });
};

module.exports = errorHandler;
