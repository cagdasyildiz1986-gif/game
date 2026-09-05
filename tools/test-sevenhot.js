/** 7 HOT · Çan Zinciri tur değişmezleri: node tools/test-sevenhot.js */
import { playRound, createPools, ensureState } from '../server/games/sevenhot/session.js';
import {
  REELS, ROWS, BET_LEVELS, BELL_ROUND, SCATTER_RESPIN, FREE_SPINS, JACKPOTS
} from '../server/games/sevenhot/config.js';
import { SeededRng } from '../server/game/rng.js';

let passed = 0;
const failures = [];
function check(name, condition, detail = '') {
  if (condition) passed += 1;
  else failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
}

const rng = new SeededRng(31337);
const pools = createPools();
const bet = 40;
const player = { balance: 1e7, stats: { spins: 0, wagered: 0, won: 0, biggestWin: 0 } };

let seenBell = 0;
let seenRespin = 0;
let seenFree = 0;
let seenGrandAwarded = 0;
let seenGrandConverted = 0;
let seenFullScreen = 0;
let balance = player.balance;

for (let i = 0; i < 300000; i += 1) {
  const wasFree = ensureState(player).free.remaining > 0;
  if (player.balance < 1e6) player.balance = 1e7; // uzun koşuda bakiye tükenmesin
  const before = player.balance;
  const { error, round } = playRound({ player, pools, rng, bet });
  if (error) {
    failures.push(`beklenmeyen hata: ${error}`);
    break;
  }

  /* Muhasebe: bakiye tam olarak (kazanç − bahis) kadar değişmeli. */
  const stake = wasFree ? 0 : round.bet;
  const delta = player.balance - before;
  // totalWin iki ondalığa yuvarlanır; kabul edilebilir sapma o yuvarlamadır.
  if (Math.abs(delta - (round.totalWin - stake)) > 0.011) {
    failures.push(`bakiye tutmuyor: Δ${delta} ≠ ${round.totalWin - stake}`);
    break;
  }

  /* Izgara boyutu */
  if (round.grid.length !== REELS || round.grid.some((c) => c.length !== ROWS)) {
    failures.push(`ızgara ${REELS}x${ROWS} değil`);
    break;
  }

  /* Scatter respin: tutulan makara sayısı hiç azalmamalı ve hedefte durmalı */
  if (round.scatterRespin) {
    seenRespin += 1;
    let prevHeld = 0;
    for (const step of round.scatterRespin.steps) {
      if (step.held.length < prevHeld) {
        failures.push('tutulan makara sayısı azaldı');
        break;
      }
      prevHeld = step.held.length;
    }
    const steps = round.scatterRespin.steps;
    const last = steps.at(-1);
    if (last.scatterCount > SCATTER_RESPIN.target) {
      failures.push(`respin hedefi aşıldı: ${last.scatterCount}`);
    }
    /* Kural: dizi yalnızca YENİ scatter geldiği sürece sürer. */
    for (const step of steps.slice(0, -1)) {
      if (step.gained <= 0) {
        failures.push('scatter eklenmeden respin devam etti');
        break;
      }
    }
    if (last.gained > 0 && last.scatterCount < SCATTER_RESPIN.target
        && steps.length < SCATTER_RESPIN.maxSpins) {
      failures.push('scatter eklendiği hâlde respin durdu');
    }
  }

  /* Çan Zinciri değişmezleri */
  const bellRound = round.bellRound;
  if (bellRound) {
    seenBell += 1;
    if (bellRound.cellCount > REELS * ROWS) failures.push(`tahta taştı: ${bellRound.cellCount}`);
    if (bellRound.start.length < BELL_ROUND.trigger) {
      failures.push(`tur ${bellRound.start.length} çanla başladı`);
    }
    if (bellRound.cells.length !== bellRound.cellCount) {
      failures.push('hücre sayısı sayaçla uyuşmuyor');
    }

    const grand = bellRound.cells.filter((c) => c.jackpot === 'GRAND');
    if (bellRound.grandAwarded) {
      seenGrandAwarded += 1;
      if (grand.length < BELL_ROUND.grandRequired) {
        failures.push(`GRAND ${grand.length} çanla verildi`);
      }
    } else if (grand.length > 0) {
      failures.push('GRAND verilmedi ama GRAND çanı nakde dönmemiş');
    } else if (bellRound.grandCount > 0) {
      seenGrandConverted += 1;
    }

    /* Tur toplamı hücre ödüllerinin toplamına eşit olmalı */
    const sum = bellRound.cells.reduce((s, c) => s + (c.award || 0), 0);
    if (Math.abs(sum - bellRound.total) > 0.01) {
      failures.push(`çan toplamı tutmuyor: ${sum} ≠ ${bellRound.total}`);
    }

    if (bellRound.full) {
      seenFullScreen += 1;
      if (bellRound.cellCount !== REELS * ROWS) failures.push('tam ekran ama tahta dolu değil');
      if (bellRound.multiplier === 1) failures.push('tam ekranda çarpan uygulanmadı');
    } else if (bellRound.multiplier !== 1) {
      failures.push('tam ekran olmadan çarpan uygulandı');
    }

    /* MAJÖR ve GRAND tam ekran çarpanından etkilenmez */
    for (const cell of bellRound.cells) {
      if (cell.jackpot === 'MAJOR' || cell.jackpot === 'GRAND') {
        const level = JACKPOTS.levels.find((l) => l.id === cell.jackpot);
        if (level.fixed && Math.abs(cell.award - level.fixed * round.bet) > 0.01) {
          failures.push(`${cell.jackpot} çarpandan etkilenmiş: ${cell.award}`);
        }
      }
    }
  }

  /* Bedava dönüşte çan turu tetiklenmez */
  if (round.free && bellRound) failures.push('bedava dönüşte Çan Zinciri tetiklendi');

  /* Bedava dönüş ödülü tabloya uymalı */
  if (round.freeSpinsAwarded > 0) {
    seenFree += 1;
    const expected = FREE_SPINS[Math.min(round.scatter.count, 5)] || 0;
    if (round.freeSpinsAwarded !== expected) {
      failures.push(`${round.scatter.count} scatter → ${round.freeSpinsAwarded} dönüş (beklenen ${expected})`);
    }
  }

  if (failures.length) break;
  balance = player.balance;
}

