/** YILDIRIM RTP simülasyonu: node tools/simulate-yildirim.js [tur] [bahis] */
import { playRound, ensureState } from '../server/games/yildirim/session.js';
import { MAX_WIN } from '../server/games/yildirim/config.js';
import { SeededRng } from '../server/game/rng.js';

const spins = Number(process.argv[2] || 500_000);
const bet = Number(process.argv[3] || 20);
const rng = new SeededRng(20260905);

const player = {
  balance: 1e12,
  stats: { spins: 0, wagered: 0, won: 0, biggestWin: 0 }
};

let paidSpins = 0;
let baseWin = 0;      // ucretli donuslerin kazanci
let freeWin = 0;      // bedava donuslerin kazanci
let scatterWin = 0;
let triggers = 0;
let retriggers = 0;
let tumbleTotal = 0;
let orbSpins = 0;
let biggest = 0;
let capHits = 0;
let winningSpins = 0;
const tumbleHist = {};

while (paidSpins < spins) {
  const wasFree = ensureState(player).free.remaining > 0;
  if (player.balance < 1e9) player.balance = 1e12;
  const { error, round } = playRound({ player, rng, bet });
  if (error) throw new Error(error);

  if (!wasFree) paidSpins += 1;
  if (wasFree) freeWin += round.totalWin;
  else baseWin += round.totalWin;

  scatterWin += round.scatter.pay;
  tumbleTotal += round.tumbles;
  tumbleHist[Math.min(round.tumbles, 10)] = (tumbleHist[Math.min(round.tumbles, 10)] || 0) + 1;
  if (round.orbTotal > 0) orbSpins += 1;
  if (round.totalWin > 0) winningSpins += 1;
  if (round.capped) capHits += 1;
  if (round.totalWin > biggest) biggest = round.totalWin;
  if (round.freeSpinsAwarded > 0) {
    if (wasFree) retriggers += 1;
    else triggers += 1;
  }
}

const wagered = paidSpins * bet;
const pct = (v) => `%${((v / wagered) * 100).toFixed(2)}`;
const nf = (v) => Math.round(v).toLocaleString('tr-TR');

console.log(`\n═══ YILDIRIM · ${nf(paidSpins)} ücretli dönüş · bahis ${bet} ═══\n`);
console.log(`Temel oyun RTP    : ${pct(baseWin)}`);
console.log(`Bedava dönüş RTP  : ${pct(freeWin)}`);
console.log(`  (scatter ödemesi: ${pct(scatterWin)} — yukarıdakilerin içinde)`);
console.log(`TOPLAM RTP        : ${pct(baseWin + freeWin)}`);
console.log(`Kasa payı         : %${(100 - ((baseWin + freeWin) / wagered) * 100).toFixed(2)}`);
console.log('---');
console.log(`Kazanma sıklığı   : %${((winningSpins / player.stats.spins) * 100).toFixed(2)}`);
console.log(`Bedava dönüş      : 1/${Math.round(paidSpins / Math.max(1, triggers))} dönüş · ${nf(triggers)} kez`);
console.log(`Retrigger         : ${nf(retriggers)} kez`);
console.log(`Ortalama tumble   : ${(tumbleTotal / player.stats.spins).toFixed(2)}`);
console.log(`Küreli dönüş      : %${((orbSpins / player.stats.spins) * 100).toFixed(2)}`);
console.log(`En büyük kazanç   : ${nf(biggest)} (bahsin ${Math.round(biggest / bet)}x katı)`);
console.log(`Tavana takılan    : ${nf(capHits)} tur (tavan ${MAX_WIN}x)`);
console.log('---');
const order = Object.keys(tumbleHist).map(Number).sort((a, b) => a - b);
console.log('Tumble dağılımı   : ' + order.map((k) => `${k}${k === 10 ? '+' : ''}:%${((tumbleHist[k] / player.stats.spins) * 100).toFixed(1)}`).join('  '));
