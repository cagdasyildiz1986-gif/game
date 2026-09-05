import {
  REELS, ROWS, CELLS, MIN_CLUSTER, PAY_SYMBOLS, payFor,
  SCATTER, MULT, SCATTER_PAY, FREE_SPINS, RETRIGGER,
  ORB_CHANCE, ORB_VALUES, ORB_TOTAL, BASE_CUM, FREE_CUM
} from './config.js';

/**
 * YILDIRIM motoru.
 *
 * Hat yoktur: bir sembolden ekranda 8+ varsa öder. Kazananlar patlar,
 * üsttekiler düşer, boşluklar yenileriyle dolar; kazanç kalmayana kadar
 * bu döngü sürer. Buna "tumble dizisi" diyoruz.
 *
 * Çarpan küreleri yeni doldurulan hücrelere düşebilir. Ödeme yapmaz,
 * patlamaz, ama yerçekimiyle düşer. Dizi sonunda toplanırlar.
 *
 * Tüm rastgelelik dışarıdan verilen rng'den gelir; motor durum tutmaz.
 */

/* ═══════════ Sembol üretimi ═══════════ */

function pickSymbol(rng, cum) {
  const roll = rng.float() * cum.total;
  for (const entry of cum.table) {
    if (roll < entry.upTo) return entry.symbol;
  }
  return cum.table[cum.table.length - 1].symbol;
}

function pickOrbValue(rng) {
  let roll = rng.float() * ORB_TOTAL;
  for (const orb of ORB_VALUES) {
    if (roll < orb.weight) return orb.value;
    roll -= orb.weight;
  }
  return ORB_VALUES[0].value;
}

/**
 * Tek bir hücre üretir. Küre şansı tutarsa sembol yerine küre döner.
 * @returns {string|{s:'MULT', value:number}}
 */
function newCell(rng, cum, orbChance) {
  if (rng.float() < orbChance) return { s: MULT, value: pickOrbValue(rng) };
  return pickSymbol(rng, cum);
}

const isOrb = (cell) => typeof cell === 'object' && cell !== null && cell.s === MULT;
const symbolOf = (cell) => (isOrb(cell) ? MULT : cell);

/** Boş bir 6x5 ızgarayı baştan doldurur. */
export function fillGrid(rng, { free = false } = {}) {
  const cums = free ? FREE_CUM : BASE_CUM;
  const chance = free ? ORB_CHANCE.free : ORB_CHANCE.base;
  const grid = [];
  for (let r = 0; r < REELS; r += 1) {
    const column = [];
    for (let row = 0; row < ROWS; row += 1) column.push(newCell(rng, cums[r], chance));
    grid.push(column);
  }
  return grid;
}

/* ═══════════ Kazanç tespiti ═══════════ */

/**
 * Ekrandaki her sembolü sayar; 8+ olanlar öder.
 * @returns {{symbol:string,count:number,amount:number,positions:number[][]}[]}
 */
export function findWins(grid, totalBet) {
  const positions = {};
  for (let r = 0; r < REELS; r += 1) {
    for (let row = 0; row < ROWS; row += 1) {
      const symbol = symbolOf(grid[r][row]);
      if (!PAY_SYMBOLS.includes(symbol)) continue;
      (positions[symbol] ||= []).push([r, row]);
    }
  }

  const wins = [];
  for (const symbol of PAY_SYMBOLS) {
    const cells = positions[symbol];
    if (!cells || cells.length < MIN_CLUSTER) continue;
    wins.push({
      symbol,
      count: cells.length,
      amount: payFor(symbol, cells.length) * totalBet,
      positions: cells
    });
  }
  return wins;
}

/** Ekrandaki scatter konumları. */
export function findScatters(grid) {
  const out = [];
  for (let r = 0; r < REELS; r += 1) {
    for (let row = 0; row < ROWS; row += 1) {
      if (grid[r][row] === SCATTER) out.push([r, row]);
    }
  }
  return out;
}

