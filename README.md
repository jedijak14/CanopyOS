# CanopyOS 🌿

**A desktop operating system that runs entirely in your browser.**

CanopyOS is an original, open-source desktop environment written with nothing but
HTML, CSS and vanilla ES modules. It boots in the browser tab, remembers your files
and settings, and ships with a window manager, a Dock, Spotlight, Mission Control,
Control Center, a terminal with ~45 commands, and 29 working applications.

> **Assets disclaimer** — CanopyOS deliberately uses **no Apple assets of any kind**.
> Every icon, glyph, wallpaper, illustration, sound and window control is authored from
> scratch as inline SVG, CSS gradients or synthesized WebAudio. The design language is
> inspired by modern desktop conventions, not copied from them.

![No build step](https://img.shields.io/badge/build-none-brightgreen)
![Vanilla JS](https://img.shields.io/badge/vanilla-ES%20modules-blue)
![Features](https://img.shields.io/badge/features-162-brightgreen)
![Tests](https://img.shields.io/badge/tests-121%20passing-brightgreen)

---

## Quick start

CanopyOS has **no build step and no runtime dependencies**. Serve the repository root as
static files and open it:

```bash
git clone https://github.com/jedijak14/CanopyOS.git
cd CanopyOS

# option 1 — the bundled zero-dependency server
npm start                     # http://localhost:4173

# option 2 — Python
python3 -m http.server 4173

# option 3 — any static host (GitHub Pages, Netlify, S3, nginx…)
```

Then visit **http://localhost:4173**.

> Opening `index.html` directly from disk (`file://`) will not work, because browsers block
> ES module imports from `file://` URLs. Use a static server — it is one command above.

### Requirements

| Requirement | Notes |
| --- | --- |
| A modern evergreen browser | Chrome/Edge 90+, Safari 15+, Firefox 90+ |
| Node.js 18+ (optional) | Only for the static server and the test suite |
| A local static server | Any server works; the entry point is `index.html` |

---

## What's inside

**162 features** are enumerated and documented in **[FEATURES.md](FEATURES.md)**.
Highlights:

### Shell
- **Window manager** — drag, 8-way resize, close/minimize/zoom, double-click zoom, edge
  snapping with live preview, tiling, cascade placement, genie minimize, z-order focus.
- **Spaces & Mission Control** — multiple virtual desktops with live, scaled window
  thumbnails and per-window close buttons.
- **Menu bar** — per-app menus, keyboard navigation, live clock, status items.
- **Dock** — magnification, tooltips, running dots, badges, context menus, auto-hide,
  repositioning and sizing.
- **Spotlight (⌘K)** — apps, files, folders, contacts, notes, calculator, unit and
  currency conversion, temperature conversion, world clocks.
- **Launchpad** — paged app grid with search.
- **Control Center** — Wi-Fi/Bluetooth/AirDrop, focus, brightness, volume, dark mode,
  now-playing.
- **Notification Center** — grouped list, clear-all, widgets, toast banners.
- **Desktop** — file icons, sorting, context menus, hot corners, six live widgets.
- **Session flow** — boot animation, lock screen with optional password, auto-lock, sleep,
  restart, shut down.

### Applications (29)

| App | What it does |
| --- | --- |
| **Finder** | Virtual filesystem browser: icon/list/gallery views, sidebar, search, rename, duplicate, trash, Get Info |
| **Terminal** | ~45 shell commands, Tab completion, history, colour output, GUI integration |
| **Notes** | Folders, search, pinning, auto-save |
| **TextEdit** | Plain-text editing, save/save-as, counts, font controls |
| **Preview** | Markdown/plain-text/image reader with page thumbnails and zoom |
| **Calculator** | Basic + scientific, memory, history tape, keyboard input |
| **System Settings** | Appearance, desktop, dock, accessibility, sound, network, notifications, users, privacy, about |
| **Calendar** | Month grid, mini picker, multiple calendars, events, day panel |
| **Mail** | Folders, search, star, unread, compose/reply/forward |
| **Messages** | Threads, typing indicator, simulated replies |
| **Contacts** | Letter grouping, favourites, edit/create/delete |
| **Reminders** | Smart lists, custom lists, priorities, progress |
| **Photos** | Generated artwork, lightbox filters, favourites, slideshow |
| **Music** | Library/albums/artists, queue, shuffle/repeat, spectrum visualiser |
| **Weather** | 10 cities, hourly + 7-day forecasts, °F/°C, detail tiles |
| **Clock** | World clocks, alarms, stopwatch with laps, timers |
| **Maps** | Pan/zoom vector map, three styles, search, pins, routes |
| **Stocks** | Watchlist, sparklines, ranges, indices, live ticks, news |
| **Dictionary** | 35 entries, suggestions, synonyms, pronunciation, history |
| **Activity Monitor** | CPU/memory/energy/network/disk graphs and process table |
| **Screenshot** | Full screen, area and window capture with gallery |
| **Paint** | Brush, shapes, spray, fill, palette, undo/redo, export |
| **Code** | Project tree, syntax highlighting, live preview, save |
| **Browser** | Tabs, history, bookmarks, internal `canopy://` pages, file rendering |
| **Voice Memos** | Microphone recording with waveform, memo library |
| **App Store** | Categories, install progress, adds apps to the Dock |
| **Minesweeper** | Three difficulties, first-click safety, chord, timer |
| **2048** | Slide/merge, undo, swipe + keyboard |
| **Snake** | Three speeds, pause, D-pad |
| **Memory** | Eight pairs, stats, best score |

---

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `⌘K` / `Ctrl K` | Spotlight |
| `⌘Tab` | App switcher |
| `⌘,` | System Settings |
| `⌘/` | Shortcut cheat sheet |
| `⌘W` / `⌘M` / `⌘Q` / `⌘N` | Close / minimize / quit app / new window |
| `⌃↑` / `F3` | Mission Control |
| `⌃←` / `⌃→` | Previous / next Space |
| `⌘⇧3` / `⌘⇧4` | Screenshot |
| `⌘⇧Q` | Lock screen |
| `Esc` | Dismiss overlays |

`⌘` is the Command key on macOS and `Ctrl` on Windows/Linux.

---

## Project layout

```
CanopyOS/
├── index.html            # shell markup + module entry point
├── css/
│   ├── main.css          # design tokens, theming, menubar, dock, windows, wallpapers
│   └── apps.css          # application styles + shared primitives
├── js/
│   ├── main.js           # bootstraps every subsystem
│   ├── core/             # platform services
│   │   ├── store.js      # persistent settings (localStorage)
│   │   ├── fs.js         # virtual filesystem
│   │   ├── wm.js         # window manager + app registry
│   │   ├── icons.js      # original inline-SVG icon set
│   │   ├── sound.js      # WebAudio UI sound engine
│   │   ├── notify.js     # notifications + toasts
│   │   ├── media.js      # music library, playback state, spectrum
│   │   ├── weather.js    # deterministic weather simulation
│   │   ├── stocks.js     # market simulation
│   │   ├── data.js       # app data documents + subscriptions
│   │   ├── util.js       # formatting, escaping, dates, helpers
│   │   └── open.js       # open-with routing
│   ├── ui/               # shell components
│   │   ├── menubar.js  menu.js  dock.js  desktop.js  widgets.js
│   │   ├── spotlight.js  launchpad.js  missioncontrol.js  switcher.js
│   │   ├── controlcenter.js  notificationcenter.js  quicklook.js
│   │   ├── system.js  modal.js  shortcuts.js  emojipicker.js
│   └── apps/             # 29 applications + index.js registry
├── scripts/serve.mjs     # zero-dependency static server
├── js/test/static.mjs    # module graph verifier
├── js/test/run.mjs       # headless integration suite (jsdom)
├── FEATURES.md           # the 162-feature catalogue
└── package.json
```

### App contract

Every application is a plain object registered with the window manager:

```js
export default {
  id: 'example',
  name: 'Example',
  icon: 'sparkle',            // name of an original SVG glyph
  colors: ['#7bd88f', '#2b7a4b'],
  width: 720, height: 520,
  keywords: ['demo'],
  menus: (win) => [{ label: 'File', items: [{ label: 'Close', action: () => win.close() }] }],
  mount({ root, win, toolbar, args }) {
    root.innerHTML = '<div class="hello">Hello, Canopy</div>';
  },
};
```

`mount` receives the window body (`root`), the `win` controller (`setTitle`,
`setToolbar`, `onClose`, `close`, `minimize`, `toggleMaximize`) and any launch `args`.
Returning a function registers a cleanup callback.

---

## Testing

```bash
npm install          # installs jsdom (the only dev dependency)
npm test             # static verification + headless integration suite
```

- **`npm run test:static`** walks every ES module, resolves all 337 relative imports,
  checks that each named import is actually exported, verifies the shell markup, and
  flags app class names that have no stylesheet rule.
- **`npm run test:unit`** boots the real OS inside jsdom: it runs the boot animation,
  drives the window manager, exercises Spotlight, Launchpad, Mission Control, Control
  Center, Notification Center, the filesystem, the terminal and the calculator, then
  opens **all 29 apps** and asserts that each mounts without console errors.

Current status: **121 integration assertions + static graph checks, all passing.**

---

## Persistence

Everything is stored locally in the browser — there is no backend and no account.

| Key | Contents |
| --- | --- |
| `canopy.settings.v1` | Appearance, dock, sound, network toggles, session preferences |
| `canopy.fs.v1` | Virtual filesystem (files, folders, metadata, Trash) |
| `canopy.data.v1` | App documents: notes, mail, contacts, reminders, photos, playlists… |
| `canopy.2048.best`, `canopy.snake.best`, `canopy.memory.best` | Game high scores |

Clearing site data resets the OS to a fresh install, including the seeded demo
documents, mail, photos and projects.

---

## Browser notes & limitations

- **External websites** cannot be embedded by most sites (`X-Frame-Options` / CSP). The
  Browser app renders internal `canopy://` pages and local `file://` documents fully, and
  offers an "open externally" action for real sites.
- **Screen capture** uses an SVG `foreignObject` snapshot of the live DOM, which can be
  blocked by cross-origin content; the Screenshot app falls back to a generated gradient
  capture rather than failing.
- **Microphone access** is optional. If permission is denied, Voice Memos falls back to a
  simulated waveform so the app remains usable.
- **Sound** starts muted by browser autoplay policy until your first click or keypress.

---

## Contributing

1. Fork and create a branch.
2. Add an app under `js/apps/`, register it in `js/apps/index.js`, and give it styles in
   `css/apps.css` (the static verifier will tell you which classes are unstyled).
3. Run `npm test` — the suite opens every registered app, so a new app is covered
   automatically.
4. Keep every asset original: inline SVG or CSS only, no third-party artwork.

---

## License

Released into the public domain under the **Unlicense** — see [LICENSE](LICENSE).
