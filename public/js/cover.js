/**
 * Oyun kapaklarini vektorel olarak uretir.
 *
 * Katalogda 100'den fazla oyun var ve hicbiri icin gorsel dosyasi yok.
 * Her oyunun bir PALET ve MOTIF'i vardir; bu modul bunlardan
 * arka plan + isik huzmeleri + motif + baslik kilidi olan bir SVG kurar.
 * Sonuc: tek bayt gorsel indirmeden birbirinden ayirt edilebilir kapaklar.
 */

export const PALETTES = {
  ember:    ['#2a0d05', '#ff6b1f', '#ffd166'],
  royal:    ['#12082e', '#7b3ff2', '#ffd166'],
  jade:     ['#04231c', '#12b886', '#c3fae8'],
  crimson:  ['#2b0410', '#e01b48', '#ffb3c1'],
  ocean:    ['#031a2e', '#1c7ed6', '#a5d8ff'],
  midnight: ['#0a0a1f', '#4c6ef5', '#dbe4ff'],
  sand:     ['#2c1c05', '#d9a406', '#ffe8a3'],
  vine:     ['#0f2005', '#5cb800', '#d8f5a2'],
  amethyst: ['#1c0630', '#b14aed', '#f3d9ff'],
  copper:   ['#2a1206', '#c9662b', '#ffd8a8'],
  ice:      ['#04202b', '#22b8cf', '#c5f6fa'],
  rose:     ['#2b0a1e', '#f06595', '#ffdeeb'],
  onyx:     ['#0c0c0f', '#8d99ae', '#edf2f4'],
  toxic:    ['#0f2b04', '#94d82d', '#f4fce3'],
  lava:     ['#280505', '#ff3c00', '#ffc078'],
  abyss:    ['#050d1a', '#3b5bdb', '#91a7ff']
};

