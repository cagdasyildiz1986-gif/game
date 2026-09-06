/**
 * MAVİ MERA · HER ATIŞTA YENİ BİR HİKAYE — yapılandırma
 *
 * Tür: 5x3, 20 hatlı balıkçılık slotu + "toplayıcı wild" özelliği.
 *
 * Mekanik ailesi sektörde yaygındır (balıkçı wild ekrandaki para
 * balıklarını toplar; bedava dönüşte her 4 balıkçıda seviye atlanır).
 * Buradaki semboller, oranlar, ödeme tablosu, jackpot merdiveni ve
 * denge tamamen bu projeye özgüdür — hiçbir oyunun kopyası değildir.
 */

export const REELS = 5;
export const ROWS = 3;
export const LINES = 20;

/** Toplam bahis seviyeleri — 20 hatta bölünebilir. */
export const BET_LEVELS = [20, 40, 100, 200, 500, 1000, 2000];
export const DEFAULT_BET = 40;

/** Tur başına kazanç tavanı (toplam bahis katı). */
export const MAX_WIN = 5000;

/* ═══════════ Semboller ═══════════ */

export const SYMBOLS = {
  KUTU:    { id: 'KUTU',    name: 'Takım Kutusu', kind: 'low' },
  YEM:     { id: 'YEM',     name: 'Sahte Yem', kind: 'low' },
  MAKARA:  { id: 'MAKARA',  name: 'Olta Makarası', kind: 'low' },
  MARTI:   { id: 'MARTI',   name: 'Martı', kind: 'mid' },
  FENER:   { id: 'FENER',   name: 'Deniz Feneri', kind: 'mid' },
  CIPURA:  { id: 'CIPURA',  name: 'Çipura', kind: 'mid' },
  LEVREK:  { id: 'LEVREK',  name: 'Levrek', kind: 'high' },
  KIRMIZI: { id: 'KIRMIZI', name: 'Kırmızı Bandırma', kind: 'high' },
  LUFER:   { id: 'LUFER',   name: 'Lüfer', kind: 'high' },
  BALIKCI: { id: 'BALIKCI', name: 'Balıkçı Teknesi', kind: 'wild' },
  DUMEN:   { id: 'DUMEN',   name: 'Dümen', kind: 'scatter' },
  PARA:    { id: 'PARA',    name: 'Para Balığı', kind: 'money' }
};

export const WILD = 'BALIKCI';
export const SCATTER = 'DUMEN';
export const MONEY = 'PARA';

/**
 * Balıkçı temel oyunda yalnızca ortadaki üç makarada görünür;
 * bedava dönüşte beş makaranın hepsinde çıkar (toplama şansı artsın diye).
 */
export const WILD_REELS_BASE = [1, 2, 3];
export const WILD_REELS_FREE = [0, 1, 2, 3, 4];

/* ═══════════ Ödeme tablosu (hat bahsi çarpanı) ═══════════ */

export const PAYTABLE = {
  LUFER:   { 3: 30, 4: 120, 5: 600 },
  KIRMIZI: { 3: 20, 4: 90,  5: 450 },
  LEVREK:  { 3: 15, 4: 60,  5: 300 },
  CIPURA:  { 3: 8,  4: 35,  5: 175 },
  FENER:   { 3: 7,  4: 28,  5: 140 },
  MARTI:   { 3: 5,  4: 20,  5: 100 },
  MAKARA:  { 3: 2.5, 4: 11, 5: 55 },
  YEM:     { 3: 2.5, 4: 11, 5: 55 },
  KUTU:    { 3: 2,  4: 9,   5: 45 }
};

/** Dümen (scatter): konumdan bağımsız, TOPLAM bahis çarpanı. */
export const SCATTER_PAY = { 3: 2, 4: 8, 5: 40 };

/** Dümen bedava dönüş ödülü. */
export const FREE_SPINS = { 3: 10, 4: 15, 5: 20 };

