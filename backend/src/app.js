const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');
const config = require('./config');

const session      = require('express-session');
const passport     = require('passport');
const initPassport = require('./config/passport');
const AuthService  = require('./services/auth.service');

const { loggerMiddleware } = require('./middleware/logger');
const { apiLimiter } = require('./middleware/rateLimit');
const errorHandler = require('./middleware/errorHandler');
const routes = require('./routes');

const app = express();

// Trust one proxy hop (Cloud Run's reverse proxy) so req.protocol / req.hostname are correct
app.set('trust proxy', 1);

// 1. Security Headers
app.use(helmet());

// 2. GZIP compression
app.use(compression());

// 3. CORS
app.use(cors({
  origin: config.corsOrigins,
  credentials: true
}));

app.use(session({
  secret:            process.env.SESSION_SECRET || 'stadium_session_secret',
  resave:            false,
  saveUninitialized: false,
  cookie: {
    secure:   process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge:   24 * 60 * 60 * 1000 // 1 day
  }
}));

app.use(passport.initialize());

// 4 & 5. Body Parsers
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// 6. HTTP Logging
app.use(loggerMiddleware);

// 7. Global API Rate Limiter
app.use('/api', apiLimiter);

// Initialize passport with DB and expose AuthService
const db = require('./config/database').getDb();
initPassport(db);
app.locals.authService = new AuthService(db);

// 8. Serve static frontend files (Unified App)
const path = require('path');
app.use(express.static(path.join(__dirname, '../../')));

// 9. Mount all routes
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
