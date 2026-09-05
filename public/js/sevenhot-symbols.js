/**
 * 7 HOT · Çan Zinciri sembol grafikleri.
 *
 * Meyve seti Lucky Reels ile ortaktır (public/js/symbols.js); buraya oyuna
 * özgü olanlar eklenir: BAR plakası, alevli 7, alevli WILD ve çan ailesi.
 *
 * Çanlar tek bir gövde şablonundan üretilir; her jackpot kademesi kendi
 * gradyanını alır. Böylece renk merdiveni (mor → mavi → yeşil → kırmızı)
 * tek yerden değişir ve sunucudaki JACKPOTS.levels ile aynı sırayı izler.
 */

import { GRADIENTS, OUTLINE, SHAPES } from './symbols.js';

/* ═══════════ Oyuna özgü gradyanlar ═══════════ */

const EXTRA_GRADIENTS = `
<linearGradient id="h-flame" x1="0.5" y1="1" x2="0.5" y2="0">
  <stop offset="0%" stop-color="#ff2d00"/><stop offset="42%" stop-color="#ff8a00"/>
  <stop offset="78%" stop-color="#ffd45e"/><stop offset="100%" stop-color="#fff6c2"/>
</linearGradient>
<radialGradient id="h-flameglow" cx="0.5" cy="0.7" r="0.55">
  <stop offset="0%" stop-color="#ffc75e" stop-opacity="0.42"/>
  <stop offset="55%" stop-color="#ff7a1a" stop-opacity="0.16"/>
  <stop offset="100%" stop-color="#ff4d00" stop-opacity="0"/>
</radialGradient>
<linearGradient id="h-bar" x1="0" y1="0" x2="0.25" y2="1">
  <stop offset="0%" stop-color="#fffbe6"/><stop offset="26%" stop-color="#ffe27a"/>
  <stop offset="62%" stop-color="#d99a0c"/><stop offset="100%" stop-color="#7a4d03"/>
</linearGradient>
<linearGradient id="h-wild" x1="0.15" y1="0" x2="0.85" y2="1">
  <stop offset="0%" stop-color="#fff3c4"/><stop offset="35%" stop-color="#ffb62e"/>
  <stop offset="70%" stop-color="#f2570f"/><stop offset="100%" stop-color="#8f1502"/>
</linearGradient>
<linearGradient id="h-bell-cash" x1="0.2" y1="0" x2="0.7" y2="1">
  <stop offset="0%" stop-color="#fff9dd"/><stop offset="30%" stop-color="#ffdc6a"/>
  <stop offset="66%" stop-color="#e09b0c"/><stop offset="100%" stop-color="#7a4d03"/>
</linearGradient>
<linearGradient id="h-bell-MINI" x1="0.2" y1="0" x2="0.7" y2="1">
  <stop offset="0%" stop-color="#f0d8ff"/><stop offset="34%" stop-color="#c084fc"/>
  <stop offset="72%" stop-color="#7e22ce"/><stop offset="100%" stop-color="#3b0764"/>
</linearGradient>
<linearGradient id="h-bell-MINOR" x1="0.2" y1="0" x2="0.7" y2="1">
  <stop offset="0%" stop-color="#d6e9ff"/><stop offset="34%" stop-color="#60a5fa"/>
  <stop offset="72%" stop-color="#1d4ed8"/><stop offset="100%" stop-color="#0b1f5c"/>
</linearGradient>
<linearGradient id="h-bell-MAJOR" x1="0.2" y1="0" x2="0.7" y2="1">
  <stop offset="0%" stop-color="#d6ffe2"/><stop offset="34%" stop-color="#4ade80"/>
  <stop offset="72%" stop-color="#15803d"/><stop offset="100%" stop-color="#052e14"/>
</linearGradient>
<linearGradient id="h-bell-GRAND" x1="0.2" y1="0" x2="0.7" y2="1">
  <stop offset="0%" stop-color="#ffd9d9"/><stop offset="34%" stop-color="#f87171"/>
  <stop offset="72%" stop-color="#b91c1c"/><stop offset="100%" stop-color="#450a0a"/>
</linearGradient>
<linearGradient id="h-bell-BOOST" x1="0.2" y1="0" x2="0.7" y2="1">
  <stop offset="0%" stop-color="#fff2cc"/><stop offset="30%" stop-color="#ffc23d"/>
  <stop offset="68%" stop-color="#ef6c00"/><stop offset="100%" stop-color="#6b2400"/>
</linearGradient>
<radialGradient id="h-cellglow" cx="0.5" cy="0.5" r="0.5">
  <stop offset="0%" stop-color="#ffffff" stop-opacity="0.35"/>
  <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
</radialGradient>
`;

