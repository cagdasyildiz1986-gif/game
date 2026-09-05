/** YILDIRIM tur değişmezleri: node tools/test-yildirim.js */
import { playRound, ensureState } from '../server/games/yildirim/session.js';
import {
  REELS, ROWS, MIN_CLUSTER, PAY_SYMBOLS, BET_LEVELS, MAX_WIN,
  FREE_SPINS, RETRIGGER, TIERS, payFor
} from '../server/games/yildirim/config.js';
import { SeededRng } from '../server/game/rng.js';

let passed = 0;
const failures = [];
function check(name, condition, detail = '') {
  if (condition) passed += 1;
  else failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
}

const isOrb = (cell) => typeof cell === 'object' && cell !== null;
const symbolOf = (cell) => (isOrb(cell) ? 'MULT' : cell);

/** Bir ızgarada her ödeme sembolünün adedi. */
function counts(grid) {
  const out = {};
  for (const column of grid) {
    for (const cell of column) {
      const s = symbolOf(cell);
      if (PAY_SYMBOLS.includes(s)) out[s] = (out[s] || 0) + 1;
    }
  }
  return out;
}

const rng = new SeededRng(70707);
const bet = 20;
const player = { balance: 1e7, stats: { spins: 0, wagered: 0, won: 0, biggestWin: 0 } };

let seenTumble = 0;
let seenOrb = 0;
let seenFree = 0;
let seenRetrigger = 0;
let maxTumbles = 0;
let maxMultiplier = 0;

for (let i = 0; i < 200000; i += 1) {
  const wasFree = ensureState(player).free.remaining > 0;
  if (player.balance < 1e6) player.balance = 1e7;
  const before = player.balance;
  const { error, round } = playRound({ player, rng, bet });
  if (error) {
    failures.push(`beklenmeyen hata: ${error}`);
    break;
  }

  /* Muhasebe */
  const stake = wasFree ? 0 : round.bet;
  const delta = player.balance - before;
  if (Math.abs(delta - (round.totalWin - stake)) > 0.011) {
    failures.push(`bakiye tutmuyor: Δ${delta} ≠ ${round.totalWin - stake}`);
    break;
  }

  /* Izgara boyutu — her adımda */
  for (const step of round.steps) {
    if (step.grid.length !== REELS || step.grid.some((c) => c.length !== ROWS)) {
      failures.push('ızgara 6x5 değil');
      break;
    }
  }
  if (failures.length) break;

  /* Kazanan adımlarda gerçekten 8+ sembol olmalı ve ödeme tabloyla uyuşmalı */
  for (const step of round.steps) {
    for (const win of step.wins) {
      if (win.count < MIN_CLUSTER) {
        failures.push(`${win.count} sembol ödedi (en az ${MIN_CLUSTER})`);
      }
      const c = counts(step.grid);
      if (c[win.symbol] !== win.count) {
        failures.push(`${win.symbol}: ızgarada ${c[win.symbol]}, kazançta ${win.count}`);
      }
      if (win.positions.length !== win.count) failures.push('konum sayısı adetle uyuşmuyor');
    }
    if (step.wins.length && !step.next) failures.push('kazançlı adımın devamı yok');
  }
  if (failures.length) break;

  /* Son adımda kazanç KALMAMIŞ olmalı — tumble tam bitmiş demektir */
  const last = round.steps.at(-1);
  if (last.wins.length) failures.push('dizi kazançla bitti');

  /* Küreler ödeme sembolü sayılmamalı */
  for (const step of round.steps) {
    const c = counts(step.grid);
    if (c.MULT) failures.push('küre ödeme sembolü olarak sayıldı');
  }

  if (round.tumbles > 0) seenTumble += 1;
  if (round.orbs.length) seenOrb += 1;
  maxTumbles = Math.max(maxTumbles, round.tumbles);
  maxMultiplier = Math.max(maxMultiplier, round.multiplier);

  /* Çarpan kuralı */
  if (!round.free) {
    const expected = round.orbTotal > 0 ? round.orbTotal : 1;
    if (round.multiplier !== expected) {
      failures.push(`temel oyun çarpanı ${round.multiplier}, beklenen ${expected}`);
    }
  } else {
    if (round.multiplierAfter !== round.multiplierBefore + round.orbTotal) {
      failures.push('bedava dönüşte çarpan birikmiyor');
    }
    if (round.multiplier !== Math.max(1, round.multiplierAfter)) {
      failures.push('bedava dönüşte uygulanan çarpan birikmiş toplam değil');
    }
  }

  /* Bedava dönüş ödülü */
  if (round.freeSpinsAwarded > 0) {
    if (round.free) {
      seenRetrigger += 1;
      if (round.scatter.count < RETRIGGER.min) failures.push('yetersiz scatter ile retrigger');
      if (round.freeSpinsAwarded !== RETRIGGER.spins) failures.push('retrigger dönüşü yanlış');
    } else {
      seenFree += 1;
      const expected = FREE_SPINS[Math.min(round.scatter.count, 6)] || 0;
      if (round.freeSpinsAwarded !== expected) {
        failures.push(`${round.scatter.count} scatter → ${round.freeSpinsAwarded} (beklenen ${expected})`);
      }
    }
  }

  /* Tavan */
  if (round.totalWin > MAX_WIN * round.bet + 0.01) {
    failures.push(`tavan aşıldı: ${round.totalWin}`);
  }

  if (failures.length) break;
}

check('tur değişmezleri tutarlı', failures.length === 0, failures[0]);
check('tumble görüldü', seenTumble > 1000, `${seenTumble} tur`);
check('çarpan küresi düştü', seenOrb > 1000, `${seenOrb} tur`);
check('bedava dönüş tetiklendi', seenFree > 100, `${seenFree} kez`);
check('retrigger görüldü', seenRetrigger > 0, `${seenRetrigger} kez`);

/* Ödeme tablosu kademeleri artan olmalı */
const [t1, t2, t3] = TIERS;
check(
  'ödeme kademeleri artıyor',
  PAY_SYMBOLS.every((s) => payFor(s, t1) < payFor(s, t2) && payFor(s, t2) < payFor(s, t3))
);
check('8 altı ödemiyor', PAY_SYMBOLS.every((s) => payFor(s, MIN_CLUSTER - 1) === 0));

/* Bahis doğrulaması */
ensureState(player).free.remaining = 0;
check('geçersiz bahis reddedildi', Boolean(playRound({ player, rng, bet: 33 }).error));
check('bahis seviyeleri artan', BET_LEVELS.every((b, i) => i === 0 || b > BET_LEVELS[i - 1]));

const poor = { balance: 1, stats: { spins: 0, wagered: 0, won: 0, biggestWin: 0 } };
check('yetersiz bakiye reddedildi', Boolean(playRound({ player: poor, rng, bet: 20 }).error));

console.log(`\nYILDIRIM: ${passed} geçti, ${failures.length} kaldı`);
if (failures.length) {
  failures.slice(0, 5).forEach((f) => console.log('  ✗', f));
  process.exit(1);
}
console.log(
  `  tumble ${seenTumble} · küre ${seenOrb} · bedava ${seenFree} · retrigger ${seenRetrigger} · ` +
    `en uzun dizi ${maxTumbles} · en yüksek çarpan x${maxMultiplier}`
);
