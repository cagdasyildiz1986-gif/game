import express from 'express';
import {
  SYMBOLS, PAY_SYMBOLS, PAYTABLE, TIERS, MIN_CLUSTER, SCATTER, MULT,
  SCATTER_PAY, FREE_SPINS, RETRIGGER, ORB_VALUES, ORB_CHANCE,
  BET_LEVELS, DEFAULT_BET, MAX_WIN, REELS, ROWS
} from '../games/yildirim/config.js';
import { playRound, ensureState, round2 } from '../games/yildirim/session.js';
import { ProvablyFairRng } from '../game/rng.js';
import { publicAccount, save, getSettings, addXp, recordHistory } from '../store/memory.js';
import { slotPayoutScale, currencyOf } from '../site/settings.js';
import { applySpinToTasks } from '../site/tasks.js';
import { requireAccount } from './auth.js';
import { config } from '../config.js';

export const router = express.Router();

const GAME_NAME = 'YILDIRIM · Göklerin Öfkesi';

/** Oyun tanımı — arayüz tamamen bu veriyle kurulur. */
router.get('/yildirim/config', (req, res) => {
  const settings = getSettings();
  res.json({
    name: GAME_NAME,
    currency: currencyOf(settings),
    rtp: 95.4,
    reels: REELS,
    rows: ROWS,
    minCluster: MIN_CLUSTER,
    tiers: TIERS,
    symbols: SYMBOLS,
    paySymbols: PAY_SYMBOLS,
    scatter: SCATTER,
    mult: MULT,
    paytable: PAYTABLE,
    scatterPay: SCATTER_PAY,
    freeSpins: FREE_SPINS,
    retrigger: RETRIGGER,
    orbValues: ORB_VALUES.map((o) => o.value),
    orbChance: ORB_CHANCE,
    betLevels: BET_LEVELS,
    defaultBet: DEFAULT_BET,
    maxWin: MAX_WIN
  });
});

/** Oyuncunun bu oyuna ait durumu. */
router.get('/yildirim/state', requireAccount, (req, res) => {
  const st = ensureState(req.account);
  res.json({
    state: { bet: st.bet, free: { ...st.free, win: round2(st.free.win) } },
    player: publicAccount(req.account)
  });
});

router.post('/yildirim/bet', requireAccount, (req, res) => {
  const st = ensureState(req.account);
  const bet = Number(req.body?.bet);
  if (!BET_LEVELS.includes(bet)) return res.status(400).json({ error: 'Geçersiz bahis seviyesi.' });
  if (st.free.remaining > 0) {
    return res.status(400).json({ error: 'Bedava dönüşler sırasında bahis değiştirilemez.' });
  }
  st.bet = bet;
  save();
  res.json({ state: { bet: st.bet, free: st.free } });
});

/** Basit hız sınırı — diğer slotlarla aynı pencere sayacını paylaşır. */
function rateLimit(account) {
  const now = Date.now();
  if (!account.spinWindow) account.spinWindow = { start: 0, count: 0 };
  if (now - account.spinWindow.start > 1000) account.spinWindow = { start: now, count: 0 };
  account.spinWindow.count += 1;
  return account.spinWindow.count <= config.maxSpinsPerSecond;
}

/** Bir tur: ilk ızgara + tüm tumble adımları + çarpan hesabı. */
router.post('/yildirim/spin', requireAccount, (req, res) => {
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
    rng,
    bet: req.body?.bet,
    payoutScale: slotPayoutScale(settings)
  });
  if (error) return res.status(400).json({ error });

  addXp(account, Math.max(1, Math.round(round.bet / 10)));
  if (round.totalWin >= round.bet * 20) {
    recordHistory(account, {
      type: 'bigwin',
      game: GAME_NAME,
      bet: round.bet,
      win: round.totalWin
    });
  }
  account.lastSeenAt = Date.now();

  applySpinToTasks(account.tasks, {
    spin: {
      totalWin: round.totalWin,
      freeSpinsAwarded: round.freeSpinsAwarded,
      jackpot: null
    },
    bet: round.bet,
    totalSpins: account.stats.spins
  });

  save();

  res.json({ round: { ...round, nonce }, player: publicAccount(account) });
});
