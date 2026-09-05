/**
 * 7 HOT · ÇAN ZİNCİRİ — yapılandırma
 *
 * Tür: 5x4, 40 hatlı meyve slotu + "tut ve kazan" (Hold & Win) çan özelliği.
 * Bu mekanik ailesi sektörde yaygındır; buradaki semboller, oranlar, ödeme
 * tablosu ve denge tamamen bu projeye özgüdür — hiçbir oyunun kopyası değildir.
 */

export const REELS = 5;
export const ROWS = 4;
export const LINES = 40;

/** Toplam bahis seviyeleri — 40 hatta bölünebilir olsun diye kendi listesi var. */
export const BET_LEVELS = [40, 80, 200, 400, 1000, 2000, 4000];
export const DEFAULT_BET = 40;

/* ═══════════ Semboller ═══════════ */

export const SYMBOLS = {
  CHERRY: { id: 'CHERRY', name: 'Kiraz', kind: 'low' },
  LEMON:  { id: 'LEMON',  name: 'Limon', kind: 'low' },
  PLUM:   { id: 'PLUM',   name: 'Erik', kind: 'low' },
  ORANGE: { id: 'ORANGE', name: 'Portakal', kind: 'low' },
  GRAPE:  { id: 'GRAPE',  name: 'Üzüm', kind: 'mid' },
  MELON:  { id: 'MELON',  name: 'Karpuz', kind: 'mid' },
  BAR:    { id: 'BAR',    name: 'Bar', kind: 'high' },
  SEVEN:  { id: 'SEVEN',  name: 'Yedi', kind: 'high' },
  WILD:   { id: 'WILD',   name: 'Wild', kind: 'wild' },
  SCATTER:{ id: 'SCATTER',name: 'Dolar', kind: 'scatter' },
  BELL:   { id: 'BELL',   name: 'Çan', kind: 'bell' }
};

export const WILD = 'WILD';
export const SCATTER = 'SCATTER';
export const BELL = 'BELL';

/** WILD yalnızca ortadaki üç makarada görünür. */
export const WILD_REELS = [1, 2, 3];

/* ═══════════ Ödeme tablosu (hat bahsi çarpanı) ═══════════ */

export const PAYTABLE = {
  SEVEN:  { 3: 40, 4: 200, 5: 1000 },
  BAR:    { 3: 25, 4: 120, 5: 600 },
  MELON:  { 3: 15, 4: 60,  5: 300 },
  GRAPE:  { 3: 12, 4: 45,  5: 220 },
  ORANGE: { 3: 6,  4: 27,  5: 130 },
  PLUM:   { 3: 6,  4: 27,  5: 130 },
  LEMON:  { 3: 4,  4: 15,  5: 80 },
  CHERRY: { 3: 4,  4: 15,  5: 80 }
};

/** Scatter: konumdan bağımsız, TOPLAM bahis çarpanı. */
export const SCATTER_PAY = { 3: 2, 4: 10, 5: 50 };

/** Scatter bedava dönüş ödülü (retrigger'da da aynı tablo). */
export const FREE_SPINS = { 3: 9, 4: 16, 5: 27 };

/* ═══════════ Scatter tutmalı respin ═══════════ */

export const SCATTER_RESPIN = {
  /** Bu kadar scatter ekranda ise respin başlar. */
  min: 2,
  max: 4,
  /** Bu sayıya ulaşınca respin biter (ve bedava dönüş tetiklenir). */
  target: 5,
  /** Üst sınır — sonsuz döngüye karşı. */
  maxSpins: 10
};

/* ═══════════ Çan Zinciri (Hold & Win) ═══════════ */

export const BELL_ROUND = {
  /** Turu başlatmak için gereken çan sayısı. */
  trigger: 5,
  /** Başlangıç ve her yeni çanda sıfırlanan respin sayısı. */
  respins: 3,
  /** Tam ekran (20 çan) çarpanı — MAJOR ve GRAND hariç. */
  fullScreenMultiplier: 3,
  /** Boost çanı tetikleyici oyunda varsa çarpan bu olur. */
  boostMultiplier: 4,
  /** Boost çanı tur sonunda bu kadar toplam bahis taşıyan nakit çana dönüşür. */
  boostCashout: 8,
  /** GRAND jackpot için gereken GRAND çanı sayısı. */
  grandRequired: 3,
  /** GRAND eşiği tutmazsa çanlar bu aralıkta nakde döner (toplam bahis katı). */
  grandFallback: [10, 25],
  /** Respin sırasında boş bir hücreye çan düşme olasılığı. */
  respinBellChance: 0.048
};

/**
 * Bir çan düştüğünde taşıdığı değer bu ağırlıklı tablodan seçilir.
 * value: toplam bahis çarpanı · jackpot: seviye kimliği
 */
export const BELL_VALUES = [
  { id: 'c1',    weight: 320, value: 1 },
  { id: 'c2',    weight: 230, value: 2 },
  { id: 'c3',    weight: 150, value: 3 },
  { id: 'c5',    weight: 90,  value: 5 },
  { id: 'c8',    weight: 45,  value: 8 },
  { id: 'c15',   weight: 18,  value: 15 },
  { id: 'c25',   weight: 6,   value: 25 },
  { id: 'MINI',  weight: 12,    jackpot: 'MINI' },
  { id: 'MINOR', weight: 4,     jackpot: 'MINOR' },
  { id: 'MAJOR', weight: 0.30,  jackpot: 'MAJOR' },
  /**
   * GRAND çanı bilerek SIK düşer ama tek başına jackpot vermez:
   * ekranda 3 tane olması gerekir. Olmazsa nakde döner. Bu, referans
   * oyundaki gerilimin kaynağıdır - kırmızı çan görmek heyecan yaratır
   * ama jackpot için üçünü toplamak gerekir.
   */
  { id: 'GRAND', weight: 10,  jackpot: 'GRAND' }
];

