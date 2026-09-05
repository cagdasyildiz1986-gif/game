import { playSequence, scatterAward, retriggerSpins } from './engine.js';
import { BET_LEVELS, MAX_WIN, MIN_CLUSTER } from './config.js';

/**
 * YILDIRIM · tur akışı.
 *
 * Bir tur (ilk çevirme + tüm tumble adımları + çarpan hesabı) tek istekte
 * sunucuda çözülür ve istemciye adım adım canlandırılacak betimleme döner.
 * İstemci hiçbir sonuç üretmez.
 *
 * ÇARPAN KURALI — iki oyun modunda farklıdır ve oyunun kalbi budur:
 *   Temel oyun  : dizi sonunda ekrandaki kürelerin toplamı O DİZİNİN
 *                 kazancını çarpar, sonra sıfırlanır.
 *   Bedava dönüş: toplam, tur boyunca yaşayan KALICI çarpana eklenir;
 *                 bundan sonraki her kazanç bu birikmiş değerle çarpılır.
 *                 Kazançsız dönüşte düşen küreler de toplama eklenir.
 */

export function round2(value) {
  return Math.round(value * 100) / 100;
}

/** Oyuncu nesnesine bu oyunun durumunu (yoksa) ekler. */
export function ensureState(player) {
  if (!player.yildirim) {
    player.yildirim = {
      bet: BET_LEVELS[0],
      free: { remaining: 0, total: 0, win: 0, multiplier: 0 }
    };
  }
  const st = player.yildirim;
  if (!BET_LEVELS.includes(st.bet)) st.bet = BET_LEVELS[0];
  if (st.free.multiplier === undefined) st.free.multiplier = 0;
  return st;
}

/** Kazançları istemci için yuvarlar. */
function publicWins(wins) {
  return wins.map((w) => ({ ...w, amount: round2(w.amount) }));
}

function publicSteps(steps, scale) {
  return steps.map((step) => ({
    grid: step.grid,
    wins: publicWins((step.wins || []).map((w) => ({ ...w, amount: w.amount * scale }))),
    win: round2((step.win || 0) * scale),
    cleared: step.cleared || [],
    next: step.next,
    dropped: step.dropped || []
  }));
}

/**
 * Tek bir turu oynar ve oyuncu durumunu günceller.
 *
 * @param {object} opts
 * @param {object} opts.player  değiştirilecek oyuncu nesnesi
 * @param {object} opts.rng     float() sağlayan üreteç
 * @param {number} [opts.bet]   istenen bahis (bedava dönüşte yoksayılır)
 * @param {number} [opts.payoutScale] yönetim RTP çarpanı
 * @returns {{ error?: string, round?: object }}
 */
export function playRound({ player, rng, bet, payoutScale = 1 }) {
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
  }

  const seq = playSequence({ rng, totalBet: stake, free: isFree });

  /* ── Çarpan ── */
  const multiplierBefore = isFree ? st.free.multiplier : 0;
  let multiplierAfter = multiplierBefore;
  let applied = 1;

  if (isFree) {
    // Küreler kalıcı toplama eklenir — kazanç olmasa bile.
    multiplierAfter = multiplierBefore + seq.orbTotal;
    st.free.multiplier = multiplierAfter;
    applied = Math.max(1, multiplierAfter);
  } else if (seq.orbTotal > 0) {
    multiplierAfter = seq.orbTotal;
    applied = seq.orbTotal;
  }

  const symbolWin = seq.baseWin * applied * payoutScale;

  /* ── Scatter ── */
  const award = scatterAward(seq.scatterCount, stake);
  const scatterPay = seq.scatterCount >= 4 ? award.pay * payoutScale : 0;

  let win = symbolWin + scatterPay;

  /* ── Kazanç tavanı ── */
  const cap = MAX_WIN * stake;
  const capped = win > cap;
  if (capped) win = cap;

  /* ── Bedava dönüş muhasebesi ── */
  let awarded = 0;
  if (isFree) {
    st.free.remaining -= 1;
    st.free.win += win;
    awarded = retriggerSpins(seq.scatterCount);
    if (awarded > 0) {
      st.free.remaining += awarded;
      st.free.total += awarded;
    }
  } else if (seq.scatterCount >= 4) {
    awarded = award.freeSpins;
    st.free.remaining = awarded;
    st.free.total = awarded;
    st.free.win = 0;
    st.free.multiplier = 0;
  }

  player.balance += win;
  player.stats.spins += 1;
  player.stats.won += win;
  if (win > player.stats.biggestWin) player.stats.biggestWin = win;

  // Tavan tur boyunca da geçerlidir: bedava dönüş turu tavana ulaşınca kapanır.
  if (isFree && st.free.win >= MAX_WIN * stake) st.free.remaining = 0;

  const roundEnded = isFree && st.free.remaining === 0;
  const summary = roundEnded
    ? { total: round2(st.free.win), multiplier: st.free.multiplier, spins: st.free.total }
    : null;
  if (roundEnded) {
    st.free.total = 0;
    st.free.win = 0;
    st.free.multiplier = 0;
  }

  player.lastSpinAt = Date.now();

  return {
    round: {
      bet: stake,
      free: isFree,
      steps: publicSteps(seq.steps, payoutScale),
      finalGrid: seq.finalGrid,
      tumbles: seq.tumbles,
      symbolWin: round2(seq.baseWin * payoutScale),
      orbs: seq.orbs,
      orbTotal: seq.orbTotal,
      multiplier: applied,
      multiplierBefore,
      multiplierAfter,
      scatter: {
        count: seq.scatterCount,
        positions: seq.scatters,
        pay: round2(scatterPay)
      },
      freeSpinsAwarded: awarded,
      freeSpinsLeft: st.free.remaining,
      freeSpinsSummary: summary,
      capped,
      totalWin: round2(win)
    }
  };
}

export { MIN_CLUSTER };
