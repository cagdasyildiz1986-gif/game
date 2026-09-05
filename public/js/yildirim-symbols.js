/**
 * YILDIRIM · Göklerin Öfkesi — sembol grafikleri.
 *
 * Tema: Anadolu fırtına tanrısı (Hitit/Luvi Tarhun) ikonografisi.
 * Yüksek semboller PATİNALI BRONZ kabartma, alçak semboller FASETLİ TAŞ.
 * Bu oyunun görsel dili diğer slotlardan bilerek ayrıdır: sıcak altın/meyve
 * yerine gece-fırtına paleti (indigo, mor, elektrik mavisi, yeşil patina).
 *
 * Tamamı vektöreldir; harici görsel dosyası yoktur.
 */

const GRADIENTS = `
<linearGradient id="y-bronze" x1="0.15" y1="0" x2="0.75" y2="1">
  <stop offset="0%" stop-color="#ffe9b8"/><stop offset="26%" stop-color="#e0b268"/>
  <stop offset="62%" stop-color="#9c6d2a"/><stop offset="100%" stop-color="#4a2f0e"/>
</linearGradient>
<linearGradient id="y-bronze2" x1="0.2" y1="0" x2="0.8" y2="1">
  <stop offset="0%" stop-color="#f6dca8"/><stop offset="34%" stop-color="#c99a4e"/>
  <stop offset="100%" stop-color="#5c3c14"/>
</linearGradient>
<linearGradient id="y-patina" x1="0" y1="0" x2="0.6" y2="1">
  <stop offset="0%" stop-color="#a8e8d0"/><stop offset="45%" stop-color="#3f9c85"/>
  <stop offset="100%" stop-color="#11463c"/>
</linearGradient>
<linearGradient id="y-bolt" x1="0.3" y1="0" x2="0.7" y2="1">
  <stop offset="0%" stop-color="#ffffff"/><stop offset="30%" stop-color="#bdf0ff"/>
  <stop offset="62%" stop-color="#3ec6ff"/><stop offset="100%" stop-color="#0a63b8"/>
</linearGradient>
<radialGradient id="y-boltglow" cx="0.5" cy="0.5" r="0.5">
  <stop offset="0%" stop-color="#cdf3ff" stop-opacity="0.85"/>
  <stop offset="55%" stop-color="#38b6ff" stop-opacity="0.3"/>
  <stop offset="100%" stop-color="#1348a8" stop-opacity="0"/>
</radialGradient>
<radialGradient id="y-orb" cx="0.36" cy="0.3" r="0.78">
  <stop offset="0%" stop-color="#ffffff"/><stop offset="22%" stop-color="#c9f2ff"/>
  <stop offset="58%" stop-color="#4aa8ff"/><stop offset="100%" stop-color="#12256e"/>
</radialGradient>
<radialGradient id="y-orbglow" cx="0.5" cy="0.5" r="0.5">
  <stop offset="0%" stop-color="#9fe4ff" stop-opacity="0.7"/>
  <stop offset="100%" stop-color="#2f6bff" stop-opacity="0"/>
</radialGradient>
<radialGradient id="y-shine" cx="0.5" cy="0.5" r="0.5">
  <stop offset="0%" stop-color="#ffffff" stop-opacity="0.92"/>
  <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
</radialGradient>
`;

/** Koyu kontur — gece zemininde siluet netliği. */
const OUT = 'stroke="#0d0820" stroke-width="2.6" stroke-linejoin="round"';

/* ═══════════ Fasetli taş üreticisi ═══════════ */

/**
 * Alçak semboller tek bir altıgen fasetli taş şablonundan üretilir;
 * her renk kendi gradyanını alır. Böylece beş taş aynı aileden görünür.
 */
function gemGradients(id, light, mid, deep, shadow) {
  return `
<linearGradient id="y-${id}-a" x1="0.2" y1="0" x2="0.7" y2="1">
  <stop offset="0%" stop-color="${light}"/><stop offset="55%" stop-color="${mid}"/>
  <stop offset="100%" stop-color="${deep}"/>
</linearGradient>
<linearGradient id="y-${id}-b" x1="0.8" y1="0.1" x2="0.2" y2="1">
  <stop offset="0%" stop-color="${mid}"/><stop offset="100%" stop-color="${shadow}"/>
</linearGradient>`;
}

const GEMS = {
  KOR:      ['#ffd2c2', '#ff5a3c', '#c01808', '#5c0602'],
  MOR:      ['#e6ccff', '#a855f7', '#5b1fa8', '#25073f'],
  KEHRIBAR: ['#fff2c2', '#ffc233', '#c07800', '#5c3600'],
  ZUMRUT:   ['#ccffe0', '#2ecf7a', '#0d8348', '#02341d'],
  GOK:      ['#cfeaff', '#3aa0ff', '#1450c4', '#04164f']
};

