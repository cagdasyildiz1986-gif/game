/** MAVİ MERA tur değişmezleri: node tools/test-mavimera.js */
import { playRound, createPools, ensureState } from '../server/games/mavimera/session.js';
import {
  REELS, ROWS, LINES, BET_LEVELS, FREE_SPINS, COLLECT, MAX_WIN,
  WILD, SCATTER, MONEY, WILD_REELS_BASE, WILD_REELS_FREE
} from '../server/games/mavimera/config.js';
import { SeededRng } from '../server/game/rng.js';

let passed = 0;
const failures = [];
function check(name, condition, detail = '') {
  if (condition) passed += 1;
  else failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
}

const rng = new SeededRng(4242);
const pools = createPools();
const bet = 40;
const player = { balance: 1e7, stats: { spins: 0, wagered: 0, won: 0, biggestWin: 0 } };

let seenFree = 0;
let seenCollect = 0;
let seenJackpot = 0;
let seenLevelUp = 0;
let maxLevel = 1;

for (let i = 0; i < 300000; i += 1) {
  const st = ensureState(player);
  const wasFree = st.free.remaining > 0;
  const fishermenBefore = wasFree ? st.free.fishermen : 0;
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
  if (Math.abs(delta - (round.totalWin - stake)) > 0.011) {
    failures.push(`bakiye tutmuyor: Δ${delta} ≠ ${round.totalWin - stake}`);
    break;
  }

  /* Izgara boyutu */
  if (round.grid.length !== REELS || round.grid.some((c) => c.length !== ROWS)) {
    failures.push(`ızgara ${REELS}x${ROWS} değil`);
    break;
  }

  /* Wild yalnızca izinli makaralarda sayılmalı */
  const allowed = round.free ? WILD_REELS_FREE : WILD_REELS_BASE;
  if (round.fishers.some(([reel]) => !allowed.includes(reel))) {
    failures.push('balıkçı izinsiz makarada sayıldı');
    break;
  }

  /* Para balıkları ızgaradaki PARA hücreleriyle birebir eşleşmeli */
  const paraCells = [];
  for (let r = 0; r < REELS; r += 1) {
    for (let row = 0; row < ROWS; row += 1) if (round.grid[r][row] === MONEY) paraCells.push(`${r}:${row}`);
  }
  if (paraCells.length !== round.money.length) {
    failures.push(`para balığı sayısı uyuşmuyor: ${paraCells.length} ≠ ${round.money.length}`);
    break;
  }
  /* Her para balığının değeri ilk andan bellidir */
  if (round.money.some((m) => m.value === undefined && !m.jackpot)) {
    failures.push('değersiz para balığı');
    break;
  }

  /* Toplama yalnızca balıkçı + para birlikteyken olur */
  const shouldCollect = round.fishers.length > 0 && round.money.length > 0;
  if (Boolean(round.collect) !== shouldCollect) {
    failures.push(`toplama beklentiyle uyuşmuyor (balıkçı ${round.fishers.length}, para ${round.money.length})`);
    break;
  }

  if (round.collect) {
    seenCollect += 1;
    /* Her balıkçı ekrandaki TÜM para balıklarını toplar */
    if (round.collect.cells.length !== round.money.length) {
      failures.push('toplanan hücre sayısı ekrandakinden farklı');
      break;
    }
    const sum = round.collect.cells.reduce((s, c) => s + c.award, 0);
    if (Math.abs(sum - round.collect.total) > 0.05) {
      failures.push(`toplama toplamı tutmuyor: ${sum} ≠ ${round.collect.total}`);
      break;
    }
    /* Nakit balıklar seviye çarpanı ve balıkçı sayısıyla ödenir */
    for (const cell of round.collect.cells) {
      if (cell.jackpot) continue;
      const expected = cell.value * bet * round.collect.multiplier * round.collect.fishers;
      if (Math.abs(cell.award - expected) > 0.05) {
        failures.push(`para ödülü tutmuyor: ${cell.award} ≠ ${expected}`);
        break;
      }
    }
    if (round.collect.jackpotWins.length) seenJackpot += round.collect.jackpotWins.length;
  }

  /* Seviye merdiveni */
  if (round.free) {
    const expectedLevel = Math.min(
      Math.floor(fishermenBefore / COLLECT.perLevel) + 1,
      COLLECT.levels.length
    );
    if (round.level.before !== expectedLevel) {
      failures.push(`seviye tutmuyor: ${round.level.before} ≠ ${expectedLevel}`);
      break;
    }
    if (round.collect && round.collect.multiplier !== COLLECT.levels[expectedLevel - 1]) {
      failures.push('çarpan seviyeyle uyuşmuyor');
      break;
    }
    if (round.level.ups > 0) {
      seenLevelUp += 1;
      if (round.level.extraSpins !== round.level.ups * COLLECT.extraSpins) {
        failures.push('seviye atlama ek dönüş vermedi');
        break;
      }
    }
    maxLevel = Math.max(maxLevel, round.level.after);
  } else if (round.level.before !== 1 || round.level.multiplier !== 1) {
    failures.push('temel oyunda çarpan 1 değil');
    break;
  }

  /* Bedava dönüş ödülü tabloya uymalı */
  if (round.freeSpinsAwarded > 0) {
    seenFree += 1;
    const expected = FREE_SPINS[Math.min(round.scatter.count, 5)] || 0;
    if (round.freeSpinsAwarded !== expected) {
      failures.push(`${round.scatter.count} dümen → ${round.freeSpinsAwarded} dönüş (beklenen ${expected})`);
      break;
    }
  }

  /* Kazanç tavanı */
  if (round.totalWin > MAX_WIN * bet + 0.01) {
    failures.push(`tavan aşıldı: ${round.totalWin}`);
    break;
  }

  if (failures.length) break;
}

