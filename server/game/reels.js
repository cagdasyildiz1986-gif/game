/**
 * Sanal makara seritleri.
 * Semboller sayilardan deterministik olarak dagitilir (Sainte-Lague / en buyuk kalan),
 * boylece ayni sembol serit uzerinde kumelenmez ve RTP ayarlamasi sayilarla yapilir.
 */

/** Temel oyun sembol sayilari (serit uzunlugu = toplam). */
export const BASE_REEL_COUNTS = [
  { CHERRY: 8, LEMON: 8, ORANGE: 7, PLUM: 7, BELL: 6, GRAPE: 5, MELON: 4, SEVEN: 3, STAR: 1, DOLLAR: 1 },
  { CHERRY: 7, LEMON: 7, ORANGE: 7, PLUM: 7, BELL: 6, GRAPE: 5, MELON: 4, SEVEN: 3, STAR: 2, DOLLAR: 2 },
  { CHERRY: 7, LEMON: 7, ORANGE: 6, PLUM: 6, BELL: 6, GRAPE: 6, MELON: 5, SEVEN: 3, STAR: 2, DOLLAR: 2 },
  { CHERRY: 7, LEMON: 7, ORANGE: 7, PLUM: 7, BELL: 6, GRAPE: 5, MELON: 4, SEVEN: 3, STAR: 2, DOLLAR: 2 },
  { CHERRY: 8, LEMON: 8, ORANGE: 7, PLUM: 7, BELL: 6, GRAPE: 5, MELON: 4, SEVEN: 3, STAR: 1, DOLLAR: 1 }
];

/** Bedava donuslerde daha comert seritler (daha cok wild, daha az dusuk sembol). */
export const FREE_REEL_COUNTS = [
  { CHERRY: 6, LEMON: 6, ORANGE: 6, PLUM: 6, BELL: 6, GRAPE: 6, MELON: 5, SEVEN: 4, STAR: 3, DOLLAR: 2 },
  { CHERRY: 6, LEMON: 6, ORANGE: 6, PLUM: 6, BELL: 6, GRAPE: 6, MELON: 5, SEVEN: 4, STAR: 3, DOLLAR: 2 },
  { CHERRY: 6, LEMON: 6, ORANGE: 6, PLUM: 6, BELL: 6, GRAPE: 6, MELON: 5, SEVEN: 4, STAR: 3, DOLLAR: 2 },
  { CHERRY: 6, LEMON: 6, ORANGE: 6, PLUM: 6, BELL: 6, GRAPE: 6, MELON: 5, SEVEN: 4, STAR: 3, DOLLAR: 2 },
  { CHERRY: 6, LEMON: 6, ORANGE: 6, PLUM: 6, BELL: 6, GRAPE: 6, MELON: 5, SEVEN: 4, STAR: 3, DOLLAR: 2 }
];

/**
 * Sayilardan serit uretir. Her adimda "hedef doluluk - mevcut doluluk" farki
 * en buyuk olan sembol yerlestirilir; bu semboller seride esit araliklarla dagilir.
 */
export function buildStrip(counts) {
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

export const BASE_REELS = BASE_REEL_COUNTS.map(buildStrip);
export const FREE_REELS = FREE_REEL_COUNTS.map(buildStrip);
