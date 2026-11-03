/* CanopyOS — Dictionary & Thesaurus */
import { data } from '../core/data.js';
import { sound } from '../core/sound.js';
import { glyph } from '../core/icons.js';
import { escapeHtml, copyText } from '../core/util.js';

const WORDS = {
  canopy: { pos: 'noun', ipa: '/ˈkænəpi/', def: 'A covering formed by the leaves and branches of trees; the uppermost layer of a forest, where most of the light is caught.', ex: 'Sunlight filtered through the canopy in shifting patches.', syn: ['canopy', 'awning', 'shade', 'cover', 'overhang'], ant: ['exposure'] },
  understory: { pos: 'noun', ipa: '/ˈʌndərˌstɔri/', def: 'The layer of vegetation beneath the main canopy of a forest, adapted to low light.', ex: 'Ferns and saplings crowded the understory.', syn: ['undergrowth', 'brush'], ant: [] },
  mycelium: { pos: 'noun', ipa: '/maɪˈsiːliəm/', def: 'The branching network of fungal threads that grows underground and exchanges nutrients with plant roots.', ex: 'A single mycelium can stretch for kilometers.', syn: ['network', 'filament'], ant: [] },
  petrichor: { pos: 'noun', ipa: '/ˈpɛtrɪkɔːr/', def: 'The earthy scent produced when rain falls on dry soil.', ex: 'She opened the window for the petrichor.', syn: ['earthiness'], ant: [] },
  verdant: { pos: 'adjective', ipa: '/ˈvɜːrdənt/', def: 'Green with growing vegetation; lush.', ex: 'The trail climbed through verdant hills.', syn: ['lush', 'green', 'leafy', 'flourishing'], ant: ['barren', 'arid'] },
  bioluminescence: { pos: 'noun', ipa: '/ˌbaɪoʊˌluːməˈnɛsəns/', def: 'The production of light by living organisms through a chemical reaction.', ex: 'The bay glowed with bioluminescence.', syn: ['glow', 'phosphorescence'], ant: [] },
  serendipity: { pos: 'noun', ipa: '/ˌsɛrənˈdɪpɪti/', def: 'The chance occurrence of a happy or beneficial discovery.', ex: 'Finding the café was pure serendipity.', syn: ['luck', 'fortune', 'chance'], ant: ['misfortune'] },
  ephemeral: { pos: 'adjective', ipa: '/ɪˈfɛmərəl/', def: 'Lasting for a very short time; transient.', ex: 'The blossom is beautiful but ephemeral.', syn: ['fleeting', 'transient', 'brief'], ant: ['permanent', 'enduring'] },
  luminous: { pos: 'adjective', ipa: '/ˈluːmɪnəs/', def: 'Giving off light; bright or shining, especially in the dark.', ex: 'A luminous mist hung over the water.', syn: ['glowing', 'radiant', 'bright'], ant: ['dim', 'dark'] },
  resilience: { pos: 'noun', ipa: '/rɪˈzɪliəns/', def: 'The capacity to recover quickly from difficulty; the ability of a system to return to its shape after bending.', ex: 'The forest showed remarkable resilience after the fire.', syn: ['toughness', 'grit', 'endurance'], ant: ['fragility'] },
  threshold: { pos: 'noun', ipa: '/ˈθrɛʃhoʊld/', def: 'A strip of wood or stone forming the bottom of a doorway; more broadly, the point at which something begins.', ex: 'They stood at the threshold of the greenhouse.', syn: ['doorstep', 'brink', 'verge'], ant: [] },
  ambient: { pos: 'adjective', ipa: '/ˈæmbiənt/', def: 'Relating to the immediate surroundings of something; creating a particular atmosphere.', ex: 'Ambient music drifted through the room.', syn: ['surrounding', 'atmospheric'], ant: ['focused'] },
  algorithm: { pos: 'noun', ipa: '/ˈælɡərɪðəm/', def: 'A finite sequence of well-defined steps used to solve a problem or perform a computation.', ex: 'The routing algorithm chose the shorter path.', syn: ['procedure', 'process', 'method'], ant: [] },
  interface: { pos: 'noun', ipa: '/ˈɪntərfeɪs/', def: 'A point where two systems meet and interact; the means by which a person communicates with a machine.', ex: 'The interface responds to a drag as naturally as a swipe.', syn: ['boundary', 'connection', 'front end'], ant: [] },
  cursor: { pos: 'noun', ipa: '/ˈkɜːrsər/', def: 'A movable indicator on a display showing where input will take effect.', ex: 'The cursor blinked at the end of the line.', syn: ['pointer', 'caret'], ant: [] },
  pixel: { pos: 'noun', ipa: '/ˈpɪksəl/', def: 'The smallest controllable element of a picture represented on a screen.', ex: 'The icon was drawn at 64 pixels square.', syn: ['dot'], ant: [] },
  window: { pos: 'noun', ipa: '/ˈwɪndoʊ/', def: 'An opening in a wall fitted with glass; in computing, a framed area on a display that contains an application.', ex: 'She dragged the window to the edge and it snapped into place.', syn: ['pane', 'aperture'], ant: [] },
  dock: { pos: 'noun', ipa: '/dɑːk/', def: 'A structure at the water’s edge where boats moor; in software, a bar of application icons kept within reach.', ex: 'The dock magnified as the pointer passed.', syn: ['pier', 'wharf', 'jetty'], ant: [] },
  synthesize: { pos: 'verb', ipa: '/ˈsɪnθəsaɪz/', def: 'To combine parts into a coherent whole; to produce a substance or sound by chemical or electronic means.', ex: 'The app synthesizes every note in real time.', syn: ['combine', 'compose', 'generate'], ant: ['separate'] },
  seamless: { pos: 'adjective', ipa: '/ˈsiːmləs/', def: 'Smooth and continuous, with no apparent gaps or awkward transitions.', ex: 'The transition felt seamless.', syn: ['smooth', 'fluid', 'continuous'], ant: ['abrupt', 'patchy'] },
  tactile: { pos: 'adjective', ipa: '/ˈtæktəl/', def: 'Relating to the sense of touch; designed to feel physically responsive.', ex: 'The keys have a satisfying tactile click.', syn: ['textural', 'physical', 'touchable'], ant: ['intangible'] },
  forage: { pos: 'verb', ipa: '/ˈfɔːrɪdʒ/', def: 'To search widely for food or provisions.', ex: 'They foraged for mushrooms after the rain.', syn: ['hunt', 'scavenge', 'rummage'], ant: [] },
  ecosystem: { pos: 'noun', ipa: '/ˈiːkoʊˌsɪstəm/', def: 'A community of interacting organisms and their physical environment.', ex: 'The pond supports a delicate ecosystem.', syn: ['biome', 'habitat'], ant: [] },
  nuance: { pos: 'noun', ipa: '/ˈnuːɑːns/', def: 'A subtle difference in meaning, expression or sound.', ex: 'The update added nuance to the shadows.', syn: ['subtlety', 'shade', 'refinement'], ant: ['crudeness'] },
  cascade: { pos: 'noun', ipa: '/kæˈskeɪd/', def: 'A small waterfall, or a process whereby things happen in sequence.', ex: 'A cascade of notifications arrived at noon.', syn: ['waterfall', 'chain', 'sequence'], ant: [] },
  threshold2: null,
  wander: { pos: 'verb', ipa: '/ˈwɑːndər/', def: 'To move about without a fixed course or destination.', ex: 'They wandered through the arboretum.', syn: ['roam', 'amble', 'drift'], ant: ['settle'] },
  mosaic: { pos: 'noun', ipa: '/moʊˈzeɪɪk/', def: 'A picture made from small pieces of colored material; a combination of diverse elements.', ex: 'The canopy formed a mosaic of greens.', syn: ['patchwork', 'collage'], ant: [] },
  orbit: { pos: 'verb', ipa: '/ˈɔːrbɪt/', def: 'To move in a curved path around a larger body.', ex: 'The satellite orbits every 94 minutes.', syn: ['circle', 'revolve'], ant: [] },
  cadence: { pos: 'noun', ipa: '/ˈkeɪdəns/', def: 'A rhythm or flow of sound, movement or events.', ex: 'The animation has a relaxed cadence.', syn: ['rhythm', 'tempo', 'beat'], ant: [] },
  clarity: { pos: 'noun', ipa: '/ˈklærəti/', def: 'The quality of being coherent and easily understood; the quality of transparency.', ex: 'Clarity of thought leads to clarity of design.', syn: ['lucidity', 'transparency', 'precision'], ant: ['confusion', 'obscurity'] },
  ephemera: { pos: 'noun', ipa: '/ɪˈfɛmərə/', def: 'Things that exist or are used for only a short time.', ex: 'The exhibition collected tickets and other ephemera.', syn: ['transient things'], ant: [] },
  flourish: { pos: 'verb', ipa: '/ˈflɜːrɪʃ/', def: 'To grow or develop in a healthy or vigorous way.', ex: 'The basil flourished on the sill.', syn: ['thrive', 'bloom', 'prosper'], ant: ['wither'] },
  hum: { pos: 'verb', ipa: '/hʌm/', def: 'To make a low, steady, continuous sound.', ex: 'The drive hummed quietly.', syn: ['buzz', 'drone', 'murmur'], ant: ['silence'] },
  vector: { pos: 'noun', ipa: '/ˈvɛktər/', def: 'A quantity with direction and magnitude; in graphics, a line defined mathematically rather than by pixels.', ex: 'The icons are drawn as vectors, so they stay crisp.', syn: ['direction', 'arrow'], ant: [] },
  glassmorphism: { pos: 'noun', ipa: '/ˈɡlæsˌmɔːrfɪzəm/', def: 'A visual style using translucent surfaces, blurred backgrounds and thin light borders to suggest frosted glass.', ex: 'The menu used glassmorphism over the wallpaper.', syn: ['translucency'], ant: [] },
};

