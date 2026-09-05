/**
 * YILDIRIM · GÖKLERİN ÖFKESİ — yapılandırma
 *
 * Tür: 6x5, HAT YOK. Bir sembolden ekranda 8 veya daha fazla varsa öder
 * (nerede olduğu fark etmez). Kazanan semboller patlar, üsttekiler düşer,
 * boşluklar yenileriyle dolar — kazanç kalmayana kadar sürer (tumble).
 * Dizi boyunca ekrana çarpan küreleri düşebilir; dizi sonunda toplanıp
 * o dizinin kazancını çarparlar.
 *
 * Bu mekanik ailesi sektörde yaygındır; buradaki tema, semboller, oranlar,
 * ödeme tablosu ve denge tamamen bu projeye özgüdür.
 *
 * Tema: Anadolu fırtına tanrısı (Hitit/Luvi Tarhun) ikonografisi —
 * boğa, çift balta, çift başlı kartal, güneş kursu.
 */

export const REELS = 6;
export const ROWS = 5;
export const CELLS = REELS * ROWS;

/**
 * Ödeme için ekranda gereken en az sembol sayısı.
 * Kademeler: 8-9 · 10-11 · 12+
 */
export const MIN_CLUSTER = 8;

/** Toplam bahis seviyeleri. */
export const BET_LEVELS = [20, 50, 100, 250, 500, 1000, 2500];
export const DEFAULT_BET = 20;

/** Tek turda ödenebilecek en yüksek tutar (toplam bahis katı). */
export const MAX_WIN = 5000;

/* ═══════════ Semboller ═══════════ */

export const SYMBOLS = {
  BOGA:     { id: 'BOGA',     name: 'Boğa',            kind: 'high' },
  MIGFER:   { id: 'MIGFER',   name: 'Tunç Miğfer',     kind: 'high' },
  KARTAL:   { id: 'KARTAL',   name: 'Çift Başlı Kartal', kind: 'high' },
  KURS:     { id: 'KURS',     name: 'Güneş Kursu',     kind: 'high' },
  KOR:      { id: 'KOR',      name: 'Kor Taşı',        kind: 'low' },
  MOR:      { id: 'MOR',      name: 'Mor Taş',         kind: 'low' },
  KEHRIBAR: { id: 'KEHRIBAR', name: 'Kehribar',        kind: 'low' },
  ZUMRUT:   { id: 'ZUMRUT',   name: 'Zümrüt',          kind: 'low' },
  GOK:      { id: 'GOK',      name: 'Gök Taşı',        kind: 'low' },
  SCATTER:  { id: 'SCATTER',  name: 'Yıldırım',        kind: 'scatter' },
  MULT:     { id: 'MULT',     name: 'Yıldırım Küresi', kind: 'multiplier' }
};

export const SCATTER = 'SCATTER';
export const MULT = 'MULT';

/** Ödeme yapan semboller (scatter ve küre hariç) — sunum sırası. */
export const PAY_SYMBOLS = ['BOGA', 'MIGFER', 'KARTAL', 'KURS', 'KOR', 'MOR', 'KEHRIBAR', 'ZUMRUT', 'GOK'];

/* ═══════════ Ödeme tablosu ═══════════ */

/**
 * Değerler TOPLAM BAHİS çarpanıdır (hat bahsi yok).
 * Kademeler: 8-9 · 10-11 · 12+
 */
export const PAYTABLE = {
  BOGA:     { 8: 4,    10: 12,   12: 30 },
  MIGFER:   { 8: 1.6,  10: 5,    12: 15 },
  KARTAL:   { 8: 1,    10: 3,    12: 9 },
  KURS:     { 8: 0.7,  10: 1.8,  12: 6 },
  KOR:      { 8: 0.46, 10: 1.25, 12: 4.2 },
  MOR:      { 8: 0.35, 10: 0.9,  12: 3 },
  KEHRIBAR: { 8: 0.26, 10: 0.62, 12: 2.3 },
  ZUMRUT:   { 8: 0.19, 10: 0.47, 12: 1.7 },
  GOK:      { 8: 0.13, 10: 0.31, 12: 1.15 }
};

/** Ödeme kademesinin alt sınırları — arayüz de bunu kullanır. */
export const TIERS = [8, 10, 12];

/** Bir sembolün verilen adetteki ödemesi (toplam bahis katı). */
export function payFor(symbol, count) {
  const table = PAYTABLE[symbol];
  if (!table || count < MIN_CLUSTER) return 0;
  if (count >= 12) return table[12];
  if (count >= 10) return table[10];
  return table[8];
}

