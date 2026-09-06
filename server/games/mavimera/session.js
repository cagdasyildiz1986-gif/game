import { resolveSpin, levelOf, levelUps } from './engine.js';
import { BET_LEVELS, DEFAULT_BET, JACKPOTS, COLLECT, MAX_WIN } from './config.js';

/**
 * MAVİ MERA · tur akışı.
 *
 * Bir tur tek istekte sunucuda çözülür ve istemciye adım adım
 * canlandırılacak bir betimleme olarak döner. Bedava dönüşlerin her biri
 * ayrı bir turdur (oyuncu ÇEVİR'e basar), böylece seviye atlama anları
 * ekranda tek tek yaşanır.
 *
 * SEVİYE MERDİVENİ — turun kalbi budur:
 *   Bedava dönüş boyunca toplanan balıkçılar sayılır. Her 4 balıkçıda
 *   bir üst basamağa çıkılır (x1 → x2 → x3 → x10) ve tur 10 dönüş uzar.
 *   Tepeden sonra çarpan x10'da kalır ama her 4 balıkçı yine +10 dönüş verir.
 *   Bu dönüşün çarpanı, dönüş BAŞLARKEN geçerli olan basamaktır.
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

/** Oyuncu nesnesine bu oyunun durumunu (yoksa) ekler. */
export function ensureState(player) {
  if (!player.mavimera) {
    player.mavimera = {
      bet: DEFAULT_BET,
      free: { remaining: 0, total: 0, win: 0, fishermen: 0 }
    };
  }
  const st = player.mavimera;
  if (!BET_LEVELS.includes(st.bet)) st.bet = DEFAULT_BET;
  if (st.free.fishermen === undefined) st.free.fishermen = 0;
  return st;
}

/** Kazançları istemci için yuvarlar. */
function publicWins(wins) {
  return wins.map((w) => ({ ...w, amount: round2(w.amount) }));
}

/** Para hücresini istemciye açılacak biçime indirger. */
function publicCell(cell) {
  const out = { reel: cell.reel, row: cell.row, id: cell.id };
  if (cell.value !== undefined) out.value = cell.value;
  if (cell.jackpot) out.jackpot = cell.jackpot;
  if (cell.award !== undefined) out.award = round2(cell.award);
  return out;
}

/**
 * Tek bir turu oynar ve oyuncu durumunu günceller.
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

  /* ── Bu dönüşün seviyesi (dönüş BAŞLARKEN geçerli olan) ── */
  const fishermenBefore = isFree ? st.free.fishermen : 0;
  const levelBefore = isFree ? levelOf(fishermenBefore) : { level: 1, multiplier: 1 };

  const spin = resolveSpin({
    rng,
    totalBet: stake,
    free: isFree,
    multiplier: levelBefore.multiplier,
    pools
  });

  /* ── Kazanç ── */
  // Jackpot merdiveni yönetim RTP çarpanından etkilenmez: ilan edilen
  // tutar neyse o ödenir.
  const cashWin = (spin.lineWin + spin.scatter.amount + spin.collected.cash) * payoutScale;
  let win = cashWin + spin.collected.jackpotTotal;

  /* ── GRAND düştüyse havuz tohuma döner ── */
  if (spin.collected.grandHit) {
    const grand = JACKPOTS.levels.find((l) => l.id === 'GRAND');
    pools.GRAND = grand.seed;
  }

  /* ── Kazanç tavanı ── */
  const cap = MAX_WIN * stake;
  const capped = win > cap;
  if (capped) win = cap;

  /* ── Seviye atlama ── */
  const gained = spin.collected.fishers;
  let fishermenAfter = fishermenBefore;
  let ups = { steps: 0, extraSpins: 0 };
  let levelAfter = levelBefore;

  if (isFree && gained > 0) {
    fishermenAfter = fishermenBefore + gained;
    ups = levelUps(fishermenBefore, fishermenAfter);
    levelAfter = levelOf(fishermenAfter);
    st.free.fishermen = fishermenAfter;
  }

  /* ── Bedava dönüş muhasebesi ── */
  let awarded = 0;
  if (isFree) {
    st.free.remaining -= 1;
    st.free.win += win;
    if (ups.extraSpins > 0) {
      st.free.remaining += ups.extraSpins;
      st.free.total += ups.extraSpins;
    }
  } else if (spin.scatter.freeSpins > 0) {
    awarded = spin.scatter.freeSpins;
    st.free.remaining = awarded;
    st.free.total = awarded;
    st.free.win = 0;
    st.free.fishermen = 0;
  }

  player.balance += win;
  player.stats.spins += 1;
  player.stats.won += win;
  if (win > player.stats.biggestWin) player.stats.biggestWin = win;

  // Tavan tur boyunca da geçerlidir: bedava dönüş turu tavana ulaşınca kapanır.
  if (isFree && st.free.win >= cap) st.free.remaining = 0;

  const roundEnded = isFree && st.free.remaining === 0;
  const summary = roundEnded
    ? {
        total: round2(st.free.win),
        spins: st.free.total,
        fishermen: st.free.fishermen,
        level: levelAfter.level,
        multiplier: levelAfter.multiplier
      }
    : null;
  if (roundEnded) {
    st.free.total = 0;
    st.free.win = 0;
    st.free.fishermen = 0;
  }

  player.lastSpinAt = Date.now();

  return {
    round: {
      bet: stake,
      free: isFree,
      grid: spin.grid,
      wins: publicWins(spin.wins.map((w) => ({ ...w, amount: w.amount * payoutScale }))),
      lineWin: round2(spin.lineWin * payoutScale),
      scatter: {
        count: spin.scatter.count,
        positions: spin.scatter.positions,
        pay: round2(spin.scatter.amount * payoutScale)
      },
      /** Ekrandaki tüm para balıkları — değerleriyle birlikte. */
      money: spin.money.map(publicCell),
      /** Balıkçı konumları. */
      fishers: spin.fishers,
      collect: spin.collected.fishers
        ? {
            cells: spin.collected.cells.map(publicCell),
            fishers: spin.collected.fishers,
            multiplier: levelBefore.multiplier,
            cash: round2(spin.collected.cash * payoutScale),
            jackpotWins: spin.collected.jackpotWins.map((j) => ({
              ...j,
              amount: round2(j.amount)
            })),
            total: round2(spin.collected.cash * payoutScale + spin.collected.jackpotTotal)
          }
        : null,
      level: {
        before: levelBefore.level,
        after: levelAfter.level,
        multiplier: levelAfter.multiplier,
        fishermenBefore,
        fishermenAfter,
        perLevel: COLLECT.perLevel,
        ups: ups.steps,
        extraSpins: ups.extraSpins
      },
      freeSpinsAwarded: awarded,
      freeSpinsLeft: st.free.remaining,
      freeSpinsSummary: summary,
      capped,
      totalWin: round2(win),
      pools: { ...pools }
    }
  };
}
