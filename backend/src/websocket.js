const WebSocket = require('ws');
const { verifyToken } = require('./utils/jwt');
const url = require('url');

let wss;
const clients = new Map(); // Map ws object -> meta { userId, role, seat, zone }

const init = (server) => {
  wss = new WebSocket.Server({ server });

  wss.on('connection', (ws, req) => {
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    let userMeta = { role: 'guest' };

    // Parse URL and JWT
    const parameters = url.parse(req.url, true);
    if (parameters.query.token) {
      try {
        const decoded = verifyToken(parameters.query.token);
        userMeta = {
          userId: decoded.id,
          role: decoded.role,
          seat: decoded.seat,
          zone: decoded.seat ? decoded.seat.substring(0,1).toLowerCase() : null
        };
      } catch (err) {
        // If token invalid, allow connection as anon guest, or close.
        ws.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Invalid token, connecting as guest' }, timestamp: Date.now() }));
      }
    }

    clients.set(ws, userMeta);
    
    // On connect, immediately send a push of data if SimulationService is running
    // We defer the loading so we don't cause circular dependency issues at boot
    const simService = require('./services/simulation.service');
    if (simService.simulationRunning) {
      ws.send(JSON.stringify({
        type: 'ZONE_UPDATE',
        payload: { zones: simService.getSnapshot().zones },
        timestamp: Date.now()
      }));
    }

    ws.on('message', (messageAsString) => {
      try {
        const message = JSON.parse(messageAsString);
        handleClientMessage(ws, userMeta, message);
      } catch (e) {
        // invalid JSON mapping
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
    });
  });

  // Heartbeat ping every 30s
  setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        clients.delete(ws);
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  console.log('🔗 WebSocket server initialized');
};

const handleClientMessage = (ws, userMeta, message) => {
  const { type, payload } = message;

  if (type === 'PING') {
    ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
  } else if (type === 'SUBSCRIBE_ZONE') {
    // Basic implementation: update meta
    if (payload && payload.zoneId) {
      clients.set(ws, { ...userMeta, subscribedZone: payload.zoneId });
    }
  } else if (type === 'JOIN_QUEUE') {
    if (userMeta.role === 'guest') {
      ws.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Auth required to join queue' }}));
      return;
    }
    // E.g. trigger db insert, notify
  }
};

/**
 * Broadcast to all connected clients
 */
const broadcast = (data) => {
  if (!wss) return;
  const strData = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(strData);
    }
  });
};

/**
 * Broadcast specifically to users with a certain role (e.g., 'organizer')
 */
const broadcastToRole = (role, data) => {
  if (!wss) return;
  const strData = JSON.stringify(data);
  wss.clients.forEach((client) => {
    const meta = clients.get(client);
    if (meta && meta.role === role && client.readyState === WebSocket.OPEN) {
      client.send(strData);
    }
  });
};

/**
 * Broadcast specifically to a user ID (for order updates etc)
 */
const sendToUser = (userId, data) => {
  if (!wss) return;
  const strData = JSON.stringify(data);
  wss.clients.forEach((client) => {
    const meta = clients.get(client);
    if (meta && meta.userId === userId && client.readyState === WebSocket.OPEN) {
      client.send(strData);
    }
  });
};

/**
 * Broadcast specifically to users whose seat maps to a specific zone array
 */
const broadcastToZones = (zonesArray, data) => {
  if (!wss) return;
  const strData = JSON.stringify(data);
  const includeAll = zonesArray.includes('all');
  
  wss.clients.forEach((client) => {
    const meta = clients.get(client);
    // Rough match: if seat starts with N -> north etc. Adjust logic locally.
    const userZoneMatch = meta && meta.zone && zonesArray.includes(meta.zone);
    if ((includeAll || userZoneMatch) && client.readyState === WebSocket.OPEN) {
      client.send(strData);
    }
  });
};

module.exports = {
  init,
  broadcast,
  broadcastToRole,
  sendToUser,
  broadcastToZones
};
