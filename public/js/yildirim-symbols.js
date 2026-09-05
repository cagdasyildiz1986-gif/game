/**
 * YILDIRIM · Göklerin Öfkesi — sembol grafikleri.
 *
 * Gönderilen maket tasarımına göre çizilmiştir:
 *  - Alçak semboller FASETLİ TAŞ: eşkenar dörtgen (mor, mavi) ve
 *    altıgen (kırmızı, sarı, yeşil) kesim, sert faset ışıkları
 *  - Yüksek semboller PARLAK ALTIN: boğa başı, dümen/güneş kursu,
 *    kanatlı kartal, çift balta
 *  - Scatter ve çarpan küresi ALTIN DİŞLİ HALKA içinde mavi yıldırım
 *
 * Tamamı vektöreldir; harici görsel dosyası yoktur.
 */

const GOLD = `
<linearGradient id="y-gold" x1="0.12" y1="0" x2="0.7" y2="1">
  <stop offset="0%" stop-color="#fff6d0"/><stop offset="22%" stop-color="#ffdc7a"/>
  <stop offset="48%" stop-color="#f0ad2a"/><stop offset="74%" stop-color="#b7760b"/>
  <stop offset="100%" stop-color="#7a4a04"/>
</linearGradient>
<linearGradient id="y-gold2" x1="0.2" y1="0" x2="0.8" y2="1">
  <stop offset="0%" stop-color="#fffbe8"/><stop offset="30%" stop-color="#ffe89a"/>
  <stop offset="62%" stop-color="#d99a18"/><stop offset="100%" stop-color="#8a5504"/>
</linearGradient>
<linearGradient id="y-goldDeep" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%" stop-color="#c68d12"/><stop offset="100%" stop-color="#6b3f02"/>
</linearGradient>
<linearGradient id="y-bolt" x1="0.3" y1="0" x2="0.7" y2="1">
  <stop offset="0%" stop-color="#ffffff"/><stop offset="26%" stop-color="#cdf3ff"/>
  <stop offset="58%" stop-color="#41c4ff"/><stop offset="100%" stop-color="#0a56c8"/>
</linearGradient>
<radialGradient id="y-boltCore" cx="0.5" cy="0.5" r="0.5">
  <stop offset="0%" stop-color="#123a8c"/><stop offset="60%" stop-color="#0a1f5c"/>
  <stop offset="100%" stop-color="#050f30"/>
</radialGradient>
<radialGradient id="y-glow" cx="0.5" cy="0.5" r="0.5">
  <stop offset="0%" stop-color="#9fe4ff" stop-opacity="0.75"/>
  <stop offset="100%" stop-color="#2f6bff" stop-opacity="0"/>
</radialGradient>
<radialGradient id="y-shine" cx="0.5" cy="0.5" r="0.5">
  <stop offset="0%" stop-color="#ffffff" stop-opacity="0.9"/>
  <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
</radialGradient>
`;

/** Altın kabartmalar için koyu kontur. */
const OUT = 'stroke="#3a1f02" stroke-width="2.4" stroke-linejoin="round"';

/* ═══════════ Fasetli taşlar ═══════════ */

/**
 * Taş renkleri: [en açık faset, gövde, koyu faset, kenar gölgesi]
 * Maketteki mücevherler cam gibi: üst fasetler açık, yan fasetler doygun,
 * alt uç neredeyse siyaha iner.
 */
const GEMS = {
  KOR:      { cut: 'hex',  c: ['#ffd9cf', '#ff5836', '#c8140a', '#5e0400'] },
  MOR:      { cut: 'rhom', c: ['#f0d4ff', '#c04ef5', '#7118c4', '#2d0553'] },
  KEHRIBAR: { cut: 'hex',  c: ['#fff6cc', '#ffc61f', '#c07c00', '#5c3600'] },
  ZUMRUT:   { cut: 'hex',  c: ['#d6ffe4', '#2fd96f', '#0a8a3c', '#023018'] },
  GOK:      { cut: 'rhom', c: ['#d6efff', '#3aa8ff', '#0f56cf', '#031a52'] }
};

