/* CanopyOS — original icon set.
   Every glyph below is hand-authored SVG line art (24x24 grid). No third-party assets. */

const G = {
  canopy: 'M6 20v-8a6 6 0 0 1 12 0v8|M12 6v14',
  finder: 'M5 5h14v14H5z|M9 10h.01|M15 10h.01|M9 15c1.8 1.2 4.2 1.2 6 0',
  terminal: 'M4 5h16v14H4z|M7.5 9.5l3 2.5-3 2.5|M12.5 15h4',
  notes: 'M6 3h9l4 4v14H6z|M15 3v4h4|M9 12h7|M9 16h5|M9 8h3',
  textedit: 'M4 20l4-1L19 8l-3-3L5 16l-1 4z|M15 6l3 3|M4 20h6',
  code: 'M9 7l-5 5 5 5|M15 7l5 5-5 5|M13.5 4.5l-3 15',
  calculator: 'M5 3h14v18H5z|M8 7h8|M8.5 12h.01|M12 12h.01|M15.5 12h.01|M8.5 16h.01|M12 16h.01|M15.5 16h.01',
  calendar: 'M4 6h16v14H4z|M8 3v4|M16 3v4|M4 10h16|M8 14h2|M14 14h2|M8 17h2',
  mail: 'M3 6h18v13H3z|M3 7l9 7 9-7',
  messages: 'M4 5h16v11H10l-5 4v-4H4z|M8 11h8',
  photos: 'M3 5h18v14H3z|M3 16l5-5 4 4 3-3 5 5|M15.5 9.5a1.4 1.4 0 1 0 0-2.8 1.4 1.4 0 0 0 0 2.8z',
  music: 'M9 18V6l11-2v12|M9 18a3 3 0 1 1-3-3 3 3 0 0 1 3 3z|M20 16a3 3 0 1 1-3-3 3 3 0 0 1 3 3z',
  weather: 'M8 8a3.5 3.5 0 1 0 0 7|M8 3v2|M3.5 8h2|M4.7 4.7l1.4 1.4|M11.3 4.7l-1.4 1.4|M13 19h7a3.5 3.5 0 0 0 .4-7 5 5 0 0 0-9.4-1.2',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z|M12 7v5l3.5 2',
  maps: 'M12 21s7-6.8 7-11a7 7 0 1 0-14 0c0 4.2 7 11 7 11z|M12 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  reminders: 'M9 6h11|M9 12h11|M9 18h7|M3 6l1.6 1.6L7.5 4.5|M3 17l1.6 1.6L7.5 15.5',
  contacts: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z|M4 21c.6-4 3.9-6 8-6s7.4 2 8 6',
  activity: 'M3 12h3.5l2.5-7 4.5 14 2.5-7H21',
  settings: 'M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z|M12 2.5v2.6|M12 18.9v2.6|M2.5 12h2.6|M18.9 12h2.6|M5.2 5.2l1.9 1.9|M16.9 16.9l1.9 1.9|M18.8 5.2l-1.9 1.9|M7.1 16.9l-1.9 1.9',
  appstore: 'M12 3.5L20.5 20|M12 3.5L3.5 20|M7 14.5h10',
  preview: 'M6 3h8l4 4v8H6z|M14 3v4h4|M10.5 19a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z|M13 16.5l3 3',
  screenshot: 'M4 9V4h5|M20 9V4h-5|M4 15v5h5|M20 15v5h-5|M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  paint: 'M12 3a9 9 0 0 0 0 18c1.4 0 2-1 2-2s-.6-2-2-2h-1a3 3 0 0 1 0-6h3a4 4 0 0 0 4-4c0-2.2-2.7-4-6-4z|M8 8h.01|M7 13h.01|M12 7h.01',
  games: 'M7 9h10a4 4 0 0 1 3.9 4.9l-.5 2.3A2.6 2.6 0 0 1 16 17l-1.4-1.4h-5.2L8 17a2.6 2.6 0 0 1-4.4-1.8l-.5-2.3A4 4 0 0 1 7 9z|M8 12v2|M7 13h2|M15.5 12.5h.01|M17.5 14h.01',
  stocks: 'M4 19V4|M4 19h16|M7 15l4-4 3 3 5-6|M16 8h3v3',
  dictionary: 'M5 4h6a3 3 0 0 1 3 3v13a3 3 0 0 0-3-3H5z|M19 4h-2a3 3 0 0 0-3 3v13a3 3 0 0 1 3-3h2|M8 8h3',
  voice: 'M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3z|M5 11a7 7 0 0 0 14 0|M12 18v3|M8 21h8',
  browser: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z|M3 12h18|M12 3a14 14 0 0 1 0 18|M12 3a14 14 0 0 0 0 18',
  minesweeper: 'M6 21V5|M6 5l9 3-9 3|M4 21h6|M16 7h.01',
  game2048: 'M4 4h6v6H4z|M14 4h6v6h-6z|M4 14h6v6H4z|M14 14h6v6h-6z',
  snake: 'M4 17c0-4 4-5 8-5s8-1 8-5a4 4 0 0 0-8 0|M4 20h4',
  memory: 'M7 3h11v13H7z|M4 7v14h10|M10 8h5|M10 12h5',
  solitaire: 'M12 3l3 4a3 3 0 1 1-3 3 3 3 0 1 1-3-3z|M12 17l3-3|M12 21l3-3',
  chess: 'M8 20h8|M9 20l1-4h4l1 4|M10 16l-1-5 3-2 3 2-1 5|M12 4v3',
  trash: 'M4 7h16|M9 7V4h6v3|M6.5 7l1 14h9l1-14|M10 11v6|M14 11v6',
  folder: 'M3 6h6l2 2h10v11H3z',
  folderOpen: 'M3 6h6l2 2h10v3H3z|M3 11h18l-2 8H3z',
  file: 'M6 3h8l4 4v14H6z|M14 3v4h4',
  doc: 'M6 3h8l4 4v14H6z|M14 3v4h4|M9 12h7|M9 16h7|M9 8h3',
  image: 'M3 5h18v14H3z|M3 16l5-5 4 4 3-3 5 5|M15.5 9.5a1.4 1.4 0 1 0 0-2.8 1.4 1.4 0 0 0 0 2.8z',
  disk: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z|M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  key: 'M8 15a4 4 0 1 0 0-8 4 4 0 0 0 0 8z|M11.5 11H21|M18 11v3|M15 11v2',
  wifi: 'M2 8.5a15 15 0 0 1 20 0|M5.5 12a10 10 0 0 1 13 0|M9 15.5a5 5 0 0 1 6 0|M12 19h.01',
  bluetooth: 'M8 7l8 10-4 3V4l4 3-8 10',
  battery: 'M2 8h16v8H2z|M20 10.5v3',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z|M16 16l4.5 4.5',
  sliders: 'M4 7h5|M13 7h7|M4 12h10|M18 12h2|M4 17h3|M11 17h9|M11 5v4|M16 10v4|M9 15v4',
  airdrop: 'M12 14v7|M8.5 17.5a5 5 0 0 1 7 0|M5.5 20a9 9 0 0 1 13 0|M12 3v7|M12 10l-2.5-2.5|M12 10l2.5-2.5',
  moon: 'M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7z',
  sun: 'M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9z|M12 2v2.5|M12 19.5V22|M2 12h2.5|M19.5 12H22|M4.9 4.9l1.8 1.8|M17.3 17.3l1.8 1.8|M19.1 4.9l-1.8 1.8|M6.7 17.3l-1.8 1.8',
  volume: 'M4 9h3l4-4v14l-4-4H4z|M15 8.5a5 5 0 0 1 0 7|M17.8 6a9 9 0 0 1 0 12',
  volumeMute: 'M4 9h3l4-4v14l-4-4H4z|M16 9l4 6|M20 9l-4 6',
  brightness: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z|M12 2v2|M12 20v2|M2 12h2|M20 12h2|M4.9 4.9l1.4 1.4|M17.7 17.7l1.4 1.4|M19.1 4.9l-1.4 1.4|M6.3 17.7l-1.4 1.4',
  lock: 'M5 11h14v10H5z|M8 11V7a4 4 0 0 1 8 0v4|M12 15v2',
  play: 'M7 4l13 8-13 8z',
  pause: 'M8 4h3v16H8z|M14 4h3v16h-3z',
  next: 'M6 4l10 8-10 8z|M18 4v16',
  prev: 'M18 4L8 12l10 8z|M6 4v16',
  chevronLeft: 'M15 5l-7 7 7 7',
  chevronRight: 'M9 5l7 7-7 7',
  chevronDown: 'M5 9l7 7 7-7',
  chevronUp: 'M5 15l7-7 7 7',
  check: 'M4 12.5l5 5L20 6.5',
  plus: 'M12 4v16|M4 12h16',
  minus: 'M4 12h16',
  close: 'M5 5l14 14|M19 5L5 19',
  refresh: 'M20.5 11a8.5 8.5 0 1 0-2.6 6.6|M20.5 4.5V11H14',
  share: 'M12 3v12|M12 3L7.5 7.5|M12 3l4.5 4.5|M5 13v7h14v-7',
  star: 'M12 3.5l2.7 5.6 6.1.8-4.5 4.2 1.1 6-5.4-3-5.4 3 1.1-6L3.2 9.9l6.1-.8z',
  heart: 'M12 20.5S3.5 15 3.5 9.2A4.7 4.7 0 0 1 12 6a4.7 4.7 0 0 1 8.5 3.2C20.5 15 12 20.5 12 20.5z',
  bell: 'M18 8a6 6 0 1 0-12 0c0 6-2 7-2 7h16s-2-1-2-7z|M10.3 20a2 2 0 0 0 3.4 0',
  download: 'M12 3v12|M7 10l5 5 5-5|M4 20h16',
  upload: 'M12 17V5|M7 10l5-5 5 5|M4 20h16',
  grid: 'M4 4h6v6H4z|M14 4h6v6h-6z|M4 14h6v6H4z|M14 14h6v6h-6z',
  list: 'M4 6h16|M4 12h16|M4 18h16|M2 6h.01|M2 12h.01|M2 18h.01',
  sidebar: 'M3 4h18v16H3z|M9 4v16',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z|M12 11v5|M12 8h.01',
  warning: 'M12 3L22 20H2z|M12 9v5|M12 17h.01',
  power: 'M12 3v9|M7 6.5a7.5 7.5 0 1 0 10 0',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z|M4 21c.6-4 3.9-6 8-6s7.4 2 8 6',
  home: 'M3 11l9-8 9 8|M5.5 9.5V21h13V9.5|M10 21v-6h4v6',
  tag: 'M3 12V4h8l9 9-8 8z|M7 7h.01',
  globe: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z|M3 12h18|M12 3a14 14 0 0 1 0 18|M12 3a14 14 0 0 0 0 18',
  wifiOff: 'M2 8.5a15 15 0 0 1 20 0|M9 15.5a5 5 0 0 1 6 0|M12 19h.01|M3 3l18 18',
  eye: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z|M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  menu: 'M4 7h16|M4 12h16|M4 17h16',
  copy: 'M8 8h12v12H8z|M4 16V4h12',
  scissors: 'M6 6l12 12|M6 18L18 6|M5 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4z|M5 22a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  brush: 'M4 20c3 0 4-2 4-4l-2-2c-2 0-4 1-4 4 0 1 1 2 2 2z|M8 14l9-9 3 3-9 9',
  camera: 'M3 7h4l1.5-2h7L17 7h4v12H3z|M12 16a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
  mic: 'M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3z|M5 11a7 7 0 0 0 14 0|M12 18v3|M8 21h8',
  clockSmall: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z|M12 7.5V12l3 2',
  cloud: 'M7 19h10a4 4 0 0 0 .3-8 5.5 5.5 0 0 0-10.5-1A3.5 3.5 0 0 0 7 19z',
  cloudRain: 'M7 15h10a4 4 0 0 0 .3-8A5.5 5.5 0 0 0 6.8 6 3.5 3.5 0 0 0 7 15z|M8 18l-1 3|M12 18l-1 3|M16 18l-1 3',
  cloudSun: 'M9 8a3.5 3.5 0 1 1 4 5|M12 2.5V4|M4.5 8H6|M6 3.5l1 1|M19 14.5a3.5 3.5 0 0 0-3.4-3.4 5 5 0 0 0-9.3 1.2A3.5 3.5 0 0 0 7 19h9a3.5 3.5 0 0 0 3-4.5z',
  snow: 'M12 3v18|M4 7.5l16 9|M20 7.5l-16 9',
  bolt: 'M13 2L4 14h6l-1 8 9-12h-6z',
  flame: 'M12 22c4 0 6-2.6 6-6 0-4.5-6-11-6-11S6 11.5 6 16c0 3.4 2 6 6 6z|M12 22c-1.6 0-3-1.4-3-3s3-4 3-4 3 2.4 3 4-1.4 3-3 3z',
  wheat: 'M12 21V9|M12 9c0-3 2-5 4-5 0 3-2 5-4 5z|M12 9c0-3-2-5-4-5 0 3 2 5 4 5z|M12 15c0-3 2-5 4-5 0 3-2 5-4 5z|M12 15c0-3-2-5-4-5 0 3 2 5 4 5z',
  leaf: 'M20 4C9 4 4 9 4 16c0 2 .5 3.5.5 3.5S8 20 11 18s4-6 9-14z|M4 20c2-5 6-8 11-10',
  flower: 'M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z|M12 7V4|M12 16v3|M9 10H5.5|M18.5 10H15',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z|M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z',
  timer: 'M12 22a8 8 0 1 0 0-16 8 8 0 0 0 0 16z|M12 10v4l2.5 1.5|M9 2h6',
  stopwatch: 'M12 22a8 8 0 1 0 0-16 8 8 0 0 0 0 16z|M12 3v3|M10 2h4|M12 10v4',
  alarm: 'M12 22a8 8 0 1 0 0-16 8 8 0 0 0 0 16z|M12 10v4l3 2|M4.5 4.5L3 6|M19.5 4.5L21 6',
  card: 'M3 6h18v12H3z|M3 10h18',
  plant: 'M12 21V11|M12 11c-4 0-6-2-6-5 4 0 6 2 6 5z|M12 14c4 0 6-2 6-5-4 0-6 2-6 5z',
  mountain: 'M2 20l7-12 4 6 3-4 6 10z',
  wave: 'M2 12c2-4 4-4 6 0s4 4 6 0 4-4 6 0|M2 17c2-4 4-4 6 0s4 4 6 0 4-4 6 0',
  fire: 'M12 22c4 0 6-2.6 6-6 0-4.5-6-11-6-11S6 11.5 6 16c0 3.4 2 6 6 6z',
  pin: 'M12 21s7-6.8 7-11a7 7 0 1 0-14 0c0 4.2 7 11 7 11z|M12 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  plane: 'M10 21l2-7 8-8-3-1-9 6-5 1 3 2-2 5z',
  book: 'M5 4h6a3 3 0 0 1 3 3v13a3 3 0 0 0-3-3H5z|M19 4h-2a3 3 0 0 0-3 3v13a3 3 0 0 1 3-3h2',
  archive: 'M3 4h18v4H3z|M4.5 8v12h15V8|M9 12h6',
  link: 'M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1|M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1',
  filter: 'M3 5h18l-7 8v6l-4 2v-8z',
  award: 'M12 15a5 5 0 1 0 0-10 5 5 0 0 0 0 10z|M8.5 14L7 22l5-3 5 3-1.5-8',
  rocket: 'M5 15c-1 3 1 5 1 5s2-2 5-3z|M9 15l-3-3c1-6 6-9 12-9 0 6-3 11-9 12z|M14 8h.01',
  compass: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z|M15.5 8.5l-2 5-5 2 2-5z',
  eyeOff: 'M3 3l18 18|M10.6 5.2A10.9 10.9 0 0 1 12 5c6.4 0 10 7 10 7a18 18 0 0 1-3.2 4.2|M6.3 6.6A17 17 0 0 0 2 12s3.6 7 10 7a10.9 10.9 0 0 0 4.9-1.1|M9.9 9.9a3 3 0 0 0 4.2 4.2',
  keyboard: 'M2 6h20v12H2z|M6 10h.01|M10 10h.01|M14 10h.01|M18 10h.01|M6 14h.01|M18 14h.01|M9 14h6',
  printer: 'M6 9V3h12v6|M3 9h18v8h-4|M6 17H3V9|M6 14h12v7H6z',
  drive: 'M3 14h18l-2 6H5z|M4 6h16v8H4z|M7 17h.01',
  cpu: 'M6 6h12v12H6z|M9.5 9.5h5v5h-5z|M9 2v4|M15 2v4|M9 18v4|M15 18v4|M2 9h4|M18 9h4|M2 15h4|M18 15h4',
  chart: 'M4 20V4|M4 20h16|M8 20v-6|M12 20v-9|M16 20v-4|M20 20V8',
  pie: 'M12 3v9h9a9 9 0 1 1-9-9z|M12 3a9 9 0 0 1 9 9',
  headphones: 'M4 15v-3a8 8 0 0 1 16 0v3|M4 14h3v6H5a1 1 0 0 1-1-1z|M20 14h-3v6h2a1 1 0 0 0 1-1z',
  cast: 'M3 5h18v10h-6|M3 19h.01|M3 15a4 4 0 0 1 4 4|M3 11a8 8 0 0 1 8 8',
  airplay: 'M6 5h12v9H6z|M12 16l4 5H8z',
  speed: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z|M12 12l4-4|M12 12h.01',
  dice: 'M4 4h16v16H4z|M8 8h.01|M16 8h.01|M12 12h.01|M8 16h.01|M16 16h.01',
  bars: 'M4 20V10|M9 20V4|M14 20v-7|M19 20V7',
  percent: 'M5 5l14 14|M7 5a2 2 0 1 0 0 4 2 2 0 0 0 0-4z|M17 15a2 2 0 1 0 0 4 2 2 0 0 0 0-4z',
  checkCircle: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z|M8 12l3 3 5-6',
  xCircle: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z|M9 9l6 6|M15 9l-6 6',
  plusCircle: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z|M12 8v8|M8 12h8',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z|M9 12l2 2 4-4',
  feather: 'M20 4c0 8-5 12-11 12H5l-2 4|M20 4c-8 0-12 5-12 11|M14 4v4|M18 8h-4',
  scan: 'M4 9V4h5|M20 9V4h-5|M4 15v5h5|M20 15v5h-5|M4 12h16',
  layers: 'M12 3l9 5-9 5-9-5z|M3 13l9 5 9-5|M3 17l9 5 9-5',
  corner: 'M4 4h6v6H4z|M14 4h6v6h-6z|M4 14h6v6H4z|M14 14h6v6h-6z',
  shuffle: 'M4 5h4l9 14h3|M4 19h4L17 5h3|M18 2l3 3-3 3|M18 16l3 3-3 3',
  repeat: 'M4 8V6h14v3|M18 16v2H4v-3|M16 3l2 3-2 3|M8 15l-2 3 2 3',
  quote: 'M7 6c-2 0-3 1.5-3 3.5S5 13 7 13c0 3-2 4-2 4s6-1 6-7c0-2.5-1.5-4-4-4z|M18 6c-2 0-3 1.5-3 3.5S16 13 18 13c0 3-2 4-2 4s6-1 6-7c0-2.5-1.5-4-4-4z',
  ruler: 'M3 15L15 3l6 6L9 21z|M7 11l2 2|M11 7l2 2|M15 15l2 2',
  magnet: 'M5 4v8a7 7 0 0 0 14 0V4h-4v8a3 3 0 0 1-6 0V4z',
  bulb: 'M9 18h6|M10 22h4|M12 2a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.8V16h5v-1.3c0-.7.4-1.4 1-1.8A6 6 0 0 0 12 2z',
};

