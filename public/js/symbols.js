/**
 * Sembol grafikleri - tamami vektorel (SVG), harici gorsel dosyasi yok.
 * Tek bir <svg> sprite icine <symbol> olarak yerlestirilir, hucreler <use> ile referans verir.
 */

const GRADIENTS = `
<linearGradient id="g-gold" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%" stop-color="#fff3b0"/><stop offset="45%" stop-color="#f6c945"/>
  <stop offset="100%" stop-color="#b8860b"/>
</linearGradient>
<linearGradient id="g-red" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%" stop-color="#ff6b6b"/><stop offset="55%" stop-color="#e01b24"/>
  <stop offset="100%" stop-color="#8c0d13"/>
</linearGradient>
<linearGradient id="g-yellow" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0%" stop-color="#fff9c4"/><stop offset="50%" stop-color="#ffd54a"/>
  <stop offset="100%" stop-color="#e0a800"/>
</linearGradient>
<linearGradient id="g-lemon" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0%" stop-color="#fffbcc"/><stop offset="50%" stop-color="#ffe14d"/>
  <stop offset="100%" stop-color="#d9a406"/>
</linearGradient>
<linearGradient id="g-orange" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0%" stop-color="#ffd08a"/><stop offset="45%" stop-color="#ff9012"/>
  <stop offset="100%" stop-color="#c25c00"/>
</linearGradient>
<linearGradient id="g-plum" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0%" stop-color="#c58bff"/><stop offset="45%" stop-color="#7a2fb5"/>
  <stop offset="100%" stop-color="#3d1163"/>
</linearGradient>
<linearGradient id="g-grape" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0%" stop-color="#a97bff"/><stop offset="50%" stop-color="#6a2bd9"/>
  <stop offset="100%" stop-color="#2f0f66"/>
</linearGradient>
<linearGradient id="g-green" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%" stop-color="#7ee27e"/><stop offset="60%" stop-color="#2e9e37"/>
  <stop offset="100%" stop-color="#155e1c"/>
</linearGradient>
<radialGradient id="g-shine" cx="0.35" cy="0.3" r="0.7">
  <stop offset="0%" stop-color="#ffffff" stop-opacity="0.85"/>
  <stop offset="60%" stop-color="#ffffff" stop-opacity="0"/>
</radialGradient>
<linearGradient id="g-star" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%" stop-color="#fffce0"/><stop offset="40%" stop-color="#ffd54a"/>
  <stop offset="100%" stop-color="#ff8f00"/>
</linearGradient>
`;