function gemGradients(id, [light, body, deep, edge]) {
  return `
<linearGradient id="y-${id}-t" x1="0.2" y1="0" x2="0.6" y2="1">
  <stop offset="0%" stop-color="${light}"/><stop offset="60%" stop-color="${body}"/>
  <stop offset="100%" stop-color="${deep}"/>
</linearGradient>
<linearGradient id="y-${id}-l" x1="0.9" y1="0" x2="0.1" y2="1">
  <stop offset="0%" stop-color="${body}"/><stop offset="100%" stop-color="${edge}"/>
</linearGradient>
<linearGradient id="y-${id}-r" x1="0.1" y1="0" x2="0.9" y2="1">
  <stop offset="0%" stop-color="${deep}"/><stop offset="100%" stop-color="${edge}"/>
</linearGradient>`;
}

const GEM_GRADIENTS = Object.entries(GEMS)
  .map(([id, g]) => gemGradients(id, g.c))
  .join('');

/** Eşkenar dörtgen kesim — mor ve mavi taşlar (masa faseti + 4 yan faset). */
function rhombus(id) {
  return `
    <ellipse cx="50" cy="50" rx="44" ry="44" fill="url(#y-glow)" opacity=".2"/>
    <path d="M50 4 94 50 50 96 6 50z" fill="url(#y-${id}-r)"
      stroke="#0a0418" stroke-width="2.6" stroke-linejoin="round"/>
    <g stroke="#0a0418" stroke-width="1.2" stroke-linejoin="round">
      <path d="M50 4 94 50 71 50 50 27z" fill="url(#y-${id}-t)"/>
      <path d="M50 4 6 50l23 0L50 27z" fill="url(#y-${id}-t)" opacity=".88"/>
      <path d="M94 50 50 96 50 73 71 50z" fill="url(#y-${id}-r)"/>
      <path d="M6 50 50 96 50 73 29 50z" fill="url(#y-${id}-l)"/>
      <path d="M50 27 71 50 50 73 29 50z" fill="url(#y-${id}-t)"/>
    </g>
    <path d="M50 10 66 27 50 27 36 27z" fill="#ffffff" opacity=".55"/>
    <path d="M33 44 50 31l5 4-17 13z" fill="#ffffff" opacity=".7"/>
    <path d="M57 57 68 50l-2 8-9 8z" fill="#ffffff" opacity=".18"/>`;
}

/** Altıgen kesim — kırmızı, sarı ve yeşil taşlar (masa faseti + 6 yan faset). */
function hexagon(id) {
  return `
    <ellipse cx="50" cy="50" rx="44" ry="44" fill="url(#y-glow)" opacity=".2"/>
    <path d="M50 4 90 27v46L50 96 10 73V27z" fill="url(#y-${id}-r)"
      stroke="#0a0418" stroke-width="2.6" stroke-linejoin="round"/>
    <g stroke="#0a0418" stroke-width="1.2" stroke-linejoin="round">
      <path d="M50 4 90 27 70 38 50 27z" fill="url(#y-${id}-t)"/>
      <path d="M50 4 10 27l20 11L50 27z" fill="url(#y-${id}-t)" opacity=".9"/>
      <path d="M90 27v46L70 62V38z" fill="url(#y-${id}-l)"/>
      <path d="M10 27v46l20-11V38z" fill="url(#y-${id}-l)" opacity=".8"/>
      <path d="M90 73 50 96 50 73 70 62z" fill="url(#y-${id}-r)"/>
      <path d="M10 73 50 96 50 73 30 62z" fill="url(#y-${id}-r)" opacity=".85"/>
      <path d="M50 27 70 38v24L50 73 30 62V38z" fill="url(#y-${id}-t)"/>
    </g>
    <path d="M50 10 66 27H50 34z" fill="#ffffff" opacity=".5"/>
    <path d="M35 34 52 30l4 5-19 6z" fill="#ffffff" opacity=".65"/>
    <path d="M34 44v16l10 6V49z" fill="#ffffff" opacity=".2"/>
    <path d="M76 44v16l-8 5V49z" fill="#ffffff" opacity=".1"/>`;
}

/* ═══════════ Altın dişli halka (scatter ve çarpan küresi ortak) ═══════════ */

