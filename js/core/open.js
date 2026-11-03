/* CanopyOS — file-type routing used by Finder, Spotlight and the desktop */
import { fs, ext } from './fs.js';
import { wm, getApp } from './wm.js';
import { data } from './data.js';
import { uid } from './util.js';

const TEXT = ['txt', 'md', 'markdown', 'log', 'csv', 'json', 'js', 'mjs', 'ts', 'css', 'html', 'htm', 'py', 'sh', 'yml', 'yaml', 'xml', 'toml', 'ini', 'conf', 'env'];
const IMAGE = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'];

export function appForNode(node) {
  if (!node) return 'finder';
  if (node.type === 'folder') return 'finder';
  const e = ext(node.name);
  if (IMAGE.includes(e)) return 'preview';
  if (['mp3', 'wav', 'm4a', 'ogg', 'flac'].includes(e)) return 'music';
  if (TEXT.includes(e)) return 'textedit';
  if (['pdf', 'md'].includes(e)) return 'preview';
  return 'preview';
}

export function openPath(path, opts = {}) {
  const node = fs.stat(path);
  if (!node) return null;
  if (node.type === 'folder') return wm.open('finder', { args: { path, ...(opts.args || {}) } });
  const app = appForNode(node);
  const recent = data.get('recentFiles', []).filter((p) => p !== path);
  recent.unshift(path);
  data.set('recentFiles', recent.slice(0, 12), true);
  if (app === 'music') return wm.open('music', { args: { path } });
  if (getApp('textedit')) return wm.open(app === 'preview' ? 'preview' : 'textedit', { args: { path } });
  return wm.open('finder', { args: { path } });
}

export function newFolder(parent = '/Users/canopy/Desktop', name = 'Untitled Folder') {
  let candidate = name;
  let i = 2;
  while (fs.exists(`${parent}/${candidate}`)) { candidate = `${name} ${i++}`; }
  fs.mkdir(`${parent}/${candidate}`);
  return `${parent}/${candidate}`;
}

export function newFile(parent = '/Users/canopy/Desktop', name = 'Untitled.txt', content = '') {
  let base = name.replace(/\.txt$/, '');
  let candidate = name;
  let i = 2;
  while (fs.exists(`${parent}/${candidate}`)) { candidate = `${base} ${i++}.txt`; }
  fs.createFile(`${parent}/${candidate}`, content);
  return `${parent}/${candidate}`;
}

export function trashPath(path) {
  return fs.remove(path, { trash: true });
}

export function uniqueId(prefix) { return uid(prefix); }