/** Motif cizimleri - 100x100 kutusunda, fill="currentColor" mantigiyla. */
const MOTIFS = {
  crown: `<path d="M14 68h72l6-38-22 15L50 20 30 45 8 30z" />
          <rect x="14" y="72" width="72" height="10" rx="3"/>`,
  pyramid: `<path d="M50 14 92 82H8z"/><path d="M50 14 62 82H38z" opacity=".45"/>
            <circle cx="50" cy="38" r="5" opacity=".6"/>`,
  gem: `<path d="M30 22h40l18 22-38 40L12 44z"/><path d="M30 22 40 44H12zM70 22 60 44h28zM40 44h20L50 84z" opacity=".4"/>`,
  fruit: `<circle cx="34" cy="62" r="20"/><circle cx="68" cy="66" r="16"/>
          <path d="M34 42c4-14 14-22 26-24" stroke="currentColor" stroke-width="5" fill="none" stroke-linecap="round"/>`,
  bell: `<path d="M50 16c-6 0-10 4-10 9v3c-13 5-20 16-20 29 0 9-3 15-7 19h74c-4-4-7-10-7-19 0-13-7-24-20-29v-3c0-5-4-9-10-9z"/>
         <ellipse cx="50" cy="84" rx="10" ry="8"/>`,
  coin: `<circle cx="50" cy="50" r="34"/><circle cx="50" cy="50" r="24" opacity=".35"/>
         <path d="M50 32v36M42 42h16M42 58h16" stroke="currentColor" stroke-width="5" fill="none" opacity=".8"/>`,
  dragon: `<path d="M18 62c8-26 28-38 52-38 8 0 14 4 14 10 0 8-8 10-16 10-14 0-24 8-28 20-2 8-8 14-16 14-6 0-10-6-6-16z"/>
           <circle cx="66" cy="34" r="4" fill="#000" opacity=".6"/>
           <path d="M30 74c14 6 34 6 48-4" stroke="currentColor" stroke-width="6" fill="none" stroke-linecap="round"/>`,
  book: `<path d="M12 24c14-6 26-6 38 2v58c-12-8-24-8-38-2z"/>
         <path d="M88 24c-14-6-26-6-38 2v58c12-8 24-8 38-2z" opacity=".55"/>`,
  wolf: `<path d="M22 30l10 16 18-10 18 10 10-16 6 34c0 16-14 26-34 26S16 80 16 64z"/>
         <circle cx="40" cy="58" r="4" fill="#000" opacity=".65"/><circle cx="60" cy="58" r="4" fill="#000" opacity=".65"/>`,
  wave: `<path d="M6 58c12-14 22-14 34 0s22 14 34 0 12-14 20-6v34H6z"/>
         <path d="M6 40c12-14 22-14 34 0s22 14 34 0" stroke="currentColor" stroke-width="5" fill="none" opacity=".5"/>`,
  star: `<path d="M50 10l12 27 30 3-22 20 6 29-26-15-26 15 6-29-22-20 30-3z"/>`,
  joker: `<path d="M50 22c14 0 24 10 24 22 0 16-12 22-12 32H38c0-10-12-16-12-32 0-12 10-22 24-22z"/>
          <path d="M26 30 14 16l12 4zM74 30l12-14-12 4z"/><circle cx="50" cy="84" r="6"/>`,
  skull: `<path d="M50 16c-20 0-34 14-34 32 0 12 6 18 10 22v14h48V70c4-4 10-10 10-22 0-18-14-32-34-32z"/>
          <circle cx="38" cy="50" r="8" fill="#000" opacity=".7"/><circle cx="62" cy="50" r="8" fill="#000" opacity=".7"/>`,
  anchor: `<circle cx="50" cy="20" r="9"/><rect x="45" y="28" width="10" height="52" rx="4"/>
           <rect x="30" y="36" width="40" height="9" rx="4"/>
           <path d="M18 62c0 16 14 24 32 24s32-8 32-24" stroke="currentColor" stroke-width="9" fill="none" stroke-linecap="round"/>`,
  lotus: `<path d="M50 20c10 14 10 30 0 44-10-14-10-30 0-44z"/>
          <path d="M24 34c16 6 26 18 26 34-16-4-26-16-26-34zM76 34c-16 6-26 18-26 34 16-4 26-16 26-34z" opacity=".7"/>
          <path d="M10 58c18 0 32 8 40 22-18 2-34-6-40-22zM90 58c-18 0-32 8-40 22 18 2 34-6 40-22z" opacity=".5"/>`,
  horseshoe: `<path d="M50 14c-18 0-30 14-30 32v28h16V46c0-8 6-14 14-14s14 6 14 14v28h16V46c0-18-12-32-30-32z"/>
              <circle cx="28" cy="80" r="6"/><circle cx="72" cy="80" r="6"/>`,
  diamond: `<path d="M50 12 88 50 50 88 12 50z"/><path d="M50 12 68 50 50 88 32 50z" opacity=".4"/>`,
  clover: `<path d="M50 50c-14-16-30-12-30 2s16 16 30 6zM50 50c14-16 30-12 30 2s-16 16-30 6zM50 50c-16-14-12-30 2-30s16 16 6 30z"/>
           <path d="M48 54h5l4 34h-13z"/>`,
  phoenix: `<path d="M50 16c8 12 8 24 2 34 12-6 22-4 30 6-12 4-18 12-20 22-6-8-14-12-24-12s-18 4-24 12c-2-10-8-18-20-22 8-10 18-12 30-6-6-10-6-22 2-34l12 10z"/>
            <path d="M34 78c10 6 22 6 32 0" stroke="currentColor" stroke-width="5" fill="none" stroke-linecap="round"/>`,
  mask: `<path d="M50 16c-20 0-34 10-34 26 0 24 18 42 34 42s34-18 34-42c0-16-14-26-34-26z"/>
         <path d="M28 46c8-6 16-6 22 0-8 8-16 8-22 0zM72 46c-8-6-16-6-22 0 8 8 16 8 22 0z" fill="#000" opacity=".65"/>`,
  wheel: `<circle cx="50" cy="50" r="36"/><circle cx="50" cy="50" r="12" fill="#000" opacity=".5"/>
          <path d="M50 14v72M14 50h72M25 25l50 50M75 25l-50 50" stroke="#000" stroke-width="4" opacity=".45"/>`,
  cards: `<rect x="16" y="24" width="36" height="52" rx="6" transform="rotate(-12 34 50)"/>
          <rect x="48" y="24" width="36" height="52" rx="6" transform="rotate(10 66 50)" opacity=".8"/>
          <path d="M66 40l6 8-6 8-6-8z" fill="#000" opacity=".55"/>`,
  gift: `<rect x="14" y="40" width="72" height="44" rx="6"/><rect x="8" y="28" width="84" height="16" rx="5"/>
         <rect x="44" y="28" width="12" height="56" fill="#000" opacity=".45"/>
         <path d="M50 28c-8-14-24-12-24-2 0 6 12 6 24 2zM50 28c8-14 24-12 24-2 0 6-12 6-24 2z"/>`,
  reels: `<rect x="10" y="26" width="80" height="48" rx="8"/>
          <rect x="20" y="34" width="18" height="32" rx="3" fill="#000" opacity=".5"/>
          <rect x="41" y="34" width="18" height="32" rx="3" fill="#000" opacity=".5"/>
          <rect x="62" y="34" width="18" height="32" rx="3" fill="#000" opacity=".5"/>`
};

