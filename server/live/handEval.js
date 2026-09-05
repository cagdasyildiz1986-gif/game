/**
 * Texas Hold'em el degerlendirici.
 *
 * 5-7 karttan en iyi 5'li eli bulur ve karsilastirilabilir bir skor uretir.
 * Skor: [kategori, ...kirici degerler] dizisi; sozluk sirasi ile karsilastirilir.
 *
 * Kategoriler (buyukten kucuge):
 *  8 Straight flush | 7 Four of a kind | 6 Full house | 5 Flush
 *  4 Straight | 3 Three of a kind | 2 Two pair | 1 One pair | 0 High card
 */

export const CATEGORY_NAMES = [
  'Yüksek Kart',
  'Bir Çift',
  'İki Çift',
  'Üçlü',
  'Kent',
  'Floş',
  'Full House',
  'Dörtlü',
  'Straight Flush'
];

/** Bes kartlik bir elin skorunu hesaplar. */
function scoreFive(cards) {
  const ranks = cards.map((c) => c.r).sort((a, b) => b - a);
  const suits = cards.map((c) => c.s);

  const counts = new Map();
  for (const r of ranks) counts.set(r, (counts.get(r) || 0) + 1);

  // Once sayiya, esitlikte degere gore sirala
  const groups = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);

  const isFlush = suits.every((s) => s === suits[0]);

  const unique = [...new Set(ranks)];
  let straightHigh = 0;
  if (unique.length === 5) {
    if (unique[0] - unique[4] === 4) straightHigh = unique[0];
    // A-2-3-4-5 (tekerlek): As burada 1 sayilir
    else if (unique[0] === 14 && unique[1] === 5 && unique[4] === 2) straightHigh = 5;
  }

  if (isFlush && straightHigh) return [8, straightHigh];
  if (groups[0][1] === 4) return [7, groups[0][0], groups[1][0]];
  if (groups[0][1] === 3 && groups[1][1] === 2) return [6, groups[0][0], groups[1][0]];
  if (isFlush) return [5, ...ranks];
  if (straightHigh) return [4, straightHigh];
  if (groups[0][1] === 3) return [3, groups[0][0], ...groups.slice(1).map((g) => g[0])];
  if (groups[0][1] === 2 && groups[1][1] === 2) {
    return [2, groups[0][0], groups[1][0], groups[2][0]];
  }
  if (groups[0][1] === 2) return [1, groups[0][0], ...groups.slice(1).map((g) => g[0])];
  return [0, ...ranks];
}

export function compareScores(a, b) {
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i += 1) {
    const x = a[i] ?? -1;
    const y = b[i] ?? -1;
    if (x !== y) return x > y ? 1 : -1;
  }
  return 0;
}

function combinations(items, size) {
  const result = [];
  const combo = [];
  const walk = (start) => {
    if (combo.length === size) {
      result.push([...combo]);
      return;
    }
    for (let i = start; i < items.length; i += 1) {
      combo.push(items[i]);
      walk(i + 1);
      combo.pop();
    }
  };
  walk(0);
  return result;
}

/**
 * 5-7 karttan en iyi eli bulur.
 * @returns {{ score: number[], cards: object[], category: number, name: string }}
 */
export function bestHand(cards) {
  if (cards.length < 5) throw new Error('En az 5 kart gerekli.');
  let best = null;
  for (const combo of combinations(cards, 5)) {
    const score = scoreFive(combo);
    if (!best || compareScores(score, best.score) > 0) {
      best = { score, cards: combo };
    }
  }
  return {
    ...best,
    category: best.score[0],
    name: CATEGORY_NAMES[best.score[0]]
  };
}

/**
 * Oyuncular arasinda kazananlari bulur (berabere olabilir).
 * @param {Array<{id: string, cards: object[]}>} players
 * @returns {{ winners: string[], results: Map<string, object> }}
 */
export function evaluateShowdown(players) {
  const results = new Map();
  let bestScore = null;
  let winners = [];

  for (const player of players) {
    const hand = bestHand(player.cards);
    results.set(player.id, hand);
    if (!bestScore || compareScores(hand.score, bestScore) > 0) {
      bestScore = hand.score;
      winners = [player.id];
    } else if (compareScores(hand.score, bestScore) === 0) {
      winners.push(player.id);
    }
  }
  return { winners, results };
}
