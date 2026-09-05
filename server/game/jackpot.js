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

/**
 * Tetiklenme sansi bahisle DOGRU ORANTILI olceklenir.
 * Havuzlara katki da bahisle orantili oldugu icin, bu sekilde jackpot'un
 * beklenen getirisi her bahis seviyesinde ayni kalir.
 */
export function shouldTrigger(rng, totalBet) {
  return rng.float() < JACKPOT.triggerChance * (totalBet / JACKPOT.referenceBet);
}

/**
 * Kart oyununu oynar.
 *
 * ONEMLI - sonuc burada, sunucuda belirlenir. Istemciye acilacak KART SIRASI
 * gonderilir; oyuncu 4x4 tahtada hangi kareye dokunursa dokunsun sirdaki bir
 * sonraki kart acilir. Yani secim sunumsaldir, sonucu degistiremez.
 * Bu, gercek slot bonus oyunlarinin calisma bicimidir ve istemcinin
 * sonucu manipule etmesini imkansiz kilar.
 *
 * En kotu durumda her turden 2'ser kart (8 kart) acilir; 9. kart mutlaka
 * bir turu 3'e tamamlar. Tahtadaki kalan kartlar kapali kalir.
 */
export function playCardGame(rng) {
  const counts = Object.fromEntries(JACKPOT.levels.map((l) => [l.id, 0]));
  const totalWeight = JACKPOT.levels.reduce((s, l) => s + l.weight, 0);
  const draws = [];

  for (let i = 0; i < 16; i += 1) {
    let roll = rng.float() * totalWeight;
    let picked = JACKPOT.levels[0];
    for (const level of JACKPOT.levels) {
      if (roll < level.weight) {
        picked = level;
        break;
      }
      roll -= level.weight;
    }
    // Bir tur zaten 3'e ulasamayacak sekilde doluysa tekrar cekme yapilmaz;
    // 3'u bulan ilk tur kazanir.
    counts[picked.id] += 1;
    draws.push({ id: picked.id, suit: picked.suit, name: picked.name });
    if (counts[picked.id] >= 3) {
      return { draws, levelId: picked.id, level: picked, gridSize: JACKPOT.cardGridSize };
    }
  }

  // Teorik olarak ulasilamaz (9 kartta mutlaka biter); guvenlik icin.
  const fallback = JACKPOT.levels[0];
  return { draws, levelId: fallback.id, level: fallback, gridSize: JACKPOT.cardGridSize };
}

/** Kazanilan havuzu odeyip seed degerine sifirlar. */
export function claim(pools, levelId) {
  const level = JACKPOT.levels.find((l) => l.id === levelId);
  const amount = pools[levelId];
  pools[levelId] = level.seed;
  return { amount, level };
}

export const JACKPOT_LEVELS = JACKPOT.levels;
