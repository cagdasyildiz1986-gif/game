/**
 * Sembol grafikleri - tamami vektorel (SVG), harici gorsel dosyasi yok.
 * Tek bir <svg> sprite icine <symbol> olarak yerlestirilir, hucreler <use> ile referans verir.
 *
 * Cizim ilkeleri: koyu kontur (koyu makara zemininde okunurluk), cok duraklı
 * gradyan (hacim), ust-sol spekuler parlama (isik yonu tutarli), alt ic golge.
 */

export const GRADIENTS = `
<linearGradient id="g-gold" x1="0" y1="0" x2="0.3" y2="1">
  <stop offset="0%" stop-color="#fff8d2"/><stop offset="28%" stop-color="#ffdc6a"/>
  <stop offset="58%" stop-color="#e8a916"/><stop offset="100%" stop-color="#8a5a05"/>
</linearGradient>
<linearGradient id="g-gold-deep" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%" stop-color="#c98f10"/><stop offset="100%" stop-color="#6b4404"/>
</linearGradient>
<radialGradient id="g-cherry" cx="0.34" cy="0.3" r="0.78">
  <stop offset="0%" stop-color="#ff8a8a"/><stop offset="35%" stop-color="#e8232c"/>
  <stop offset="78%" stop-color="#a10d14"/><stop offset="100%" stop-color="#5e050a"/>
</radialGradient>
<linearGradient id="g-red7" x1="0.2" y1="0" x2="0.8" y2="1">
  <stop offset="0%" stop-color="#ff7b7b"/><stop offset="38%" stop-color="#e01b24"/>
  <stop offset="100%" stop-color="#78070d"/>
</linearGradient>
<radialGradient id="g-lemon" cx="0.32" cy="0.26" r="0.85">
  <stop offset="0%" stop-color="#fffde8"/><stop offset="38%" stop-color="#ffe75c"/>
  <stop offset="80%" stop-color="#e0a80a"/><stop offset="100%" stop-color="#8f6603"/>
</radialGradient>
<radialGradient id="g-orange" cx="0.32" cy="0.26" r="0.85">
  <stop offset="0%" stop-color="#ffd9a0"/><stop offset="34%" stop-color="#ff9612"/>
  <stop offset="78%" stop-color="#d05e00"/><stop offset="100%" stop-color="#7d3600"/>
</radialGradient>
<radialGradient id="g-plum" cx="0.33" cy="0.26" r="0.85">
  <stop offset="0%" stop-color="#d8a6ff"/><stop offset="34%" stop-color="#8d3ad0"/>
  <stop offset="76%" stop-color="#4d1585"/><stop offset="100%" stop-color="#26073f"/>
</radialGradient>
<radialGradient id="g-grape" cx="0.32" cy="0.28" r="0.8">
  <stop offset="0%" stop-color="#c9a4ff"/><stop offset="38%" stop-color="#7a34e0"/>
  <stop offset="100%" stop-color="#310f6b"/>
</radialGradient>
<linearGradient id="g-leaf" x1="0" y1="0" x2="0.6" y2="1">
  <stop offset="0%" stop-color="#9bef7a"/><stop offset="45%" stop-color="#3aa83f"/>
  <stop offset="100%" stop-color="#14591b"/>
</linearGradient>
<linearGradient id="g-rind" x1="0" y1="1" x2="0" y2="0">
  <stop offset="0%" stop-color="#1c6b22"/><stop offset="55%" stop-color="#43b643"/>
  <stop offset="100%" stop-color="#7fe07f"/>
</linearGradient>
<linearGradient id="g-flesh" x1="0" y1="1" x2="0.2" y2="0">
  <stop offset="0%" stop-color="#8c0d13"/><stop offset="45%" stop-color="#e8232c"/>
  <stop offset="100%" stop-color="#ff7a72"/>
</linearGradient>
<linearGradient id="g-stem" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0%" stop-color="#6ab84a"/><stop offset="100%" stop-color="#2c6b1e"/>
</linearGradient>
<radialGradient id="g-gloss" cx="0.5" cy="0.5" r="0.5">
  <stop offset="0%" stop-color="#ffffff" stop-opacity="0.98"/>
  <stop offset="45%" stop-color="#ffffff" stop-opacity="0.55"/>
  <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
</radialGradient>
<radialGradient id="g-drop" cx="0.5" cy="0.5" r="0.5">
  <stop offset="0%" stop-color="#000000" stop-opacity="0.6"/>
  <stop offset="70%" stop-color="#000000" stop-opacity="0.22"/>
  <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
</radialGradient>
<linearGradient id="g-rim" x1="0" y1="1" x2="0.4" y2="0">
  <stop offset="0%" stop-color="#ffffff" stop-opacity="0.5"/>
  <stop offset="45%" stop-color="#ffffff" stop-opacity="0"/>
</linearGradient>
<radialGradient id="g-hi" cx="0.5" cy="0.5" r="0.5">
  <stop offset="0%" stop-color="#ffffff" stop-opacity="0.9"/>
  <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
</radialGradient>
<linearGradient id="g-star" x1="0.25" y1="0" x2="0.7" y2="1">
  <stop offset="0%" stop-color="#fffbe0"/><stop offset="30%" stop-color="#ffe066"/>
  <stop offset="65%" stop-color="#ffa900"/><stop offset="100%" stop-color="#c05a00"/>
</linearGradient>
<radialGradient id="g-starglow" cx="0.5" cy="0.5" r="0.5">
  <stop offset="0%" stop-color="#ffe98a" stop-opacity="0.75"/>
  <stop offset="100%" stop-color="#ffb300" stop-opacity="0"/>
</radialGradient>
`;

