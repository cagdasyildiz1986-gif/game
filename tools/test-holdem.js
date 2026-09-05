/** Hold'em motoru testleri: node tools/test-holdem.js */
import { HoldemTable } from '../server/live/holdem.js';

let passed = 0;
let failed = 0;
function check(name, actual, expected) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a === b) passed += 1;
  else {
    failed += 1;
    console.log(`  ✗ ${name}\n     beklenen ${b}\n     gelen    ${a}`);
  }
}

function makeTable(chips = [1000, 1000, 1000], options = {}) {
  const table = new HoldemTable({
    smallBlind: 10,
    bigBlind: 20,
    maxSeats: 6,
    actionSeconds: 30,
    rakePercent: 0,
    ...options
  });
  chips.forEach((amount, i) =>
    table.seatPlayer({ id: `p${i}`, name: `Oyuncu${i}`, avatar: '🦊', chips: amount })
  );
  return table;
}

/* ── 1. El baslangici ve blindler ── */
{
  const table = makeTable();
  check('başlangıçta el başlatılabilir', table.canStart(), true);
  table.startHand();
  check('faz preflop', table.phase, 'preflop');
  const bets = table.seats.filter(Boolean).map((s) => s.bet);
  check('blindler yatırıldı', bets.filter((b) => b > 0).sort((a, b) => a - b), [10, 20]);
  check('herkese 2 kart', table.seats.filter(Boolean).every((s) => s.cards.length === 2), true);
  check('pot görünümü blindleri içerir', table.view('p0').pot, 30);
}

/* ── 2. Tek oyuncu kalinca pot ona gider ── */
{
  const table = makeTable([1000, 1000]);
  table.startHand();
  const first = table.seats[table.actingSeat];
  table.act(first.id, 'fold');
  check('el bitti', table.phase, 'payout');
  check('tek kazanan', table.lastResult.winners.length, 1);
  const total = table.seats.filter(Boolean).reduce((sum, s) => sum + s.chips, 0);
  check('çip korunumu (2 oyuncu)', total, 2000);
}

/* ── 3. Sokaklar ilerliyor ── */
{
  const table = makeTable([1000, 1000, 1000]);
  table.startHand();
  // preflop: herkes call/check
  let guard = 0;
  while (table.phase === 'preflop' && guard++ < 10) {
    const player = table.seats[table.actingSeat];
    const legal = table.legalActions(player.id);
    table.act(player.id, legal.includes('call') ? 'call' : 'check');
  }
  check('flop açıldı', table.phase, 'flop');
  check('board 3 kart', table.board.length, 3);

  guard = 0;
  while (table.phase === 'flop' && guard++ < 10) {
    const player = table.seats[table.actingSeat];
    table.act(player.id, 'check');
  }
  check('turn açıldı', table.phase, 'turn');
  check('board 4 kart', table.board.length, 4);
}

/* ── 4. Min-raise kurali ── */
{
  const table = makeTable([1000, 1000]);
  table.startHand();
  const player = table.seats[table.actingSeat];
  const bad = table.act(player.id, 'raise', 25); // BB 20, min raise 20 -> en az 40
  check('düşük yükseltme reddedilir', Boolean(bad.error), true);
  const good = table.act(player.id, 'raise', 40);
  check('geçerli yükseltme kabul', good.ok, true);
  check('currentBet güncellendi', table.currentBet, 40);
}

/* ── 5. Yan pot: kisa yigin all-in ── */
{
  const table = makeTable([100, 1000, 1000]);
  table.startHand();
  // Kisa yigini all-in'e zorla, digerleri call
  let guard = 0;
  while (table.isHandActive() && guard++ < 40) {
    const player = table.seats[table.actingSeat];
    if (!player) break;
    const legal = table.legalActions(player.id);
    if (player.chips + player.bet <= 100 && legal.includes('allin')) {
      table.act(player.id, 'allin');
    } else if (legal.includes('call')) {
      table.act(player.id, 'call');
    } else {
      table.act(player.id, 'check');
    }
  }
  const total = table.seats.filter(Boolean).reduce((sum, s) => sum + s.chips, 0);
  check('çip korunumu (yan pot)', total, 2100);
  check('el tamamlandı', table.phase, 'payout');
}

/* ── 6. Cip korunumu: 200 rastgele el ── */
{
  let mismatches = 0;
  for (let run = 0; run < 200; run += 1) {
    const start = [500, 800, 1200, 300];
    const table = makeTable(start);
    const expected = start.reduce((a, b) => a + b, 0);
    let hands = 0;
    while (table.canStart() && hands < 6) {
      table.startHand();
      let guard = 0;
      while (table.isHandActive() && guard++ < 200) {
        const player = table.seats[table.actingSeat];
        if (!player) break;
        const legal = table.legalActions(player.id);
        if (!legal.length) break;
        const pick = legal[Math.floor(Math.random() * legal.length)];
        const amount =
          pick === 'raise'
            ? Math.min(player.bet + player.chips, table.currentBet + table.minRaise)
            : 0;
        const result = table.act(player.id, pick, amount);
        if (result.error) table.act(player.id, 'fold');
      }
      const total = table.seats.filter(Boolean).reduce((sum, s) => sum + s.chips, 0);
      if (total !== expected) mismatches += 1;
      table.settle();
      hands += 1;
    }
  }
  check('200 elde çip korunumu bozulmadı', mismatches, 0);
}

/* ── 7. Rake ── */
{
  const table = makeTable([1000, 1000], { rakePercent: 5, rakeCapBigBlinds: 3 });
  table.startHand();
  let guard = 0;
  while (table.isHandActive() && guard++ < 60) {
    const player = table.seats[table.actingSeat];
    if (!player) break;
    const legal = table.legalActions(player.id);
    table.act(player.id, legal.includes('call') ? 'call' : 'check');
  }
  const total = table.seats.filter(Boolean).reduce((sum, s) => sum + s.chips, 0);
  check('rake alındı (flop görüldüyse)', total <= 2000, true);
  check('rake cap aşılmadı', table.lastResult.rake <= 60, true);
}

/* ── 8. Kart gizliligi ── */
{
  const table = makeTable([1000, 1000]);
  table.startHand();
  const view = table.view('p0');
  const self = view.seats.find((s) => s.id === 'p0');
  const other = view.seats.find((s) => s.id === 'p1');
  check('kendi kartları görünür', self.cards?.length, 2);
  check('rakip kartları gizli', other.cards, null);
  check('rakip kart sayısı bilinir', other.cardCount, 2);
}

/* ── 9. Ev oynamiyor ── */
{
  const table = makeTable([1000, 1000]);
  table.startHand();
  const occupants = table.seats.filter(Boolean);
  check('masada yalnızca oyuncular var', occupants.every((s) => s.id.startsWith('p')), true);
  check('krupiye koltuğu yok', occupants.some((s) => s.id === 'dealer' || s.house), false);
}

console.log(`\nHold'em motoru: ${passed} geçti, ${failed} kaldı`);
process.exit(failed ? 1 : 0);
