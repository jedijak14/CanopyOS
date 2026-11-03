# CanopyOS

CanopyOS is a small, browser-based desktop environment inspired by classic desktop conventions. It uses its own visual design and assets; it is not affiliated with Apple.

## Run locally

```sh
npm install
npm run dev
```

Vite serves the app at the local URL it prints. To create a production build, run `npm run build`.

## What's here

The desktop includes a draggable window layer, dock, app launcher, global app search, Control Center, notification panel, date/weather widgets, context menu, keyboard shortcuts, and a responsive layout. Built-in apps include Finder, Notes, Reminders, Calendar, Calculator, Clock, Settings, Terminal, Activity Monitor, Browser, Photos, Music, Mail, Messages, Maps, Contacts, Preview, Weather, Voice Memos, and Trash. The Canopy Guide catalogs 100+ small desktop capabilities and affordances.

**Live wallpapers are rendered by an animated Canvas loop** (six selectable scenes). Motion speed and ambient glow are configurable. Rendering pauses when the document is hidden, can be paused in Settings, respects reduced-motion settings, and caps canvas resolution on high-DPI displays.

Notes, reminders, calendar events, file-list changes, and desktop preferences are saved to the browser's local storage. This is an interactive front-end demo, not a connected operating system: sample weather, media, mail, maps, contacts, and web browsing are illustrative; no accounts, external mail, streaming audio, microphone, or location services are connected. Some controls are explicitly demo affordances.