/* ═══════════ Balıkçı toplama ve seviye merdiveni ═══════════ */

export const COLLECT = {
  /**
   * Bedava dönüşte seviye merdiveni: her `perLevel` balıkçıda bir üst
   * basamağa çıkılır, tur `extraSpins` dönüş uzar.
   *
   * Merdivenin tepesine (x10) ulaşıldıktan sonra da her 4 balıkçı
   * +10 dönüş vermeye devam eder — çarpan x10'da sabitlenir.
   */
  perLevel: 4,
  extraSpins: 10,
  /** Seviye çarpanları: 1. seviye x1 ile başlar. */
  levels: [1, 2, 3, 10]
};

/**
 * Bir para balığı düştüğünde taşıdığı değer bu ağırlıklı tablodan seçilir.
 * value: toplam bahis çarpanı · jackpot: seviye kimliği
 *
 * Değer, balık ekranda göründüğü ANDA bellidir — sonradan atanmaz.
 */
export const MONEY_VALUES = [
  { id: 'm05',   weight: 300,   value: 0.5 },
  { id: 'm1',    weight: 380,   value: 1 },
  { id: 'm2',    weight: 240,   value: 2 },
  { id: 'm3',    weight: 120,   value: 3 },
  { id: 'm5',    weight: 70,    value: 5 },
  { id: 'm10',   weight: 40,    value: 10 },
  { id: 'm20',   weight: 16,    value: 20 },
  { id: 'm50',   weight: 6,     value: 50 },
  { id: 'm100',  weight: 2.2,   value: 100 },
  { id: 'm500',  weight: 0.22,  value: 500 },
  { id: 'm1000', weight: 0.03,  value: 1000 },
  { id: 'MINI',  weight: 5,     jackpot: 'MINI' },
  { id: 'MINOR', weight: 0.9,   jackpot: 'MINOR' },
  { id: 'MAJOR', weight: 0.04,  jackpot: 'MAJOR' },
  { id: 'GRAND', weight: 0.02,  jackpot: 'GRAND' }
];

/* ═══════════ Progresif jackpotlar ═══════════ */

/**
 * MINI / MINÖR / MAJÖR bahsin SABİT katıdır: her bahis seviyesinde adil
 * çalışır. GRAND tek PROGRESİF havuzdur; her ücretli dönüşten katkı alır
 * ve düştüğünde tohuma döner.
 *
 * Jackpot yalnızca ALTIN para balığı balıkçı tarafından toplanınca ödenir —
 * ekranda görüp toplayamamak oyunun gerilimidir.
 */
export const JACKPOTS = {
  contributionRate: 0.01,
  levels: [
    { id: 'MINI',  name: 'Mini',  color: '#3b82f6', fixed: 40 },
    { id: 'MINOR', name: 'Minör', color: '#a855f7', fixed: 200 },
    { id: 'MAJOR', name: 'Majör', color: '#22c55e', fixed: 1600 },
    { id: 'GRAND', name: 'Grand', color: '#ef4444', progressive: true, seed: 50000 }
  ]
};

/** Sabit jackpot tutarı (toplam bahis katı) veya progresif havuz. */
export function jackpotAmount(levelId, totalBet, pools) {
  const level = JACKPOTS.levels.find((l) => l.id === levelId);
  if (!level) return 0;
  return level.progressive ? pools[levelId] : level.fixed * totalBet;
}

/* ═══════════ Makara şeritleri ═══════════ */

/**
 * Temel oyun şeritleri. Para balığı temel oyunda da düşer (balıkçı
 * ortadaki makaralarda olduğu için toplama temel oyunda da mümkündür),
 * ama bedava dönüşe göre belirgin biçimde seyrektir.
 */
