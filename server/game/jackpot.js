import { JACKPOT } from './paytable.js';

/**
 * EGT tarzi "Jackpot Cards" bonusu.
 * 4 progresif seviye. Her spinde bahsin bir kismi havuzlara aktarilir.
 * Bonus rastgele tetiklenir; oyuncu ayni turden 3 kart bulana kadar kart acar.
 */

export function createPools() {
  const pools = {};
  for (const level of JACKPOT.levels) {
    pools[level.id] = level.seed;
  }
  return pools;
}

/** Bahsin katki payini havuzlara dagitir. */
export function contribute(pools, totalBet) {
  const amount = totalBet * JACKPOT.contributionRate;
  for (const level of JACKPOT.levels) {
    pools[level.id] += amount * level.share;
  }
  return amount;
}

export function shouldTrigger(rng, totalBet, baseBet) {
  // Yuksek bahis -> biraz daha yuksek tetiklenme sansi (adil oransal katki).
  const scale = Math.min(4, Math.max(0.25, totalBet / baseBet));
  return rng.float() < JACKPOT.triggerChance * scale;
}

/**
 * Kart oyununu oynar: agirlikli desteden kart cekilir,
 * ayni turden 3. kart cikinca o seviyenin jackpotu kazanilir.
 */
export function playCardGame(rng) {
  const counts = Object.fromEntries(JACKPOT.levels.map((l) => [l.id, 0]));
  const totalWeight = JACKPOT.levels.reduce((s, l) => s + l.weight, 0);
  const draws = [];

  for (let i = 0; i < 60; i += 1) {
    let roll = rng.float() * totalWeight;
    let picked = JACKPOT.levels[0];
    for (const level of JACKPOT.levels) {
      if (roll < level.weight) {
        picked = level;
        break;
      }
      roll -= level.weight;
    }
    counts[picked.id] += 1;
    draws.push({ id: picked.id, suit: picked.suit, name: picked.name });
    if (counts[picked.id] >= 3) {
      return { draws, levelId: picked.id, level: picked };
    }
  }
  // Teorik olarak ulasilamaz; guvenlik icin en dusuk seviye.
  const fallback = JACKPOT.levels[0];
  return { draws, levelId: fallback.id, level: fallback };
}

/** Kazanilan havuzu odeyip seed degerine sifirlar. */
export function claim(pools, levelId) {
  const level = JACKPOT.levels.find((l) => l.id === levelId);
  const amount = pools[levelId];
  pools[levelId] = level.seed;
  return { amount, level };
}

export const JACKPOT_LEVELS = JACKPOT.levels;