export const glyphNames = Object.keys(G);

const hash = (str) => {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
};

let uid = 0;

export function glyph(name, size = 24, strokeWidth = 2) {
  const d = G[name] || G.file;
  const paths = d.split('|').map((p) => `<path d="${p}"/>`).join('');
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
}

/** Renders a rounded app tile with a gradient and a white line-art glyph. */
export function appIcon(name, colors, opts = {}) {
  const [c1, c2] = Array.isArray(colors) ? colors : ['#5b6b82', '#2a3444'];
  const d = G[name] || G.file;
  const paths = d.split('|').map((p) => `<path d="${p}"/>`).join('');
  const id = `g${uid++}`;
  const glyphScale = opts.glyphScale || 1;
  const sw = opts.strokeWidth || (name === 'game2048' || name === 'grid' ? 2.4 : 2);
  const flip = opts.flip ? 'scale(-1,1) translate(-24,0)' : '';
  return `<svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true">
    <defs>
      <linearGradient id="${id}" x1="0" y1="0" x2="0.6" y2="1">
        <stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/>
      </linearGradient>
      <linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <rect x="1" y="1" width="62" height="62" rx="14" fill="url(#${id})"/>
    <rect x="1" y="1" width="62" height="62" rx="14" fill="url(#${id}s)"/>
    <rect x="1.5" y="1.5" width="61" height="61" rx="13.5" fill="none" stroke="#fff" stroke-opacity=".22"/>
    <g transform="translate(14.5,14.5) scale(${(35 / 24) * glyphScale}) ${flip}" fill="none" stroke="#fff" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" opacity=".97">${paths}</g>
  </svg>`;
}

