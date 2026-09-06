/**
 * MAVİ MERA sembol grafikleri — tamamı vektörel (SVG), harici görsel yok.
 *
 * Dört balık tek bir gövde şablonundan üretilir: silüet aynı, renk paleti,
 * yüzgeç biçimi ve desen farklıdır. Böylece set bir arada bir "tür ailesi"
 * gibi durur ve bir balığın rengini değiştirmek tek satırdır.
 *
 * Çizim ilkeleri (diğer oyunlarla ortak): koyu kontur, çok duraklı gradyan,
 * üst-sol speküler parlama, altta temas gölgesi, üstte ince rim ışığı.
 */

const OUTLINE = 'stroke="#08222e" stroke-width="2.6" stroke-linejoin="round"';

/* ═══════════ Gradyanlar ═══════════ */

const GRADIENTS = `
<linearGradient id="m-gold" x1="0" y1="0" x2="0.3" y2="1">
  <stop offset="0%" stop-color="#fff8d2"/><stop offset="28%" stop-color="#ffdc6a"/>
  <stop offset="58%" stop-color="#e8a916"/><stop offset="100%" stop-color="#8a5a05"/>
</linearGradient>
<linearGradient id="m-wood" x1="0" y1="0" x2="0.2" y2="1">
  <stop offset="0%" stop-color="#b4794a"/><stop offset="45%" stop-color="#8a5228"/>
  <stop offset="100%" stop-color="#4a2a11"/>
</linearGradient>
<linearGradient id="m-steel" x1="0.1" y1="0" x2="0.6" y2="1">
  <stop offset="0%" stop-color="#ffffff"/><stop offset="30%" stop-color="#cfdae4"/>
  <stop offset="65%" stop-color="#7e8f9e"/><stop offset="100%" stop-color="#39434d"/>
</linearGradient>

<linearGradient id="m-lufer" x1="0.1" y1="0" x2="0.4" y2="1">
  <stop offset="0%" stop-color="#dff3ff"/><stop offset="26%" stop-color="#7ec8f2"/>
  <stop offset="58%" stop-color="#2a7fc4"/><stop offset="100%" stop-color="#0d3a63"/>
</linearGradient>
<linearGradient id="m-kirmizi" x1="0.1" y1="0" x2="0.4" y2="1">
  <stop offset="0%" stop-color="#ffd9d2"/><stop offset="26%" stop-color="#ff8a72"/>
  <stop offset="58%" stop-color="#d92f22"/><stop offset="100%" stop-color="#6d0d0a"/>
</linearGradient>
<linearGradient id="m-levrek" x1="0.1" y1="0" x2="0.4" y2="1">
  <stop offset="0%" stop-color="#e8ffd8"/><stop offset="26%" stop-color="#9fd964"/>
  <stop offset="58%" stop-color="#3f8b2e"/><stop offset="100%" stop-color="#153d14"/>
</linearGradient>
<linearGradient id="m-cipura" x1="0.1" y1="0" x2="0.4" y2="1">
  <stop offset="0%" stop-color="#fff1cc"/><stop offset="26%" stop-color="#e8c078"/>
  <stop offset="58%" stop-color="#a97a2c"/><stop offset="100%" stop-color="#4d340c"/>
</linearGradient>
<linearGradient id="m-para" x1="0.1" y1="0" x2="0.4" y2="1">
  <stop offset="0%" stop-color="#fffbe0"/><stop offset="24%" stop-color="#ffe066"/>
  <stop offset="58%" stop-color="#f0a800"/><stop offset="100%" stop-color="#7a4b00"/>
</linearGradient>
<linearGradient id="m-para-MINI" x1="0.1" y1="0" x2="0.4" y2="1">
  <stop offset="0%" stop-color="#dbeafe"/><stop offset="28%" stop-color="#60a5fa"/>
  <stop offset="66%" stop-color="#1d4ed8"/><stop offset="100%" stop-color="#0b1f5c"/>
</linearGradient>
<linearGradient id="m-para-MINOR" x1="0.1" y1="0" x2="0.4" y2="1">
  <stop offset="0%" stop-color="#f0d8ff"/><stop offset="28%" stop-color="#c084fc"/>
  <stop offset="66%" stop-color="#7e22ce"/><stop offset="100%" stop-color="#3b0764"/>
</linearGradient>
<linearGradient id="m-para-MAJOR" x1="0.1" y1="0" x2="0.4" y2="1">
  <stop offset="0%" stop-color="#d6ffe2"/><stop offset="28%" stop-color="#4ade80"/>
  <stop offset="66%" stop-color="#15803d"/><stop offset="100%" stop-color="#052e14"/>
</linearGradient>
<linearGradient id="m-para-GRAND" x1="0.1" y1="0" x2="0.4" y2="1">
  <stop offset="0%" stop-color="#ffd9d9"/><stop offset="28%" stop-color="#f87171"/>
  <stop offset="66%" stop-color="#b91c1c"/><stop offset="100%" stop-color="#450a0a"/>
</linearGradient>

<linearGradient id="m-sky" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%" stop-color="#ffb457"/><stop offset="55%" stop-color="#ff7a3c"/>
  <stop offset="100%" stop-color="#1d3f66"/>
</linearGradient>
<linearGradient id="m-hull" x1="0" y1="0" x2="0.2" y2="1">
  <stop offset="0%" stop-color="#ff8f7a"/><stop offset="40%" stop-color="#d8342a"/>
  <stop offset="100%" stop-color="#6d0f0c"/>
</linearGradient>
<linearGradient id="m-wave" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%" stop-color="#8fd8ff"/><stop offset="100%" stop-color="#1668a8"/>
</linearGradient>
<radialGradient id="m-gloss" cx="0.32" cy="0.24" r="0.5">
  <stop offset="0%" stop-color="#ffffff" stop-opacity="0.62"/>
  <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
</radialGradient>
<linearGradient id="m-rim" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%" stop-color="#ffffff" stop-opacity="0.55"/>
  <stop offset="45%" stop-color="#ffffff" stop-opacity="0"/>
</linearGradient>
<radialGradient id="m-glow" cx="0.5" cy="0.5" r="0.5">
  <stop offset="0%" stop-color="#8fd8ff" stop-opacity="0.35"/>
  <stop offset="100%" stop-color="#8fd8ff" stop-opacity="0"/>
</radialGradient>
`;