const GEM_GRADIENTS = Object.entries(GEMS)
  .map(([id, [l, m, d, s]]) => gemGradients(id, l, m, d, s))
  .join('');

/** Altıgen fasetli taş — üst yüz açık, alt yüzler koyu, sert parlama. */
function gem(id) {
  return `
    <ellipse cx="50" cy="54" rx="40" ry="38" fill="url(#y-shine)" opacity=".1"/>
    <path d="M50 12 84 33v42L50 96 16 75V33z" fill="url(#y-${id}-b)" ${OUT}/>
    <path d="M50 12 84 33 50 52 16 33z" fill="url(#y-${id}-a)" stroke="#0d0820" stroke-width="1.6"/>
    <path d="M16 33 50 52v44L16 75z" fill="url(#y-${id}-a)" opacity=".72"
      stroke="#0d0820" stroke-width="1.6"/>
    <path d="M50 52 84 33v42L50 96z" fill="url(#y-${id}-b)" opacity=".9"
      stroke="#0d0820" stroke-width="1.6"/>
    <path d="M26 34 50 20l10 6-24 14z" fill="#ffffff" opacity=".5"/>
    <path d="M60 62l16-10v18l-16 10z" fill="#ffffff" opacity=".14"/>`;
}

/* ═══════════ Şekiller ═══════════ */

