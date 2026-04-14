const { getDb } = require('../config/database');

class GeofenceService {

  // Haversine formula — real GPS distance in meters
  haversine(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth radius in meters
    const dLat = this._toRad(lat2 - lat1);
    const dLon = this._toRad(lon2 - lon1);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(this._toRad(lat1)) * 
              Math.cos(this._toRad(lat2)) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  _toRad(deg) { return deg * (Math.PI / 180); }

  detectStadium(userLat, userLng) {
    const stadiums = this._getStadiums();
    let nearest = null;
    let nearestDist = Infinity;

    for (const s of stadiums) {
      const dist = this.haversine(userLat, userLng, s.lat, s.lng);
      if (dist <= s.geofenceRadius && dist < nearestDist) {
        nearest = { ...s, distanceMeters: Math.round(dist) };
        nearestDist = dist;
      }
    }
    return nearest; // null if not at any stadium
  }

  getNearestStadium(userLat, userLng) {
    // Returns nearest even if outside geofence
    // Used for "nearby stadiums" feature
    const stadiums = this._getStadiums();
    return stadiums
      .map(s => ({
        ...s,
        distance: this.haversine(userLat, userLng, s.lat, s.lng)
      }))
      .sort((a, b) => a.distance - b.distance)[0];
  }

  _getStadiums() {
    // Read from DB — admin can add more via portal
    const db = getDb();
    return db.prepare(
      'SELECT * FROM stadiums WHERE is_active = 1'
    ).all();
  }
}

module.exports = new GeofenceService();
