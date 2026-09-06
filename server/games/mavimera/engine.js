import {
  REELS, ROWS, LINES, PAYTABLE, SCATTER_PAY, FREE_SPINS, COLLECT,
  MONEY_VALUES, JACKPOTS, jackpotAmount, BASE_REELS, FREE_REELS,
  WILD, SCATTER, MONEY, WILD_REELS_BASE, WILD_REELS_FREE
} from './config.js';
import { PAYLINES } from './paylines.js';

/**
 * MAVİ MERA motoru.
 *
 * Tek bir çevirmede üç şey çözülür ve hepsi SUNUCUDA olur:
 *  1. 5x3 ızgara + 20 hat + dümen (scatter) değerlendirmesi
 *  2. Para balıklarının değerleri (balık ekranda belirdiği anda bellidir)
 *  3. Balıkçı toplaması — ekranda balıkçı varsa TÜM para balıkları toplanır
 *
 * İstemci hiçbir sonuç üretmez; yalnızca gelen betimlemeyi canlandırır.
 */

/* ═══════════ Çevirme ═══════════ */

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

/* ═══════════ Hat değerlendirme ═══════════ */

function payFor(symbol, count) {
  return PAYTABLE[symbol]?.[count] || 0;
}

/** Balıkçı yalnızca izinli makaralarda wild'dır; dümen ve para yerine geçmez. */
function isWildAt(symbol, reel, wildReels) {
  return symbol === WILD && wildReels.includes(reel);
}

function evaluateLine(grid, line, betPerLine, wildReels) {
  const symbols = line.map((row, reel) => grid[reel][row]);

  // Temel sembol: soldan ilk wild olmayan, ödeme yapan sembol
  let base = null;
  for (let r = 0; r < REELS; r += 1) {
    const s = symbols[r];
    if (isWildAt(s, r, wildReels)) continue;
    base = s;
    break;
  }
  if (!base || !PAYTABLE[base]) return null;

  let count = 0;
  for (let r = 0; r < REELS; r += 1) {
    const s = symbols[r];
    if (s === base || isWildAt(s, r, wildReels)) count += 1;
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

export function evaluateLines(grid, betPerLine, wildReels) {
  const wins = [];
  PAYLINES.forEach((line, index) => {
    const win = evaluateLine(grid, line, betPerLine, wildReels);
    if (win) wins.push({ ...win, line: index });
  });
  return wins;
}

/* ═══════════ Sembol arama ═══════════ */

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

/* ═══════════ Para balığı değerleri ═══════════ */

const MONEY_WEIGHT = MONEY_VALUES.reduce((sum, v) => sum + v.weight, 0);

/** Ağırlıklı tablodan bir para balığı yüzü seçer. */
export function pickMoneyFace(rng) {
  let roll = rng.float() * MONEY_WEIGHT;
  for (const face of MONEY_VALUES) {
    roll -= face.weight;
    if (roll <= 0) return face;
  }
  return MONEY_VALUES[0];
}

/**
 * Izgaradaki her para balığına bir yüz atar.
 * @returns {{reel:number,row:number,id:string,value?:number,jackpot?:string}[]}
 */
export function assignMoney(rng, grid) {
  return findSymbol(grid, MONEY).map(([reel, row]) => {
    const face = pickMoneyFace(rng);
    return { reel, row, id: face.id, value: face.value, jackpot: face.jackpot };
  });
}

/* ═══════════ Balıkçı toplaması ═══════════ */

/**
 * Ekrandaki balıkçılar para balıklarını toplar.
 *
 * Kural: ekranda EN AZ bir balıkçı ve en az bir para balığı varsa, HER
 * balıkçı ekrandaki tüm para balıklarının değerini toplar. İki balıkçı =
 * iki kat. Toplanan tutar çarpanla (bedava dönüş seviyesi) çarpılır.
 *
 * @param {object[]} money      assignMoney çıktısı
 * @param {number[][]} fishers  balıkçı konumları
 * @param {number} totalBet
 * @param {number} multiplier   bedava dönüş seviye çarpanı (temel oyunda 1)
 * @param {object} pools        progresif havuzlar
 */
export function collect({ money, fishers, totalBet, multiplier, pools }) {
  const empty = { total: 0, cash: 0, jackpotTotal: 0, cells: [], jackpotWins: [], grandHit: false, fishers: 0 };
  if (!fishers.length || !money.length) return empty;

  const count = fishers.length;
  const cells = [];
  const jackpotWins = [];
  let cash = 0;
  let jackpotTotal = 0;
  let grandHit = false;

  for (const cell of money) {
    let amount;
    if (cell.jackpot) {
      // Jackpot çarpanla büyütülmez; merdiven zaten sabit/progresiftir.
      amount = jackpotAmount(cell.jackpot, totalBet, pools) * count;
      jackpotWins.push({ level: cell.jackpot, amount });
      if (cell.jackpot === 'GRAND') grandHit = true;
      jackpotTotal += amount;
    } else {
      amount = cell.value * totalBet * multiplier * count;
      cash += amount;
    }
    cells.push({ ...cell, award: amount });
  }

  return { total: cash + jackpotTotal, cash, jackpotTotal, cells, jackpotWins, grandHit, fishers: count };
}

/* ═══════════ Seviye merdiveni ═══════════ */

/** Toplanan balıkçı sayısından seviye çarpanını verir (1 tabanlı). */
export function levelOf(fishermen) {
  const step = Math.floor(fishermen / COLLECT.perLevel);
  const index = Math.min(step, COLLECT.levels.length - 1);
  return { level: index + 1, multiplier: COLLECT.levels[index] };
}

/**
 * Bu dönüşte toplanan balıkçılarla kaç seviye atlandığını hesaplar.
 * Merdivenin tepesinden sonra da her 4 balıkçı +10 dönüş verir.
 */
export function levelUps(before, after) {
  const steps = Math.floor(after / COLLECT.perLevel) - Math.floor(before / COLLECT.perLevel);
  if (steps <= 0) return { steps: 0, extraSpins: 0 };
  return { steps, extraSpins: steps * COLLECT.extraSpins };
}

/* ═══════════ Tek çevirmenin tamamı ═══════════ */

/**
 * Bir çevirmeyi baştan sona çözer.
 *
 * @param {object} opts
 * @param {object} opts.rng
 * @param {number} opts.totalBet
 * @param {boolean} opts.free       bedava dönüş mü
 * @param {number} opts.multiplier  bedava dönüş seviye çarpanı
 * @param {object} opts.pools       progresif havuzlar
 */
export function resolveSpin({ rng, totalBet, free = false, multiplier = 1, pools = {} }) {
  const strips = free ? FREE_REELS : BASE_REELS;
  const wildReels = free ? WILD_REELS_FREE : WILD_REELS_BASE;
  const grid = spinReels(rng, strips);
  const betPerLine = totalBet / LINES;

  const wins = evaluateLines(grid, betPerLine, wildReels);
  const lineWin = wins.reduce((sum, w) => sum + w.amount, 0);

  const scatter = evaluateScatter(grid, totalBet);
  const money = assignMoney(rng, grid);
  const fishers = findSymbol(grid, WILD).filter(([reel]) => wildReels.includes(reel));

  const collected = collect({ money, fishers, totalBet, multiplier, pools });

  return {
    grid,
    wildReels,
    wins,
    lineWin,
    scatter,
    money,
    fishers,
    collected,
    totalWin: lineWin + scatter.amount + collected.total
  };
}

export { JACKPOTS, COLLECT };