function goldRing(inner) {
  return `
    <ellipse cx="50" cy="50" rx="49" ry="49" fill="url(#y-glow)" opacity=".55"/>
    <g fill="url(#y-gold)" ${OUT} stroke-width="1.8">
      <path d="M50 2l5 9h-10z"/><path d="M50 98l5-9h-10z"/>
      <path d="M2 50l9 5v-10z"/><path d="M98 50l-9 5v-10z"/>
      <path d="M16 16l9.5 3.5-6 6z"/><path d="M84 84l-9.5-3.5 6-6z"/>
      <path d="M84 16l-3.5 9.5-6-6z"/><path d="M16 84l3.5-9.5 6 6z"/>
    </g>
    <circle cx="50" cy="50" r="40" fill="url(#y-goldDeep)" ${OUT}/>
    <circle cx="50" cy="50" r="35" fill="url(#y-gold)" stroke="#7a4a04" stroke-width="1.6"/>
    <circle cx="50" cy="50" r="29" fill="url(#y-boltCore)" stroke="#7a4a04" stroke-width="2"/>
    <path d="M28 34a26 26 0 0 1 16-11" stroke="#fff6d0" stroke-width="3.4" fill="none"
      stroke-linecap="round" opacity=".65"/>
    ${inner}`;
}

/** Halkanın içindeki mavi yıldırım. */
const INNER_BOLT = `
    <path d="M58 24 38 55h12l-4 22 20-30H52z" fill="#04204a" opacity=".8"
      transform="translate(2 2)"/>
    <path d="M58 24 38 55h12l-4 22 20-30H52z" fill="url(#y-bolt)"
      stroke="#0a2a66" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="M55 31 44 49h7l-2 12" fill="none" stroke="#ffffff" stroke-width="2.2"
      opacity=".7" stroke-linecap="round"/>`;

/* ═══════════ Şekiller ═══════════ */

