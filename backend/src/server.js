const http = require('http');
const config = require('./config');
const db = require('./config/database');

// Initialize DB BEFORE loading app.js (which needs getDb() at load time)
db.init();

const app = require('./app');
const wss = require('./websocket');
const SimulationService = require('./services/simulation.service');

const server = http.createServer(app);

// Attach websocket to same server
wss.init(server);

const startServer = () => {
  try {

    // Start listening
    server.listen(config.port, '0.0.0.0', () => {
      console.log(`🚀 StadiumPulse HTTP Server running on port ${config.port} in ${config.env} mode`);
      console.log(`🔌 WebSocket server attached to same port (or ${config.wsPort})`);
      console.log(`💾 Database connected at ${config.dbPath}`);
      
      // Initialize core simulation service for active event
      const activeEvent = db.getActiveEvent();
      if (activeEvent) {
        SimulationService.start(activeEvent.id);
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

const gracefulShutdown = () => {
  console.log('SIGTERM/SIGINT received. Shutting down gracefully...');
  
  // Stop simulation loop
  SimulationService.stop();
  
  // Close HTTP and WS server
  server.close(() => {
    console.log('HTTP Server closed.');
    
    // Close DB connection
    db.close();
    console.log('Database connection closed.');
    
    process.exit(0);
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

startServer();