const BASE_COUNTS = [
  { KUTU: 10, YEM: 9, MAKARA: 9, MARTI: 7, FENER: 6, CIPURA: 6, LEVREK: 5, KIRMIZI: 4, LUFER: 3, PARA: 1, DUMEN: 2 },
  { KUTU: 9, YEM: 9, MAKARA: 8, MARTI: 7, FENER: 6, CIPURA: 6, LEVREK: 5, KIRMIZI: 4, LUFER: 3, PARA: 1, BALIKCI: 2, DUMEN: 1 },
  { KUTU: 9, YEM: 9, MAKARA: 8, MARTI: 7, FENER: 6, CIPURA: 6, LEVREK: 5, KIRMIZI: 4, LUFER: 3, PARA: 1, BALIKCI: 2, DUMEN: 2 },
  { KUTU: 9, YEM: 9, MAKARA: 8, MARTI: 7, FENER: 6, CIPURA: 6, LEVREK: 5, KIRMIZI: 4, LUFER: 3, PARA: 1, BALIKCI: 2, DUMEN: 1 },
  { KUTU: 10, YEM: 9, MAKARA: 9, MARTI: 7, FENER: 6, CIPURA: 6, LEVREK: 5, KIRMIZI: 4, LUFER: 3, PARA: 1, DUMEN: 2 }
];

/**
 * Bedava dönüş şeritleri: balıkçı BEŞ makarada da bulunur ve para balığı
 * belirgin biçimde sıklaşır — turun tamamı toplama üzerine kuruludur.
 * Balıkçı sıklığı bilerek ölçülüdür: 4 balıkçı ortalama 10 dönüşten biraz
 * uzun sürede toplanır, böylece tur kendi kendini sonsuza uzatmaz.
 * Bedava dönüş şeridinde dümen yoktur: tur yalnızca balıkçıyla uzar.
 */
const FREE_COUNTS = [
  { KUTU: 8, YEM: 8, MAKARA: 7, MARTI: 6, FENER: 6, CIPURA: 5, LEVREK: 4, KIRMIZI: 4, LUFER: 3, PARA: 8, BALIKCI: 1 },
  { KUTU: 8, YEM: 8, MAKARA: 7, MARTI: 6, FENER: 6, CIPURA: 5, LEVREK: 4, KIRMIZI: 4, LUFER: 3, PARA: 8, BALIKCI: 2 },
  { KUTU: 8, YEM: 8, MAKARA: 7, MARTI: 6, FENER: 6, CIPURA: 5, LEVREK: 4, KIRMIZI: 4, LUFER: 3, PARA: 8, BALIKCI: 1 },
  { KUTU: 8, YEM: 8, MAKARA: 7, MARTI: 6, FENER: 6, CIPURA: 5, LEVREK: 4, KIRMIZI: 4, LUFER: 3, PARA: 8, BALIKCI: 2 },
  { KUTU: 8, YEM: 8, MAKARA: 7, MARTI: 6, FENER: 6, CIPURA: 5, LEVREK: 4, KIRMIZI: 4, LUFER: 3, PARA: 8, BALIKCI: 1 }
];

/** Sembolleri şeride eşit aralıklarla dağıtır (Sainte-Laguë). */
function spread(counts) {
  const symbols = Object.keys(counts).filter((s) => counts[s] > 0);
  const total = symbols.reduce((sum, s) => sum + counts[s], 0);
  const placed = Object.fromEntries(symbols.map((s) => [s, 0]));
  const strip = [];
  for (let i = 1; i <= total; i += 1) {
    let best = null;
    let bestScore = -Infinity;
    for (const s of symbols) {
      if (placed[s] >= counts[s]) continue;
      const score = (counts[s] * i) / total - placed[s];
      if (score > bestScore) {
        bestScore = score;
        best = s;
      }
    }
    placed[best] += 1;
    strip.push(best);
  }
  return strip;
}

export const BASE_REELS = BASE_COUNTS.map(spread);
export const FREE_REELS = FREE_COUNTS.map(spread);
