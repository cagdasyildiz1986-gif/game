import { PAYLINES } from './paylines.js';
import { PAYTABLE, SCATTER_PAY, FREE_SPINS } from './paytable.js';
import { WILD, SCATTER } from './symbols.js';
import { BASE_REELS, FREE_REELS } from './reels.js';

export const ROWS = 3;
export const REELS = 5;

/**
 * Makaralari cevirir.
 * @returns {{ grid: string[][], stops: number[] }} grid[makara][satir]
 */
export function spinReels(rng, strips) {
  const grid = [];
  const stops = [];
  for (let r = 0; r < REELS; r += 1) {
    const strip = strips[r];
    const stop = rng.int(strip.length);
    stops.push(stop);
    const column = [];
    for (let row = 0; row < ROWS; row += 1) {
      column.push(strip[(stop + row) % strip.length]);
    }
    grid.push(column);
  }
  return { grid, stops };
}

function payFor(symbol, count) {
  const row = PAYTABLE[symbol];
  if (!row) return 0;
  return row[count] || 0;
}

/** Tek bir hat icin soldan saga kazanc hesabi (wild ikame eder). */
function evaluateLine(grid, line, betPerLine) {
  const symbols = line.map((row, reel) => grid[reel][row]);

  // Wild-only serisi
  let wildRun = 0;
  while (wildRun < REELS && symbols[wildRun] === WILD) wildRun += 1;

  // Temel sembol: ilk wild olmayan sembol
  const base = symbols.find((s) => s !== WILD);

  let baseRun = 0;
  if (base && base !== SCATTER) {
    while (baseRun < REELS && (symbols[baseRun] === base || symbols[baseRun] === WILD)) {
      baseRun += 1;
    }
  }

  const wildPay = payFor(WILD, wildRun);
  const basePay = base ? payFor(base, baseRun) : 0;

  if (wildPay <= 0 && basePay <= 0) return null;

  const useWild = wildPay >= basePay;
  const symbol = useWild ? WILD : base;
  const count = useWild ? wildRun : baseRun;
  const amount = (useWild ? wildPay : basePay) * betPerLine;

  return {
    type: 'line',
    symbol,
    count,
    amount,
    positions: line.slice(0, count).map((row, reel) => [reel, row])
  };
}

/** Tum hatlari degerlendirir. */
export function evaluateLines(grid, betPerLine) {
  const wins = [];
  PAYLINES.forEach((line, index) => {
    const win = evaluateLine(grid, line, betPerLine);
    if (win) wins.push({ ...win, line: index });
  });
  return wins;
}

/** Scatter (dagilan) sembol degerlendirmesi - konumdan bagimsiz. */
export function evaluateScatter(grid, totalBet) {
  const positions = [];
  for (let reel = 0; reel < REELS; reel += 1) {
    for (let row = 0; row < ROWS; row += 1) {
      if (grid[reel][row] === SCATTER) positions.push([reel, row]);
    }
  }
  const count = positions.length;
  if (count < 3) return { count, amount: 0, positions: [], freeSpins: 0 };

  return {
    count,
    amount: (SCATTER_PAY[Math.min(count, 5)] || 0) * totalBet,
    positions,
    freeSpins: FREE_SPINS.award[Math.min(count, 5)] || 0
  };
}

/**
 * Tek bir spini cozer (temel oyun veya bedava donus).
 * @param {object} opts
 * @param {object} opts.rng
 * @param {number} opts.totalBet toplam bahis
 * @param {boolean} opts.free bedava donus mu
 */
export function resolveSpin({ rng, totalBet, free = false }) {
  const betPerLine = totalBet / PAYLINES.length;
  const strips = free ? FREE_REELS : BASE_REELS;
  const { grid, stops } = spinReels(rng, strips);

  const multiplier = free ? FREE_SPINS.multiplier : 1;
  const lineWins = evaluateLines(grid, betPerLine).map((w) => ({
    ...w,
    amount: w.amount * multiplier
  }));
  const scatter = evaluateScatter(grid, totalBet);
  const scatterAmount = scatter.amount * multiplier;

  const wins = [...lineWins];
  if (scatterAmount > 0) {
    wins.push({
      type: 'scatter',
      symbol: SCATTER,
      count: scatter.count,
      amount: scatterAmount,
      positions: scatter.positions,
      line: null
    });
  }

  const totalWin = wins.reduce((sum, w) => sum + w.amount, 0);

  return {
    grid,
    stops,
    wins,
    totalWin,
    multiplier,
    scatterCount: scatter.count,
    freeSpinsAwarded: free
      ? scatter.count >= 3
        ? FREE_SPINS.retrigger
        : 0
      : scatter.freeSpins
  };
}
