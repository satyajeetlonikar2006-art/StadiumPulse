const success = (res, data, statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    data,
    timestamp: Date.now()
  });
};

const paginated = (res, items, total, page, limit) => {
  res.status(200).json({
    success: true,
    data: items,
    pagination: {
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      pages: Math.ceil(total / limit)
    },
    timestamp: Date.now()
  });
};

const error = (res, message, statusCode = 400, code = 'ERROR', details = null) => {
  const payload = {
    success: false,
    error: {
      code,
      message
    }
  };
  if (details) payload.error.details = details;
  res.status(statusCode).json(payload);
};

module.exports = {
  success,
  paginated,
  error
};
