/**
 * RTP / oynanabilirlik simulasyonu.
 * Kullanim: npm run simulate -- [spinSayisi]
 */
import { resolveSpin } from '../server/game/engine.js';
import { SeededRng } from '../server/game/rng.js';
import { JACKPOT } from '../server/game/paytable.js';
import * as jackpot from '../server/game/jackpot.js';

const spins = Number(process.argv[2] || 2_000_000);
const totalBet = 20;
const rng = new SeededRng(20260905);

let wagered = 0;
let returned = 0;
let baseReturn = 0;
let freeReturn = 0;
let scatterReturn = 0;
let hits = 0;
let featureTriggers = 0;
let freeSpinCount = 0;
let biggestWin = 0;

// Jackpot havuzlarini da gercek akisla simule et
const pools = jackpot.createPools();
const jackpotHits = Object.fromEntries(JACKPOT.levels.map((l) => [l.id, 0]));
const jackpotPaid = Object.fromEntries(JACKPOT.levels.map((l) => [l.id, 0]));
const poolSum = Object.fromEntries(JACKPOT.levels.map((l) => [l.id, 0]));

for (let i = 0; i < spins; i += 1) {
  wagered += totalBet;
  jackpot.contribute(pools, totalBet);
  for (const level of JACKPOT.levels) poolSum[level.id] += pools[level.id];
  if (jackpot.shouldTrigger(rng, totalBet)) {
    const game = jackpot.playCardGame(rng);
    const claimed = jackpot.claim(pools, game.levelId);
    jackpotHits[game.levelId] += 1;
    jackpotPaid[game.levelId] += claimed.amount;
  }
  const result = resolveSpin({ rng, totalBet, free: false });
  let spinWin = result.totalWin;
  baseReturn += result.wins.filter((w) => w.type === 'line').reduce((s, w) => s + w.amount, 0);
  scatterReturn += result.wins.filter((w) => w.type === 'scatter').reduce((s, w) => s + w.amount, 0);

  let remaining = result.freeSpinsAwarded;
  if (remaining > 0) featureTriggers += 1;
  while (remaining > 0) {
    remaining -= 1;
    freeSpinCount += 1;
    const fs = resolveSpin({ rng, totalBet, free: true });
    spinWin += fs.totalWin;
    freeReturn += fs.totalWin;
    remaining += fs.freeSpinsAwarded;
    if (remaining > 500) break; // guvenlik siniri
  }

  if (spinWin > 0) hits += 1;
  if (spinWin > biggestWin) biggestWin = spinWin;
  returned += spinWin;
}

const pct = (x) => `${(x * 100).toFixed(2)}%`;
const baseRtp = returned / wagered;
const jackpotRtp = JACKPOT.contributionRate;

console.log(`Spin sayisi        : ${spins.toLocaleString('tr-TR')}`);
console.log(`Toplam bahis       : ${wagered.toLocaleString('tr-TR')}`);
console.log(`Toplam odeme       : ${Math.round(returned).toLocaleString('tr-TR')}`);
console.log('---');
console.log(`Hat RTP            : ${pct(baseReturn / wagered)}`);
console.log(`Scatter RTP        : ${pct(scatterReturn / wagered)}`);
console.log(`Bedava donus RTP   : ${pct(freeReturn / wagered)}`);
console.log(`TEMEL OYUN RTP     : ${pct(baseRtp)}`);
const jackpotTotalPaid = Object.values(jackpotPaid).reduce((a, b) => a + b, 0);
const jackpotActualRtp = jackpotTotalPaid / wagered;
console.log(`Jackpot RTP (katki): ${pct(jackpotRtp)}`);
console.log(`Jackpot RTP (ölçüm): ${pct(jackpotActualRtp)}`);
console.log(`TOPLAM RTP         : ${pct(baseRtp + jackpotActualRtp)}`);
console.log('---');
console.log(`Kazanma sikligi    : ${pct(hits / spins)} (1/${(spins / hits).toFixed(2)})`);
console.log(`Bonus tetiklenmesi : 1/${(spins / featureTriggers).toFixed(0)} spin`);
console.log(`Toplam bedava donus: ${freeSpinCount.toLocaleString('tr-TR')}`);
console.log(`En buyuk kazanc    : ${biggestWin.toLocaleString('tr-TR')} (bahsin ${(biggestWin / totalBet).toFixed(0)}x katı)`);
console.log('---');
const totalJackpotHits = Object.values(jackpotHits).reduce((a, b) => a + b, 0);
console.log(`Jackpot tetiklenmesi: 1/${totalJackpotHits ? (spins / totalJackpotHits).toFixed(0) : '-'} spin (bahis ${totalBet})`);
for (const level of JACKPOT.levels) {
  const hits = jackpotHits[level.id];
  console.log(
    `  ${level.suit} ${level.name.padEnd(6)} ` +
      `ort. havuz ${Math.round(poolSum[level.id] / spins).toLocaleString('tr-TR').padStart(8)} · ` +
      `isabet 1/${hits ? Math.round(spins / hits).toLocaleString('tr-TR') : '-'} spin · ` +
      `ort. ödeme ${hits ? Math.round(jackpotPaid[level.id] / hits).toLocaleString('tr-TR') : '-'}`
  );
}
