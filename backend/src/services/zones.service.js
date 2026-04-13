const fs = require('fs');
const path = require('path');
const SimulationService = require('./simulation.service');

// Load static details
const stadiumData = JSON.parse(fs.readFileSync(path.join(__dirname, '../../data/stadium.json'), 'utf8'));
const facilitiesData = JSON.parse(fs.readFileSync(path.join(__dirname, '../../data/facilities.json'), 'utf8'));

class NotFoundError extends Error {
  constructor(message) { super(message); this.name = 'NotFoundError'; }
}

exports.getAll = async () => {
  const currentSnapshot = SimulationService.getSnapshot();
  const zonesArray = Object.keys(stadiumData.zones).map(id => ({
    ...stadiumData.zones[id],
    ...currentSnapshot.zones[id]
  }));
  return { zones: zonesArray };
};

exports.getById = async (id) => {
  const meta = stadiumData.zones[id];
  if (!meta) throw new NotFoundError('Zone not found');
  const sim = SimulationService.getZoneState(id) || { count: 0, capacity: meta.capacity };
  const density = sim.capacity > 0 ? sim.count / sim.capacity : 0;
  return { zone: { ...meta, count: sim.count, density, waitTime: 0 } };
};

exports.getHistory = async (id, minutes) => {
  if (minutes > 480) minutes = 480;
  const history = SimulationService.getHistory(id, minutes, 'zone');
  return { history: history.map(h => ({ timestamp: h.timestamp, count: h.count, density: h.density })) };
};

exports.getForecast = async (id) => {
  // Use last 30 minutes to do simple linear regression predict
  const history = SimulationService.getHistory(id, 30, 'zone');
  if (history.length < 2) return { forecast: [{ minutesFromNow: 30, predictedDensity: SimulationService.getZoneState(id)?.count / stadiumData.zones[id].capacity || 0 }] };
  
  const first = history[0];
  const last = history[history.length - 1];
  const slope = (last.density - first.density) / (last.timestamp - first.timestamp); // density per ms
  
  const forecast = [];
  for (let i = 1; i <= 6; i++) {
    const mins = i * 5; // predict every 5 mins up to 30
    const timeDelta = mins * 60000;
    const predictDensity = Math.max(0, Math.min(1, last.density + (slope * timeDelta)));
    forecast.push({ minutesFromNow: mins, predictedDensity: predictDensity });
  }
  return { forecast };
};

exports.getFacilities = async (id) => {
  const facsForZone = facilitiesData.filter(f => f.zone === id);
  const currentSnapshot = SimulationService.getSnapshot();
  const res = facsForZone.map(f => ({
    ...f,
    current: currentSnapshot.facilities[f.id] || { queueLength: 0, waitTime: 0 }
  }));
  return { facilities: res };
};
