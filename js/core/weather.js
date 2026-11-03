/* CanopyOS — deterministic simulated weather data (no network required) */
import { seededRandom } from './util.js';

export const CONDITIONS = {
  sunny: { label: 'Sunny', icon: 'sun', night: 'Clear' },
  partly: { label: 'Partly Cloudy', icon: 'cloudSun' },
  cloudy: { label: 'Cloudy', icon: 'cloud' },
  rain: { label: 'Rain', icon: 'cloudRain' },
  storm: { label: 'Thunderstorms', icon: 'bolt' },
  snow: { label: 'Snow', icon: 'snow' },
  fog: { label: 'Fog', icon: 'cloud' },
  windy: { label: 'Windy', icon: 'wave' },
  clear: { label: 'Clear', icon: 'moon' },
};

const CITIES = [
  { name: 'San Diego', region: 'California', country: 'US', base: 21, cond: 'sunny', tz: 'America/Los_Angeles' },
  { name: 'San Francisco', region: 'California', country: 'US', base: 16, cond: 'fog', tz: 'America/Los_Angeles' },
  { name: 'New York', region: 'New York', country: 'US', base: 14, cond: 'partly', tz: 'America/New_York' },
  { name: 'Austin', region: 'Texas', country: 'US', base: 26, cond: 'storm', tz: 'America/Chicago' },
  { name: 'London', region: 'England', country: 'UK', base: 11, cond: 'rain', tz: 'Europe/London' },
  { name: 'Reykjavík', region: 'Capital Region', country: 'IS', base: 3, cond: 'snow', tz: 'Atlantic/Reykjavik' },
  { name: 'Tokyo', region: 'Kantō', country: 'JP', base: 19, cond: 'cloudy', tz: 'Asia/Tokyo' },
  { name: 'Sydney', region: 'New South Wales', country: 'AU', base: 24, cond: 'partly', tz: 'Australia/Sydney' },
  { name: 'Cape Town', region: 'Western Cape', country: 'ZA', base: 20, cond: 'windy', tz: 'Africa/Johannesburg' },
  { name: 'Mexico City', region: 'CDMX', country: 'MX', base: 22, cond: 'partly', tz: 'America/Mexico_City' },
];

const COND_KEYS = Object.keys(CONDITIONS);
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function listCities() { return CITIES.map((c) => ({ ...c })); }

export function getWeather(cityName) {
  const city = CITIES.find((c) => c.name === cityName) || CITIES[0];
  const rnd = seededRandom(city.name + new Date().toDateString());
  const cond = COND_KEYS.includes(city.cond) ? city.cond : 'partly';
  const temp = Math.round(city.base + (rnd() - 0.5) * 6);
  const high = temp + Math.round(3 + rnd() * 4);
  const low = temp - Math.round(4 + rnd() * 4);
  const now = new Date();
  const hourly = Array.from({ length: 24 }, (_, i) => {
    const hour = (now.getHours() + i) % 24;
    const curve = Math.sin(((hour - 6) / 24) * Math.PI * 2) * 4;
    return {
      hour,
      label: i === 0 ? 'Now' : `${hour % 12 === 0 ? 12 : hour % 12}${hour >= 12 ? 'PM' : 'AM'}`,
      temp: Math.round(temp + curve + (rnd() - 0.5) * 2),
      cond: rnd() > 0.82 ? COND_KEYS[Math.floor(rnd() * 5)] : cond,
      precip: Math.round(rnd() * (cond === 'rain' || cond === 'storm' ? 80 : 15)),
    };
  });
  const daily = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const swing = (rnd() - 0.5) * 5;
    return {
      label: i === 0 ? 'Today' : DAY_NAMES[d.getDay()],
      date: d,
      high: Math.round(high + swing),
      low: Math.round(low + swing),
      cond: COND_KEYS[Math.floor(rnd() * COND_KEYS.length)],
      precip: Math.round(rnd() * 70),
    };
  });
  return {
    city,
    temp, high, low, cond, condition: CONDITIONS[cond],
    feelsLike: temp + Math.round((rnd() - 0.4) * 3),
    humidity: Math.round(35 + rnd() * 50),
    wind: Math.round(3 + rnd() * 22),
    gust: Math.round(18 + rnd() * 25),
    uv: Math.round(1 + rnd() * 9),
    visibility: (4 + rnd() * 12).toFixed(1),
    pressure: Math.round(1000 + rnd() * 26),
    sunrise: `${5 + Math.round(rnd())}:${String(Math.round(rnd() * 59)).padStart(2, '0')} AM`,
    sunset: `${6 + Math.round(rnd() * 2)}:${String(Math.round(rnd() * 59)).padStart(2, '0')} PM`,
    hourly, daily,
  };
}

export function clockInZone(tz) {
  try {
    return new Date().toLocaleTimeString('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' });
  } catch (e) { return new Date().toLocaleTimeString(); }
}
