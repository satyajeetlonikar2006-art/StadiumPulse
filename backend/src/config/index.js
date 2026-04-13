require('dotenv').config();
const path = require('path');

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  wsPort: parseInt(process.env.WS_PORT || '5001', 10),
  dbPath: process.env.DB_PATH || path.join(__dirname, '../../stadiumpulse.sqlite'),
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_prod',
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  },
  corsOrigins: (process.env.CORS_ORIGINS || '').split(','),
  simulation: {
    tickRateMs: parseInt(process.env.SIMULATION_TICK_RATE_MS || '5000', 10)
  }
};
