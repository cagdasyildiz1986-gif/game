/**
 * MAVİ MERA RTP simülasyonu: node tools/simulate-mavimera.js [tur] [bahis]
 *
 * Oyuncunun gördüğü akışın AYNISINI ölçer: motoru değil, oturum katmanını
 * (playRound) sürer. Böylece balıkçı toplaması, seviye merdiveni ve
 * bedava dönüş kuralları simülasyona birebir yansır.
 */
import { playRound, ensureState, createPools } from '../server/games/mavimera/session.js';
import { JACKPOTS, COLLECT } from '../server/games/mavimera/config.js';
import { SeededRng } from '../server/game/rng.js';

const spins = Number(process.argv[2] || 1_000_000);
const bet = Number(process.argv[3] || 40);
const rng = new SeededRng(31337);
const pools = createPools();

const player = {
  balance: 1e12,
  stats: { spins: 0, wagered: 0, won: 0, biggestWin: 0 }
};

let paid = 0;
let baseRet = 0;       // ucretli donuslerin kazanci
let freeRet = 0;       // bedava donuslerin kazanci
let lineRet = 0;
let scatterRet = 0;
let collectRet = 0;    // balikci toplamasi (yukaridakilerin icinde)
let jackpotRet = 0;
let fsTriggers = 0;
let fsSpins = 0;
let baseCollects = 0;
let freeCollects = 0;
let biggest = 0;
let capped = 0;
const levelHits = [0, 0, 0, 0];
const jpHits = Object.fromEntries(JACKPOTS.levels.map((l) => [l.id, 0]));
const jpPaid = Object.fromEntries(JACKPOTS.levels.map((l) => [l.id, 0]));

while (paid < spins) {
  const wasFree = ensureState(player).free.remaining > 0;
  if (player.balance < 1e9) player.balance = 1e12;

  const { error, round } = playRound({ player, pools, rng, bet });
  if (error) throw new Error(error);

  if (!wasFree) paid += 1;
  else fsSpins += 1;

  if (wasFree) freeRet += round.totalWin;
  else baseRet += round.totalWin;

  lineRet += round.lineWin;
  scatterRet += round.scatter.pay;

  if (round.collect) {
    collectRet += round.collect.total;
    if (wasFree) freeCollects += 1;
    else baseCollects += 1;
    for (const j of round.collect.jackpotWins) {
      jpHits[j.level] += 1;
      jpPaid[j.level] += j.amount;
      jackpotRet += j.amount;
    }
  }
  if (round.freeSpinsAwarded > 0 && !wasFree) fsTriggers += 1;
  if (round.freeSpinsSummary) {
    levelHits[Math.min(round.freeSpinsSummary.level, 4) - 1] += 1;
  }
  if (round.capped) capped += 1;
  if (round.totalWin > biggest) biggest = round.totalWin;
}

const wagered = paid * bet;
const pct = (v) => `%${((v / wagered) * 100).toFixed(2)}`;
const nf = (v) => Math.round(v).toLocaleString('tr-TR');
const total = baseRet + freeRet;

console.log(`\n═══ MAVİ MERA · ${nf(paid)} ücretli dönüş · bahis ${bet} ═══\n`);
console.log(`Temel oyun RTP    : ${pct(baseRet)}`);
console.log(`Bedava dönüş RTP  : ${pct(freeRet)}`);
console.log(`  Hat ödemeleri   : ${pct(lineRet)}  (ikisinin içinde)`);
console.log(`  Dümen ödemesi   : ${pct(scatterRet)}`);
console.log(`  Balıkçı toplama : ${pct(collectRet)}`);
console.log(`    · jackpot payı: ${pct(jackpotRet)}`);
console.log(`TOPLAM RTP        : ${pct(total)}`);
console.log(`Kasa payı         : %${(100 - (total / wagered) * 100).toFixed(2)}`);
console.log('---');
console.log(`Bedava dönüş      : 1/${Math.round(paid / Math.max(1, fsTriggers))} dönüş · ` +
  `tur başına ort. ${(fsSpins / Math.max(1, fsTriggers)).toFixed(1)} dönüş`);
console.log(`Toplama (temel)   : 1/${Math.round(paid / Math.max(1, baseCollects))} dönüş`);
console.log(`Toplama (bedava)  : dönüşlerin %${((100 * freeCollects) / Math.max(1, fsSpins)).toFixed(1)}'inde`);
console.log(`Seviye dağılımı   : ` + levelHits
  .map((h, i) => `x${COLLECT.levels[i]} %${((100 * h) / Math.max(1, fsTriggers)).toFixed(1)}`)
  .join(' · '));
console.log(`En büyük kazanç   : ${nf(biggest)} (bahsin ${Math.round(biggest / bet)}x katı) · tavan ${capped} kez`);
console.log('---');
for (const level of JACKPOTS.levels) {
  const hits = jpHits[level.id];
  const every = hits ? Math.round(paid / hits) : 0;
  console.log(
    `  ${level.name.padEnd(6)} isabet ${hits ? `1/${nf(every)}`.padEnd(12) : 'hiç'.padEnd(12)}` +
    ` · ödenen ${nf(jpPaid[level.id]).padStart(12)} · RTP ${pct(jpPaid[level.id])}`
  );
}