const SHAPES = {
  CHERRY: `
    <path d="M52 18c-6 10-18 16-28 22" stroke="#3f8a2f" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M52 18c4 12 12 20 22 26" stroke="#3f8a2f" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M52 18c8-8 20-9 26-4-6 8-17 10-26 4z" fill="url(#g-green)"/>
    <circle cx="32" cy="66" r="17" fill="url(#g-red)"/>
    <circle cx="70" cy="70" r="15" fill="url(#g-red)"/>
    <circle cx="32" cy="66" r="17" fill="url(#g-shine)"/>
    <circle cx="70" cy="70" r="15" fill="url(#g-shine)"/>`,
  LEMON: `
    <ellipse cx="50" cy="52" rx="34" ry="25" transform="rotate(-22 50 52)" fill="url(#g-lemon)"/>
    <path d="M20 40c6-6 14-9 20-9" stroke="#fff8c9" stroke-width="4" fill="none" stroke-linecap="round" opacity=".8"/>
    <path d="M78 33c6-4 10-4 12-1-3 5-8 6-12 1z" fill="url(#g-green)"/>
    <ellipse cx="50" cy="52" rx="34" ry="25" transform="rotate(-22 50 52)" fill="url(#g-shine)"/>`,
  ORANGE: `
    <circle cx="50" cy="56" r="31" fill="url(#g-orange)"/>
    <circle cx="50" cy="56" r="31" fill="url(#g-shine)"/>
    <path d="M50 25c-2-8 2-13 8-14 1 8-2 13-8 14z" fill="url(#g-green)"/>
    <path d="M50 25c3-6 9-8 14-6-3 6-8 8-14 6z" fill="#3f8a2f" opacity=".85"/>`,
  PLUM: `
    <ellipse cx="50" cy="57" rx="29" ry="31" fill="url(#g-plum)"/>
    <path d="M50 27c0 12-3 22-8 30" stroke="#2a0b47" stroke-width="3" fill="none" opacity=".5"/>
    <ellipse cx="50" cy="57" rx="29" ry="31" fill="url(#g-shine)"/>
    <path d="M52 26c6-9 15-12 22-9-4 9-13 13-22 9z" fill="url(#g-green)"/>`,
  BELL: `
    <path d="M50 16c-4 0-7 3-7 6v3c-11 4-18 14-18 26 0 9-2 15-6 20h62c-4-5-6-11-6-20 0-12-7-22-18-26v-3c0-3-3-6-7-6z" fill="url(#g-gold)" stroke="#8a6209" stroke-width="2"/>
    <ellipse cx="50" cy="80" rx="8" ry="7" fill="url(#g-gold)" stroke="#8a6209" stroke-width="2"/>
    <path d="M36 34c-5 6-7 13-7 20" stroke="#fff6c2" stroke-width="4" fill="none" stroke-linecap="round" opacity=".7"/>`,
  GRAPE: `
    <path d="M50 20c8-8 18-9 24-5-6 9-16 11-24 5z" fill="url(#g-green)"/>
    <path d="M50 20v10" stroke="#3f8a2f" stroke-width="4" stroke-linecap="round"/>
    <g fill="url(#g-grape)">
      <circle cx="38" cy="40" r="11"/><circle cx="62" cy="40" r="11"/>
      <circle cx="27" cy="58" r="11"/><circle cx="50" cy="57" r="11"/><circle cx="73" cy="58" r="11"/>
      <circle cx="38" cy="75" r="11"/><circle cx="62" cy="75" r="11"/>
    </g>
    <g fill="url(#g-shine)">
      <circle cx="38" cy="40" r="11"/><circle cx="50" cy="57" r="11"/><circle cx="38" cy="75" r="11"/>
    </g>`,
  MELON: `
    <path d="M12 68a38 38 0 0 1 76 0z" fill="url(#g-green)"/>
    <path d="M18 68a32 32 0 0 1 64 0z" fill="#f4f9e8"/>
    <path d="M22 68a28 28 0 0 1 56 0z" fill="url(#g-red)"/>
    <g fill="#2b0a0a">
      <ellipse cx="40" cy="56" rx="3" ry="4.5"/><ellipse cx="60" cy="56" rx="3" ry="4.5"/>
      <ellipse cx="50" cy="45" rx="3" ry="4.5"/><ellipse cx="31" cy="64" rx="3" ry="4.5"/>
      <ellipse cx="69" cy="64" rx="3" ry="4.5"/>
    </g>`,
  SEVEN: `
    <text x="50" y="78" text-anchor="middle" font-family="Impact, 'Arial Black', sans-serif" font-size="76"
      fill="url(#g-red)" stroke="#ffd54a" stroke-width="3" paint-order="stroke">7</text>`,
  STAR: `
    <path d="M50 10l11 26 28 2-21 18 6 27-24-14-24 14 6-27-21-18 28-2z" fill="url(#g-star)" stroke="#a35c00" stroke-width="2.5"/>
    <path d="M50 22l7 17 18 1-14 12 4 17-15-9-15 9 4-17-14-12 18-1z" fill="#fff7cf" opacity=".55"/>`,
  DOLLAR: `
    <circle cx="50" cy="52" r="34" fill="url(#g-gold)" stroke="#8a6209" stroke-width="3"/>
    <circle cx="50" cy="52" r="26" fill="none" stroke="#8a6209" stroke-width="2" opacity=".5"/>
    <text x="50" y="72" text-anchor="middle" font-family="Georgia, serif" font-weight="bold" font-size="46"
      fill="#7a4a00">$</text>`
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