/* ═══════════ Alev tacı — 7 ve WILD'ın arkasına konur ═══════════ */

const FLAMES = `
  <g fill="url(#h-flame)">
    <path d="M50 96c-16 0-27-10-27-24 0-11 7-18 9-27 2 6 5 9 8 11-2-11 2-21 12-30-1 12 5 17 11 24
             5 7 8 12 8 22 0 14-11 24-21 24z" opacity=".92"/>
    <path d="M22 96c-11 0-18-7-18-16 0-8 5-13 7-19 1 5 3 7 5 8-1-8 1-14 8-20-1 8 3 12 7 17
             3 5 5 8 5 14 0 9-6 16-14 16z" opacity=".62"/>
    <path d="M78 96c-11 0-18-7-18-16 0-8 5-13 7-19 1 5 3 7 5 8-1-8 1-14 8-20-1 8 3 12 7 17
             3 5 5 8 5 14 0 9-6 16-14 16z" opacity=".62"/>
  </g>
  <g fill="#ffd45e" opacity=".85">
    <path d="M50 96c-8 0-13-5-13-12 0-6 4-9 5-14 3 5 9 8 9 15 0 4-1 7-1 11z"/>
  </g>
  <ellipse cx="50" cy="74" rx="40" ry="26" fill="url(#h-flameglow)"/>
`;

/** Çan gövdesi — jackpot kademesine göre farklı gradyanla üretilir. */
function bell(fill, extra = '') {
  return `
    <ellipse cx="50" cy="56" rx="42" ry="40" fill="url(#h-cellglow)"/>
    <path d="M50 13c-5 0-9 3-9 7v3c-13 5-21 16-21 29 0 10-2 16-7 21h74c-5-5-7-11-7-21 0-13-8-24-21-29v-3c0-4-4-7-9-7z"
      fill="${fill}" ${OUTLINE}/>
    <path d="M20 73h60" stroke="#2b0f00" stroke-width="2.2" opacity=".55"/>
    <ellipse cx="50" cy="84" rx="9.5" ry="8.5" fill="${fill}" ${OUTLINE}/>
    <circle cx="50" cy="13" r="5.5" fill="${fill}" ${OUTLINE} stroke-width="2"/>
    <path d="M34 32c-7 8-11 17-11 26" stroke="#ffffff" stroke-width="5" fill="none"
      stroke-linecap="round" opacity=".4"/>
    <ellipse cx="46" cy="81" rx="3.2" ry="2.5" fill="#ffffff" opacity=".45"/>
    ${extra}`;
}

/** Kademe rozeti — çanın üstüne basılan kısa etiket. */
function badge(text, size = 15) {
  return `
    <path d="M17 50h66v16H17z" fill="#12131a" opacity=".62" rx="3"/>
    <text x="50" y="62.5" text-anchor="middle"
      font-family="'Arial Black', Impact, system-ui, sans-serif"
      font-size="${size}" font-weight="900" letter-spacing=".5"
      textLength="58" lengthAdjust="spacingAndGlyphs"
      fill="#fff8e1" stroke="#000" stroke-width="2.2" paint-order="stroke">${text}</text>`;
}

/* ═══════════ Oyuna özgü şekiller ═══════════ */

