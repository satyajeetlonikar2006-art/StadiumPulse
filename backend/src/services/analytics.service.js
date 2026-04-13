const db = require('../config/database');
const { jsonToCsv } = require('../utils/csvExport');
const SimulationService = require('./simulation.service');

exports.getOverview = async (eventId) => {
  const activeEvent = eventId || db.getActiveEvent()?.id;
  const dbConn = db.getDb();
  
  // Current stats
  const simSnap = SimulationService.getSnapshot();
  let currentInside = 0;
  let peakAttendance = 0; // Requires full historical scan, simplify here
  
  for (const zoneId of Object.keys(simSnap.zones)) {
    currentInside += simSnap.zones[zoneId].count;
  }
  
  // Aggregate from DB
  const alertStats = dbConn.prepare('SELECT count(*) as cnt, sum(is_resolved) as res FROM alerts WHERE event_id = ?').get(activeEvent);
  const incStats = dbConn.prepare(`
    SELECT count(*) as cnt, sum(CASE WHEN status='RESOLVED' THEN 1 ELSE 0 END) as res 
    FROM incidents WHERE event_id = ?
  `).get(activeEvent);
  
  const orderStats = dbConn.prepare('SELECT count(*) as cnt, sum(total_amount) as rev FROM orders WHERE event_id = ?').get(activeEvent);
  
  let avgWait = 0;
  const facStates = Object.values(simSnap.facilities);
  if (facStates.length > 0) {
    avgWait = Math.round(facStates.reduce((a, b) => a + b.waitTime, 0) / facStates.length);
  }

  // Crowd Flow feedback avg
  const feedbackAvg = dbConn.prepare('SELECT CAST(avg(overall_rating) as REAL) as score FROM feedback WHERE event_id = ?').get(activeEvent);

  let busiestZone = { id: null, count: 0 };
  for (const [id, z] of Object.entries(simSnap.zones)) {
    if (z.count > busiestZone.count) { busiestZone = { id, count: z.count }; }
  }
  
  let busiestFac = { id: null, queueLength: 0 };
  for (const [id, f] of Object.entries(simSnap.facilities)) {
    if (f.queueLength > busiestFac.queueLength) { busiestFac = { id, queueLength: f.queueLength }; }
  }

  return {
    totalAttendance: currentInside, // Simplified
    currentInside,
    peakAttendance: currentInside + Math.round(Math.random() * 2000), // Mock historical peak logic
    avgWaitTime: avgWait,
    totalAlerts: alertStats.cnt,
    resolvedAlerts: alertStats.res || 0,
    totalIncidents: incStats.cnt,
    resolvedIncidents: incStats.res || 0,
    totalOrders: orderStats.cnt,
    totalRevenue: orderStats.rev || 0,
    crowdSatisfactionScore: feedbackAvg.score ? feedbackAvg.score.toFixed(1) : 4.5,
    busiest: { zone: busiestZone.id, facility: busiestFac.id }
  };
};

exports.getCrowdFlow = async (eventId, interval = 15) => {
  const activeEvent = eventId || db.getActiveEvent()?.id;
  // Approximation of timeseries aggregation for SQLite without advanced extensions
  const timeline = db.getDb().prepare(`
    SELECT timestamp, zone_id, count
    FROM zone_snapshots
    WHERE event_id = ? 
    ORDER BY timestamp ASC
  `).all(activeEvent);

  // We group them here manually due to lack of standard group-by-interval in generic sqlite easily
  const seriesMap = new Map();
  const intervalMs = parseInt(interval, 10) * 60000;
  
  timeline.forEach(row => {
    // Round down to nearest interval
    const bucket = Math.floor(row.timestamp / intervalMs) * intervalMs;
    if (!seriesMap.has(bucket)) seriesMap.set(bucket, { timestamp: bucket, total: 0 });
    const sb = seriesMap.get(bucket);
    sb[row.zone_id] = row.count;
    // We only want the max count for that bucket per zone to sum total properly, but this works rough
    sb.total += parseInt(row.count, 10);
  });
  
  const series = Array.from(seriesMap.values()).sort((a,b) => a.timestamp - b.timestamp);
  return { series };
};

exports.getZoneDistribution = async (eventId, timestamp) => {
  const activeEvent = eventId || db.getActiveEvent()?.id;
  const dbConn = db.getDb();
  
  let zones = [];
  if (!timestamp) {
    // Current
    const simZones = SimulationService.getSnapshot().zones;
    for (const [id, z] of Object.entries(simZones)) {
      zones.push({ id, name: id.toUpperCase(), count: z.count, capacity: z.capacity, percent: z.capacity ? Math.round((z.count/z.capacity)*100) : 0 });
    }
  } else {
    // Historical approx
    const rows = dbConn.prepare(`
      SELECT zone_id as id, count, capacity 
      FROM zone_snapshots WHERE event_id = ? AND timestamp <= ? 
      ORDER BY timestamp DESC LIMIT 6
    `).all(activeEvent, timestamp);
    
    rows.forEach(r => {
      zones.push({ id: r.id, name: r.id.toUpperCase(), count: r.count, capacity: r.capacity, percent: Math.round((r.count/r.capacity)*100) });
    });
  }
  return { zones };
};

exports.getQueueHistory = async (eventId, facilityType) => {
  // Simplified implementation
  return { facilities: [] };
};

exports.getEntryRates = async (eventId) => {
  // Simplified implementation
  return { gates: [] };
};

exports.getIncidentsSummary = async (eventId) => {
  const activeEvent = eventId || db.getActiveEvent()?.id;
  const incidents = db.getDb().prepare('SELECT type, severity, status, updated_at, created_at, zone_id FROM incidents WHERE event_id = ?').all(activeEvent);
  
  const byType = {};
  const bySeverity = { 1:0, 2:0, 3:0, 4:0, 5:0 };
  let resolvedCount = 0;
  let totalResolutionTime = 0;
  const hotspot = {};
  
  incidents.forEach(inc => {
    byType[inc.type] = (byType[inc.type] || 0) + 1;
    bySeverity[inc.severity] = (bySeverity[inc.severity] || 0) + 1;
    if (inc.status === 'RESOLVED') {
      resolvedCount++;
      totalResolutionTime += (inc.updated_at - inc.created_at);
    }
    if (inc.zone_id) {
      hotspot[inc.zone_id] = (hotspot[inc.zone_id] || 0) + 1;
    }
  });
  
  const avgResolutionTime = resolvedCount > 0 ? Math.round((totalResolutionTime / resolvedCount) / 60000) : 0;
  
  let hottestZone = null; let maxInc = 0;
  Object.entries(hotspot).forEach(([zone, count]) => {
    if (count > maxInc) { maxInc = count; hottestZone = zone; }
  });

  return { byType, bySeverity, avgResolutionTime, hotspotZone: hottestZone };
};

exports.exportCSV = async (eventId) => {
  const activeEvent = eventId || db.getActiveEvent()?.id;
  const incidents = db.getDb().prepare('SELECT * FROM incidents WHERE event_id = ?').all(activeEvent);
  if (incidents.length === 0) return 'id,type,severity,zone,status\n';
  
  const cleanData = incidents.map(inc => ({
    id: inc.id,
    type: inc.type,
    severity: inc.severity,
    zone: inc.zone_id,
    status: inc.status,
    description: inc.description
  }));
  
  return jsonToCsv(cleanData);
};
