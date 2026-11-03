/* CanopyOS — static import/export verifier.
   Walks every ES module, resolves relative specifiers, and checks that each
   named import actually exists as an export in the target module. */
import { readdirSync, readFileSync, statSync } from 'fs';
import { dirname, join, resolve, relative } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (name.endsWith('.js')) out.push(p);
  }
  return out;
}

const files = walk(join(root, 'js')).sort();

const exportsOf = new Map();
for (const file of files) {
  const src = readFileSync(file, 'utf8');
  const names = new Set();
  let hasDefault = false;
  for (const m of src.matchAll(/^\s*export\s+(?:async\s+)?(?:const|let|var|function\*?|class)\s+([A-Za-z_$][\w$]*)/gm)) {
    names.add(m[1]);
  }
  for (const m of src.matchAll(/^\s*export\s*\{([^}]*)\}/gm)) {
    for (const part of m[1].split(',')) {
      const seg = part.trim();
      if (!seg) continue;
      const alias = seg.split(/\s+as\s+/);
      names.add((alias[1] || alias[0]).trim());
    }
  }
  if (/^\s*export\s+default/m.test(src)) hasDefault = true;
  exportsOf.set(file, { names, hasDefault });
}

const errors = [];
const warnings = [];
let importCount = 0;

for (const file of files) {
  const src = readFileSync(file, 'utf8');
  for (const m of src.matchAll(/import\s+([^'"]*?)\s+from\s+['"]([^'"]+)['"]/g)) {
    const clause = m[1].trim();
    const spec = m[2];
    if (!spec.startsWith('.')) continue;
    importCount++;
    const target = resolve(dirname(file), spec);
    const targetFile = exportsOf.has(target) ? target : exportsOf.has(target + '.js') ? target + '.js' : null;
    if (!targetFile) {
      errors.push(`${relative(root, file)}: cannot resolve "${spec}"`);
      continue;
    }
    const info = exportsOf.get(targetFile);
    const braced = clause.match(/\{([\s\S]*)\}/);
    const def = clause.replace(/\{[\s\S]*\}/, '').replace(/^,|,$/g, '').replace(/^\*\s+as\s+/, '').trim();
    if (/^\{/.test(clause) === false && def && !def.startsWith('*')) {
      if (!info.hasDefault) errors.push(`${relative(root, file)}: "${spec}" has no default export (imported as ${def})`);
    }
    if (braced) {
      for (const part of braced[1].split(',')) {
        let seg = part.trim();
        if (!seg) continue;
        const [orig, alias] = seg.split(/\s+as\s+/).map((s) => s.trim());
        if (!info.names.has(orig)) {
          errors.push(`${relative(root, file)}: "${orig}"${alias ? ` (as ${alias})` : ''} is not exported by ${relative(root, spec)}`);
        }
      }
    }
  }
}

/* Optional sanity checks on index.html wiring */
const html = readFileSync(join(root, 'index.html'), 'utf8');
for (const id of ['wallpaper', 'desktop', 'windows', 'widgets', 'menubar', 'dock-shell', 'spotlight',
  'launchpad', 'control-center', 'notification-center', 'mission-control', 'switcher', 'quicklook',
  'context-menu', 'emoji-picker', 'modal-root', 'boot', 'lockscreen', 'sleep-layer', 'shutdown-layer',
  'snap-preview', 'toasts', 'desktop-icons']) {
  if (!html.includes(`id="${id}"`)) errors.push(`index.html: missing #${id}`);
}
for (const css of ['css/main.css', 'css/apps.css']) {
  if (!html.includes(css)) errors.push(`index.html: missing stylesheet ${css}`);
}
if (!html.includes('type="module"')) errors.push('index.html: main script is not a module');

/* Documentation: FEATURES.md must enumerate at least 100 contiguous features */
const features = readFileSync(join(root, 'FEATURES.md'), 'utf8');
const nums = [...features.matchAll(/^(\d+)\. \*\*/gm)].map((m) => Number(m[1]));
if (nums.length < 100) errors.push(`FEATURES.md documents only ${nums.length} features (need >= 100)`);
for (let i = 1; i <= nums.length; i++) {
  if (nums[i - 1] !== i) { errors.push(`FEATURES.md numbering breaks at item ${i}`); break; }
}
const readme = readFileSync(join(root, 'README.md'), 'utf8');
if (!readme.includes('FEATURES.md')) errors.push('README.md does not link to FEATURES.md');
if (/Apple assets/i.test(readme) === false) errors.push('README.md is missing the original-assets disclaimer');

/* CSS sanity: literal class names used in app templates should be styled somewhere.
   Template expressions (${...}, ternaries) are ignored — only plain tokens count. */
const css = ['css/main.css', 'css/apps.css'].map((f) => readFileSync(join(root, f), 'utf8')).join('\n');
const styled = new Set([...css.matchAll(/\.([a-zA-Z][\w-]*)/g)].map((m) => m[1]));
const UTILITY = new Set(['no-drag', 'spacer', 'tiny', 'muted', 'on', 'off', 'active', 'selected', 'open',
  'hidden', 'done', 'flipped', 'recording', 'playing', 'installing', 'muted', 'loading', 'danger',
  'primary', 'secondary', 'small', 'large', 'empty', 'unread', 'today', 'overdue', 'up', 'down']);

for (const app of readdirSync(join(root, 'js/apps'))) {
  if (!app.endsWith('.js') || app === 'index.js') continue;
  const src = readFileSync(join(root, 'js/apps', app), 'utf8');
  const used = new Set();
  for (const m of src.matchAll(/class="([^"]*)"/g)) {
    let value = m[1];
    while (/\$\{[^}]*\}/.test(value)) value = value.replace(/\$\{[^}]*\}/g, ' ');
    for (const cls of value.split(/\s+/)) if (/^[a-z][a-z0-9-]+$/.test(cls)) used.add(cls);
  }
  const missing = [...used].filter((c) => c.length > 2 && !c.endsWith('-') && !styled.has(c) && !UTILITY.has(c));
  if (missing.length) warnings.push(`${app}: unstyled classes → ${missing.join(' ')}`);
}

console.log(`Scanned ${files.length} modules, ${importCount} relative imports.`);
if (warnings.length) {
  console.log(`\n${warnings.length} warning(s):`);
  for (const w of warnings) console.log('  ! ' + w);
}
if (errors.length) {
  console.error(`\n${errors.length} error(s):`);
  for (const e of errors) console.error('  ✗ ' + e);
  process.exit(1);
}
console.log('\n✓ static import/export graph is consistent');
