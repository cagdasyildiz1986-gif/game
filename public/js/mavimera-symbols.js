/**
 * MAVİ MERA sembol grafikleri.
 *
 * Semboller, oyunun kendi tasarım görselinden çıkarılmış RASTER
 * kutucuklardır (public/img/mavimera-symbols.webp). Tek bir 4x4 sprite
 * sayfasında dururlar; her hücre sayfanın ilgili karesini arka plan
 * olarak gösterir. Böylece makaradaki görüntü tasarımın birebir aynısıdır.
 *
 * Sayfa düzeni (soldan sağa, yukarıdan aşağıya):
 *   LUFER KIRMIZI LEVREK CIPURA
 *   MARTI FENER   MAKARA YEM
 *   KUTU  BALIKCI DUMEN  PARA
 *   PARA_MINI PARA_MINOR PARA_MAJOR PARA_GRAND
 *
 * Jackpot para balıkları aynı kutucuğun kademe rengine boyanmış hâlidir;
 * oyuncu hangi merdiven basamağının düştüğünü renkten anlar.
 */

export const SHEET = 'img/mavimera-symbols.webp';
export const SHEET_COLS = 4;
export const SHEET_ROWS = 4;

export const SYMBOL_ORDER = [
  'LUFER', 'KIRMIZI', 'LEVREK', 'CIPURA',
  'MARTI', 'FENER', 'MAKARA', 'YEM',
  'KUTU', 'BALIKCI', 'DUMEN', 'PARA',
  'PARA_MINI', 'PARA_MINOR', 'PARA_MAJOR', 'PARA_GRAND'
];

/** Sunucu sembol kimliği → sprite kimliği (birebir). */
export const SPRITE_ID = Object.fromEntries(SYMBOL_ORDER.map((id) => [id, id]));

/** Para balığının taşıdığı ödüle göre sprite seçer. */
export function moneySprite(cell) {
  if (!cell) return 'PARA';
  return cell.jackpot ? `PARA_${cell.jackpot}` : 'PARA';
}

/** Bir sembolün sprite sayfasındaki yüzde konumu. */
function position(index) {
  const col = index % SHEET_COLS;
  const row = Math.floor(index / SHEET_COLS);
  return `${(col * 100) / (SHEET_COLS - 1)}% ${(row * 100) / (SHEET_ROWS - 1)}%`;
}

/**
 * Sprite sayfasını kullanan stil bloğunu üretir.
 * (SVG sprite'ın yerini alır; #sprite-host içine basılır.)
 */
export function buildSprite() {
  const rules = SYMBOL_ORDER.map(
    (id, i) => `.sym-${id}{background-position:${position(i)}}`
  ).join('');
  return `<style>
    .sym {
      display: block;
      background-image: url('${SHEET}');
      background-size: ${SHEET_COLS * 100}% ${SHEET_ROWS * 100}%;
      background-repeat: no-repeat;
    }
    ${rules}
  </style>`;
}

export function symbolMarkup(symbolId, extraClass = '') {
  const id = SPRITE_ID[symbolId] || symbolId;
  return `<span class="sym sym-${id} ${extraClass}" aria-hidden="true"></span>`;
}