/** Zeminde duran her sembolün altına konan temas gölgesi. */
const SHADOW = '<ellipse cx="50" cy="90" rx="33" ry="6" fill="#001621" opacity=".42"/>';

/* ═══════════ Balık şablonu ═══════════ */

/**
 * Ortak balık gövdesi.
 * @param {string} fill    gövde gradyanı
 * @param {string} fin     yüzgeç rengi
 * @param {string} pattern gövdeye basılan desen (çizgi, benek, şerit)
 */
function fish(fill, fin, pattern = '') {
  return `
    ${SHADOW}
    <ellipse cx="50" cy="52" rx="46" ry="34" fill="url(#m-glow)"/>
    <!-- kuyruk -->
    <path d="M18 52 4 34c-2 12-2 24 0 36z" fill="${fin}" ${OUTLINE}/>
    <!-- sırt yüzgeci -->
    <path d="M40 28c6-10 16-15 26-16-2 8-6 13-8 18z" fill="${fin}" ${OUTLINE}/>
    <!-- karın yüzgeci -->
    <path d="M46 72c-3 8-2 14 2 18 4-4 7-9 8-15z" fill="${fin}" ${OUTLINE}/>
    <!-- gövde -->
    <path d="M92 52c-8-14-25-24-44-24S25 38 16 52c9 14 26 24 32 24s36-10 44-24z"
      fill="${fill}" ${OUTLINE}/>
    ${pattern}
    <!-- göğüs yüzgeci -->
    <path d="M62 58c-7 4-11 10-10 16 7-2 13-7 16-13z" fill="${fin}" ${OUTLINE} stroke-width="2"/>
    <!-- solungaç -->
    <path d="M74 34c-6 6-8 12-8 18s2 12 8 18" fill="none" stroke="#08222e"
      stroke-width="2.4" opacity=".55"/>
    <!-- göz -->
    <circle cx="80" cy="45" r="6" fill="#fdfdff" ${OUTLINE} stroke-width="2"/>
    <circle cx="81" cy="45" r="3" fill="#0b1a24"/>
    <circle cx="79.4" cy="43.4" r="1.2" fill="#ffffff"/>
    <!-- ağız -->
    <path d="M92 52c-3 3-7 4-11 4" fill="none" stroke="#08222e" stroke-width="2.4"
      stroke-linecap="round"/>
    <!-- üst rim ışığı + spekülerler -->
    <path d="M92 52c-8-14-25-24-44-24S25 38 16 52c9-9 26-16 32-16s36 7 44 16z"
      fill="url(#m-rim)" opacity=".7"/>
    <ellipse cx="52" cy="40" rx="18" ry="7" fill="url(#m-gloss)"/>
    <ellipse cx="44" cy="38" rx="5" ry="2.2" fill="#ffffff" opacity=".8"/>`;
}