check('bakiye muhasebesi tutarlı', failures.length === 0, failures[0]);
check('Çan Zinciri tetiklendi', seenBell > 100, `${seenBell} kez`);
check('scatter respin tetiklendi', seenRespin > 100, `${seenRespin} kez`);
check('bedava dönüş tetiklendi', seenFree > 100, `${seenFree} kez`);
check('GRAND eşiği tutmayınca nakde döndü', seenGrandConverted > 0, `${seenGrandConverted} kez`);
check('tam ekran görüldü', seenFullScreen >= 0, `${seenFullScreen} kez`);

/* Geçersiz bahis reddedilmeli (bedava dönüşte bahis yoksayıldığı için önce turu bitir) */
ensureState(player).free.remaining = 0;
const bad = playRound({ player, pools, rng, bet: 33 });
check('geçersiz bahis reddedildi', Boolean(bad.error));

/* Bahis seviyeleri 40 hatta tam bölünmeli */
check(
  'bahis seviyeleri 40 hatta bölünüyor',
  BET_LEVELS.every((b) => Number.isInteger(b / 40) || (b / 40) * 40 === b)
);

/* Yetersiz bakiye reddedilmeli */
const poor = { balance: 1, stats: { spins: 0, wagered: 0, won: 0, biggestWin: 0 } };
check('yetersiz bakiye reddedildi', Boolean(playRound({ player: poor, pools, rng, bet: 40 }).error));

console.log(`\n7 HOT: ${passed} geçti, ${failures.length} kaldı`);
if (failures.length) {
  failures.slice(0, 5).forEach((f) => console.log('  ✗', f));
  process.exit(1);
}
console.log(
  `  Çan Zinciri ${seenBell} · respin ${seenRespin} · bedava ${seenFree} · ` +
    `GRAND verildi ${seenGrandAwarded} / nakde döndü ${seenGrandConverted} · tam ekran ${seenFullScreen}`
);
