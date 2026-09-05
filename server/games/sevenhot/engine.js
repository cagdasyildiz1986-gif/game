import {
  REELS, ROWS, PAYTABLE, SCATTER_PAY, FREE_SPINS, SCATTER_RESPIN, BELL_ROUND,
  BELL_VALUES, BOOST_CHANCE, JACKPOTS, jackpotAmount, BASE_REELS, FREE_REELS,
  WILD, SCATTER, BELL, WILD_REELS
} from './config.js';
import { PAYLINES } from './paylines.js';

/**
 * 7 HOT · Çan Zinciri motoru.
 *
 * Üç ayrı durum makinesi vardır ve hepsi SUNUCUDA çalışır:
 *  1. Temel oyun    — 5x4 çevirme, 40 hat, scatter, çan tespiti
 *  2. Scatter respin — scatter'lı makaralar tutulur, diğerleri döner
 *  3. Çan Zinciri    — çanlar kilitlenir, boş hücrelere çan düşer
 *
 * İstemci hiçbir sonucu üretmez; yalnızca gelen durumu canlandırır.
 */

/* ═══════════ Temel çevirme ═══════════ */

export function spinReels(rng, strips) {
  const grid = [];
  for (let r = 0; r < REELS; r += 1) {
    const strip = strips[r];
    const stop = rng.int(strip.length);
    const column = [];
    for (let row = 0; row < ROWS; row += 1) {
      column.push(strip[(stop + row) % strip.length]);
    }
    grid.push(column);
  }
  return grid;
}

/** Belirli makaraları tutup diğerlerini yeniden çevirir. */
export function respinReels(rng, strips, grid, heldReels) {
  const next = grid.map((col) => [...col]);
  for (let r = 0; r < REELS; r += 1) {
    if (heldReels.includes(r)) continue;
    const strip = strips[r];
    const stop = rng.int(strip.length);
    for (let row = 0; row < ROWS; row += 1) {
      next[r][row] = strip[(stop + row) % strip.length];
    }
  }
  return next;
}

/* ═══════════ Hat değerlendirme ═══════════ */

function payFor(symbol, count) {
  return PAYTABLE[symbol]?.[count] || 0;
}

/** Wild yalnızca ortadaki makaralarda geçerlidir; çan ve scatter yerine geçmez. */
function isWildAt(symbol, reel) {
  return symbol === WILD && WILD_REELS.includes(reel);
}

function evaluateLine(grid, line, betPerLine) {
  const symbols = line.map((row, reel) => grid[reel][row]);

  // Temel sembol: soldan ilk wild olmayan, ödeme yapan sembol
  let base = null;
  for (let r = 0; r < REELS; r += 1) {
    const s = symbols[r];
    if (isWildAt(s, r)) continue;
    base = s;
    break;
  }
  if (!base || !PAYTABLE[base]) return null;

  let count = 0;
  for (let r = 0; r < REELS; r += 1) {
    const s = symbols[r];
    if (s === base || isWildAt(s, r)) count += 1;
    else break;
  }

  const amount = payFor(base, count) * betPerLine;
  if (amount <= 0) return null;

  return {
    type: 'line',
    symbol: base,
    count,
    amount,
    positions: line.slice(0, count).map((row, reel) => [reel, row])
  };
}

export function evaluateLines(grid, betPerLine) {
  const wins = [];
  PAYLINES.forEach((line, index) => {
    const win = evaluateLine(grid, line, betPerLine);
    if (win) wins.push({ ...win, line: index });
  });
  return wins;
}

/* ═══════════ Sembol sayımı ═══════════ */

export function findSymbol(grid, symbol) {
  const positions = [];
  for (let r = 0; r < REELS; r += 1) {
    for (let row = 0; row < ROWS; row += 1) {
      if (grid[r][row] === symbol) positions.push([r, row]);
    }
  }
  return positions;
}

export function evaluateScatter(grid, totalBet) {
  const positions = findSymbol(grid, SCATTER);
  const count = positions.length;
  const amount = count >= 3 ? (SCATTER_PAY[Math.min(count, 5)] || 0) * totalBet : 0;
  return { count, positions, amount, freeSpins: FREE_SPINS[Math.min(count, 5)] || 0 };
}

/** Scatter içeren makaraların indeksleri (respin'de tutulurlar). */
export function scatterReels(grid) {
  const held = [];
  for (let r = 0; r < REELS; r += 1) {
    if (grid[r].includes(SCATTER)) held.push(r);
  }
  return held;
}

/* ═══════════ Çan değerleri ═══════════ */

const TOTAL_BELL_WEIGHT = BELL_VALUES.reduce((sum, b) => sum + b.weight, 0);

/** Bir çanın taşıyacağı ödülü ağırlıklı olarak seçer. */
export function rollBellValue(rng) {
  let roll = rng.float() * TOTAL_BELL_WEIGHT;
  for (const entry of BELL_VALUES) {
    if (roll < entry.weight) return { ...entry };
    roll -= entry.weight;
  }
  return { ...BELL_VALUES[0] };
}

/**
 * Temel oyunda düşen çanları ödüllendirilmiş hücrelere çevirir.
 * Boost çanı ekranda en fazla bir kez görünebilir.
 */
export function decorateBells(rng, grid) {
  const positions = findSymbol(grid, BELL);
  const cells = positions.map(([reel, row]) => ({
    reel,
    row,
    ...rollBellValue(rng)
  }));

  let boost = false;
  if (cells.length >= BELL_ROUND.trigger && rng.float() < BOOST_CHANCE) {
    // Nakit çanlardan biri Boost çanına dönüşür
    const cashCells = cells.filter((c) => c.value !== undefined);
    if (cashCells.length) {
      const pick = cashCells[rng.int(cashCells.length)];
      pick.boost = true;
      delete pick.value;
      pick.id = 'BOOST';
      boost = true;
    }
  }
  return { cells, boost };
}

