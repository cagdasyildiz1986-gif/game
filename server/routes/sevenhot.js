import express from 'express';
import {
  SYMBOLS, PAYTABLE, SCATTER_PAY, FREE_SPINS, SCATTER_RESPIN,
  BELL_ROUND, BELL_VALUES, JACKPOTS, BET_LEVELS, DEFAULT_BET,
  REELS, ROWS, LINES, WILD, SCATTER, BELL, WILD_REELS, jackpotAmount
} from '../games/sevenhot/config.js';
import { PAYLINES } from '../games/sevenhot/paylines.js';
import { playRound, ensureState, round2 } from '../games/sevenhot/session.js';
import { ProvablyFairRng } from '../game/rng.js';
import {
  getSevenHotPools, publicAccount, save, getSettings, addXp, recordHistory
} from '../store/memory.js';
import { slotPayoutScale, currencyOf } from '../site/settings.js';
import { applySpinToTasks } from '../site/tasks.js';
import { requireAccount } from './auth.js';
import { config } from '../config.js';

export const router = express.Router();

const GAME_NAME = '7 HOT · Çan Zinciri';

/** Bahis seviyesine göre jackpot merdiveni (istemci şeridi bunu gösterir). */
export function sevenhotJackpotView(totalBet = DEFAULT_BET) {
  const pools = getSevenHotPools();
  return JACKPOTS.levels.map((level) => ({
    id: level.id,
    name: level.name,
    color: level.color,
    progressive: Boolean(level.progressive),
    amount: round2(jackpotAmount(level.id, totalBet, pools))
  }));
}

/** Oyun tanımı — arayüz tamamen bu veriyle kurulur. */
router.get('/sevenhot/config', (req, res) => {
  const settings = getSettings();
  res.json({
    name: GAME_NAME,
    currency: currencyOf(settings),
    rtp: 95.6,
    reels: REELS,
    rows: ROWS,
    lines: LINES,
    symbols: SYMBOLS,
    wild: WILD,
    wildReels: WILD_REELS,
    scatter: SCATTER,
    bell: BELL,
    paytable: PAYTABLE,
    scatterPay: SCATTER_PAY,
    freeSpins: FREE_SPINS,
    scatterRespin: SCATTER_RESPIN,
    bellRound: BELL_ROUND,
    bellValues: BELL_VALUES.map(({ id, value, jackpot }) => ({ id, value, jackpot })),
    paylines: PAYLINES,
    betLevels: BET_LEVELS,
    defaultBet: DEFAULT_BET,
    jackpotLevels: JACKPOTS.levels.map(({ id, name, color, progressive, fixed }) => ({
      id, name, color, progressive: Boolean(progressive), fixed: fixed || 0
    }))
  });
});

router.get('/sevenhot/jackpots', (req, res) => {
  const bet = Number(req.query.bet) || DEFAULT_BET;
  res.json({ jackpots: sevenhotJackpotView(BET_LEVELS.includes(bet) ? bet : DEFAULT_BET) });
});

/** Oyuncunun bu oyuna ait durumu (bahis, kalan bedava dönüş). */
router.get('/sevenhot/state', requireAccount, (req, res) => {
  const st = ensureState(req.account);
  res.json({
    state: { bet: st.bet, free: { ...st.free, win: round2(st.free.win) } },
    player: publicAccount(req.account),
    jackpots: sevenhotJackpotView(st.bet)
  });
});

router.post('/sevenhot/bet', requireAccount, (req, res) => {
  const st = ensureState(req.account);
  const bet = Number(req.body?.bet);
  if (!BET_LEVELS.includes(bet)) return res.status(400).json({ error: 'Geçersiz bahis seviyesi.' });
  if (st.free.remaining > 0) {
    return res.status(400).json({ error: 'Bedava dönüşler sırasında bahis değiştirilemez.' });
  }
  st.bet = bet;
  save();
  res.json({ state: { bet: st.bet, free: st.free }, jackpots: sevenhotJackpotView(bet) });
});

/** Basit hız sınırı — Lucky Reels ile aynı pencere sayacını paylaşır. */
function rateLimit(account) {
  const now = Date.now();
  if (!account.spinWindow) account.spinWindow = { start: 0, count: 0 };
  if (now - account.spinWindow.start > 1000) account.spinWindow = { start: now, count: 0 };
  account.spinWindow.count += 1;
  return account.spinWindow.count <= config.maxSpinsPerSecond;
}

/** Bir tur: temel çevirme + varsa scatter respin + varsa Çan Zinciri. */
router.post('/sevenhot/spin', requireAccount, (req, res) => {
  const account = req.account;
  if (!rateLimit(account)) {
    return res.status(429).json({ error: 'Çok hızlı. Biraz yavaşlayın.' });
  }

  const rng = new ProvablyFairRng(
    account.fair.serverSeed,
    account.fair.clientSeed,
    account.fair.nonce
  );
  const nonce = account.fair.nonce;
  account.fair.nonce += 1;

  const settings = getSettings();
  const { error, round } = playRound({
    player: account,
    pools: getSevenHotPools(),
    rng,
    bet: req.body?.bet,
    payoutScale: slotPayoutScale(settings)
  });
  if (error) return res.status(400).json({ error });

  addXp(account, Math.max(1, Math.round(round.bet / 10)));
  const jackpotWin = round.bellRound?.jackpotWins?.[0] || null;
  if (jackpotWin || round.totalWin >= round.bet * 20) {
    recordHistory(account, {
      type: jackpotWin ? 'jackpot' : 'bigwin',
      game: GAME_NAME,
      bet: round.bet,
      win: round.totalWin
    });
  }
  account.lastSeenAt = Date.now();

  // Görev sistemi Lucky Reels ile aynı sözleşmeyi bekler.
  applySpinToTasks(account.tasks, {
    spin: {
      totalWin: round.totalWin,
      freeSpinsAwarded: round.freeSpinsAwarded,
      jackpot: jackpotWin
    },
    bet: round.bet,
    totalSpins: account.stats.spins
  });

  save();

  res.json({
    round: { ...round, nonce },
    player: publicAccount(account),
    jackpots: sevenhotJackpotView(round.bet)
  });
});
