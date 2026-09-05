/**
 * 7 HOT RTP simülasyonu: node tools/simulate-7hot.js [tur] [bahis]
 *
 * Oyuncunun gördüğü akışın AYNISINI ölçer: motoru değil, oturum katmanını
 * (playRound) sürer. Böylece scatter respin garantisi, bedava dönüş ve
 * Çan Zinciri kuralları simülasyona birebir yansır.
 */
import { playRound, ensureState, createPools } from '../server/games/sevenhot/session.js';
import { JACKPOTS } from '../server/games/sevenhot/config.js';
import { SeededRng } from '../server/game/rng.js';

const spins = Number(process.argv[2] || 1_000_000);
const bet = Number(process.argv[3] || 40);
const rng = new SeededRng(90210);
const pools = createPools();

const player = {
  balance: 1e12,
  stats: { spins: 0, wagered: 0, won: 0, biggestWin: 0 }
};

let paid = 0;
let baseRet = 0;      // ucretli donuslerin kazanci
let freeRet = 0;      // bedava donuslerin kazanci
let bellRet = 0;      // Can Zinciri payi
let scatterRet = 0;
let bellTriggers = 0;
let bellSpins = 0;
let fullScreens = 0;
let fsTriggers = 0;
let respinTriggers = 0;
let respinSteps = 0;
let biggest = 0;
const jpHits = Object.fromEntries(JACKPOTS.levels.map((l) => [l.id, 0]));
const jpPaid = Object.fromEntries(JACKPOTS.levels.map((l) => [l.id, 0]));

while (paid < spins) {
  const wasFree = ensureState(player).free.remaining > 0;
  if (player.balance < 1e9) player.balance = 1e12;

  const { error, round } = playRound({ player, pools, rng, bet });
  if (error) throw new Error(error);

  if (!wasFree) paid += 1;
  if (wasFree) freeRet += round.totalWin;
  else baseRet += round.totalWin;

  scatterRet += round.scatter.amount;
  if (round.scatterRespin) {
    respinTriggers += 1;
    respinSteps += round.scatterRespin.steps.length;
  }
  if (round.freeSpinsAwarded > 0 && !wasFree) fsTriggers += 1;
  if (round.bellRound) {
    bellTriggers += 1;
    bellSpins += round.bellRound.spins;
    bellRet += round.bellRound.total;
    if (round.bellRound.full) fullScreens += 1;
    for (const j of round.bellRound.jackpotWins) {
      jpHits[j.level] += 1;
      jpPaid[j.level] += j.amount;
    }
  }
  if (round.totalWin > biggest) biggest = round.totalWin;
}

const wagered = paid * bet;
const pct = (v) => `%${((v / wagered) * 100).toFixed(2)}`;
const nf = (v) => Math.round(v).toLocaleString('tr-TR');
const total = baseRet + freeRet;

console.log(`\n═══ 7 HOT · ${nf(paid)} ücretli dönüş · bahis ${bet} ═══\n`);
console.log(`Temel oyun RTP    : ${pct(baseRet)}`);
console.log(`Bedava dönüş RTP  : ${pct(freeRet)}`);
console.log(`  Çan Zinciri payı: ${pct(bellRet)}  (yukarıdakilerin içinde)`);
console.log(`  Scatter ödemesi : ${pct(scatterRet)}`);
console.log(`TOPLAM RTP        : ${pct(total)}`);
console.log(`Kasa payı         : %${(100 - (total / wagered) * 100).toFixed(2)}`);
console.log('---');
console.log(`Çan Zinciri       : 1/${Math.round(paid / Math.max(1, bellTriggers))} dönüş · ` +
  `ort. ${(bellSpins / Math.max(1, bellTriggers)).toFixed(1)} respin · tam ekran ${fullScreens} kez`);
console.log(`Bedava dönüş      : 1/${Math.round(paid / Math.max(1, fsTriggers))} dönüş`);
console.log(`Scatter respin    : 1/${Math.round(paid / Math.max(1, respinTriggers))} dönüş · ` +
  `ort. ${(respinSteps / Math.max(1, respinTriggers)).toFixed(2)} tur`);
console.log(`En büyük kazanç   : ${nf(biggest)} (bahsin ${Math.round(biggest / bet)}x katı)`);
console.log('---');
for (const level of JACKPOTS.levels) {
  const hits = jpHits[level.id];
  const every = hits ? Math.round(paid / hits) : 0;
  console.log(
    `  ${level.name.padEnd(6)} isabet ${hits ? `1/${nf(every)}`.padEnd(12) : 'hiç'.padEnd(12)}` +
    ` · ödenen ${nf(jpPaid[level.id]).padStart(12)} · RTP ${pct(jpPaid[level.id])}`
  );
}
