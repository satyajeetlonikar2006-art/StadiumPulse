const morgan = require('morgan');
const fs = require('fs');
const path = require('path');

// Ensure log directory exists
const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Create a write stream (in append mode)
const logStream = fs.createWriteStream(path.join(logDir, 'access.log'), { flags: 'a' });

const loggerMiddleware = morgan('combined', { stream: logStream });

const logError = (err) => {
  const errorLog = `${new Date().toISOString()} - ${err.name}: ${err.message}\n${err.stack}\n\n`;
  fs.appendFileSync(path.join(logDir, 'error.log'), errorLog);
};

module.exports = { loggerMiddleware, logError };
