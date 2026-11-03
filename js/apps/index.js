/* CanopyOS — app registry */
import { registerApp } from '../core/wm.js';

import finder from './finder.js';
import terminal from './terminal.js';
import notes from './notes.js';
import textedit from './textedit.js';
import preview from './preview.js';
import calculator from './calculator.js';
import settings from './settings.js';
import calendar from './calendar.js';
import mail from './mail.js';
import messages from './messages.js';
import contacts from './contacts.js';
import reminders from './reminders.js';
import photos from './photos.js';
import music from './music.js';
import weather from './weather.js';
import clock from './clock.js';
import maps from './maps.js';
import stocks from './stocks.js';
import dictionary from './dictionary.js';
import activity from './activity.js';
import screenshot from './screenshot.js';
import paint from './paint.js';
import code from './code.js';
import browser from './browser.js';
import voice from './voice.js';
import appstore from './appstore.js';
import minesweeper from './minesweeper.js';
import game2048 from './game2048.js';
import snake from './snake.js';
import memory from './memory.js';

const APPS = [
  finder, terminal, notes, textedit, preview, calculator, settings, calendar, mail, messages,
  contacts, reminders, photos, music, weather, clock, maps, stocks, dictionary, activity,
  screenshot, paint, code, browser, voice, appstore, minesweeper, game2048, snake, memory,
];

export function registerAll() {
  APPS.forEach((app) => registerApp(app));
}

export default APPS;