const SHAPES = {
  /** Parlak altın boğa başı — en yüksek sembol. */
  BOGA: `
    <ellipse cx="50" cy="54" rx="44" ry="40" fill="url(#y-shine)" opacity=".1"/>
    <path d="M30 36C20 31 10 27 3 16c1 16 11 27 28 32z" fill="url(#y-gold)" ${OUT}/>
    <path d="M70 36c10-5 20-9 27-20-1 16-11 27-28 32z" fill="url(#y-gold)" ${OUT}/>
    <ellipse cx="23" cy="51" rx="9" ry="6" transform="rotate(-22 23 51)"
      fill="url(#y-gold2)" ${OUT} stroke-width="1.9"/>
    <ellipse cx="77" cy="51" rx="9" ry="6" transform="rotate(22 77 51)"
      fill="url(#y-gold2)" ${OUT} stroke-width="1.9"/>
    <path d="M50 27c-16 0-25 10-25 25 0 12 7 22 15 28 4 3 16 3 20 0 8-6 15-16 15-28
             0-15-9-25-25-25z" fill="url(#y-gold)" ${OUT}/>
    <path d="M41 34c3-4 6-6 9-7 3 1 6 3 9 7-6-2-12-2-18 0z" fill="#7a4a04" opacity=".5"/>
    <path d="M33 51c2-5 9-6 12-2 1 4-2 7-6 7s-6-2-6-5z" fill="#2a1502"/>
    <path d="M67 51c-2-5-9-6-12-2-1 4 2 7 6 7s6-2 6-5z" fill="#2a1502"/>
    <circle cx="38.5" cy="50" r="2.6" fill="#7ef0ff"/>
    <circle cx="61.5" cy="50" r="2.6" fill="#7ef0ff"/>
    <ellipse cx="50" cy="73" rx="15" ry="10" fill="url(#y-gold2)" ${OUT} stroke-width="1.9"/>
    <ellipse cx="43.5" cy="71" rx="3.4" ry="2.5" fill="#2a1502"/>
    <ellipse cx="56.5" cy="71" rx="3.4" ry="2.5" fill="#2a1502"/>
    <path d="M43 79c4 2 10 2 14 0" stroke="#2a1502" stroke-width="2" fill="none"
      stroke-linecap="round"/>
    <path d="M33 36c-3 5-4 10-4 15" stroke="#fff6d0" stroke-width="3.2" fill="none"
      stroke-linecap="round" opacity=".55"/>`,

  /** Tunç miğfer — Korint tipi, altın kabartma. */
  MIGFER: `
    <ellipse cx="50" cy="52" rx="43" ry="43" fill="url(#y-shine)" opacity=".1"/>
    <!-- Tepelik (crest) -->
    <path d="M50 6c-14 0-22 7-25 15 6-4 12-5 18-4 3-5 6-8 7-11z"
      fill="url(#y-gold2)" ${OUT} stroke-width="2"/>
    <path d="M28 14c-8 3-14 9-17 17 5-3 10-4 15-3z" fill="url(#y-gold)" ${OUT} stroke-width="2"/>
    <path d="M55 8c10 2 17 8 21 17-5-4-11-6-17-6z" fill="url(#y-gold)" ${OUT} stroke-width="2"/>
    <!-- Kubbe -->
    <path d="M50 18c-16 0-27 11-27 27v16c0 8 5 15 12 19l4-9c-4-3-6-7-6-12V45c0-9 7-16 17-16s17 7 17 16v14c0 5-2 9-6 12l4 9c7-4 12-11 12-19V45c0-16-11-27-27-27z"
      fill="url(#y-gold)" ${OUT}/>
    <!-- Yanaklıklar ve burunluk -->
    <path d="M33 45h8v34c0 5-2 9-4 11-2-2-4-6-4-11z" fill="url(#y-gold2)" ${OUT} stroke-width="2"/>
    <path d="M59 45h8v34c0 5-2 9-4 11-2-2-4-6-4-11z" fill="url(#y-gold2)" ${OUT} stroke-width="2"/>
    <path d="M46 40h8v52c0 3-1 5-4 6-3-1-4-3-4-6z" fill="url(#y-gold2)" ${OUT} stroke-width="2"/>
    <!-- Göz boşlukları -->
    <path d="M35 50c3-3 8-3 10 0v10c-2 3-7 3-10 0z" fill="#0f1030"/>
    <path d="M65 50c-3-3-8-3-10 0v10c2 3 7 3 10 0z" fill="#0f1030"/>
    <circle cx="40" cy="55" r="2.3" fill="#7ef0ff"/>
    <circle cx="60" cy="55" r="2.3" fill="#7ef0ff"/>
    <path d="M30 32a24 24 0 0 1 13-9" stroke="#fff6d0" stroke-width="3.2" fill="none"
      stroke-linecap="round" opacity=".55"/>`,

  /** Kanatlı altın kartal amblemi. */
  KARTAL: `
    <ellipse cx="50" cy="52" rx="45" ry="41" fill="url(#y-shine)" opacity=".1"/>
    <path d="M46 34 6 24c-4-1-6 4-2 7 11 8 14 18 11 28 13-2 24-8 31-16z"
      fill="url(#y-gold)" ${OUT}/>
    <path d="M54 34 94 24c4-1 6 4 2 7-11 8-14 18-11 28-13-2-24-8-31-16z"
      fill="url(#y-gold)" ${OUT}/>
    <g stroke="#7a4a04" stroke-width="1.9" opacity=".45" fill="none">
      <path d="M14 28c9 5 19 9 29 11"/><path d="M12 41c9 4 19 7 28 9"/>
      <path d="M86 28c-9 5-19 9-29 11"/><path d="M88 41c-9 4-19 7-28 9"/>
    </g>
    <path d="M50 28c-13 0-19 6-19 16 0 13 7 24 19 34 12-10 19-21 19-34 0-10-6-16-19-16z"
      fill="url(#y-gold2)" ${OUT}/>
    <path d="M50 40l10 10-10 10-10-10z" fill="url(#y-goldDeep)" ${OUT} stroke-width="1.8"/>
    <path d="M43 24c-1-6 2-11 7-13 5 2 8 7 7 13z" fill="url(#y-gold)" ${OUT} stroke-width="2"/>
    <path d="M50 4c-3 3-5 6-5 9h10c0-3-2-6-5-9z" fill="url(#y-gold2)" ${OUT} stroke-width="1.8"/>
    <circle cx="45" cy="17" r="2.2" fill="#2a1502"/>
    <circle cx="55" cy="17" r="2.2" fill="#2a1502"/>
    <path d="M40 74c1 10 4 16 10 22 6-6 9-12 10-22-6 4-14 4-20 0z"
      fill="url(#y-goldDeep)" ${OUT} stroke-width="2"/>`,

  /** Güneş kursu / dümen — altın çember, mavi göbek. */
  KURS: `
    <ellipse cx="50" cy="50" rx="47" ry="47" fill="url(#y-shine)" opacity=".1"/>
    <g fill="url(#y-gold)" ${OUT} stroke-width="1.9">
      <path d="M46 1h8v16h-8z"/><path d="M46 83h8v16h-8z"/>
      <path d="M1 46h16v8H1z"/><path d="M83 46h16v8h-16z"/>
      <path d="M14 8l6-6 11 11-6 6z"/><path d="M69 69l6-6 11 11-6 6z"/>
      <path d="M86 14l-6-6-11 11 6 6z"/><path d="M31 69l-6-6-11 11 6 6z"/>
    </g>
    <g fill="url(#y-gold2)">
      <circle cx="50" cy="8" r="5"/><circle cx="50" cy="92" r="5"/>
      <circle cx="8" cy="50" r="5"/><circle cx="92" cy="50" r="5"/>
      <circle cx="20" cy="20" r="4.2"/><circle cx="80" cy="80" r="4.2"/>
      <circle cx="80" cy="20" r="4.2"/><circle cx="20" cy="80" r="4.2"/>
    </g>
    <circle cx="50" cy="50" r="35" fill="none" stroke="url(#y-gold)" stroke-width="10"/>
    <circle cx="50" cy="50" r="35" fill="none" ${OUT} stroke-width="1.8" opacity=".65"/>
    <circle cx="50" cy="50" r="26" fill="url(#y-boltCore)" stroke="#7a4a04" stroke-width="2.4"/>
    <g fill="url(#y-gold2)" stroke="#7a4a04" stroke-width="1.4">
      <ellipse cx="50" cy="38" rx="4.5" ry="8"/><ellipse cx="50" cy="62" rx="4.5" ry="8"/>
      <ellipse cx="38" cy="50" rx="8" ry="4.5"/><ellipse cx="62" cy="50" rx="8" ry="4.5"/>
      <ellipse cx="41.5" cy="41.5" rx="7" ry="4" transform="rotate(45 41.5 41.5)"/>
      <ellipse cx="58.5" cy="58.5" rx="7" ry="4" transform="rotate(45 58.5 58.5)"/>
      <ellipse cx="58.5" cy="41.5" rx="7" ry="4" transform="rotate(-45 58.5 41.5)"/>
      <ellipse cx="41.5" cy="58.5" rx="7" ry="4" transform="rotate(-45 41.5 58.5)"/>
    </g>
    <circle cx="50" cy="50" r="6" fill="url(#y-gold)" ${OUT} stroke-width="1.8"/>
    <path d="M28 32a26 26 0 0 1 15-10" stroke="#fff6d0" stroke-width="3.2" fill="none"
      stroke-linecap="round" opacity=".6"/>`,

  KOR: hexagon('KOR'),
  MOR: rhombus('MOR'),
  KEHRIBAR: hexagon('KEHRIBAR'),
  ZUMRUT: hexagon('ZUMRUT'),
  GOK: rhombus('GOK'),

  /** Scatter — altın dişli halka içinde mavi yıldırım. */
  SCATTER: goldRing(INNER_BOLT),

  /** Çarpan küresi — aynı halka; değeri arayüzde üstüne basılır. */
  MULT: goldRing(`
    <path d="M60 20 36 56h13l-5 26 24-34H55z" fill="#0a2a66" opacity=".55"/>`)
};

export function buildSprite() {
  const symbols = Object.entries(SHAPES)
    .map(([id, shape]) => `<symbol id="y-sym-${id}" viewBox="0 0 100 100">${shape}</symbol>`)
    .join('');
  return `<svg id="storm-sprite" aria-hidden="true" focusable="false">
    <defs>${GOLD}${GEM_GRADIENTS}</defs>${symbols}</svg>`;
}

export function symbolMarkup(id, extraClass = '') {
  return `<svg class="sym sym-${id} ${extraClass}" viewBox="0 0 100 100"><use href="#y-sym-${id}"/></svg>`;
}

export const SYMBOL_IDS = Object.keys(SHAPES);