const FILE_PALETTE = {
  folder: ['#6cb6f7', '#2f7fd4'],
  folderBlue: ['#6cb6f7', '#2f7fd4'],
  doc: ['#f2f4f7', '#c9d0da'],
  image: ['#7be0c0', '#2f9e7a'],
  code: ['#5b6b82', '#232b38'],
  disk: ['#c9d2dd', '#8794a4'],
  trash: ['#aeb8c4', '#6d7a89'],
  music: ['#ff8fb1', '#d43f6c'],
  archive: ['#e8c07d', '#b4863c'],
  pdf: ['#ff9a8b', '#d2432f'],
};

export function fileIcon(node, opts = {}) {
  const name = node?.name || '';
  const ext = (name.split('.').pop() || '').toLowerCase();
  let kind = node?.type === 'folder' ? 'folder' : 'doc';
  if (node?.type === 'file') {
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) kind = 'image';
    else if (['js', 'ts', 'json', 'css', 'html', 'py', 'md', 'sh'].includes(ext)) kind = 'code';
    else if (['mp3', 'wav', 'm4a'].includes(ext)) kind = 'music';
    else if (['zip', 'tar', 'gz'].includes(ext)) kind = 'archive';
    else if (ext === 'pdf') kind = 'pdf';
  }
  if (node?.meta?.kind === 'disk') kind = 'disk';
  if (node?.meta?.kind === 'trash') kind = 'trash';
  const glyphName = kind === 'folder' ? 'folder' : kind === 'image' ? 'image' : kind === 'code' ? 'code'
    : kind === 'music' ? 'music' : kind === 'archive' ? 'archive' : kind === 'disk' ? 'disk'
    : kind === 'trash' ? 'trash' : kind === 'pdf' ? 'doc' : 'doc';
  return appIcon(glyphName, FILE_PALETTE[kind] || FILE_PALETTE.doc, opts);
}

export function iconColor(seed) {
  const palettes = [
    ['#34d399', '#0f766e'], ['#60a5fa', '#1d4ed8'], ['#c084fc', '#6d28d9'],
    ['#fb923c', '#c2410c'], ['#f472b6', '#be185d'], ['#facc15', '#a16207'],
    ['#22d3ee', '#0e7490'], ['#94a3b8', '#334155'],
  ];
  return palettes[hash(seed) % palettes.length];
}

export const CANOPY_LOGO = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6.2 20v-8.3a5.8 5.8 0 0 1 11.6 0V20"/><path d="M12 5.8V20" opacity=".55"/></svg>`;