/** Boost çanı: tetikleyici oyunda ekranda en fazla bir kez görünebilir. */
export const BOOST_CHANCE = 0.16;

/* ═══════════ Progresif jackpotlar ═══════════ */

/**
 * Jackpot merdiveni.
 *
 * MINI / MINÖR / MAJÖR bahsin SABİT katıdır: her bahis seviyesinde adil
 * çalışır ve bahis değiştiğinde ekranda güncellenir. Tutarlar bilerek
 * küçük tutulur; karşılığında çanlar SIK düşer, böylece oyuncu bir
 * oturumda gerçekten jackpot görür.
 * GRAND tek PROGRESİF havuzdur: her dönüşten katkı alır, düşünce tohuma döner.
 * (Tek progresif havuz, dört havuzun bahis seviyeleri arasında yarattığı
 *  adaletsizliği ortadan kaldırır.)
 */
export const JACKPOTS = {
  contributionRate: 0.012,
  levels: [
    { id: 'MINI',  name: 'Mini',  color: '#a855f7', fixed: 12 },
    { id: 'MINOR', name: 'Minör', color: '#3b82f6', fixed: 34 },
    { id: 'MAJOR', name: 'Majör', color: '#22c55e', fixed: 300 },
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
 * Şeritler sayılardan üretilir. Çanlar YIĞIN halinde yerleştirilir:
 * gerçek Hold & Win oyunlarında olduğu gibi bir makarada 2-3 çan üst üste
 * gelebilsin diye. Yığınsız dağıtımda 5 çan pratikte imkânsız olurdu.
 */
const BASE_COUNTS = [
  { CHERRY: 9, LEMON: 9, PLUM: 8, ORANGE: 8, GRAPE: 7, MELON: 6, BAR: 5, SEVEN: 4, SCATTER: 1 },
  { CHERRY: 8, LEMON: 8, PLUM: 7, ORANGE: 7, GRAPE: 6, MELON: 6, BAR: 5, SEVEN: 4, WILD: 3, SCATTER: 1 },
  { CHERRY: 8, LEMON: 8, PLUM: 7, ORANGE: 7, GRAPE: 6, MELON: 6, BAR: 5, SEVEN: 4, WILD: 3, SCATTER: 1 },
  { CHERRY: 8, LEMON: 8, PLUM: 7, ORANGE: 7, GRAPE: 6, MELON: 6, BAR: 5, SEVEN: 4, WILD: 3, SCATTER: 1 },
  { CHERRY: 9, LEMON: 9, PLUM: 8, ORANGE: 8, GRAPE: 7, MELON: 6, BAR: 5, SEVEN: 4, SCATTER: 1 }
];

/** Her makarada kaç çan yığını ve yığın başına kaç çan. */
const BELL_STACKS = [
  { stacks: 1, size: 2 },
  { stacks: 1, size: 2 },
  { stacks: 1, size: 3 },
  { stacks: 1, size: 2 },
  { stacks: 1, size: 2 }
];

/** Bedava dönüş şeritleri: çan yok (Çan Zinciri bedava dönüşte tetiklenmez). */
const FREE_COUNTS = [
  { CHERRY: 7, LEMON: 7, PLUM: 7, ORANGE: 7, GRAPE: 7, MELON: 7, BAR: 6, SEVEN: 5, SCATTER: 1 },
  { CHERRY: 6, LEMON: 6, PLUM: 6, ORANGE: 6, GRAPE: 6, MELON: 6, BAR: 6, SEVEN: 5, WILD: 3, SCATTER: 1 },
  { CHERRY: 6, LEMON: 6, PLUM: 6, ORANGE: 6, GRAPE: 6, MELON: 6, BAR: 6, SEVEN: 5, WILD: 3, SCATTER: 1 },
  { CHERRY: 6, LEMON: 6, PLUM: 6, ORANGE: 6, GRAPE: 6, MELON: 6, BAR: 6, SEVEN: 5, WILD: 3, SCATTER: 1 },
  { CHERRY: 7, LEMON: 7, PLUM: 7, ORANGE: 7, GRAPE: 7, MELON: 7, BAR: 6, SEVEN: 5, SCATTER: 1 }
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

/** Çan yığınlarını şeride eşit aralıklarla ekler. */
function withBellStacks(strip, { stacks, size }) {
  const result = [...strip];
  const gap = Math.floor(result.length / stacks);
  // Sondan başa ekle ki indeksler kaymasın
  for (let i = stacks - 1; i >= 0; i -= 1) {
    const at = i * gap + Math.floor(gap / 2);
    result.splice(at, 0, ...Array.from({ length: size }, () => BELL));
  }
  return result;
}

export const BASE_REELS = BASE_COUNTS.map((counts, i) =>
  withBellStacks(spread(counts), BELL_STACKS[i])
);
export const FREE_REELS = FREE_COUNTS.map(spread);

/** Çan Zinciri turunda kullanılan sanal makara (yalnızca çan / boş). */
export const BELL_ROUND_REELS = null;