const SHAPES = {
  /** Boğa — fırtına tanrısının kutsal hayvanı, en yüksek sembol. */
  BOGA: `
    <ellipse cx="50" cy="56" rx="43" ry="39" fill="url(#y-shine)" opacity=".08"/>
    <!-- Boynuzlar: kalın kökten sivri uca daralan hilaller -->
    <path d="M31 36C21 31 10 28 3 17c1 15 10 25 27 30z" fill="url(#y-bronze)" ${OUT}/>
    <path d="M69 36c10-5 21-8 28-19-1 15-10 25-27 30z" fill="url(#y-bronze)" ${OUT}/>
    <!-- Kulaklar -->
    <ellipse cx="24" cy="50" rx="9" ry="6" transform="rotate(-22 24 50)"
      fill="url(#y-bronze2)" ${OUT} stroke-width="2"/>
    <ellipse cx="76" cy="50" rx="9" ry="6" transform="rotate(22 76 50)"
      fill="url(#y-bronze2)" ${OUT} stroke-width="2"/>
    <!-- Baş -->
    <path d="M50 28c-16 0-24 10-24 24 0 12 6 22 14 28 4 4 16 4 20 0 8-6 14-16 14-28
             0-14-8-24-24-24z" fill="url(#y-bronze)" ${OUT}/>
    <!-- Alın tüyü -->
    <path d="M42 34c3-4 5-6 8-7 3 1 5 3 8 7-5-2-11-2-16 0z" fill="#4a2f0e" opacity=".55"/>
    <!-- Gözler -->
    <path d="M34 50c2-4 8-5 11-2 1 3-1 6-5 6-3 0-6-2-6-4z" fill="#0d0820"/>
    <path d="M66 50c-2-4-8-5-11-2-1 3 1 6 5 6 3 0 6-2 6-4z" fill="#0d0820"/>
    <circle cx="39" cy="49" r="2.4" fill="#7ef0ff"/>
    <circle cx="61" cy="49" r="2.4" fill="#7ef0ff"/>
    <!-- Burun -->
    <ellipse cx="50" cy="72" rx="14" ry="10" fill="url(#y-bronze2)" ${OUT} stroke-width="2"/>
    <ellipse cx="44" cy="70" rx="3.2" ry="2.4" fill="#0d0820"/>
    <ellipse cx="56" cy="70" rx="3.2" ry="2.4" fill="#0d0820"/>
    <path d="M44 78c4 2 8 2 12 0" stroke="#0d0820" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M34 36c-3 5-4 9-4 14" stroke="#fff3d0" stroke-width="3" fill="none"
      stroke-linecap="round" opacity=".4"/>`,


  /** Çift balta (labrys) — fırtına tanrısının silahı. */
  BALTA: `
    <ellipse cx="50" cy="50" rx="42" ry="42" fill="url(#y-shine)" opacity=".08"/>
    <rect x="46" y="5" width="8" height="90" rx="4" fill="url(#y-bronze2)" ${OUT}/>
    <!-- Ağızlar sapa dar bağlanır, dışa doğru hilal gibi açılır -->
    <path d="M46 42C34 30 22 21 9 16c11 17 11 51 0 68 13-5 25-14 37-26z"
      fill="url(#y-patina)" ${OUT}/>
    <path d="M54 42c12-12 24-21 37-26-11 17-11 51 0 68-13-5-25-14-37-26z"
      fill="url(#y-patina)" ${OUT}/>
    <path d="M42 42C32 33 22 26 13 22c7 15 7 41 0 56 9-4 19-11 29-20" fill="none"
      stroke="#d9fff0" stroke-width="2.4" opacity=".35"/>
    <path d="M58 42c10-9 20-16 29-20-7 15-7 41 0 56-9-4-19-11-29-20" fill="none"
      stroke="#082e28" stroke-width="2.4" opacity=".4"/>
    <circle cx="50" cy="50" r="9" fill="url(#y-bronze)" ${OUT} stroke-width="2"/>
    <circle cx="50" cy="50" r="3.2" fill="#0d0820"/>
    <path d="M48 8h4v22h-4z" fill="#fff3d0" opacity=".35"/>`,



  /** Çift başlı kartal — Anadolu mühür ve kabartmalarının klasik amblemi. */
  KARTAL: `
    <ellipse cx="50" cy="52" rx="44" ry="41" fill="url(#y-shine)" opacity=".08"/>
    <!-- Dolu gövdeli, alt kenarı dalgalı geniş kanatlar -->
    <path d="M46 31 8 25c-4-1-6 4-3 6 10 7 13 16 11 25 12-1 23-6 30-13z"
      fill="url(#y-bronze)" ${OUT}/>
    <path d="M54 31 92 25c4-1 6 4 3 6-10 7-13 16-11 25-12-1-23-6-30-13z"
      fill="url(#y-bronze)" ${OUT}/>
    <g stroke="#4a2f0e" stroke-width="1.8" opacity=".4" fill="none">
      <path d="M14 28c8 4 18 8 28 10"/><path d="M12 40c8 4 18 7 27 9"/>
      <path d="M86 28c-8 4-18 8-28 10"/><path d="M88 40c-8 4-18 7-27 9"/>
    </g>
    <!-- Geniş kalkan gövde -->
    <path d="M50 30c-14 0-20 6-20 16 0 12 7 22 20 30 13-8 20-18 20-30 0-10-6-16-20-16z"
      fill="url(#y-bronze2)" ${OUT}/>
    <path d="M50 40l9 9-9 9-9-9z" fill="url(#y-patina)" ${OUT} stroke-width="1.8"/>
    <!-- Kalın S boyunlar ve dışa dönük iki baş -->
    <path d="M46 32c-3-5-4-9-3-13l-8-1c-1 6 1 11 4 16z" fill="url(#y-bronze)" ${OUT} stroke-width="2.2"/>
    <path d="M54 32c3-5 4-9 3-13l8-1c1 6-1 11-4 16z" fill="url(#y-bronze)" ${OUT} stroke-width="2.2"/>
    <path d="M38 20c0-6 4-10 9-10 4 0 6 3 6 7 0 5-4 9-9 9-4 0-6-2-6-6z"
      fill="url(#y-bronze)" ${OUT} stroke-width="2.2"/>
    <path d="M62 20c0-6-4-10-9-10-4 0-6 3-6 7 0 5 4 9 9 9 4 0 6-2 6-6z"
      fill="url(#y-bronze)" ${OUT} stroke-width="2.2"/>
    <path d="M40 12c-4-3-9-4-13-2 3 4 8 6 13 5z" fill="url(#y-bronze2)" ${OUT} stroke-width="1.8"/>
    <path d="M60 12c4-3 9-4 13-2-3 4-8 6-13 5z" fill="url(#y-bronze2)" ${OUT} stroke-width="1.8"/>
    <circle cx="44" cy="15" r="2.6" fill="#0d0820"/>
    <circle cx="56" cy="15" r="2.6" fill="#0d0820"/>
    <circle cx="43.2" cy="14.2" r="1.1" fill="#7ef0ff"/>
    <circle cx="55.2" cy="14.2" r="1.1" fill="#7ef0ff"/>
    <!-- Yelpaze kuyruk -->
    <path d="M39 72c1 11 4 18 11 25 7-7 10-14 11-25-7 4-15 4-22 0z"
      fill="url(#y-patina)" ${OUT} stroke-width="2.2"/>
    <g stroke="#082e28" stroke-width="1.6" opacity=".5" fill="none">
      <path d="M45 76l-1 16"/><path d="M50 77v17"/><path d="M55 76l1 16"/>
    </g>`,





  /** Güneş kursu — Anadolu'nun en tanınmış tunç eseri. */
  KURS: `
    <ellipse cx="50" cy="50" rx="46" ry="46" fill="url(#y-shine)" opacity=".08"/>
    <g stroke="url(#y-bronze)" stroke-width="5.5" stroke-linecap="round" fill="none">
      <path d="M50 3v13"/><path d="M50 84v13"/><path d="M3 50h13"/><path d="M84 50h13"/>
      <path d="M17 17l9 9"/><path d="M74 74l9 9"/><path d="M83 17l-9 9"/><path d="M26 74l-9 9"/>
    </g>
    <circle cx="50" cy="50" r="34" fill="none" stroke="url(#y-bronze)" stroke-width="8"/>
    <circle cx="50" cy="50" r="34" fill="none" ${OUT} stroke-width="2" opacity=".55"/>
    <circle cx="50" cy="50" r="24" fill="none" stroke="url(#y-patina)" stroke-width="5"/>
    <!-- Merkez gül biçimi (sekiz yapraklı güneş rozeti) -->
    <g fill="url(#y-bronze2)" ${OUT} stroke-width="1.8">
      <ellipse cx="50" cy="36" rx="5" ry="9"/><ellipse cx="50" cy="64" rx="5" ry="9"/>
      <ellipse cx="36" cy="50" rx="9" ry="5"/><ellipse cx="64" cy="50" rx="9" ry="5"/>
      <ellipse cx="40" cy="40" rx="7.5" ry="4.5" transform="rotate(45 40 40)"/>
      <ellipse cx="60" cy="60" rx="7.5" ry="4.5" transform="rotate(45 60 60)"/>
      <ellipse cx="60" cy="40" rx="7.5" ry="4.5" transform="rotate(-45 60 40)"/>
      <ellipse cx="40" cy="60" rx="7.5" ry="4.5" transform="rotate(-45 40 60)"/>
    </g>
    <circle cx="50" cy="50" r="6" fill="url(#y-bronze)" ${OUT} stroke-width="2"/>
    <circle cx="48.5" cy="48.5" r="2" fill="#7ef0ff"/>
    <g fill="url(#y-bronze)">
      <circle cx="50" cy="13" r="4"/><circle cx="50" cy="87" r="4"/>
      <circle cx="13" cy="50" r="4"/><circle cx="87" cy="50" r="4"/>
    </g>`,


  KOR: gem('KOR'),
  MOR: gem('MOR'),
  KEHRIBAR: gem('KEHRIBAR'),
  ZUMRUT: gem('ZUMRUT'),
  GOK: gem('GOK'),

  /** Scatter — oyunun adını taşıyan yıldırım. */
  SCATTER: `
    <ellipse cx="50" cy="50" rx="48" ry="48" fill="url(#y-boltglow)"/>
    <g class="storm-arc" stroke="#8fe4ff" stroke-width="2" fill="none" opacity=".7"
       stroke-linecap="round">
      <path d="M22 20l6 9-5 4 8 7"/><path d="M78 20l-6 9 5 4-8 7"/>
      <path d="M20 78l7-8-4-5 9-6"/><path d="M80 78l-7-8 4-5-9-6"/>
    </g>
    <path d="M58 4 26 54h18l-6 42 32-52H52z" fill="#04204a" opacity=".7"
      transform="translate(2.5 3)"/>
    <path d="M58 4 26 54h18l-6 42 32-52H52z" fill="url(#y-bolt)" ${OUT}/>
    <path d="M55 14 36 46h11l-3 22" fill="none" stroke="#ffffff" stroke-width="3"
      opacity=".65" stroke-linecap="round"/>`,

  /** Çarpan küresi — değeri arayüzde üstüne basılır. */
  MULT: `
    <ellipse cx="50" cy="50" rx="48" ry="48" fill="url(#y-orbglow)"/>
    <g class="storm-arc" stroke="#bdf0ff" stroke-width="2.2" fill="none" opacity=".8"
       stroke-linecap="round">
      <path d="M14 30l8 6-6 6 9 5"/><path d="M86 30l-8 6 6 6-9 5"/>
      <path d="M32 8l6 7-5 5 7 4"/><path d="M68 92l-6-7 5-5-7-4"/>
    </g>
    <circle cx="50" cy="50" r="33" fill="url(#y-orb)" ${OUT}/>
    <circle cx="50" cy="50" r="33" fill="none" stroke="#bdf0ff" stroke-width="2" opacity=".55"/>
    <path d="M32 34a24 24 0 0 1 15-9" stroke="#ffffff" stroke-width="4" fill="none"
      stroke-linecap="round" opacity=".7"/>`
};

export function buildSprite() {
  const symbols = Object.entries(SHAPES)
    .map(([id, shape]) => `<symbol id="y-sym-${id}" viewBox="0 0 100 100">${shape}</symbol>`)
    .join('');
  return `<svg id="storm-sprite" aria-hidden="true" focusable="false">
    <defs>${GRADIENTS}${GEM_GRADIENTS}</defs>${symbols}</svg>`;
}

export function symbolMarkup(id, extraClass = '') {
  return `<svg class="sym sym-${id} ${extraClass}" viewBox="0 0 100 100"><use href="#y-sym-${id}"/></svg>`;
}

export const SYMBOL_IDS = Object.keys(SHAPES);
