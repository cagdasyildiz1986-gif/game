/**
 * Kazanç dagilimi analizi: "oyuncu neye gore kazaniyor?" sorusunun sayisal cevabi.
 * Kullanim: node tools/analyze.js [spinSayisi]
 */
import { resolveSpin } from '../server/game/engine.js';
import { SeededRng } from '../server/game/rng.js';
import { BASE_REEL_COUNTS } from '../server/game/reels.js';
import { PAYTABLE } from '../server/game/paytable.js';

const spins = Number(process.argv[2] || 3_000_000);
const bet = 20;
const rng = new SeededRng(4242);

const buckets = {
  'Kayıp (0 kazanç)': 0,
  'Bahsin altında (0-1x)': 0,
  'Başa baş (1-2x)': 0,
  'Küçük (2-5x)': 0,
  'Orta (5-20x)': 0,
  'Büyük (20-100x)': 0,
  'Çok büyük (100x+)': 0
};
const bySymbol = {};
let wagered = 0;
let returned = 0;
let freeSpinReturn = 0;

for (let i = 0; i < spins; i += 1) {
  wagered += bet;
  const r = resolveSpin({ rng, totalBet: bet, free: false });
  let win = r.totalWin;
  for (const w of r.wins) {
    bySymbol[w.symbol] = (bySymbol[w.symbol] || 0) + w.amount;
  }
  let remaining = r.freeSpinsAwarded;
  while (remaining > 0) {
    remaining -= 1;
    const fs = resolveSpin({ rng, totalBet: bet, free: true });
    win += fs.totalWin;
    freeSpinReturn += fs.totalWin;
    for (const w of fs.wins) bySymbol[w.symbol] = (bySymbol[w.symbol] || 0) + w.amount;
    remaining += fs.freeSpinsAwarded;
    if (remaining > 500) break;
  }
  returned += win;

  const ratio = win / bet;
  if (win === 0) buckets['Kayıp (0 kazanç)'] += 1;
  else if (ratio < 1) buckets['Bahsin altında (0-1x)'] += 1;
  else if (ratio < 2) buckets['Başa baş (1-2x)'] += 1;
  else if (ratio < 5) buckets['Küçük (2-5x)'] += 1;
  else if (ratio < 20) buckets['Orta (5-20x)'] += 1;
  else if (ratio < 100) buckets['Büyük (20-100x)'] += 1;
  else buckets['Çok büyük (100x+)'] += 1;
}

const pct = (n) => `%${((n / spins) * 100).toFixed(2)}`;

console.log(`\n═══ ${spins.toLocaleString('tr-TR')} dönüş · bahis ${bet} ═══\n`);
console.log('SONUÇ DAĞILIMI (tek dönüşte ne oluyor):');
for (const [name, count] of Object.entries(buckets)) {
  const bar = '█'.repeat(Math.round((count / spins) * 60));
  console.log(`  ${name.padEnd(24)} ${pct(count).padStart(7)}  ${bar}`);
}

console.log('\nMAKARA ŞERİDİNDEKİ SEMBOL SAYILARI (olasılığı bunlar belirler):');
const symbols = Object.keys(BASE_REEL_COUNTS[0]);
console.log('  sembol'.padEnd(12) + BASE_REEL_COUNTS.map((_, i) => `M${i + 1}`.padStart(5)).join('') + '   tek makarada şans');
for (const sym of symbols) {
  const counts = BASE_REEL_COUNTS.map((c) => c[sym] || 0);
  const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
  console.log(
    `  ${sym.padEnd(10)}` +
      counts.map((c) => String(c).padStart(5)).join('') +
      `   ${((avg / 50) * 100).toFixed(1)}%`
  );
}

console.log('\nRTP\'NİN KAYNAĞI (hangi sembol ne kadar ödedi):');
const total = Object.values(bySymbol).reduce((a, b) => a + b, 0);
for (const [sym, amount] of Object.entries(bySymbol).sort((a, b) => b[1] - a[1])) {
  const share = (amount / total) * 100;
  console.log(
    `  ${sym.padEnd(10)} ${((amount / wagered) * 100).toFixed(2).padStart(6)}% RTP` +
      `   (toplam ödemenin %${share.toFixed(1)}'i)`
  );
}

console.log(`\n  Temel oyun RTP        : %${((returned / wagered) * 100).toFixed(2)}`);
console.log(`  Bunun bedava dönüşten : %${((freeSpinReturn / wagered) * 100).toFixed(2)}`);
console.log(`  Kasa payı             : %${(100 - (returned / wagered) * 100).toFixed(2)}\n`);

// En yuksek sembolun 5'li ihtimali (wild olmadan, tek hat)
const sevenProb = BASE_REEL_COUNTS.reduce((p, c) => p * ((c.SEVEN || 0) / 50), 1);
const starProb = BASE_REEL_COUNTS.reduce((p, c) => p * ((c.STAR || 0) / 50), 1);
console.log('BELİRLİ KOMBİNASYON İHTİMALLERİ (tek hatta, wild hariç):');
console.log(`  5x YEDİ   : 1 / ${Math.round(1 / sevenProb).toLocaleString('tr-TR')}  (ödeme ${PAYTABLE.SEVEN[5]}x hat bahsi)`);
console.log(`  5x YILDIZ : 1 / ${Math.round(1 / starProb).toLocaleString('tr-TR')}  (ödeme ${PAYTABLE.STAR[5]}x hat bahsi)`);
console.log('  Not: 20 hat olduğu için bir dönüşte yakalama şansı yaklaşık 20 katıdır.\n');