/* ═══════════ Çan Zinciri (Hold & Win) ═══════════ */

/** Tur durumunu tetikleyici ekrandan kurar. */
export function startBellRound(bellCells, boost, totalBet) {
  const board = Array.from({ length: REELS }, () => Array.from({ length: ROWS }, () => null));
  for (const cell of bellCells) board[cell.reel][cell.row] = cell;
  return {
    board,
    respins: BELL_ROUND.respins,
    boost,
    totalBet,
    spins: 0,
    filled: bellCells.length,
    finished: false
  };
}

/** Tek bir Çan Zinciri respini. */
export function bellRoundSpin(rng, round) {
  const landed = [];
  for (let r = 0; r < REELS; r += 1) {
    for (let row = 0; row < ROWS; row += 1) {
      if (round.board[r][row]) continue;
      if (rng.float() < BELL_ROUND.respinBellChance) {
        const cell = { reel: r, row, ...rollBellValue(rng) };
        round.board[r][row] = cell;
        landed.push(cell);
      }
    }
  }

  round.spins += 1;
  round.filled += landed.length;
  // Her yeni çan sayacı sıfırlar
  round.respins = landed.length > 0 ? BELL_ROUND.respins : round.respins - 1;

  const full = round.filled >= REELS * ROWS;
  if (full || round.respins <= 0) round.finished = true;

  return { landed, full, respins: round.respins, finished: round.finished };
}

/**
 * Tur sonu hesabı.
 * - GRAND çanı eşiği tutmazsa nakde döner
 * - Boost çanı sabit nakde döner
 * - Tam ekranda MAJOR/GRAND hariç tüm nakit ödüller çarpanla artar
 */
export function settleBellRound(rng, round, pools) {
  const cells = [];
  for (let r = 0; r < REELS; r += 1) {
    for (let row = 0; row < ROWS; row += 1) {
      if (round.board[r][row]) cells.push(round.board[r][row]);
    }
  }

  const grandCells = cells.filter((c) => c.jackpot === 'GRAND');
  const grandAwarded = grandCells.length >= BELL_ROUND.grandRequired;

  // GRAND eşiği tutmadıysa çanlar nakde döner
  if (!grandAwarded) {
    const [lo, hi] = BELL_ROUND.grandFallback;
    for (const cell of grandCells) {
      delete cell.jackpot;
      cell.value = lo + rng.int(hi - lo + 1);
      cell.converted = true;
    }
  }

  // Boost çanı nakde döner
  for (const cell of cells) {
    if (cell.boost) {
      delete cell.boost;
      cell.value = BELL_ROUND.boostCashout;
      cell.converted = true;
    }
  }

  const full = round.filled >= REELS * ROWS;
  const multiplier = full ? (round.boost ? BELL_ROUND.boostMultiplier : BELL_ROUND.fullScreenMultiplier) : 1;

  let cashTotal = 0;
  const jackpotWins = [];

  for (const cell of cells) {
    if (cell.jackpot) {
      const level = JACKPOTS.levels.find((l) => l.id === cell.jackpot);
      const amount = jackpotAmount(cell.jackpot, round.totalBet, pools);
      // MAJOR ve GRAND tam ekran çarpanından etkilenmez
      const boosted =
        cell.jackpot === 'MAJOR' || cell.jackpot === 'GRAND' ? amount : amount * multiplier;
      if (level.progressive) pools[cell.jackpot] = level.seed;
      cell.award = boosted;
      jackpotWins.push({ level: cell.jackpot, name: level.name, amount: boosted });
      cashTotal += boosted;
    } else {
      const amount = cell.value * round.totalBet * multiplier;
      cell.award = amount;
      cashTotal += amount;
    }
  }

  return {
    cells,
    total: cashTotal,
    multiplier,
    full,
    grandAwarded,
    grandCount: grandCells.length,
    jackpotWins,
    spins: round.spins
  };
}

/* ═══════════ Tek çevirme çözümü ═══════════ */

/**
 * Temel veya bedava dönüş çevirmesi.
 * @returns grid, hat kazançları, scatter, çan bilgisi
 */
export function resolveSpin({ rng, totalBet, free = false }) {
  const strips = free ? FREE_REELS : BASE_REELS;
  const grid = spinReels(rng, strips);
  return finishSpin({ rng, grid, totalBet, free });
}

/** Hazır bir grid'i (respin sonrası) değerlendirir. */
export function finishSpin({ rng, grid, totalBet, free = false }) {
  const betPerLine = totalBet / PAYLINES.length;
  const lineWins = evaluateLines(grid, betPerLine);
  const scatter = evaluateScatter(grid, totalBet);

  const wins = [...lineWins];
  if (scatter.amount > 0) {
    wins.push({
      type: 'scatter',
      symbol: SCATTER,
      count: scatter.count,
      amount: scatter.amount,
      positions: scatter.positions,
      line: null
    });
  }

  // Çanlar yalnızca temel oyunda anlamlıdır
  const bells = free ? { cells: [], boost: false } : decorateBells(rng, grid);

  return {
    grid,
    wins,
    totalWin: wins.reduce((sum, w) => sum + w.amount, 0),
    scatter,
    bells,
    bellTrigger: !free && bells.cells.length >= BELL_ROUND.trigger,
    scatterRespin:
      !free &&
      scatter.count >= SCATTER_RESPIN.min &&
      scatter.count <= SCATTER_RESPIN.max
  };
}

export { REELS, ROWS, PAYLINES, BELL, SCATTER, WILD };