const KEYS = Object.keys(WORDS).filter((k) => WORDS[k]);

export default {
  id: 'dictionary',
  name: 'Dictionary',
  icon: 'dictionary',
  colors: ['#f0ead6', '#c4b393'],
  iconOpts: { strokeWidth: 1.8 },
  width: 760, height: 560,
  keywords: ['words', 'define', 'thesaurus', 'meaning', 'synonym'],
  menus: () => [
    { label: 'File', items: [{ label: 'Word of the Day', action: () => window.dispatchEvent(new CustomEvent('canopy:dict-wotd')) }] },
  ],

  mount({ root, toolbar, win }) {
    let query = 'canopy';
    let history = data.get('dictionaryHistory', ['canopy']);
    let selected = 'canopy';

    root.innerHTML = `<div class="dict">
      <div class="dict-search"><label class="dict-search-inner">${glyph('search', 16, 2)}<input type="search" placeholder="Search a word" data-q aria-label="Search a word" value="canopy" /></label>
        <div class="dict-suggest" data-suggest></div></div>
      <div class="dict-body scroll-thin" data-body></div>
      <div class="dict-history"><span class="tiny muted">Recent:</span><div data-history></div></div>
    </div>`;

    const body = root.querySelector('[data-body]');
    const suggest = root.querySelector('[data-suggest]');
    const input = root.querySelector('[data-q]');

    function entry(word) {
      const w = WORDS[word];
      if (!w) {
        body.innerHTML = `<div class="dict-empty">${glyph('book', 40)}<div>No entry for “${escapeHtml(word)}”</div><div class="tiny muted">Try: ${KEYS.slice(0, 5).join(', ')}</div></div>`;
        return;
      }
      body.innerHTML = `<div class="dict-entry">
        <div class="dict-word">${escapeHtml(word)}<button class="icon-btn" data-speak title="Pronounce">${glyph('volume', 16, 1.8)}</button></div>
        <div class="dict-ipa">${w.ipa} <span class="dict-pos">${w.pos}</span></div>
        <div class="dict-def">${escapeHtml(w.def)}</div>
        <div class="dict-ex">“${escapeHtml(w.ex)}”</div>
        <div class="dict-section">Synonyms</div>
        <div class="dict-chips">${w.syn.map((s) => `<button class="dict-chip" data-word="${escapeHtml(s)}">${escapeHtml(s)}</button>`).join('')}</div>
        ${w.ant?.length ? `<div class="dict-section">Antonyms</div><div class="dict-chips">${w.ant.map((s) => `<span class="dict-chip ant">${escapeHtml(s)}</span>`).join('')}</div>` : ''}
        <div class="dict-actions"><button class="btn small" data-copy>Copy definition</button><button class="btn small" data-note>Save to Notes</button></div>
      </div>`;
      body.querySelector('[data-speak]').addEventListener('click', () => {
        if (window.speechSynthesis) {
          const u = new SpeechSynthesisUtterance(`${word}. ${w.def}`);
          u.rate = 0.95;
          window.speechSynthesis.speak(u);
        }
        sound.play('pop');
      });
      body.querySelectorAll('[data-word]').forEach((b) => b.addEventListener('click', () => show(b.dataset.word)));
      body.querySelector('[data-copy]').addEventListener('click', () => copyText(`${word} ${w.ipa} — ${w.pos}. ${w.def}`));
      body.querySelector('[data-note]').addEventListener('click', () => {
        const notes = data.get('notes', []);
        notes.unshift({ id: 'note-' + Date.now(), title: word, folder: 'Personal', tags: ['dictionary'], updated: Date.now(), pinned: false, body: `**${word}** ${w.ipa} *${w.pos}*\n\n${w.def}\n\n> ${w.ex}` });
        data.set('notes', notes);
        import('../core/notify.js').then(({ notify }) => notify.post({ title: 'Saved to Notes', body: `“${word}” was added to your notes.`, icon: 'notes', colors: ['#ffd45e', '#e0a300'], app: 'Notes', appId: 'notes' }));
      });
      win.setTitle(`Dictionary — ${word}`);
    }

    function show(word) {
      selected = word;
      query = word;
      input.value = word;
      suggest.innerHTML = '';
      if (!history.includes(word)) history = [word, ...history].slice(0, 8);
      data.set('dictionaryHistory', history, true);
      renderHistory();
      entry(word);
    }

    function renderHistory() {
      root.querySelector('[data-history]').innerHTML = history.map((h) => `<button class="dict-hist" data-h="${escapeHtml(h)}">${escapeHtml(h)}</button>`).join('');
      root.querySelectorAll('[data-h]').forEach((b) => b.addEventListener('click', () => show(b.dataset.h)));
    }

    input.addEventListener('input', () => {
      const q = input.value.toLowerCase().trim();
      if (!q) { suggest.innerHTML = ''; return; }
      const matches = KEYS.filter((k) => k.startsWith(q) || k.includes(q)).slice(0, 6);
      suggest.innerHTML = matches.map((m) => `<button class="dict-sug" data-s="${m}">${escapeHtml(m)}<small>${WORDS[m].pos}</small></button>`).join('');
      suggest.querySelectorAll('[data-s]').forEach((b) => b.addEventListener('click', () => show(b.dataset.s)));
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const exact = KEYS.find((k) => k === input.value.toLowerCase().trim());
        const near = exact || KEYS.find((k) => k.startsWith(input.value.toLowerCase().trim())) || input.value.toLowerCase().trim();
        show(near);
      }
    });
    window.addEventListener('canopy:dict-wotd', () => {
      const word = KEYS[new Date().getDate() % KEYS.length];
      show(word);
    });

    toolbar.innerHTML = `<span class="fn-toolbar-title">Dictionary</span><span class="spacer"></span>
      <button class="btn small no-drag" data-wotd>${glyph('sparkle', 11, 2)} Word of the Day</button>`;
    toolbar.querySelector('[data-wotd]').addEventListener('click', () => window.dispatchEvent(new CustomEvent('canopy:dict-wotd')));

    show('canopy');
    renderHistory();
  },
};
