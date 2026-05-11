const http = require('http');
const config = require('./config');
const db = require('./config/database');
const SimulationService = require('./services/simulation.service');

const server = http.createServer();

const startServer = () => {
  try {
    console.log('🏁 Starting StadiumPulse Server...');
    
    // Initialize DB
    db.init();
    
    // Load app and websocket after DB is ready
    const app = require('./app');
    const wss = require('./websocket');
    
    server.on('request', app);
    
    // Attach websocket to same server
    wss.init(server);

    // Start listening
    const port = process.env.PORT || 8080;
    server.listen(port, '0.0.0.0', () => {
      console.log(`🚀 StadiumPulse HTTP Server running on port ${port} in ${config.env} mode`);
      console.log(`🔌 WebSocket server attached to same port`);
      console.log(`💾 Database connected at ${config.dbPath}`);
      
      // Initialize core simulation service for active event
      const activeEvent = db.getActiveEvent();
      if (activeEvent) {
        SimulationService.start(activeEvent.id);
      }
    });
  } catch (error) {
    console.error('💥 Failed to start server:', error);
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

process.on('uncaughtException', (err) => {
  console.error('💥 UNCAUGHT EXCEPTION! Shutting down...', err.name, err.message, err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('💥 UNHANDLED REJECTION! Shutting down...', err.name, err.message, err.stack);
  process.exit(1);
});

startServer();
