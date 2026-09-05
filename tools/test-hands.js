/** El degerlendirici birim testleri: node tools/test-hands.js */
import { bestHand, compareScores, evaluateShowdown } from '../server/live/handEval.js';

const C = (text) =>
  text.split(' ').map((token) => {
    const suit = token.slice(-1).toLowerCase();
    const rankText = token.slice(0, -1).toUpperCase();
    const map = { A: 14, K: 13, Q: 12, J: 11, T: 10 };
    return { r: map[rankText] || Number(rankText), s: suit };
  });

let passed = 0;
let failed = 0;

function check(name, actual, expected) {
  const ok = actual === expected;
  if (ok) passed += 1;
  else {
    failed += 1;
    console.log(`  ✗ ${name}: beklenen "${expected}", gelen "${actual}"`);
  }
}

// --- Kategori tanima ---
check('Royal flush', bestHand(C('As Ks Qs Js Ts 2h 3d')).name, 'Straight Flush');
check('Straight flush', bestHand(C('9h 8h 7h 6h 5h Ad Kc')).name, 'Straight Flush');
check('Dörtlü', bestHand(C('7c 7d 7h 7s 2c 3d 4h')).name, 'Dörtlü');
check('Full house', bestHand(C('Kc Kd Kh 4s 4c 2d 7h')).name, 'Full House');
check('Floş', bestHand(C('Ad 9d 7d 4d 2d Kc Qh')).name, 'Floş');
check('Kent', bestHand(C('9c 8d 7h 6s 5c Ad Kh')).name, 'Kent');
check('Tekerlek kenti (A-5)', bestHand(C('Ac 2d 3h 4s 5c Kd Qh')).name, 'Kent');
check('Üçlü', bestHand(C('Qc Qd Qh 7s 4c 2d 9h')).name, 'Üçlü');
check('İki çift', bestHand(C('Jc Jd 8h 8s 4c 2d 9h')).name, 'İki Çift');
check('Bir çift', bestHand(C('Tc Td 8h 6s 4c 2d 9h')).name, 'Bir Çift');
check('Yüksek kart', bestHand(C('Ac Jd 8h 6s 4c 2d 9h')).name, 'Yüksek Kart');

// --- Karsilastirma ---
const higherFlush = bestHand(C('Ad Qd 9d 5d 2d 3c 4h'));
const lowerFlush = bestHand(C('Kd Qd 9d 5d 2d 3c 4h'));
check('As floş > Papaz floş', compareScores(higherFlush.score, lowerFlush.score), 1);

const aces = bestHand(C('Ac Ad 9h 5s 2c 3d 4h'));
const kings = bestHand(C('Kc Kd 9h 5s 2c 3d 4h'));
check('As çifti > Papaz çifti', compareScores(aces.score, kings.score), 1);

// Not: A-2-3-4-5 iceren eller tekerlek KENTI olur; kicker testi icin kentsiz el secilir.
const kicker1 = bestHand(C('Ac Ad Kh 9s 7c 3d 2h'));
const kicker2 = bestHand(C('Ac Ad Qh 9s 7c 3d 2h'));
check('Kicker: A çifti K vs Q', compareScores(kicker1.score, kicker2.score), 1);
check('Kicker eli çift kalmalı', kicker1.name, 'Bir Çift');

// Tekerlegin kent olarak taninmasi (yukaridaki tuzagin testi)
check('A-2-3-4-5 kent sayılır', bestHand(C('Ac Ad Kh 5s 2c 3d 4h')).name, 'Kent');

// Tekerlek kenti en dusuk kent olmali
const wheel = bestHand(C('Ac 2d 3h 4s 5c Kd Qh'));
const sixHigh = bestHand(C('2c 3d 4h 5s 6c Kd Qh'));
check('6-yüksek kent > tekerlek', compareScores(sixHigh.score, wheel.score), 1);

// --- Showdown ---
const board = C('Ah Kd 7c 3s 2h');
const showdown = evaluateShowdown([
  { id: 'a', cards: [...board, ...C('Ac Kc')] }, // iki çift A-K
  { id: 'b', cards: [...board, ...C('7h 7d')] }, // üçlü 7
  { id: 'c', cards: [...board, ...C('Qs Jh')] } // yüksek kart
]);
check('Showdown kazananı', showdown.winners.join(','), 'b');

const tie = evaluateShowdown([
  { id: 'x', cards: [...board, ...C('Qs Jh')] },
  { id: 'y', cards: [...board, ...C('Qd Jc')] }
]);
check('Beraberlik', tie.winners.sort().join(','), 'x,y');

console.log(`\nEl değerlendirici: ${passed} geçti, ${failed} kaldı`);
process.exit(failed ? 1 : 0);
