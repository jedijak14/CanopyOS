/* CanopyOS — shared app data store (notes, mail, reminders, events, contacts…) */
import { uid } from './util.js';

const KEY = 'canopy.data.v1';
const today = new Date();

function dateOffset(days, hour = 10, minute = 0) {
  const d = new Date(today);
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d.getTime();
}
function isoDate(days) {
  const d = new Date(today);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function defaults() {
  return {
    notes: [
      {
        id: 'n1', title: 'CanopyOS launch checklist', folder: 'Work', tags: ['launch'],
        updated: Date.now() - 1000 * 60 * 22, pinned: true,
        body: `# Launch checklist\n\n- [x] Window manager\n- [x] Spotlight\n- [x] Dock magnification\n- [ ] Wallpaper pack\n- [ ] Accessibility review\n\n> Ship it Friday.\n\nRemember to thank the beta testers.`,
      },
      {
        id: 'n2', title: 'Grocery run', folder: 'Personal', tags: ['errands'],
        updated: Date.now() - 1000 * 60 * 60 * 3, pinned: false,
        body: `Oat milk\nCoffee beans\nSourdough\nBasil\nOlive oil\nRice\n\n*Farmers market is Saturday.*`,
      },
      {
        id: 'n3', title: 'Garden notes', folder: 'Personal', tags: ['garden'],
        updated: Date.now() - 1000 * 60 * 60 * 26, pinned: false,
        body: `The fern by the window needs less direct light.\n\nWater the monstera on Tuesdays and Fridays.\n\nRepot the basil when roots show at the drainage holes.`,
      },
      {
        id: 'n4', title: 'Reading list', folder: 'Personal', tags: ['books'],
        updated: Date.now() - 1000 * 60 * 60 * 70, pinned: false,
        body: `- The Overstory — Richard Powers\n- Braiding Sweetgrass — Robin Wall Kimmerer\n- The Design of Everyday Things — Don Norman\n- Shape Up — Ryan Singer`,
      },
    ],
    reminders: [
      { id: 'r1', title: 'Water the plants', list: 'Personal', done: false, due: isoDate(0), priority: 'normal', notes: '' },
      { id: 'r2', title: 'Review pull request #128', list: 'Work', done: false, due: isoDate(0), priority: 'high', notes: 'Focus on the dock animation timing.' },
      { id: 'r3', title: 'Book dentist appointment', list: 'Personal', done: false, due: isoDate(2), priority: 'normal', notes: '' },
      { id: 'r4', title: 'Send design tokens to Moss', list: 'Work', done: true, due: isoDate(-1), priority: 'normal', notes: '' },
      { id: 'r5', title: 'Pick up dry cleaning', list: 'Errands', done: false, due: isoDate(1), priority: 'low', notes: '' },
      { id: 'r6', title: 'Renew library books', list: 'Errands', done: false, due: isoDate(4), priority: 'normal', notes: '' },
      { id: 'r7', title: 'Plan weekend hike', list: 'Personal', done: false, due: isoDate(3), priority: 'low', notes: 'Torrey Pines, early start.' },
    ],
    events: [
      { id: 'e1', title: 'Design review', date: isoDate(0), start: '10:00', end: '11:00', calendar: 'Work', location: 'Canopy Room', color: '#0a84ff', notes: 'Bring the new dock specs.' },
      { id: 'e2', title: 'Coffee with Sam', date: isoDate(1), start: '09:30', end: '10:15', calendar: 'Personal', location: 'Fern & Filter', color: '#34c759', notes: '' },
      { id: 'e3', title: 'Sprint planning', date: isoDate(2), start: '14:00', end: '15:00', calendar: 'Work', location: 'Video call', color: '#0a84ff', notes: '' },
      { id: 'e4', title: 'Yoga', date: isoDate(3), start: '18:30', end: '19:30', calendar: 'Personal', location: 'Studio 4', color: '#34c759', notes: '' },
      { id: 'e5', title: 'Release 1.0', date: isoDate(5), start: '12:00', end: '13:00', calendar: 'Work', location: 'Everywhere', color: '#ff9f0a', notes: 'Tag the repo, publish notes.' },
      { id: 'e6', title: 'Farmers market', date: isoDate(6), start: '08:00', end: '10:00', calendar: 'Personal', location: 'Little Italy', color: '#34c759', notes: '' },
    ],
    mail: [
      {
        id: 'm1', folder: 'inbox', from: 'Sam Rivera', email: 'sam@canopy.dev', subject: 'Dock magnification feels great',
        preview: 'The cosine falloff is so much smoother than the linear one…', unread: true, starred: false,
        date: Date.now() - 1000 * 60 * 12, hasAttachment: false,
        body: `Hey,\n\nThe cosine falloff you shipped makes the dock feel alive. Neighbours scale down naturally instead of popping.\n\nOne thought: on very wide screens the effect spread could be a touch narrower. Try a radius of 3 icons instead of 4.\n\nNice work!\n— Sam`,
      },
      {
        id: 'm2', folder: 'inbox', from: 'Moss & Pine', email: 'hello@mosspine.fm', subject: 'Your album is live 🌿',
        preview: 'Green Noise is now streaming everywhere. Thanks for listening…', unread: true, starred: true,
        date: Date.now() - 1000 * 60 * 60 * 2, hasAttachment: true,
        body: `Hi there,\n\nGreen Noise is officially out. It was recorded in a cabin with a single condenser mic and a very curious cat.\n\nTrack list:\n1. Understory\n2. Fern Light\n3. Old Growth\n\nThank you for supporting independent music.\n\n— Moss & Pine`,
      },
      {
        id: 'm3', folder: 'inbox', from: 'CanopyOS Team', email: 'team@canopyos.org', subject: 'Weekly build 1.0.3 is ready',
        preview: 'Snapping, spaces, and a new wallpaper. Test notes inside…', unread: false, starred: false,
        date: Date.now() - 1000 * 60 * 60 * 24, hasAttachment: false,
        body: `Build 1.0.3\n\n• Edge snapping rewritten with a 16px activation zone\n• Spaces can be added and removed from Mission Control\n• New "Bark" wallpaper in the gallery\n• Fixed: Spotlight lost focus after opening a file\n\nReport issues in the Terminal with: bug "description"`,
      },
      {
        id: 'm4', folder: 'inbox', from: 'Acorn Financial', email: 'statements@acorn.example', subject: 'Your monthly statement',
        preview: 'Your October statement is available to review…', unread: false, starred: false,
        date: Date.now() - 1000 * 60 * 60 * 49, hasAttachment: true,
        body: `Hello Canopy User,\n\nYour statement for October is ready.\n\nOpening balance: $4,210.55\nClosing balance: $5,087.10\n\nThis is a simulated message for the CanopyOS demo.\n\nAcorn Financial`,
      },
      {
        id: 'm5', folder: 'inbox', from: 'Riley Chen', email: 'riley@example.com', subject: 'Re: hiking Saturday?',
        preview: 'Torrey Pines at 7am works. Bring more water than you think…', unread: false, starred: false,
        date: Date.now() - 1000 * 60 * 60 * 72, hasAttachment: false,
        body: `Torrey Pines at 7am works for me. Bring more water than you think you need — the last stretch is exposed.\n\nI'll bring the good trail mix.\n\n— R`,
      },
      {
        id: 'm6', folder: 'inbox', from: 'Leafwork Labs', email: 'noreply@leafwork.example', subject: 'Invitation: Plant biology webinar',
        preview: 'Join us Thursday for a session on urban canopy cover…', unread: false, starred: false,
        date: Date.now() - 1000 * 60 * 60 * 96, hasAttachment: false,
        body: `You're invited to "Urban Canopy Cover: measuring what matters", a 45-minute webinar this Thursday at 4pm.\n\nSpeaker: Dr. Ana Verdant\n\nSeats are limited.`,
      },
      {
        id: 'm7', folder: 'sent', from: 'Canopy User', email: 'you@canopy.os', subject: 'Re: Dock magnification feels great',
        preview: 'Thanks! Trying radius 3 now…', unread: false, starred: false,
        date: Date.now() - 1000 * 60 * 8, hasAttachment: false,
        body: `Thanks Sam — trying radius 3 on the wide display now. It does read better.\n\nI also added a subtle shadow so icons feel grounded when they lift.\n\n— C`,
      },
      {
        id: 'm8', folder: 'drafts', from: 'Canopy User', email: 'you@canopy.os', subject: 'Draft: wallpaper pack',
        preview: 'Attached are the six wallpapers…', unread: false, starred: false,
        date: Date.now() - 1000 * 60 * 60 * 5, hasAttachment: false,
        body: 'Attached are the six wallpapers. All generated with CSS gradients, no bitmaps.\n\n',
      },
    ],
    contacts: [
      { id: 'c1', name: 'Sam Rivera', role: 'Design lead', email: 'sam@canopy.dev', phone: '(619) 555-0142', company: 'Canopy', color: '#0a84ff', favorite: true, notes: 'Prefers voice notes.' },
      { id: 'c2', name: 'Riley Chen', role: 'Trail buddy', email: 'riley@example.com', phone: '(619) 555-0188', company: '—', color: '#34c759', favorite: true, notes: 'Knows every trail in the county.' },
      { id: 'c3', name: 'Moss', role: 'Musician', email: 'hello@mosspine.fm', phone: '—', company: 'Moss & Pine', color: '#8e5cf7', favorite: false, notes: 'Released Green Noise.' },
      { id: 'c4', name: 'Ana Verdant', role: 'Biologist', email: 'ana@leafwork.example', phone: '(415) 555-0119', company: 'Leafwork Labs', color: '#ff9f0a', favorite: false, notes: '' },
      { id: 'c5', name: 'Dev Patel', role: 'Engineer', email: 'dev@canopy.dev', phone: '(408) 555-0177', company: 'Canopy', color: '#ff375f', favorite: false, notes: 'Owns the render pipeline.' },
      { id: 'c6', name: 'Jules Moreau', role: 'Writer', email: 'jules@example.com', phone: '—', company: 'Freelance', color: '#5ac8fa', favorite: false, notes: '' },
      { id: 'c7', name: 'Priya Nair', role: 'Product', email: 'priya@canopy.dev', phone: '(619) 555-0103', company: 'Canopy', color: '#ffd60a', favorite: true, notes: 'Runs sprint planning.' },
      { id: 'c8', name: 'Theo Brooks', role: 'Barista', email: '—', phone: '(619) 555-0164', company: 'Fern & Filter', color: '#bf5af2', favorite: false, notes: 'Oat cortado, extra hot.' },
    ],
    messages: [
      {
        id: 't1', name: 'Sam Rivera', color: '#0a84ff', unread: 1,
        messages: [
          { id: 'x1', from: 'them', text: 'Did the dock change land?', ts: Date.now() - 1000 * 60 * 26 },
          { id: 'x2', from: 'me', text: 'Yep — cosine falloff, feels much better.', ts: Date.now() - 1000 * 60 * 24 },
          { id: 'x3', from: 'them', text: 'Saw it. Chef’s kiss 👨‍🍳', ts: Date.now() - 1000 * 60 * 12 },
        ],
      },
      {
        id: 't2', name: 'Riley Chen', color: '#34c759', unread: 0,
        messages: [
          { id: 'y1', from: 'them', text: 'Saturday, 7am, Torrey Pines?', ts: Date.now() - 1000 * 60 * 60 * 3 },
          { id: 'y2', from: 'me', text: 'In. I’ll bring the stove.', ts: Date.now() - 1000 * 60 * 60 * 2 },
        ],
      },
      {
        id: 't3', name: 'Priya Nair', color: '#ffd60a', unread: 2,
        messages: [
          { id: 'z1', from: 'them', text: 'Sprint planning moved to 2pm.', ts: Date.now() - 1000 * 30 * 60 },
          { id: 'z2', from: 'them', text: 'Can you bring the release checklist?', ts: Date.now() - 1000 * 30 * 60 + 20000 },
        ],
      },
    ],
    photos: Array.from({ length: 14 }, (_, i) => {
      const arts = [
        ['#ffd166', '#ef476f'], ['#06d6a0', '#118ab2'], ['#cdb4db', '#ffafcc'], ['#a2d2ff', '#ffc8dd'],
        ['#f4a261', '#e76f51'], ['#90be6d', '#2a9d8f'], ['#bde0fe', '#a2d2ff'], ['#ffb703', '#fb8500'],
        ['#d4a373', '#faedcd'], ['#8ecae6', '#219ebc'], ['#e9c46a', '#264653'], ['#c77dff', '#5a189a'],
        ['#ff9f1c', '#2ec4b6'], ['#a7c957', '#386641'],
      ];
      const titles = ['Morning Light', 'Fern Detail', 'Coastal Fog', 'Canopy Study', 'Oak & Sky', 'Trail Marker',
        'Glasshouse', 'Rooftop Garden', 'Desert Bloom', 'Harbor Blue', 'Golden Hour', 'Violet Shade', 'Low Tide', 'Green Noise'];
      const places = ['Balboa Park', 'Torrey Pines', 'Point Loma', 'Mission Trails', 'Coronado', 'Encinitas', 'Julian', 'Ocean Beach'];
      return {
        id: 'p' + i, title: titles[i], colors: arts[i], location: places[i % places.length],
        date: Date.now() - i * 86400000 * 3, favorite: i === 2 || i === 7,
        kind: i % 4 === 0 ? 'portrait' : 'landscape',
      };
    }),
    bookmarks: [
      { id: 'b1', title: 'CanopyOS Docs', url: 'https://example.com/docs' },
      { id: 'b2', title: 'MDN Web Docs', url: 'https://developer.mozilla.org' },
      { id: 'b3', title: 'Hacker News', url: 'https://news.ycombinator.com' },
      { id: 'b4', title: 'Local Weather', url: 'https://example.com/weather' },
    ],
    remindersLists: ['Personal', 'Work', 'Errands'],
    alarms: [
      { id: 'a1', time: '07:00', label: 'Wake up', days: [1, 2, 3, 4, 5], on: true },
      { id: 'a2', time: '22:30', label: 'Wind down', days: [], on: false },
    ],
    worldClocks: ['America/Los_Angeles', 'America/New_York', 'Europe/London', 'Asia/Tokyo'],
    weatherCity: 'San Diego',
    watchlist: ['CNPY', 'FERN', 'LEAF', 'MYCL', 'ACRN'],
    dictionaryHistory: ['canopy', 'understory', 'mycelium'],
    recentFiles: [],
    installedApps: ['paint', 'minesweeper', 'game2048', 'snake', 'solitaire'],
    notesFolders: ['Work', 'Personal'],
    photoAlbums: [{ id: 'fav', name: 'Favorites' }, { id: 'all', name: 'All Photos' }],
  };
}

class Data {
  constructor() {
    this.data = defaults();
    this.listeners = new Map();
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) this.data = { ...this.data, ...JSON.parse(raw) };
    } catch (e) { /* fall back to defaults */ }
  }

  get(key, fallback) {
    const v = this.data[key];
    return v === undefined ? fallback : v;
  }

  set(key, value, silent = false) {
    this.data[key] = value;
    this.persist();
    (this.listeners.get(key) || []).forEach((fn) => { try { fn(value); } catch (e) { console.warn(e); } });
    if (!silent) window.dispatchEvent(new CustomEvent('canopy:data', { detail: { key, value } }));
    return value;
  }

  update(key, fn) { return this.set(key, fn(this.get(key))); }

  subscribe(key, fn) {
    if (!this.listeners.has(key)) this.listeners.set(key, new Set());
    this.listeners.get(key).add(fn);
    return () => this.listeners.get(key)?.delete(fn);
  }

  push(key, item) {
    const list = this.get(key, []);
    list.unshift(item);
    this.set(key, list);
    return item;
  }

  remove(key, id) {
    this.set(key, this.get(key, []).filter((x) => x.id !== id));
  }

  upsert(key, item) {
    const list = this.get(key, []);
    const i = list.findIndex((x) => x.id === item.id);
    if (i >= 0) list[i] = { ...list[i], ...item };
    else list.unshift({ id: uid(key.slice(0, 2)), ...item });
    this.set(key, list);
    return item;
  }

  persist() {
    if (this._t) clearTimeout(this._t);
    this._t = setTimeout(() => {
      try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { console.warn('CanopyOS: data not saved', e); }
    }, 200);
  }

  reset() {
    this.data = defaults();
    this.persist();
    window.dispatchEvent(new CustomEvent('canopy:data', { detail: { key: '*', value: null } }));
  }
}

export const data = new Data();
