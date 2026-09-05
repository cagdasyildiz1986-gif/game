import { resolveSpin } from './engine.js';
import { FREE_SPINS } from './paytable.js';
import * as jackpot from './jackpot.js';

/**
 * Bir spinin oyuncu durumu uzerindeki tum etkisi.
 *
 * Bu modul hem Express sunucusu (server/routes/game.js) hem de
 * GitHub Pages demo modu (public/js/demo.js) tarafindan kullanilir;
 * boylece bahis, bakiye, bedava donus ve jackpot muhasebesi tek yerde durur.
 */

export function round2(value) {
  return Math.round(value * 100) / 100;
}

/**
 * @param {object} opts
 * @param {object} opts.player   degistirilecek oyuncu nesnesi
 * @param {object} opts.pools    jackpot havuzlari
 * @param {object} opts.rng      float()/int() saglayan ureteç
 * @param {number} opts.bet      istenen bahis (bedava donuste yoksayilir)
 * @param {number[]} opts.betLevels gecerli bahis seviyeleri
 * @returns {{ error?: string, spin?: object }}
 */
export function applySpin({ player, pools, rng, bet, betLevels }) {
  const isFree = player.freeSpins.remaining > 0;

  if (!isFree) {
    const requested = Number(bet ?? player.bet);
    if (!betLevels.includes(requested)) {
      return { error: 'Geçersiz bahis seviyesi.' };
    }
    player.bet = requested;
    if (player.balance < requested) {
      return { error: 'Yetersiz bakiye.' };
    }
  }

  const stake = player.bet;

  if (!isFree) {
    player.balance -= stake;
    player.stats.wagered += stake;
    jackpot.contribute(pools, stake);
  }

  const result = resolveSpin({ rng, totalBet: stake, free: isFree });

  // Jackpot Cards bonusu yalnizca ucretli spinlerde tetiklenir.
  let jackpotWin = null;
  if (!isFree && jackpot.shouldTrigger(rng, stake)) {
    const game = jackpot.playCardGame(rng);
    const claimed = jackpot.claim(pools, game.levelId);
    jackpotWin = {
      levelId: game.levelId,
      name: claimed.level.name,
      suit: claimed.level.suit,
      draws: game.draws,
      gridSize: game.gridSize,
      amount: round2(claimed.amount)
    };
  }

  let win = result.totalWin;
  if (jackpotWin) win += jackpotWin.amount;

  player.balance += win;
  player.stats.spins += 1;
  player.stats.won += win;
  if (win > player.stats.biggestWin) player.stats.biggestWin = win;

  if (isFree) {
    player.freeSpins.remaining -= 1;
    player.freeSpins.win += win;
  }
  if (result.freeSpinsAwarded > 0) {
    player.freeSpins.remaining += result.freeSpinsAwarded;
    player.freeSpins.total += result.freeSpinsAwarded;
    player.freeSpins.multiplier = FREE_SPINS.multiplier;
    if (!isFree) player.freeSpins.win = 0;
  }

  const roundEnded = isFree && player.freeSpins.remaining === 0;
  const freeSpinsSummary = roundEnded ? round2(player.freeSpins.win) : null;
  if (roundEnded) {
    player.freeSpins.multiplier = 1;
    player.freeSpins.total = 0;
  }

  player.lastSpinAt = Date.now();

  return {
    spin: {
      grid: result.grid,
      wins: result.wins.map((w) => ({ ...w, amount: round2(w.amount) })),
      totalWin: round2(result.totalWin),
      multiplier: result.multiplier,
      scatterCount: result.scatterCount,
      free: isFree,
      freeSpinsAwarded: result.freeSpinsAwarded,
      jackpot: jackpotWin,
      freeSpinsSummary
    }
  };
}
