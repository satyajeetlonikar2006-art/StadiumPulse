// Cached weather
let weatherCache = { data: null, timestamp: 0 };
const CACHE_TTL = 10 * 60 * 1000; // 10 mins

exports.getWeather = async (city = 'Mumbai') => {
  if (weatherCache.data && (Date.now() - weatherCache.timestamp) < CACHE_TTL) {
    return weatherCache.data;
  }

  try {
    // Dynamic import for fetch in CommonJS environments (node 20 natively supports fetch but sometimes requires explicit call, actually global.fetch is usually fine)
    const res = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=j1`);
    if (!res.ok) throw new Error('Fetch failed');
    const json = await res.json();
    
    const current = json.current_condition[0];
    const data = {
      temp: parseInt(current.temp_C, 10),
      feelsLike: parseInt(current.FeelsLikeC, 10),
      humidity: parseInt(current.humidity, 10),
      windKmh: parseInt(current.windspeedKmph, 10),
      condition: current.weatherDesc[0].value,
      uvIndex: parseInt(current.uvIndex, 10),
      icon: getWeatherIcon(current.weatherCode),
      cachedAt: Date.now()
    };
    
    weatherCache.data = data;
    weatherCache.timestamp = Date.now();
    return data;
  } catch (error) {
    console.error('Weather fetch failed, returning mock data:', error.message);
    if (weatherCache.data) return weatherCache.data;
    
    // Return mock data for demo safety
    return {
      temp: 32, feelsLike: 35, humidity: 70, windKmh: 12,
      condition: 'Partly cloudy', uvIndex: 6, icon: '⛅', cachedAt: Date.now()
    };
  }
};

function getWeatherIcon(code) {
  // basic wttr.in code to emoji mappings
  if (['113'].includes(code)) return '☀️';
  if (['116', '119'].includes(code)) return '⛅';
  if (['122', '143', '248', '260'].includes(code)) return '☁️';
  if (['176', '263', '266', '293', '296', '299', '302', '305', '308', '353'].includes(code)) return '🌧️';
  if (['200', '386', '389'].includes(code)) return '⛈️';
  return '🌡️';
}
