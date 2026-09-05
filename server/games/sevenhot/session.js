import {
  resolveSpin, finishSpin, respinReels, scatterReels,
  startBellRound, bellRoundSpin, settleBellRound
} from './engine.js';
import {
  BASE_REELS, BET_LEVELS, SCATTER_RESPIN, JACKPOTS, REELS, ROWS
} from './config.js';

/**
 * 7 HOT · Çan Zinciri — tur akışı.
 *
 * Bir "tur" tek bir istekte baştan sona sunucuda çözülür ve istemciye
 * ADIM ADIM canlandırılacak bir betimleme olarak döner. İstemci hiçbir
 * sonuç üretmez; sadece gelen adımları oynatır. Böylece:
 *  - istemci tarafında kurcalanabilecek ara durum kalmaz,
 *  - bağlantı koparsa bakiye tutarlı kalır (her şey tek işlemde işlenir),
 *  - matematik tek yerde (motor) durur.
 *
 * Bu modül hem Express rotası hem de GitHub Pages demo modu tarafından
 * kullanılır; ikisinin sonucu birebir aynıdır.
 */

export function round2(value) {
  return Math.round(value * 100) / 100;
}

/** Havuz nesnesini seviye tohumlarıyla oluşturur. */
export function createPools() {
  const pools = {};
  for (const level of JACKPOTS.levels) {
    if (level.progressive) pools[level.id] = level.seed;
  }
  return pools;
}

/** Her ücretli dönüşte progresif havuza katkı. */
export function contribute(pools, totalBet) {
  const amount = totalBet * JACKPOTS.contributionRate;
  for (const level of JACKPOTS.levels) {
    if (level.progressive) pools[level.id] = (pools[level.id] || level.seed) + amount;
  }
  return amount;
}

/** Oyuncu nesnesine 7 HOT durumunu (yoksa) ekler. */
export function ensureState(player) {
  if (!player.sevenhot) {
    player.sevenhot = {
      bet: BET_LEVELS[0],
      free: { remaining: 0, total: 0, win: 0 }
    };
  }
  if (!BET_LEVELS.includes(player.sevenhot.bet)) player.sevenhot.bet = BET_LEVELS[0];
  return player.sevenhot;
}

function scaleWins(result, payoutScale) {
  if (payoutScale === 1) return result;
  return {
    ...result,
    wins: result.wins.map((w) => ({ ...w, amount: w.amount * payoutScale })),
    totalWin: result.totalWin * payoutScale
  };
}

/** Çan hücresini istemciye açılacak biçime indirger (ağırlık sızmasın). */
function publicCell(cell) {
  const out = { reel: cell.reel, row: cell.row, id: cell.id };
  if (cell.value !== undefined) out.value = cell.value;
  if (cell.jackpot) out.jackpot = cell.jackpot;
  if (cell.boost) out.boost = true;
  if (cell.converted) out.converted = true;
  if (cell.award !== undefined) out.award = round2(cell.award);
  return out;
}

/** Kazançları istemci için yuvarlar. */
function publicWins(wins) {
  return wins.map((w) => ({ ...w, amount: round2(w.amount) }));
}

/**
 * Scatter tutmalı respin dizisi.
 *
 * Scatter içeren makaralar tutulur, kalanlar yeniden döner. 2 scatter
 * geldiğinde bir tur daha döner; o turda YENİ bir scatter eklenirse bir tur
 * daha döner, eklenmezse dizi biter. Hedef sayıya (5) ulaşılırsa hemen biter.
 */
function runScatterRespins({ rng, grid, totalBet, payoutScale, startCount }) {
  const steps = [];
  let current = grid;
  let last = null;
  let beforeCount = startCount;

  for (let spin = 1; spin <= SCATTER_RESPIN.maxSpins; spin += 1) {
    const held = scatterReels(current);
    const next = respinReels(rng, BASE_REELS, current, held);
    const res = scaleWins(finishSpin({ rng, grid: next, totalBet, free: false }), payoutScale);
    const after = res.scatter.count;

    steps.push({
      held,
      grid: next,
      scatterCount: after,
      // Sayaçlar SEMBOL adedidir; daha önce makara adediyle karşılaştırılıyordu.
      gained: after - beforeCount,
      // Bu ızgaradaki çanların taşıdığı tutarlar (arayüz üstlerine basar)
      bells: res.bells.cells.map(publicCell)
    });

    current = next;
    last = res;

    if (after >= SCATTER_RESPIN.target) break;
    // Yeni scatter eklenmediyse dizi biter; eklendiyse bir tur daha döner.
    if (after === beforeCount) break;
    beforeCount = after;
  }

  return { steps, result: last };
}

