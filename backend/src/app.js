const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');
const config = require('./config');

const { loggerMiddleware } = require('./middleware/logger');
const { apiLimiter } = require('./middleware/rateLimit');
const errorHandler = require('./middleware/errorHandler');
const routes = require('./routes');

const app = express();

// 1. Security Headers
app.use(helmet());

// 2. GZIP compression
app.use(compression());

// 3. CORS
app.use(cors({
  origin: config.corsOrigins,
  credentials: true
}));

// 4 & 5. Body Parsers
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// 6. HTTP Logging
app.use(loggerMiddleware);

// 7. Global API Rate Limiter
app.use('/api', apiLimiter);

// 8. Mount all routes
app.use('/api', routes);

// 9. Unknown Routes / 404 Handler
app.use((req, res, next) => {
  const error = new Error(`Not Found - ${req.method} ${req.originalUrl}`);
  error.name = 'NotFoundError';
  next(error);
});

// 10. Global Error Handler
app.use(errorHandler);

module.exports = app;
