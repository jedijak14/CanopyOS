/* CanopyOS — Weather */
import { data } from '../core/data.js';
import { sound } from '../core/sound.js';
import { glyph } from '../core/icons.js';
import { getWeather, listCities, CONDITIONS, clockInZone } from '../core/weather.js';
import { escapeHtml, fmtDate } from '../core/util.js';
import { promptModal } from '../ui/modal.js';

const toF = (c) => Math.round((c * 9) / 5 + 32);

export default {
  id: 'weather',
  name: 'Weather',
  icon: 'weather',
  colors: ['#5ab9f5', '#0a6fd1'],
  width: 900, height: 640,
  keywords: ['forecast', 'temperature', 'rain', 'climate'],
  menus: (win) => [
    { label: 'View', items: [
      { label: 'Refresh', shortcut: '⌘R', action: () => win?._refresh() },
      { label: 'Add City…', action: () => win?._addCity() },
      { sep: true },
      { label: 'Use Celsius', action: () => win?._units('C') },
      { label: 'Use Fahrenheit', action: () => win?._units('F') },
    ] },
  ],

  mount({ root, toolbar, win }) {
    let cities = data.get('weatherCities', ['San Diego', 'San Francisco', 'Tokyo']);
    let city = data.get('weatherCity', 'San Diego');
    let unit = data.get('tempUnit', 'F');
    let w = getWeather(city);

    root.innerHTML = `<div class="weather">
      <aside class="weather-side">
        <div class="weather-side-title">My Locations</div>
        <div class="weather-cities" data-cities></div>
        <button class="weather-add" data-add>${glyph('plusCircle', 13, 1.8)} Add City</button>
      </aside>
      <section class="weather-main scroll-thin">
        <div class="weather-hero" data-hero></div>
        <div class="weather-hourly scroll-thin" data-hourly></div>
        <div class="weather-daily" data-daily></div>
        <div class="weather-details" data-details></div>
        <div class="weather-foot tiny muted">Simulated forecast · generated locally, no network requests</div>
      </section>
    </div>`;

    const citiesEl = root.querySelector('[data-cities]');
    const t = (c) => (unit === 'F' ? `${toF(c)}°` : `${Math.round(c)}°`);

    function renderCities() {
      citiesEl.innerHTML = cities.map((c) => {
        const cw = getWeather(c);
        return `<button class="weather-city ${c === city ? 'active' : ''}" data-city="${escapeHtml(c)}">
          <div><b>${escapeHtml(c)}</b><small>${cw.city.country} · ${clockInZone(cw.city.tz)}</small></div>
          <span class="weather-city-temp">${t(cw.temp)}</span>
        </button>`;
      }).join('');
      citiesEl.querySelectorAll('[data-city]').forEach((b) => b.addEventListener('click', () => {
        city = b.dataset.city;
        data.set('weatherCity', city);
        w = getWeather(city);
        render();
      }));
    }

    function renderHero() {
      root.querySelector('[data-hero]').innerHTML = `
        <div class="weather-hero-top">
          <div class="weather-hero-city">${escapeHtml(w.city.name)}</div>
          <div class="tiny" style="opacity:.75">${fmtDate(new Date(), { year: true })} · ${clockInZone(w.city.tz)}</div>
        </div>
        <div class="weather-hero-row">
          <div>
            <div class="weather-temp">${t(w.temp)}</div>
            <div class="weather-cond">${w.condition.label}</div>
            <div class="weather-hl">H:${t(w.high)} L:${t(w.low)} · Feels like ${t(w.feelsLike)}</div>
          </div>
          <div class="weather-icon">${glyph(w.condition.icon, 96, 1.1)}</div>
        </div>`;
    }

    function renderHourly() {
      root.querySelector('[data-hourly]').innerHTML = `<div class="weather-hourly-inner">
        ${w.hourly.slice(0, 24).map((h) => `<div class="weather-hour ${h.hours === 0 ? '' : ''}">
          <div class="tiny">${h.label}</div>
          <div class="wh-icon">${glyph(CONDITIONS[h.cond]?.icon || 'sun', 20, 1.6)}</div>
          ${h.precip > 20 ? `<div class="wh-precip">${h.precip}%</div>` : '<div class="wh-precip">&nbsp;</div>'}
          <div class="wh-temp">${t(h.temp)}</div>
        </div>`).join('')}
      </div><div class="tiny muted" style="padding:4px 2px">Hourly forecast</div>`;
    }

    function renderDaily() {
      const min = Math.min(...w.daily.map((d) => d.low));
      const max = Math.max(...w.daily.map((d) => d.high));
      root.querySelector('[data-daily]').innerHTML = w.daily.map((d) => `
        <div class="weather-day">
          <div class="wd-label">${d.label}</div>
          <div class="wd-icon">${glyph(CONDITIONS[d.cond]?.icon || 'sun', 22, 1.6)}</div>
          <div class="wd-precip">${d.precip > 20 ? d.precip + '%' : ''}</div>
          <div class="wd-low">${t(d.low)}</div>
          <div class="wd-bar"><span style="left:${((d.low - min) / (max - min || 1)) * 100}%;right:${(1 - (d.high - min) / (max - min || 1)) * 100}%"></span></div>
          <div class="wd-high">${t(d.high)}</div>
        </div>`).join('');
    }

    function renderDetails() {
      const tiles = [
        ['UV Index', String(w.uv), w.uv > 7 ? 'High — wear sunscreen' : w.uv > 3 ? 'Moderate' : 'Low'],
        ['Humidity', `${w.humidity}%`, w.humidity > 70 ? 'Muggy' : 'Comfortable'],
        ['Wind', `${w.wind} km/h`, `Gusts up to ${w.gust}`],
        ['Visibility', `${w.visibility} km`, 'Clear'],
        ['Pressure', `${w.pressure} hPa`, 'Steady'],
        ['Sunrise / Sunset', `${w.sunrise}`, `${w.sunset}`],
      ];
      root.querySelector('[data-details]').innerHTML = tiles.map(([label, value, sub]) => `
        <div class="weather-tile"><div class="tiny muted">${label}</div><div class="wt-value">${escapeHtml(value)}</div><div class="tiny muted">${escapeHtml(sub)}</div></div>`).join('');
    }

    function render() {
      renderCities();
      renderHero();
      renderHourly();
      renderDaily();
      renderDetails();
      win.setTitle(`Weather — ${w.city.name}`);
      toolbar.innerHTML = `<span class="fn-toolbar-title">${escapeHtml(w.city.name)}</span><span class="spacer"></span>
        <div class="set-seg no-drag" data-unit-seg>
          <button data-unit="F" class="${unit === 'F' ? 'on' : ''}">°F</button>
          <button data-unit="C" class="${unit === 'C' ? 'on' : ''}">°C</button>
        </div>
        <button class="icon-btn no-drag" data-refresh title="Refresh">${glyph('refresh', 15, 1.8)}</button>`;
      toolbar.querySelectorAll('[data-unit]').forEach((b) => b.addEventListener('click', () => win._units(b.dataset.unit)));
      toolbar.querySelector('[data-refresh]').addEventListener('click', () => win._refresh());
    }

    win._refresh = () => {
      w = getWeather(city);
      render();
      sound.play('pop');
    };
    win._units = (u) => { unit = u; data.set('tempUnit', u); render(); };
    win._addCity = async () => {
      const rest = listCities().filter((c) => !cities.includes(c.name));
      if (!rest.length) return;
      const name = await promptModal({ title: 'Add City', label: `Available: ${rest.map((c) => c.name).join(', ')}`, value: rest[0].name, okLabel: 'Add' });
      if (!name) return;
      const found = listCities().find((c) => c.name.toLowerCase() === name.trim().toLowerCase());
      if (!found) return;
      cities = [...cities, found.name];
      data.set('weatherCities', cities);
      city = found.name;
      data.set('weatherCity', city);
      w = getWeather(city);
      render();
    };

    root.querySelector('[data-add]').addEventListener('click', () => win._addCity());
    render();
    const timer = setInterval(() => { if (!root.isConnected) return clearInterval(timer); renderCities(); }, 60000);
    win.onClose(() => clearInterval(timer));
  },
};
