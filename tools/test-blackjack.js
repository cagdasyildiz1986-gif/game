/** Blackjack testleri: node tools/test-blackjack.js */
import { BlackjackTable, handValue, isBlackjack } from '../server/live/blackjack.js';

let passed = 0, failed = 0;
const check = (name, actual, expected) => {
  if (JSON.stringify(actual) === JSON.stringify(expected)) passed += 1;
  else { failed += 1; console.log(`  ✗ ${name}: beklenen ${JSON.stringify(expected)}, gelen ${JSON.stringify(actual)}`); }
};
const C = (t) => t.split(' ').map((x) => {
  const s = x.slice(-1).toLowerCase();
  const m = { A: 14, K: 13, Q: 12, J: 11, T: 10 };
  return { r: m[x.slice(0, -1).toUpperCase()] || Number(x.slice(0, -1)), s };
});

// El degeri
check('As+K = 21', handValue(C('Ah Ks')).total, 21);
check('As+As = 12', handValue(C('Ah As')).total, 12);
check('As+9+5 = 15 (As düşer)', handValue(C('Ah 9s 5d')).total, 15);
check('yumuşak 17', handValue(C('Ah 6s')), { total: 17, soft: true });
check('sert 17', handValue(C('Th 7s')), { total: 17, soft: false });
check('blackjack tanımı', isBlackjack(C('Ah Ks')), true);
check('3 kartlı 21 blackjack değil', isBlackjack(C('7h 7s 7d')), false);

// Masa akisi
{
  const t = new BlackjackTable({ minBet: 10, maxBet: 1000, maxSeats: 3, deckCount: 6 });
  t.seatPlayer({ id: 'a', name: 'A', avatar: '🦊', chips: 500 });
  t.seatPlayer({ id: 'b', name: 'B', avatar: '🐺', chips: 500 });
  check('bahis öncesi faz', t.phase, 'betting');
  check('düşük bahis reddedilir', Boolean(t.placeBet('a', 5).error), true);
  t.placeBet('a', 100);
  t.placeBet('b', 50);
  check('bahis çipten düşülür', t.player('a').chips, 400);
  t.deal();
  check('dağıtım sonrası faz', ['playing', 'insurance'].includes(t.phase), true);
  check('krupiyede 2 kart', t.dealer.cards.length, 2);
  check('gizli kart maskeli', t.view('a').dealer.cards[1], null);
}

// Cip korunumu: 400 tur rastgele
{
  let mismatch = 0;
  for (let run = 0; run < 400; run += 1) {
    const t = new BlackjackTable({ minBet: 10, maxBet: 200, maxSeats: 3, deckCount: 6 });
    const start = [1000, 1000, 1000];
    start.forEach((c, i) => t.seatPlayer({ id: `p${i}`, name: `P${i}`, avatar: '🦊', chips: c }));
    // Krupiyenin kasasi sinirsiz: oyuncu cipleri + masaya konan bahis toplami
    // her turun sonunda tutarli olmali (negatif cip olmamali).
    for (let round = 0; round < 5; round += 1) {
      for (const seat of t.seats.filter(Boolean)) {
        if (seat.chips >= 10) t.placeBet(seat.id, Math.min(50, seat.chips));
      }
      if (!t.readyToDeal()) break;
      t.deal();
      let guard = 0;
      while ((t.phase === 'playing' || t.phase === 'insurance') && guard++ < 60) {
        if (t.phase === 'insurance') { t.finishInsurance(); continue; }
        const p = t.seats[t.actingSeat];
        if (!p) break;
        const legal = t.legalActions(p.id);
        if (!legal.length) break;
        const pick = legal[Math.floor(Math.random() * legal.length)];
        const r = t.act(p.id, pick);
        if (r.error) t.act(p.id, 'stand');
      }
      if (t.seats.filter(Boolean).some((s) => s.chips < 0)) mismatch += 1;
      t.reset();
    }
  }
  check('400 turda negatif çip yok', mismatch, 0);
}

// Odeme kurallari
{
  const t = new BlackjackTable({ minBet: 10, maxBet: 1000, maxSeats: 1, blackjackPayout: 1.5 });
  t.seatPlayer({ id: 'a', name: 'A', avatar: '🦊', chips: 1000 });
  t.placeBet('a', 100);
  t.deal();
  const p = t.player('a');
  // Elleri elle kur: oyuncu blackjack, krupiye 20
  p.hands = [{ cards: C('Ah Ks'), bet: 100, done: true, doubled: false, split: false }];
  t.dealer.cards = C('Th Qs');
  t.dealer.hidden = false;
  t.settleRound();
  check('blackjack 3:2 öder', t.lastResult.results[0].payout, 250);
}
{
  const t = new BlackjackTable({ minBet: 10, maxBet: 1000, maxSeats: 1 });
  t.seatPlayer({ id: 'a', name: 'A', avatar: '🦊', chips: 1000 });
  t.placeBet('a', 100);
  t.deal();
  const p = t.player('a');
  p.hands = [{ cards: C('Th 8s'), bet: 100, done: true, doubled: false, split: false }];
  t.dealer.cards = C('Th 8d');
  t.dealer.hidden = false;
  t.settleRound();
  check('berabere bahsi iade eder', t.lastResult.results[0].outcome, 'push');
}
{
  const t = new BlackjackTable({ minBet: 10, maxBet: 1000, maxSeats: 1 });
  t.seatPlayer({ id: 'a', name: 'A', avatar: '🦊', chips: 1000 });
  t.placeBet('a', 100);
  t.deal();
  const p = t.player('a');
  p.hands = [{ cards: C('Th 5s 9d'), bet: 100, done: true, doubled: false, split: false }];
  t.dealer.cards = C('Th 7d');
  t.dealer.hidden = false;
  t.settleRound();
  check('batan el kaybeder', t.lastResult.results[0].outcome, 'bust');
}

// Krupiye kurali
{
  const soft17Stand = new BlackjackTable({ minBet: 10, maxBet: 100, dealerHitsSoft17: false });
  soft17Stand.dealer.cards = C('Ah 6s');
  soft17Stand.seatPlayer({ id: 'a', name: 'A', avatar: '🦊', chips: 500 });
  soft17Stand.player('a').hands = [{ cards: C('Th 9s'), bet: 10, done: true }];
  soft17Stand.playDealer();
  check('yumuşak 17de durur', soft17Stand.dealer.cards.length, 2);

  const soft17Hit = new BlackjackTable({ minBet: 10, maxBet: 100, dealerHitsSoft17: true });
  soft17Hit.dealer.cards = C('Ah 6s');
  soft17Hit.seatPlayer({ id: 'a', name: 'A', avatar: '🦊', chips: 500 });
  soft17Hit.player('a').hands = [{ cards: C('Th 9s'), bet: 10, done: true }];
  soft17Hit.playDealer();
  check('ayar açıkken yumuşak 17de çeker', soft17Hit.dealer.cards.length > 2, true);
}

console.log(`\nBlackjack: ${passed} geçti, ${failed} kaldı`);
process.exit(failed ? 1 : 0);