/* ═══════════ Para balığı ═══════════ */

/**
 * Para balığı: altın gövde + değer plakası için boşluk.
 * Değer, hücrenin üstüne HTML etiketi olarak basılır — böylece
 * balık ekranda belirdiği ANDA tutarı da okunur.
 */
function moneyFish(fill, glow = '#ffd45e') {
  return `
    ${SHADOW}
    <ellipse cx="50" cy="50" rx="48" ry="40" fill="url(#m-glow)"/>
    <path d="M18 46 4 28c-2 12-2 24 0 36z" fill="${fill}" ${OUTLINE}/>
    <path d="M40 22c6-10 16-15 26-16-2 8-6 13-8 18z" fill="${fill}" ${OUTLINE}/>
    <path d="M92 46c-8-14-25-24-44-24S25 32 16 46c9 14 26 24 32 24s36-10 44-24z"
      fill="${fill}" ${OUTLINE}/>
    <circle cx="80" cy="39" r="5.5" fill="#fdfdff" ${OUTLINE} stroke-width="2"/>
    <circle cx="81" cy="39" r="2.8" fill="#0b1a24"/>
    <circle cx="79.4" cy="37.6" r="1.1" fill="#ffffff"/>
    <path d="M92 46c-3 3-7 4-11 4" fill="none" stroke="#08222e" stroke-width="2.4"
      stroke-linecap="round"/>
    <!-- pul dokusu -->
    <g fill="none" stroke="#ffffff" stroke-width="1.6" opacity=".35">
      <path d="M34 36c4 4 4 16 0 20M46 32c5 5 5 22 0 27M58 31c5 5 5 24 0 29"/>
    </g>
    <path d="M92 46c-8-14-25-24-44-24S25 32 16 46c9-9 26-16 32-16s36 7 44 16z"
      fill="url(#m-rim)" opacity=".75"/>
    <ellipse cx="50" cy="34" rx="17" ry="6" fill="url(#m-gloss)"/>
    <!-- ışıma halkası: para balığı ekranda hemen fark edilsin -->
    <ellipse cx="50" cy="46" rx="44" ry="30" fill="none" stroke="${glow}"
      stroke-width="2" opacity=".45"/>`;
}

/* ═══════════ Şekiller ═══════════ */