const EXTRA_SHAPES = {
  /** Klasik üç katlı BAR plakası. */
  BAR: `
    <ellipse cx="50" cy="88" rx="36" ry="6.5" fill="#000" opacity=".38"/>
    <g ${OUTLINE}>
      <rect x="14" y="19" width="72" height="19" rx="6" fill="url(#h-bar)"/>
      <rect x="14" y="41" width="72" height="19" rx="6" fill="url(#h-bar)"/>
      <rect x="14" y="63" width="72" height="19" rx="6" fill="url(#h-bar)"/>
    </g>
    <!-- Alt kenar ışığı: plakalara kalınlık hissi verir -->
    <g fill="#fff3c4" opacity=".45">
      <rect x="17" y="34" width="66" height="2.4" rx="1.2"/>
      <rect x="17" y="56" width="66" height="2.4" rx="1.2"/>
      <rect x="17" y="78" width="66" height="2.4" rx="1.2"/>
    </g>
    <g font-family="'Arial Black', Impact, system-ui, sans-serif" font-size="13.5"
       font-weight="900" text-anchor="middle" letter-spacing="1.6">
      <g fill="#4a2d01">
        <text x="50" y="33.5">BAR</text><text x="50" y="55.5">BAR</text><text x="50" y="77.5">BAR</text>
      </g>
    </g>
    <!-- Üstten gelen sert parlama -->
    <g fill="#ffffff">
      <rect x="18" y="21.5" width="64" height="4.5" rx="2.2" opacity=".62"/>
      <rect x="18" y="43.5" width="64" height="4.5" rx="2.2" opacity=".52"/>
      <rect x="18" y="65.5" width="64" height="4.5" rx="2.2" opacity=".42"/>
    </g>`,

  /** Alevli 7 — oyunun ana yüksek sembolü. */
  SEVEN: `
    ${FLAMES}
    <text x="51" y="86" text-anchor="middle" font-family="Impact, 'Arial Black', sans-serif"
      font-size="88" fill="#3a0206" opacity=".5">7</text>
    <text x="50" y="84" text-anchor="middle" font-family="Impact, 'Arial Black', sans-serif"
      font-size="88" fill="url(#g-red7)" stroke="url(#g-gold)" stroke-width="4.5" paint-order="stroke">7</text>
    <text x="50" y="84" text-anchor="middle" font-family="Impact, 'Arial Black', sans-serif"
      font-size="88" fill="none" stroke="#2b0f00" stroke-width="1.3" paint-order="stroke" opacity=".85">7</text>`,

  /** Alevli WILD yazısı — yalnızca ortadaki üç makarada görünür. */
  WILD: `
    <g transform="translate(0 43) scale(1 0.55)">${FLAMES}</g>
    <g transform="rotate(-8 50 62)">
      <text x="50" y="64" text-anchor="middle"
        font-family="'Arial Black', Impact, system-ui, sans-serif"
        font-size="31" font-weight="900" letter-spacing="1"
        textLength="90" lengthAdjust="spacingAndGlyphs"
        fill="url(#h-wild)" stroke="#2b0f00" stroke-width="7" paint-order="stroke">WILD</text>
      <text x="50" y="64" text-anchor="middle"
        font-family="'Arial Black', Impact, system-ui, sans-serif"
        font-size="31" font-weight="900" letter-spacing="1"
        textLength="90" lengthAdjust="spacingAndGlyphs"
        fill="url(#h-wild)" stroke="url(#g-gold)" stroke-width="1.8" paint-order="stroke">WILD</text>
    </g>`,

  /** Makarada dönen sade çan (değeri henüz açılmamış). */
  BELL: bell('url(#h-bell-cash)'),

  BELL_MINI:  bell('url(#h-bell-MINI)',  badge('MINI')),
  BELL_MINOR: bell('url(#h-bell-MINOR)', badge('MINÖR', 13)),
  BELL_MAJOR: bell('url(#h-bell-MAJOR)', badge('MAJÖR', 13)),
  BELL_GRAND: bell('url(#h-bell-GRAND)', badge('GRAND')),
  BELL_BOOST: bell(
    'url(#h-bell-BOOST)',
    `<path d="M55 40l-16 22h11l-4 18 17-24H51z" fill="#fff6c2" stroke="#6b2400"
       stroke-width="2" stroke-linejoin="round"/>`
  )
};

/** 7 HOT'ta kullanılan semboller — ortak meyveler + oyuna özgüler. */
const SHARED = ['CHERRY', 'LEMON', 'PLUM', 'ORANGE', 'GRAPE', 'MELON', 'DOLLAR'];

const ALL = {
  ...Object.fromEntries(SHARED.map((id) => [id, SHAPES[id]])),
  ...EXTRA_SHAPES
};

/** Sunucu sembol kimliği → sprite kimliği. */
export const SPRITE_ID = {
  CHERRY: 'CHERRY', LEMON: 'LEMON', PLUM: 'PLUM', ORANGE: 'ORANGE',
  GRAPE: 'GRAPE', MELON: 'MELON', BAR: 'BAR', SEVEN: 'SEVEN',
  WILD: 'WILD', SCATTER: 'DOLLAR', BELL: 'BELL'
};

/** Çan hücresinin taşıdığı ödüle göre sprite seçer. */
export function bellSprite(cell) {
  if (!cell) return 'BELL';
  if (cell.boost) return 'BELL_BOOST';
  if (cell.jackpot) return `BELL_${cell.jackpot}`;
  return 'BELL';
}

export function buildSprite() {
  const symbols = Object.entries(ALL)
    .map(([id, shape]) => `<symbol id="h-sym-${id}" viewBox="0 0 100 100">${shape}</symbol>`)
    .join('');
  return `<svg id="hot-sprite" aria-hidden="true" focusable="false">
    <defs>${GRADIENTS}${EXTRA_GRADIENTS}</defs>${symbols}</svg>`;
}

export function symbolMarkup(symbolId, extraClass = '') {
  const id = SPRITE_ID[symbolId] || symbolId;
  return `<svg class="sym sym-${id} ${extraClass}" viewBox="0 0 100 100"><use href="#h-sym-${id}"/></svg>`;
}
