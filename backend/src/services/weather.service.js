class WeatherService {
  constructor() {
    this.cache = null;
    this.cachedAt = 0;
    this.TTL = 10 * 60 * 1000; // 10 minutes
    this.defaultCity = 'Mumbai';
  }

  async getWeather(city = this.defaultCity) {
    if (!city) city = this.defaultCity;
    // Return cache if still fresh
    if (this.cache && (Date.now() - this.cachedAt) < this.TTL) {
      return this.cache;
    }

    try {
      const url = `https://wttr.in/${encodeURIComponent(city)}?format=j1`;
      const res = await fetch(url, { 
        signal: AbortSignal.timeout(5000) // 5s timeout
      });
      
      if (!res.ok) throw new Error('wttr.in request failed');
      
      const raw = await res.json();
      const c = raw.current_condition[0];
      const nearest = raw.nearest_area[0];

      this.cache = {
        city:          nearest.areaName[0].value,
        country:       nearest.country[0].value,
        temp:          parseInt(c.temp_C),
        feelsLike:     parseInt(c.FeelsLikeC),
        humidity:      parseInt(c.humidity),
        windKmh:       parseInt(c.windspeedKmph),
        windDir:       c.winddir16Point,
        condition:     c.weatherDesc[0].value,
        uvIndex:       parseInt(c.uvIndex),
        visibility:    parseInt(c.visibility),
        pressure:      parseInt(c.pressure),
        cloudCover:    parseInt(c.cloudcover),
        isReal:        true,
        source:        'wttr.in',
        fetchedAt:     Date.now(),
        comfortIndex:  this._calcComfort(
                         parseInt(c.temp_C), 
                         parseInt(c.humidity)
                       ),
        advice:        this._getAdvice(
                         parseInt(c.temp_C),
                         parseInt(c.humidity),
                         parseInt(c.uvIndex),
                         c.weatherDesc[0].value
                       )
      };
      this.cachedAt = Date.now();
      return this.cache;

    } catch (err) {
      console.error('[WeatherService] fetch failed:', err.message);
      // Return last cache even if stale, or fallback
      if (this.cache) return { ...this.cache, stale: true };
      return this._fallback(city);
    }
  }

  _calcComfort(temp, humidity) {
    // Heat index formula for stadium context
    if (temp < 27) return 'comfortable';
    if (temp >= 27 && humidity > 80) return 'very_uncomfortable';
    if (temp >= 35) return 'dangerous';
    if (temp >= 30 && humidity > 70) return 'uncomfortable';
    return 'moderate';
  }

  _getAdvice(temp, humidity, uv, condition) {
    const tips = [];
    if (temp >= 35) tips.push('Extreme heat — stay hydrated');
    if (humidity >= 85) tips.push('Very humid — carry extra water');
    if (uv >= 8) tips.push('High UV — apply sunscreen');
    if (uv >= 6) tips.push('Wear a cap or hat');
    if (condition.toLowerCase().includes('rain')) 
      tips.push('Rain expected — carry a light jacket');
    if (temp < 20) tips.push('Cool evening — bring a jacket');
    if (tips.length === 0) tips.push('Pleasant weather for cricket!');
    return tips;
  }

  _fallback(city) {
    return {
      city, temp: 30, feelsLike: 33, humidity: 72,
      windKmh: 14, condition: 'Partly cloudy',
      uvIndex: 6, isReal: false, source: 'fallback',
      comfortIndex: 'moderate',
      advice: ['Data temporarily unavailable']
    };
  }
}

module.exports = new WeatherService();