check('tur değişmezleri tutarlı', failures.length === 0, failures[0]);
check('balıkçı toplaması görüldü', seenCollect > 1000, `${seenCollect} kez`);
check('bedava dönüş tetiklendi', seenFree > 100, `${seenFree} kez`);
check('seviye atlandı', seenLevelUp > 50, `${seenLevelUp} kez`);
check('jackpot toplandı', seenJackpot > 0, `${seenJackpot} kez`);
check('merdivenin tepesi görüldü', maxLevel === COLLECT.levels.length, `en yüksek ${maxLevel}`);

/* Geçersiz bahis reddedilmeli (bedava dönüşte bahis yoksayıldığı için önce turu bitir) */
ensureState(player).free.remaining = 0;
check('geçersiz bahis reddedildi', Boolean(playRound({ player, pools, rng, bet: 33 }).error));

/* Bahis seviyeleri 20 hatta tam bölünmeli */
check('bahis seviyeleri 20 hatta bölünüyor', BET_LEVELS.every((b) => Number.isInteger(b / LINES)));

/* Yetersiz bakiye reddedilmeli */
const poor = { balance: 1, stats: { spins: 0, wagered: 0, won: 0, biggestWin: 0 } };
check('yetersiz bakiye reddedildi', Boolean(playRound({ player: poor, pools, rng, bet: 40 }).error));

/* Sembol kimlikleri çakışmamalı */
check('özel semboller ayrı', new Set([WILD, SCATTER, MONEY]).size === 3);

console.log(`\nMAVİ MERA: ${passed} geçti, ${failures.length} kaldı`);
if (failures.length) {
  failures.slice(0, 5).forEach((f) => console.log('  ✗', f));
  process.exit(1);
}
console.log(
  `  toplama ${seenCollect} · bedava ${seenFree} · seviye atlama ${seenLevelUp} · ` +
    `jackpot ${seenJackpot} · en yüksek seviye ${maxLevel}`
);