/** Çan Zinciri turunu baştan sona oynar. */
function runBellRound({ rng, cells, boost, totalBet, pools }) {
  const round = startBellRound(cells, boost, totalBet);
  const steps = [];
  let guard = 0;

  while (!round.finished && guard++ < 200) {
    const step = bellRoundSpin(rng, round);
    steps.push({
      landed: step.landed.map(publicCell),
      respins: step.respins,
      filled: round.filled,
      full: step.full
    });
  }

  const settle = settleBellRound(rng, round, pools);
  return {
    start: cells.map(publicCell),
    boost,
    steps,
    cells: settle.cells.map(publicCell),
    total: round2(settle.total),
    multiplier: settle.multiplier,
    full: settle.full,
    grandAwarded: settle.grandAwarded,
    grandCount: settle.grandCount,
    jackpotWins: settle.jackpotWins.map((j) => ({ ...j, amount: round2(j.amount) })),
    spins: settle.spins,
    cellCount: round.filled,
    capacity: REELS * ROWS
  };
}

/**
 * Tek bir tur oynar ve oyuncu durumunu günceller.
 *
 * @param {object} opts
 * @param {object} opts.player  değiştirilecek oyuncu nesnesi
 * @param {object} opts.pools   progresif havuzlar (GRAND)
 * @param {object} opts.rng     float()/int() sağlayan üreteç
 * @param {number} [opts.bet]   istenen bahis (bedava dönüşte yoksayılır)
 * @param {number} [opts.payoutScale] yönetim RTP çarpanı
 * @returns {{ error?: string, round?: object }}
 */
export function playRound({ player, pools, rng, bet, payoutScale = 1 }) {
  const st = ensureState(player);
  const isFree = st.free.remaining > 0;

  if (!isFree) {
    const requested = Number(bet ?? st.bet);
    if (!BET_LEVELS.includes(requested)) return { error: 'Geçersiz bahis seviyesi.' };
    st.bet = requested;
    if (player.balance < requested) return { error: 'Yetersiz bakiye.' };
  }

  const stake = st.bet;

  if (!isFree) {
    player.balance -= stake;
    player.stats.wagered += stake;
    contribute(pools, stake);
  }

  // ── 1. Temel çevirme ────────────────────────────────────────────────
  let result = scaleWins(resolveSpin({ rng, totalBet: stake, free: isFree }), payoutScale);
  const baseGrid = result.grid;
  const baseBells = result.bells.cells.map(publicCell);
  const baseWins = publicWins(result.wins);
  const baseWin = result.totalWin;
  let win = result.totalWin;

  // ── 2. Scatter tutmalı respin ───────────────────────────────────────
  let scatterRespin = null;
  if (result.scatterRespin) {
    const run = runScatterRespins({
      rng,
      grid: result.grid,
      totalBet: stake,
      payoutScale,
      startCount: result.scatter.count
    });
    result = run.result;
    win += result.totalWin;
    scatterRespin = {
      steps: run.steps,
      finalWins: publicWins(result.wins),
      finalWin: round2(result.totalWin)
    };
  }

  // ── 3. Çan Zinciri (Hold & Win) ─────────────────────────────────────
  let bellRound = null;
  if (result.bellTrigger) {
    bellRound = runBellRound({
      rng,
      cells: result.bells.cells,
      boost: result.bells.boost,
      totalBet: stake,
      pools
    });
    win += bellRound.total;
  }

  // ── 4. Bedava dönüş muhasebesi ──────────────────────────────────────
  const awarded = result.scatter.freeSpins || 0;

  player.balance += win;
  player.stats.spins += 1;
  player.stats.won += win;
  if (win > player.stats.biggestWin) player.stats.biggestWin = win;

  if (isFree) {
    st.free.remaining -= 1;
    st.free.win += win;
  }
  if (awarded > 0) {
    if (!isFree) st.free.win = 0;
    st.free.remaining += awarded;
    st.free.total += awarded;
  }

  const roundEnded = isFree && st.free.remaining === 0;
  const freeSummary = roundEnded ? round2(st.free.win) : null;
  if (roundEnded) {
    st.free.total = 0;
    st.free.win = 0;
  }

  player.lastSpinAt = Date.now();

  return {
    round: {
      bet: stake,
      free: isFree,
      grid: baseGrid,
      wins: baseWins,
      baseWin: round2(baseWin),
      scatter: {
        count: result.scatter.count,
        positions: result.scatter.positions,
        amount: round2(result.scatter.amount)
      },
      bells: { cells: result.bells.cells.map(publicCell), boost: result.bells.boost },
      baseBells,
      scatterRespin,
      bellRound,
      freeSpinsAwarded: awarded,
      freeSpinsLeft: st.free.remaining,
      freeSpinsSummary: freeSummary,
      totalWin: round2(win)
    }
  };
}
