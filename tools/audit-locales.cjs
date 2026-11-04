// Representative, not exhaustive: this list flags known gaps in high-traffic UI.
// A passing result does not establish that every app or generated message is translated.
const fs = require('node:fs');
const vm = require('node:vm');
const context = {window:{}};
vm.runInNewContext(fs.readFileSync('locales/desktop.js', 'utf8'), context);
const labels = [
  'File', 'Edit', 'View', 'Window', 'Help', 'Settings', 'Language',
  'Profile', 'Display & Sound', 'Wallpaper', 'New Note', 'Search notes',
  'New reminder', 'Due date', 'Reminder time', 'New event', 'Holiday calendars',
  'World Clock', 'Stopwatch', 'Timers', 'No active timers', 'Start timer',
  'Ask Fern anything…', 'Ask Fern', 'Attach image or video', 'Share current note',
  'Optional · only the open note is shared for your next question.',
  'Attachments are sent to Fern’s online service when you ask.',
  'Start Fern Live', 'Stop Fern Live',
  'Hands-free, turn-by-turn conversation. Your browser may send audio to its speech provider; questions go to Fern’s online service.',
  'Listening. Your microphone is on.', 'Thinking… Your microphone is paused.', 'Speaking… Your microphone is paused.',
  'Fern Live is on. The microphone will resume after Fern replies.',
  'Fern Live needs browser speech recognition and spoken replies. Use the microphone or type instead.',
  'Microphone permission was denied. Allow it in your browser or type instead.',
  'Speech recognition stopped. Check your microphone and connection, or type instead.',
  'Fern Live stopped when CanopyOS was hidden.',
];
let missingTotal = 0;
for (const [locale, catalog] of Object.entries(context.window.CANOPY_DESKTOP_TRANSLATIONS)) {
  const missing = labels.filter(label => !Object.hasOwn(catalog, label));
  missingTotal += missing.length;
  if (missing.length) console.log(`${locale}: ${missing.length} missing — ${missing.join(' | ')}`);
}
console.log(`\n${missingTotal} missing translations among ${labels.length} sampled labels per non-English locale. This audit is not exhaustive.`);
if (process.argv.includes('--strict') && missingTotal) process.exitCode = 1;