/** Ekrandaki kürelerin toplam değeri ve konumları. */
export function collectOrbs(grid) {
  const orbs = [];
  let total = 0;
  for (let r = 0; r < REELS; r += 1) {
    for (let row = 0; row < ROWS; row += 1) {
      const cell = grid[r][row];
      if (!isOrb(cell)) continue;
      orbs.push({ reel: r, row, value: cell.value });
      total += cell.value;
    }
  }
  return { orbs, total };
}

/* ═══════════ Tumble ═══════════ */

/**
 * Kazanan hücreleri siler, üsttekileri düşürür ve boşlukları doldurur.
 *
 * @returns {{grid:any[][], dropped:{reel:number,row:number}[], newCells:object}}
 *   dropped: yeni gelen hücrelerin konumları (istemci bunları yukarıdan düşürür)
 */
export function tumble(rng, grid, winPositions, { free = false } = {}) {
  const cums = free ? FREE_CUM : BASE_CUM;
  const chance = free ? ORB_CHANCE.free : ORB_CHANCE.base;

  const doomed = new Set(winPositions.map(([r, row]) => `${r}:${row}`));
  const next = [];
  const dropped = [];

  for (let r = 0; r < REELS; r += 1) {
    // Hayatta kalanlar sırayı koruyarak dibe çöker
    const survivors = [];
    for (let row = 0; row < ROWS; row += 1) {
      if (doomed.has(`${r}:${row}`)) continue;
      survivors.push(grid[r][row]);
    }
    const missing = ROWS - survivors.length;
    const column = [];
    for (let i = 0; i < missing; i += 1) column.push(newCell(rng, cums[r], chance));
    column.push(...survivors);
    next.push(column);
    for (let row = 0; row < missing; row += 1) dropped.push({ reel: r, row });
  }

  return { grid: next, dropped };
}

/* ═══════════ Tam tumble dizisi ═══════════ */

/**
 * Bir çevirmeyi baştan sona çözer: ilk ızgara, ardından kazanç kalmayana
 * kadar tumble. İstemciye adım adım canlandırılacak betimleme döner.
 *
 * Çarpan uygulaması BURADA yapılmaz — turu yöneten katman (session.js)
 * temel oyun / bedava dönüş kuralına göre uygular.
 */
export function playSequence({ rng, totalBet, free = false, maxSteps = 60 }) {
  let grid = fillGrid(rng, { free });
  const steps = [];
  let baseWin = 0;
  let guard = 0;

  for (;;) {
    const wins = findWins(grid, totalBet);
    if (!wins.length || guard >= maxSteps) {
      steps.push({ grid: snapshot(grid), wins: [], win: 0, dropped: [] });
      break;
    }
    guard += 1;

    const stepWin = wins.reduce((sum, w) => sum + w.amount, 0);
    baseWin += stepWin;

    const doomed = wins.flatMap((w) => w.positions);
    const result = tumble(rng, grid, doomed, { free });

    steps.push({
      grid: snapshot(grid),
      wins: wins.map((w) => ({ ...w })),
      win: stepWin,
      cleared: doomed,
      next: snapshot(result.grid),
      dropped: result.dropped
    });

    grid = result.grid;
  }

  const scatters = findScatters(grid);
  const { orbs, total: orbTotal } = collectOrbs(grid);

  return {
    steps,
    finalGrid: snapshot(grid),
    baseWin,
    tumbles: guard,
    scatters,
    scatterCount: scatters.length,
    orbs,
    orbTotal
  };
}

/** Izgarayı istemciye gidecek sade biçime çevirir. */
export function snapshot(grid) {
  return grid.map((column) =>
    column.map((cell) => (isOrb(cell) ? { s: MULT, value: cell.value } : cell))
  );
}

/* ═══════════ Scatter ödülleri ═══════════ */

export function scatterAward(count, totalBet) {
  const capped = Math.min(count, 6);
  return {
    pay: (SCATTER_PAY[capped] || 0) * totalBet,
    freeSpins: FREE_SPINS[capped] || 0
  };
}

export function retriggerSpins(count) {
  return count >= RETRIGGER.min ? RETRIGGER.spins : 0;
}

export { REELS, ROWS, CELLS, MIN_CLUSTER, SCATTER, MULT, isOrb, symbolOf };