const SHAPES = {
  LUFER: fish(
    'url(#m-lufer)',
    '#1a6ba8',
    `<g fill="#0d3a63" opacity=".45">
       <path d="M30 36c10-4 24-6 38-5-13 2-26 4-38 5zM26 44c14-4 32-6 50-5-17 1-35 3-50 5z"/>
     </g>
     <path d="M20 40c14-8 34-12 52-11" fill="none" stroke="#0b2f52" stroke-width="3.4" opacity=".5"/>`
  ),

  KIRMIZI: fish(
    'url(#m-kirmizi)',
    '#a51a12',
    `<g fill="none" stroke="#8d1410" stroke-width="2.2" opacity=".38">
       <path d="M32 40c3 8 3 16 0 24M44 36c3 10 3 20 0 30M56 35c3 11 3 22 0 32M68 38c3 9 3 18 0 27"/>
     </g>
     <path d="M28 58c14 5 30 6 44 2" fill="none" stroke="#ffffff" stroke-width="2.4" opacity=".3"/>`
  ),

  LEVREK: fish(
    'url(#m-levrek)',
    '#2f6f22',
    `<g fill="#15400f" opacity=".4">
       <circle cx="38" cy="44" r="3.4"/><circle cx="52" cy="40" r="3"/><circle cx="64" cy="46" r="3.2"/>
       <circle cx="46" cy="58" r="3"/><circle cx="60" cy="60" r="2.6"/>
     </g>`
  ),

  CIPURA: fish(
    'url(#m-cipura)',
    '#8a6320',
    `<g fill="none" stroke="#5b3f10" stroke-width="2" opacity=".45">
       <path d="M30 38c2 9 2 18 0 27M42 34c2 11 2 22 0 33M54 33c2 12 2 24 0 35M66 36c2 10 2 20 0 30"/>
     </g>
`
  ),

  /** Martı — direk babasına konmuş, kanadı hafif açık. */
  MARTI: `
    ${SHADOW}
    <rect x="36" y="66" width="28" height="26" rx="3" fill="url(#m-wood)" ${OUTLINE}/>
    <rect x="33" y="62" width="34" height="8" rx="3" fill="url(#m-wood)" ${OUTLINE}/>
    <path d="M50 16c-13 0-22 10-22 23 0 10 5 18 12 23h20c7-5 12-13 12-23 0-13-9-23-22-23z"
      fill="#fdfdff" ${OUTLINE}/>
    <path d="M62 30c9 2 17 9 20 19-9 1-17-2-23-8z" fill="#c9d6e0" ${OUTLINE} stroke-width="2"/>
    <path d="M30 24c-5-3-11-3-16 1 4 4 9 6 15 6z" fill="#c9d6e0" ${OUTLINE} stroke-width="2"/>
    <circle cx="41" cy="28" r="3.4" fill="#0b1a24"/>
    <circle cx="40" cy="27" r="1.1" fill="#ffffff"/>
    <path d="M32 32l-14 4 14 4z" fill="#ffb020" ${OUTLINE} stroke-width="2"/>
    <path d="M40 18c8-2 16 2 20 9" fill="none" stroke="#ffffff" stroke-width="4"
      opacity=".7" stroke-linecap="round"/>`,

  /** Deniz feneri — ışık huzmesi ve kayalık. */
  FENER: `
    ${SHADOW}
    <ellipse cx="50" cy="52" rx="44" ry="40" fill="url(#m-glow)"/>
    <path d="M14 88c8-8 20-12 36-12s28 4 36 12z" fill="#2c3d49" ${OUTLINE}/>
    <path d="M38 78 42 34h16l4 44z" fill="#f4f7fa" ${OUTLINE}/>
    <path d="M42 46h16v10H42zM41 60h18v10H41z" fill="#e0342a" opacity=".9"/>
    <rect x="38" y="28" width="24" height="8" rx="2" fill="#2c3d49" ${OUTLINE} stroke-width="2"/>
    <rect x="42" y="14" width="16" height="14" rx="3" fill="#ffdf7a" ${OUTLINE} stroke-width="2"/>
    <path d="M44 10h12l-2-5h-8z" fill="#2c3d49" ${OUTLINE} stroke-width="2"/>
    <g fill="#ffe9a8" opacity=".55">
      <path d="M58 17 96 6v26z"/><path d="M42 17 4 6v26z"/>
    </g>
    <path d="M40 34h20" stroke="#08222e" stroke-width="2.2" opacity=".5"/>
    <path d="M43 36l3 42" stroke="#ffffff" stroke-width="3" opacity=".55" stroke-linecap="round"/>`,

  /** Olta makarası — gövde, kol ve misina. */
  MAKARA: `
    ${SHADOW}
    <path d="M20 30h40v10H20z" fill="url(#m-steel)" ${OUTLINE}/>
    <path d="M34 40h14v12H34z" fill="#39434d" ${OUTLINE} stroke-width="2"/>
    <circle cx="52" cy="60" r="26" fill="url(#m-steel)" ${OUTLINE}/>
    <circle cx="52" cy="60" r="18" fill="#1f2933" stroke="#08222e" stroke-width="2"/>
    <circle cx="52" cy="60" r="10" fill="url(#m-gold)" ${OUTLINE} stroke-width="2"/>
    <circle cx="52" cy="60" r="4" fill="#39434d"/>
    <path d="M78 60c0 14-12 26-26 26" fill="none" stroke="#cfdae4" stroke-width="4"
      stroke-linecap="round" opacity=".8"/>
    <path d="M74 42c8 2 14 8 14 16" fill="none" stroke="#39434d" stroke-width="5"
      stroke-linecap="round"/>
    <circle cx="88" cy="60" r="6" fill="url(#m-gold)" ${OUTLINE} stroke-width="2"/>
    <path d="M22 32h36" stroke="#ffffff" stroke-width="3" opacity=".55" stroke-linecap="round"/>
    <ellipse cx="44" cy="50" rx="9" ry="4" fill="url(#m-gloss)"/>`,

  /** Sahte yem (rapala) — gövde, yüzgeç ve üç iğneli çengel. */
  YEM: `
    ${SHADOW}
    <path d="M14 26c10-4 18 2 22 10" fill="none" stroke="#cfdae4" stroke-width="2.6"
      stroke-linecap="round" opacity=".8"/>
    <circle cx="34" cy="38" r="4" fill="url(#m-steel)" ${OUTLINE} stroke-width="2"/>
    <path d="M38 44c12-8 30-8 42 0 6 4 8 10 8 14 0 6-4 12-12 16-12 6-28 6-38-2-5-4-8-9-8-14
             0-6 3-10 8-14z" fill="url(#m-hull)" ${OUTLINE}/>
    <path d="M40 58h48" stroke="#ffffff" stroke-width="4" opacity=".6"/>
    <path d="M38 44c12-8 30-8 42 0 6 4 8 10 8 14-4-6-10-10-20-12-12-3-22-3-30-2z"
      fill="#ffffff" opacity=".28"/>
    <circle cx="76" cy="52" r="4.5" fill="#fdfdff" ${OUTLINE} stroke-width="2"/>
    <circle cx="77" cy="52" r="2.2" fill="#0b1a24"/>
    <g fill="none" stroke="url(#m-steel)" stroke-width="3.4" stroke-linecap="round">
      <path d="M50 76c0 6 4 10 9 10s9-4 9-10"/><path d="M59 70v8"/>
      <path d="M40 74c0 5 3 8 7 8"/><path d="M72 74c0 5-3 8-7 8"/>
    </g>
    <ellipse cx="56" cy="50" rx="14" ry="5" fill="url(#m-gloss)"/>`,

  /** Takım kutusu — iki kademeli, tokalı. */
  KUTU: `
    ${SHADOW}
    <path d="M16 46h68v38H16z" fill="#1f6fb2" ${OUTLINE}/>
    <path d="M16 46h68v10H16z" fill="#0f4d80" opacity=".7"/>
    <path d="M12 30h76v18H12z" fill="#e8ecef" ${OUTLINE}/>
    <path d="M12 30h76v6H12z" fill="#ffffff" opacity=".6"/>
    <path d="M38 22h24v9H38z" fill="#39434d" ${OUTLINE} stroke-width="2"/>
    <path d="M42 18h16v6H42z" fill="none" stroke="#39434d" stroke-width="4"
      stroke-linejoin="round"/>
    <rect x="30" y="42" width="12" height="10" rx="2" fill="url(#m-steel)" ${OUTLINE} stroke-width="2"/>
    <rect x="58" y="42" width="12" height="10" rx="2" fill="url(#m-steel)" ${OUTLINE} stroke-width="2"/>
    <path d="M16 64h68" stroke="#0f4d80" stroke-width="3" opacity=".7"/>
    <g fill="#ffd45e" opacity=".9">
      <circle cx="30" cy="74" r="3.4"/><circle cx="42" cy="74" r="3.4"/>
      <circle cx="54" cy="74" r="3.4"/><circle cx="66" cy="74" r="3.4"/>
    </g>
    <path d="M18 48h64" stroke="#ffffff" stroke-width="3" opacity=".35"/>`,

  /** Balıkçı teknesi — WILD. Dalga üstünde, bacalı, WILD flamalı. */
  BALIKCI: `
    <ellipse cx="50" cy="50" rx="50" ry="44" fill="url(#m-glow)"/>
    <!-- gökyüzü kamacığı -->
    <rect x="8" y="22" width="84" height="26" rx="6" fill="url(#m-sky)" opacity=".55"/>
    <!-- direk ve flama -->
    <path d="M46 12v22" stroke="#e8ecef" stroke-width="3" stroke-linecap="round"/>
    <path d="M46 12h22l-6 6 6 6H46z" fill="#e0342a" ${OUTLINE} stroke-width="2"/>
    <!-- güverte yapısı -->
    <path d="M30 36h30v18H30z" fill="#f4f7fa" ${OUTLINE}/>
    <path d="M34 40h9v8h-9zM48 40h9v8h-9z" fill="#2a6f9e"/>
    <path d="M62 30h8v24h-8z" fill="#e8ecef" ${OUTLINE} stroke-width="2"/>
    <!-- tekne gövdesi -->
    <path d="M12 54h74l-8 18c-2 4-6 6-10 6H30c-4 0-8-2-10-6z" fill="url(#m-hull)" ${OUTLINE}/>
    <path d="M14 58h70l-2 5H16z" fill="#ffffff" opacity=".55"/>
    <!-- dalgalar -->
    <path d="M2 80c8-5 14-5 22 0s14 5 22 0 14-5 22 0 14 5 22 0v18H2z"
      fill="url(#m-wave)" ${OUTLINE} stroke-width="2"/>
    <path d="M2 84c8-4 14-4 22 0s14 4 22 0 14-4 22 0 14 4 22 0"
      fill="none" stroke="#ffffff" stroke-width="2.6" opacity=".6"/>
    <!-- WILD bandı -->
    <g transform="translate(0 4)">
      <rect x="8" y="60" width="84" height="18" rx="4" fill="#0b2f52" opacity=".82"/>
      <text x="50" y="74" text-anchor="middle"
        font-family="'Arial Black', Impact, system-ui, sans-serif"
        font-size="17" font-weight="900" letter-spacing="1.5"
        textLength="74" lengthAdjust="spacingAndGlyphs"
        fill="url(#m-gold)" stroke="#08222e" stroke-width="4.5" paint-order="stroke">WILD</text>
    </g>`,

  /** Gemi dümeni — SCATTER. */
  DUMEN: `
    ${SHADOW}
    <ellipse cx="50" cy="46" rx="46" ry="42" fill="url(#m-glow)"/>
    <!-- dış tutamaklar -->
    <g fill="url(#m-wood)" stroke="#08222e" stroke-width="2.4" stroke-linejoin="round">
      <rect x="45" y="2" width="10" height="16" rx="4"/>
      <rect x="45" y="74" width="10" height="16" rx="4"/>
      <rect x="2" y="41" width="16" height="10" rx="4"/>
      <rect x="82" y="41" width="16" height="10" rx="4"/>
      <rect x="14" y="12" width="10" height="16" rx="4" transform="rotate(-45 19 20)"/>
      <rect x="76" y="12" width="10" height="16" rx="4" transform="rotate(45 81 20)"/>
      <rect x="14" y="64" width="10" height="16" rx="4" transform="rotate(45 19 72)"/>
      <rect x="76" y="64" width="10" height="16" rx="4" transform="rotate(-45 81 72)"/>
    </g>
    <!-- parmaklıklar -->
    <g stroke="url(#m-wood)" stroke-width="7" stroke-linecap="round" fill="none">
      <path d="M50 20v52M24 46h52M31 27l38 38M69 27 31 65"/>
    </g>
    <!-- çember -->
    <circle cx="50" cy="46" r="30" fill="none" stroke="#08222e" stroke-width="12"/>
    <circle cx="50" cy="46" r="30" fill="none" stroke="url(#m-wood)" stroke-width="8"/>
    <circle cx="50" cy="46" r="30" fill="none" stroke="#ffffff" stroke-width="1.6" opacity=".35"/>
    <!-- göbek -->
    <circle cx="50" cy="46" r="13" fill="url(#m-gold)" stroke="#08222e" stroke-width="2.4"/>
    <circle cx="50" cy="46" r="6" fill="#4a2a11"/>
    <circle cx="46" cy="42" r="3.4" fill="#ffffff" opacity=".55"/>
    <!-- SCATTER bandı -->
    <rect x="8" y="82" width="84" height="15" rx="4" fill="#0b2f52" opacity=".88"/>
    <text x="50" y="93.5" text-anchor="middle"
      font-family="'Arial Black', Impact, system-ui, sans-serif"
      font-size="12" font-weight="900" letter-spacing="1"
      textLength="74" lengthAdjust="spacingAndGlyphs"
      fill="#ffe9a8" stroke="#08222e" stroke-width="3.4" paint-order="stroke">SCATTER</text>`,

  PARA:       moneyFish('url(#m-para)'),
  PARA_MINI:  moneyFish('url(#m-para-MINI)', '#93c5fd'),
  PARA_MINOR: moneyFish('url(#m-para-MINOR)', '#e9d5ff'),
  PARA_MAJOR: moneyFish('url(#m-para-MAJOR)', '#bbf7d0'),
  PARA_GRAND: moneyFish('url(#m-para-GRAND)', '#fecaca')
};

/** Sunucu sembol kimliği → sprite kimliği (birebir). */
export const SPRITE_ID = Object.fromEntries(Object.keys(SHAPES).map((id) => [id, id]));

/** Para balığının taşıdığı ödüle göre sprite seçer. */
export function moneySprite(cell) {
  if (!cell) return 'PARA';
  return cell.jackpot ? `PARA_${cell.jackpot}` : 'PARA';
}

export function buildSprite() {
  const symbols = Object.entries(SHAPES)
    .map(([id, shape]) => `<symbol id="m-sym-${id}" viewBox="0 0 100 100">${shape}</symbol>`)
    .join('');
  return `<svg id="mera-sprite" aria-hidden="true" focusable="false">
    <defs>${GRADIENTS}</defs>${symbols}</svg>`;
}

export function symbolMarkup(symbolId, extraClass = '') {
  const id = SPRITE_ID[symbolId] || symbolId;
  return `<svg class="sym sym-${id} ${extraClass}" viewBox="0 0 100 100"><use href="#m-sym-${id}"/></svg>`;
}

export const SYMBOL_ORDER = Object.keys(SHAPES);
