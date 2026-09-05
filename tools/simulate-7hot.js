/** 7 HOT RTP simülasyonu: node tools/simulate-7hot.js [spin] */
import {
  resolveSpin, finishSpin, respinReels, scatterReels,
  startBellRound, bellRoundSpin, settleBellRound
} from '../server/games/sevenhot/engine.js';
import { BASE_REELS, JACKPOTS, SCATTER_RESPIN, FREE_SPINS } from '../server/games/sevenhot/config.js';
import { SeededRng } from '../server/game/rng.js';

const spins = Number(process.argv[2] || 1_000_000);
const bet = 40;
const rng = new SeededRng(90210);

const pools = Object.fromEntries(JACKPOTS.levels.map((l) => [l.id, l.seed || 0]));
let wagered = 0, lineRet = 0, scatterRet = 0, freeRet = 0, bellRet = 0;
let bellTriggers = 0, bellSpinsTotal = 0, fullScreens = 0;
let fsTriggers = 0, respinTriggers = 0, biggest = 0;
const jpHits = Object.fromEntries(JACKPOTS.levels.map((l) => [l.id, 0]));
const jpPaid = Object.fromEntries(JACKPOTS.levels.map((l) => [l.id, 0]));

for (let i = 0; i < spins; i += 1) {
  wagered += bet;
  for (const level of JACKPOTS.levels) {
    if (level.progressive) pools[level.id] += bet * JACKPOTS.contributionRate;
  }

  let win = 0;
  let r = resolveSpin({ rng, totalBet: bet, free: false });
  lineRet += r.wins.filter((w) => w.type === 'line').reduce((s, w) => s + w.amount, 0);
  scatterRet += r.wins.filter((w) => w.type === 'scatter').reduce((s, w) => s + w.amount, 0);
  win += r.totalWin;

  // --- Scatter tutmalı respin ---
  if (r.scatterRespin) {
    respinTriggers += 1;
    let grid = r.grid;
    let guard = 0;
    for (;;) {
      const before = scatterReels(grid).length;
      const held = scatterReels(grid);
      grid = respinReels(rng, BASE_REELS, grid, held);
      const res = finishSpin({ rng, grid, totalBet: bet, free: false });
      const after = res.scatter.count;
      if (after > before * 0) { /* değerlendirme aşağıda */ }
      if (after >= SCATTER_RESPIN.target || after === before || guard++ > 8) {
        r = res;
        break;
      }
      r = res;
    }
    lineRet += r.wins.filter((w) => w.type === 'line').reduce((s, w) => s + w.amount, 0);
    scatterRet += r.wins.filter((w) => w.type === 'scatter').reduce((s, w) => s + w.amount, 0);
    win += r.totalWin;
  }

  // --- Çan Zinciri ---
  if (r.bellTrigger) {
    bellTriggers += 1;
    const round = startBellRound(r.bells.cells, r.bells.boost, bet);
    let guard = 0;
    while (!round.finished && guard++ < 120) bellRoundSpin(rng, round);
    const settled = settleBellRound(rng, round, pools);
    bellRet += settled.total;
    bellSpinsTotal += settled.spins;
    if (settled.full) fullScreens += 1;
    for (const jw of settled.jackpotWins) {
      jpHits[jw.level] += 1;
      jpPaid[jw.level] += jw.amount;
    }
    win += settled.total;
  }

  // --- Bedava dönüşler ---
  let remaining = r.scatter.freeSpins;
  if (remaining > 0) fsTriggers += 1;
  let guard = 0;
  while (remaining > 0 && guard++ < 400) {
    remaining -= 1;
    const fs = resolveSpin({ rng, totalBet: bet, free: true });
    freeRet += fs.totalWin;
    win += fs.totalWin;
    remaining += fs.scatter.freeSpins;
  }

  if (win > biggest) biggest = win;
}

const returned = lineRet + scatterRet + freeRet + bellRet;
const pct = (x) => `%${((x / wagered) * 100).toFixed(2)}`;

console.log(`\n═══ 7 HOT · ${spins.toLocaleString('tr-TR')} dönüş · bahis ${bet} ═══\n`);
console.log(`Hat RTP           : ${pct(lineRet)}`);
console.log(`Scatter RTP       : ${pct(scatterRet)}`);
console.log(`Bedava dönüş RTP  : ${pct(freeRet)}`);
console.log(`Çan Zinciri RTP   : ${pct(bellRet)}`);
console.log(`TOPLAM RTP        : ${pct(returned)}`);
console.log(`Kasa payı         : %${(100 - (returned / wagered) * 100).toFixed(2)}`);
console.log('---');
console.log(`Çan Zinciri       : 1/${bellTriggers ? Math.round(spins / bellTriggers) : '-'} dönüş` +
  ` · ort. ${bellTriggers ? (bellSpinsTotal / bellTriggers).toFixed(1) : 0} respin` +
  ` · tam ekran ${fullScreens} kez`);
console.log(`Bedava dönüş      : 1/${fsTriggers ? Math.round(spins / fsTriggers) : '-'} dönüş`);
console.log(`Scatter respin    : 1/${respinTriggers ? Math.round(spins / respinTriggers) : '-'} dönüş`);
console.log(`En büyük kazanç   : ${Math.round(biggest).toLocaleString('tr-TR')} (bahsin ${Math.round(biggest / bet)}x katı)`);
console.log('---');
for (const level of JACKPOTS.levels) {
  console.log(`  ${level.name.padEnd(6)} isabet 1/${jpHits[level.id] ? Math.round(spins / jpHits[level.id]).toLocaleString('tr-TR') : '-'}` +
    ` · ödenen ${Math.round(jpPaid[level.id]).toLocaleString('tr-TR')}` +
    ` · RTP ${pct(jpPaid[level.id])}`);
}
console.log();