/** Ortak koyu kontur - koyu zeminde siluet netligi saglar. */
export const OUTLINE = 'stroke="#2b0f00" stroke-width="2.5" stroke-linejoin="round"';

export const SHAPES = {
  CHERRY: `
    <path d="M50 20c-8 11-20 18-27 25" ${OUTLINE} stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M50 20c5 12 13 20 21 26" ${OUTLINE} stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M50 20c-8 11-20 18-27 25" stroke="url(#g-stem)" stroke-width="3.4" fill="none" stroke-linecap="round"/>
    <path d="M50 20c5 12 13 20 21 26" stroke="url(#g-stem)" stroke-width="3.4" fill="none" stroke-linecap="round"/>
    <path d="M50 20c9-10 23-11 30-5-7 10-20 12-30 5z" fill="url(#g-leaf)" ${OUTLINE}/>
    <path d="M53 18c8-3 16-3 22 0" stroke="#1a6b22" stroke-width="1.6" fill="none" opacity=".7"/>
    <ellipse cx="50" cy="90" rx="34" ry="8" fill="url(#g-drop)"/>
    <circle cx="32" cy="68" r="18" fill="url(#g-cherry)" ${OUTLINE}/>
    <circle cx="71" cy="71" r="15" fill="url(#g-cherry)" ${OUTLINE}/>
    <circle cx="32" cy="68" r="18" fill="url(#g-rim)"/>
    <circle cx="71" cy="71" r="15" fill="url(#g-rim)"/>
    <ellipse cx="25" cy="59" rx="8.5" ry="6" fill="url(#g-gloss)" transform="rotate(-34 25 59)"/>
    <ellipse cx="65" cy="64" rx="6.5" ry="4.6" fill="url(#g-gloss)" transform="rotate(-34 65 64)"/>
    <ellipse cx="22.5" cy="57" rx="3.4" ry="2" fill="#ffffff" opacity=".95" transform="rotate(-34 22.5 57)"/>
    <ellipse cx="63" cy="62.5" rx="2.6" ry="1.6" fill="#ffffff" opacity=".9" transform="rotate(-34 63 62.5)"/>`,

  LEMON: `
    <ellipse cx="50" cy="88" rx="32" ry="7.5" fill="url(#g-drop)"/>
    <g transform="rotate(-20 50 54)">
      <ellipse cx="50" cy="54" rx="35" ry="25" fill="url(#g-lemon)" ${OUTLINE}/>
      <path d="M85 54c3 0 5-1 6-3-2-3-4-4-6-4z" fill="url(#g-lemon)" ${OUTLINE} stroke-width="2"/>
      <path d="M15 54c-3 0-5-1-6-3 2-3 4-4 6-4z" fill="url(#g-lemon)" ${OUTLINE} stroke-width="2"/>
      <g fill="#c48f04" opacity=".35">
        <circle cx="34" cy="46" r="1.5"/><circle cx="46" cy="42" r="1.5"/>
        <circle cx="58" cy="45" r="1.5"/><circle cx="40" cy="60" r="1.5"/>
        <circle cx="54" cy="63" r="1.5"/><circle cx="66" cy="55" r="1.5"/>
      </g>
      <ellipse cx="50" cy="54" rx="35" ry="25" fill="url(#g-rim)"/>
      <ellipse cx="35" cy="41" rx="15" ry="7.5" fill="url(#g-gloss)" transform="rotate(-18 35 41)"/>
      <ellipse cx="31" cy="39" rx="7" ry="3" fill="#ffffff" opacity=".95" transform="rotate(-18 31 39)"/>
    </g>
    <path d="M74 27c7-6 15-7 20-4-5 8-14 10-20 4z" fill="url(#g-leaf)" ${OUTLINE} stroke-width="2"/>`,

  ORANGE: `
    <ellipse cx="50" cy="90" rx="30" ry="7" fill="url(#g-drop)"/>
    <circle cx="50" cy="57" r="31" fill="url(#g-orange)" ${OUTLINE}/>
    <circle cx="50" cy="57" r="31" fill="url(#g-rim)"/>
    <g fill="#a34a00" opacity=".28">
      <circle cx="38" cy="48" r="1.7"/><circle cx="52" cy="44" r="1.7"/><circle cx="63" cy="52" r="1.7"/>
      <circle cx="36" cy="64" r="1.7"/><circle cx="50" cy="70" r="1.7"/><circle cx="64" cy="66" r="1.7"/>
      <circle cx="46" cy="57" r="1.7"/>
    </g>
    <ellipse cx="38" cy="42" rx="14" ry="8.5" fill="url(#g-gloss)" transform="rotate(-28 38 42)"/>
    <ellipse cx="34" cy="39" rx="6" ry="3" fill="#ffffff" opacity=".95" transform="rotate(-28 34 39)"/>
    <path d="M50 27c-1-6 1-10 5-11 1 6-1 10-5 11z" fill="url(#g-stem)" ${OUTLINE} stroke-width="2"/>
    <path d="M51 26c6-8 16-10 23-7-5 9-15 12-23 7z" fill="url(#g-leaf)" ${OUTLINE} stroke-width="2"/>
    <path d="M55 24c6-3 12-4 17-3" stroke="#14591b" stroke-width="1.5" fill="none" opacity=".6"/>`,

  PLUM: `
    <ellipse cx="50" cy="90" rx="29" ry="7" fill="url(#g-drop)"/>
    <ellipse cx="50" cy="58" rx="30" ry="32" fill="url(#g-plum)" ${OUTLINE}/>
    <ellipse cx="50" cy="58" rx="30" ry="32" fill="url(#g-rim)"/>
    <path d="M50 26c-4 13-5 26-2 38" stroke="#2a0b47" stroke-width="3" fill="none" opacity=".55" stroke-linecap="round"/>
    <ellipse cx="36" cy="42" rx="13" ry="8" fill="url(#g-gloss)" transform="rotate(-32 36 42)"/>
    <ellipse cx="32.5" cy="39" rx="5.5" ry="2.8" fill="#ffffff" opacity=".9" transform="rotate(-32 32.5 39)"/>
    <path d="M52 27c7-10 18-13 25-10-5 11-16 15-25 10z" fill="url(#g-leaf)" ${OUTLINE} stroke-width="2"/>
    <path d="M57 24c6-4 12-5 17-4" stroke="#14591b" stroke-width="1.5" fill="none" opacity=".6"/>`,

  BELL: `
    <path d="M50 15c-5 0-8 3-8 7v3c-12 5-19 15-19 27 0 9-2 15-6 20h66c-4-5-6-11-6-20 0-12-7-22-19-27v-3c0-4-3-7-8-7z"
      fill="url(#g-gold)" ${OUTLINE}/>
    <path d="M23 72h54" stroke="#8a5a05" stroke-width="2.5" opacity=".65"/>
    <ellipse cx="50" cy="82" rx="9" ry="8" fill="url(#g-gold)" ${OUTLINE}/>
    <ellipse cx="47" cy="79" rx="3" ry="2.4" fill="url(#g-hi)"/>
    <path d="M36 32c-6 7-9 15-9 23" stroke="#fff6c2" stroke-width="5" fill="none" stroke-linecap="round" opacity=".55"/>
    <circle cx="50" cy="15" r="5" fill="url(#g-gold)" ${OUTLINE} stroke-width="2"/>
    <path d="M72 26l3 5 5 3-5 3-3 5-3-5-5-3 5-3z" fill="#fff6c2" opacity=".9"/>`,

  GRAPE: `
    <path d="M50 18v12" stroke="url(#g-stem)" stroke-width="5" stroke-linecap="round"/>
    <path d="M50 18v12" ${OUTLINE} stroke-width="6.5" fill="none" stroke-linecap="round" opacity=".35"/>
    <path d="M50 19c9-10 21-11 28-6-7 10-19 12-28 6z" fill="url(#g-leaf)" ${OUTLINE} stroke-width="2"/>
    <path d="M55 16c7-3 14-4 20-2" stroke="#14591b" stroke-width="1.5" fill="none" opacity=".6"/>
    <ellipse cx="50" cy="90" rx="31" ry="7" fill="url(#g-drop)"/>
    <g fill="url(#g-grape)" ${OUTLINE} stroke-width="2">
      <circle cx="38" cy="41" r="11.5"/><circle cx="62" cy="41" r="11.5"/>
      <circle cx="27" cy="59" r="11.5"/><circle cx="50" cy="58" r="11.5"/><circle cx="73" cy="59" r="11.5"/>
      <circle cx="38" cy="76" r="11.5"/><circle cx="62" cy="76" r="11.5"/>
    </g>
    <g fill="url(#g-gloss)">
      <ellipse cx="34" cy="36.5" rx="5.6" ry="4" transform="rotate(-30 34 36.5)"/>
      <ellipse cx="58" cy="36.5" rx="5.6" ry="4" transform="rotate(-30 58 36.5)"/>
      <ellipse cx="23" cy="54.5" rx="5.6" ry="4" transform="rotate(-30 23 54.5)"/>
      <ellipse cx="46" cy="53.5" rx="5.6" ry="4" transform="rotate(-30 46 53.5)"/>
      <ellipse cx="69" cy="54.5" rx="5.6" ry="4" transform="rotate(-30 69 54.5)"/>
      <ellipse cx="34" cy="71.5" rx="5.6" ry="4" transform="rotate(-30 34 71.5)"/>
      <ellipse cx="58" cy="71.5" rx="5.6" ry="4" transform="rotate(-30 58 71.5)"/>
    </g>
    <g fill="#ffffff" opacity=".92">
      <ellipse cx="32.5" cy="35" rx="2.4" ry="1.5" transform="rotate(-30 32.5 35)"/>
      <ellipse cx="56.5" cy="35" rx="2.4" ry="1.5" transform="rotate(-30 56.5 35)"/>
      <ellipse cx="44.5" cy="52" rx="2.4" ry="1.5" transform="rotate(-30 44.5 52)"/>
    </g>`,

  MELON: `
    <ellipse cx="50" cy="76" rx="40" ry="7" fill="url(#g-drop)"/>
    <path d="M11 70a39 39 0 0 1 78 0z" fill="url(#g-rind)" ${OUTLINE}/>
    <path d="M18 70a32 32 0 0 1 64 0z" fill="#f6fbe9" stroke="#1c6b22" stroke-width="1.5"/>
    <path d="M22 70a28 28 0 0 1 56 0z" fill="url(#g-flesh)" stroke="#8c0d13" stroke-width="1.5"/>
    <g fill="#2b0a0a">
      <ellipse cx="39" cy="57" rx="3" ry="4.6" transform="rotate(-12 39 57)"/>
      <ellipse cx="61" cy="57" rx="3" ry="4.6" transform="rotate(12 61 57)"/>
      <ellipse cx="50" cy="46" rx="3" ry="4.6"/>
      <ellipse cx="30" cy="65" rx="3" ry="4.6" transform="rotate(-22 30 65)"/>
      <ellipse cx="70" cy="65" rx="3" ry="4.6" transform="rotate(22 70 65)"/>
    </g>
    <path d="M27 63a26 26 0 0 1 14-16" stroke="#ffc7c1" stroke-width="4" fill="none"
      opacity=".75" stroke-linecap="round"/>
    <path d="M30 66a22 22 0 0 1 9-11" stroke="#ffffff" stroke-width="2" fill="none"
      opacity=".7" stroke-linecap="round"/>
    <path d="M13 70h74" stroke="#2b0f00" stroke-width="2.5" stroke-linecap="round"/>`,

  SEVEN: `
    <text x="51" y="80" text-anchor="middle" font-family="Impact, 'Arial Black', Haettenschweiler, sans-serif"
      font-size="80" fill="#3a0206" opacity=".55">7</text>
    <text x="50" y="78" text-anchor="middle" font-family="Impact, 'Arial Black', Haettenschweiler, sans-serif"
      font-size="80" fill="url(#g-red7)" stroke="url(#g-gold)" stroke-width="4" paint-order="stroke">7</text>
    <text x="50" y="78" text-anchor="middle" font-family="Impact, 'Arial Black', Haettenschweiler, sans-serif"
      font-size="80" fill="none" stroke="#2b0f00" stroke-width="1.2" paint-order="stroke" opacity=".8">7</text>
    <path d="M34 30h30l-4 9H36z" fill="#ffffff" opacity=".28"/>`,

  STAR: `
    <circle cx="50" cy="50" r="46" fill="url(#g-starglow)"/>
    <path d="M50 8l12 27 29 2.5-22 19.5 6.5 28.5L50 70 24.5 85.5 31 57 9 37.5 38 35z"
      fill="url(#g-star)" ${OUTLINE}/>
    <path d="M50 21l7.5 17 18.5 1.5-14 12.5 4 18L50 61l-16 9 4-18-14-12.5L42.5 38z"
      fill="#fffbe0" opacity=".5"/>
    <path d="M42 26l5-11 5 11-5 4z" fill="#ffffff" opacity=".55"/>`,

  DOLLAR: `
    <g class="scatter-burst">
      <path d="M50 2l5.5 14.5L70 8l-2.5 15.5L82 18l-9.5 12.5L88 32l-13.5 8L88 48l-15.5 1.5L82 62l-14.5-5L70 72l-14.5-8.5L50 78l-5.5-14.5L30 72l2.5-15.5L18 62l9.5-13L12 48l13.5-8L12 32l15.5-1.5L18 18l14.5 5L30 8l14.5 8.5z"
        fill="url(#g-star)" opacity=".55"/>
    </g>
    <circle cx="50" cy="44" r="30" fill="url(#g-gold-deep)" ${OUTLINE}/>
    <circle cx="50" cy="42" r="28" fill="url(#g-gold)" stroke="#8a5a05" stroke-width="2"/>
    <circle cx="50" cy="42" r="23" fill="none" stroke="#8a5a05" stroke-width="1.8" opacity=".5"/>
    <text x="50" y="57" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif"
      font-weight="bold" font-size="38" fill="#6b4404">$</text>
    <text x="49" y="56" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif"
      font-weight="bold" font-size="38" fill="#ffeaa0">$</text>
    <path d="M32 28a26 26 0 0 1 17-11" stroke="#fff8d2" stroke-width="3.5" fill="none"
      stroke-linecap="round" opacity=".7"/>

    <!-- SCATTER kurdelesi: sembolu digerlerinden aninda ayirir -->
    <path d="M8 72h84l-6 11H14z" fill="url(#g-red7)" ${OUTLINE} stroke-width="2"/>
    <path d="M8 72l-4 5 4 6z" fill="#78070d"/>
    <path d="M92 72l4 5-4 6z" fill="#78070d"/>
    <text x="50" y="81.5" text-anchor="middle"
      font-family="'Arial Black', Impact, system-ui, sans-serif"
      font-size="10.5" font-weight="900" letter-spacing="1.1"
      textLength="66" lengthAdjust="spacingAndGlyphs"
      fill="#fff6d8" stroke="#5e050a" stroke-width="2.4" paint-order="stroke">SCATTER</text>`
};

export function buildSprite() {
  const symbols = Object.entries(SHAPES)
    .map(([id, shape]) => `<symbol id="sym-${id}" viewBox="0 0 100 100">${shape}</symbol>`)
    .join('');
  return `<svg id="sprite" aria-hidden="true" focusable="false"><defs>${GRADIENTS}</defs>${symbols}</svg>`;
}

export function symbolMarkup(id) {
  return `<svg class="sym sym-${id}" viewBox="0 0 100 100"><use href="#sym-${id}"/></svg>`;
}

export const SYMBOL_ORDER = Object.keys(SHAPES);