function escapeHtml(text) {
  return String(text).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

/** Basligi en fazla iki satira boler. */
function splitTitle(name) {
  const words = name.split(' ');
  if (words.length === 1) return [name];
  if (words.length === 2) return words;
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
}

let uid = 0;

/**
 * Kapak SVG'si uretir.
 * @param {{name:string, palette:string, motif:string}} game
 */
export function coverMarkup(game) {
  const [dark, main, light] = PALETTES[game.palette] || PALETTES.onyx;
  const motif = MOTIFS[game.motif] || MOTIFS.star;
  const id = `cv${(uid += 1)}`;
  const lines = splitTitle(game.name);
  const fontSize = lines.length > 1 ? 15 : 18;
  const startY = lines.length > 1 ? 112 : 120;

  const title = lines
    .map(
      (line, i) =>
        `<text x="75" y="${startY + i * 17}" text-anchor="middle" font-size="${fontSize}"
           font-weight="900" letter-spacing="0.3" textLength="${Math.min(138, line.length * fontSize * 0.62)}"
           lengthAdjust="spacingAndGlyphs"
           font-family="'Arial Black', Impact, system-ui, sans-serif"
           fill="url(#${id}t)" stroke="#1a0d00" stroke-width="3.6" paint-order="stroke"
         >${escapeHtml(line.toLocaleUpperCase('tr'))}</text>`
    )
    .join('');

  return `<svg class="cover" viewBox="0 0 150 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <defs>
    <linearGradient id="${id}b" x1="0" y1="0" x2="0.6" y2="1">
      <stop offset="0%" stop-color="${main}" stop-opacity="0.55"/>
      <stop offset="55%" stop-color="${dark}"/>
      <stop offset="100%" stop-color="#04040a"/>
    </linearGradient>
    <radialGradient id="${id}g" cx="0.5" cy="0.36" r="0.62">
      <stop offset="0%" stop-color="${light}" stop-opacity="0.55"/>
      <stop offset="60%" stop-color="${main}" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="${main}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="${id}m" x1="0.2" y1="0" x2="0.8" y2="1">
      <stop offset="0%" stop-color="${light}"/>
      <stop offset="55%" stop-color="${main}"/>
      <stop offset="100%" stop-color="${dark}"/>
    </linearGradient>
    <linearGradient id="${id}t" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fff6d0"/><stop offset="45%" stop-color="#ffd35e"/>
      <stop offset="100%" stop-color="#e08a00"/>
    </linearGradient>
    <linearGradient id="${id}v" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#04040a" stop-opacity="0"/>
      <stop offset="35%" stop-color="#04040a" stop-opacity="0.72"/>
      <stop offset="100%" stop-color="#04040a" stop-opacity="0.95"/>
    </linearGradient>
    <linearGradient id="${id}s" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0"/>
      <stop offset="45%" stop-color="#ffffff" stop-opacity="0.16"/>
      <stop offset="55%" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <rect width="150" height="150" fill="url(#${id}b)"/>
  <circle cx="75" cy="54" r="70" fill="url(#${id}g)"/>

  <g opacity="0.10" fill="${light}">
    <path d="M75 50 26 -16h9zM75 50 58 -22h7zM75 50 96 -20h8zM75 50 132 -8h9zM75 50 150 22v10z"/>
  </g>
  <g opacity="0.35" fill="${main}">
    <circle cx="18" cy="128" r="9"/><circle cx="34" cy="140" r="6"/><circle cx="134" cy="120" r="7"/>
  </g>

  <g transform="translate(30 8) scale(0.9)" fill="url(#${id}m)"
     stroke="#0a0500" stroke-width="2.2" stroke-linejoin="round">${motif}</g>

  <rect y="70" width="150" height="80" fill="url(#${id}v)"/>
  ${title}
  <rect width="150" height="150" fill="url(#${id}s)" class="cover-sheen"/>
</svg>`;
}

export const MOTIF_IDS = Object.keys(MOTIFS);