/* ═══════════ Scatter ═══════════ */

/** Scatter ödemesi (toplam bahis katı). */
export const SCATTER_PAY = { 4: 2, 5: 10, 6: 50 };

/** Scatter sayısına göre bedava dönüş. */
export const FREE_SPINS = { 4: 12, 5: 18, 6: 25 };

/** Bedava dönüşler sırasında bu kadar scatter ek dönüş verir. */
export const RETRIGGER = { min: 3, spins: 5 };

/* ═══════════ Çarpan küreleri ═══════════ */

/**
 * Küre, yeni doldurulan bir hücreye düşebilir. Ödeme yapmaz, kazançla
 * patlamaz, yerçekimiyle düşer. Dizi sonunda ekrandaki tüm kürelerin
 * değerleri toplanır.
 *
 * TEMEL OYUN : toplam yalnızca o dizinin kazancını çarpar, sonra silinir.
 * BEDAVA DÖNÜŞ: toplam KALICI çarpana eklenir ve tur boyunca her kazancı çarpar.
 */
export const ORB_CHANCE = { base: 0.007, free: 0.050 };

export const ORB_VALUES = [
  { value: 2,   weight: 2000 },
  { value: 3,   weight: 1400 },
  { value: 4,   weight: 900 },
  { value: 5,   weight: 700 },
  { value: 6,   weight: 450 },
  { value: 8,   weight: 300 },
  { value: 10,  weight: 220 },
  { value: 12,  weight: 140 },
  { value: 15,  weight: 90 },
  { value: 20,  weight: 55 },
  { value: 25,  weight: 35 },
  { value: 50,  weight: 12 },
  { value: 100, weight: 5 },
  { value: 250, weight: 1.5 },
  { value: 500, weight: 0.6 }
];

/* ═══════════ Makara ağırlıkları ═══════════ */

/**
 * Hat olmadığı için şerit yerine HÜCRE BAŞINA ağırlık kullanılır: tumble
 * sırasında tek tek hücreler yeniden doldurulduğundan doğal olan budur.
 * Her makaranın kendi tablosu vardır; kenar makaralar biraz daha cömerttir.
 */
const W = (boga, migfer, kartal, kurs, kor, mor, kehribar, zumrut, gok, scatter) => ({
  BOGA: boga, MIGFER: migfer, KARTAL: kartal, KURS: kurs,
  KOR: kor, MOR: mor, KEHRIBAR: kehribar, ZUMRUT: zumrut, GOK: gok,
  SCATTER: scatter
});

export const BASE_WEIGHTS = [
  W(6, 8, 10, 12, 17, 20, 23, 27, 31, 2.7),
  W(5, 7, 9, 11, 17, 20, 24, 28, 32, 2.7),
  W(5, 7, 9, 11, 17, 20, 24, 28, 32, 2.7),
  W(5, 7, 9, 11, 17, 20, 24, 28, 32, 2.7),
  W(5, 7, 9, 11, 17, 20, 24, 28, 32, 2.7),
  W(6, 8, 10, 12, 17, 20, 23, 27, 31, 2.7)
];

/** Bedava dönüşlerde yüksek semboller biraz daha sık gelir. */
export const FREE_WEIGHTS = [
  W(7, 9, 11, 13, 17, 20, 22, 25, 28, 1.8),
  W(6, 8, 10, 12, 17, 20, 23, 26, 29, 1.8),
  W(6, 8, 10, 12, 17, 20, 23, 26, 29, 1.8),
  W(6, 8, 10, 12, 17, 20, 23, 26, 29, 1.8),
  W(6, 8, 10, 12, 17, 20, 23, 26, 29, 1.8),
  W(7, 9, 11, 13, 17, 20, 22, 25, 28, 1.8)
];

/** Ağırlık tablosunu kümülatif diziye çevirir (üretim sırasında hızlı seçim). */
function cumulative(weights) {
  const entries = Object.entries(weights);
  const out = [];
  let total = 0;
  for (const [symbol, weight] of entries) {
    total += weight;
    out.push({ symbol, upTo: total });
  }
  return { table: out, total };
}

export const BASE_CUM = BASE_WEIGHTS.map(cumulative);
export const FREE_CUM = FREE_WEIGHTS.map(cumulative);

const ORB_TOTAL = ORB_VALUES.reduce((sum, o) => sum + o.weight, 0);
export { ORB_TOTAL };
