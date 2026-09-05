import express from 'express';
import crypto from 'node:crypto';
import { config } from '../config.js';
import { applySpin } from '../game/session.js';
import { ProvablyFairRng, newServerSeed, hashSeed } from '../game/rng.js';
import { PAYTABLE, SCATTER_PAY, FREE_SPINS, JACKPOT } from '../game/paytable.js';
import { PAYLINES } from '../game/paylines.js';
import { SYMBOLS, WILD, SCATTER } from '../game/symbols.js';
import { applySpinToTasks } from '../site/tasks.js';
import {
  getJackpots,
  publicAccount,
  round2,
  save,
  getSettings,
  addXp,
  recordHistory
} from '../store/memory.js';
import { slotPayoutScale, currencyOf } from '../site/settings.js';
import { requireAccount } from './auth.js';

export const router = express.Router();

/** Basit hiz siniri: ayni oyuncunun saniyedeki spin sayisi. */
function rateLimit(account) {
  const now = Date.now();
  if (!account.spinWindow) account.spinWindow = { start: 0, count: 0 };
  if (now - account.spinWindow.start > 1000) {
    account.spinWindow = { start: now, count: 0 };
  }
  account.spinWindow.count += 1;
  return account.spinWindow.count <= config.maxSpinsPerSecond;
}

export function jackpotView() {
  const pools = getJackpots();
  return JACKPOT.levels.map((level) => ({
    id: level.id,
    name: level.name,
    suit: level.suit,
    amount: round2(pools[level.id])
  }));
}

/** Oyun tanimlari - istemci arayuzu bu veriyle kurulur. */
router.get('/config', (req, res) => {
  const settings = getSettings();
  res.json({
    currency: currencyOf(settings),
    rtp: Number(settings.slot?.rtpTarget ?? 95.8),
    symbols: SYMBOLS,
    wild: WILD,
    scatter: SCATTER,
    paytable: PAYTABLE,
    scatterPay: SCATTER_PAY,
    freeSpins: FREE_SPINS,
    paylines: PAYLINES,
    betLevels: config.betLevels,
    defaultBet: config.defaultBet,
    reels: 5,
    rows: 3,
    jackpotLevels: JACKPOT.levels.map(({ id, name, suit }) => ({ id, name, suit }))
  });
});

/** Bahis seviyesi degistir. */
router.post('/bet', requireAccount, (req, res) => {
  const bet = Number(req.body?.bet);
  if (!config.betLevels.includes(bet)) {
    return res.status(400).json({ error: 'Geçersiz bahis seviyesi.' });
  }
  if (req.account.freeSpins.remaining > 0) {
    return res.status(400).json({ error: 'Bedava dönüşler sırasında bahis değiştirilemez.' });
  }
  req.account.bet = bet;
  save();
  res.json({ player: publicAccount(req.account) });
});

/** Spin - tum matematik sunucuda calisir, istemci sadece sonucu canlandirir. */
router.post('/spin', requireAccount, (req, res) => {
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
  const { error, spin } = applySpin({
    player: account,
    pools: getJackpots(),
    rng,
    bet: req.body?.bet,
    betLevels: config.betLevels,
    payoutScale: slotPayoutScale(settings)
  });

  if (error) return res.status(400).json({ error });

  // Seviye ilerlemesi ve gecmis
  addXp(account, Math.max(1, Math.round(account.bet / 10)));
  if (spin.jackpot || spin.totalWin >= account.bet * 20) {
    recordHistory(account, {
      type: spin.jackpot ? 'jackpot' : 'bigwin',
      game: 'Lucky Reels',
      bet: account.bet,
      win: round2(spin.totalWin + (spin.jackpot?.amount || 0))
    });
  }
  account.lastSeenAt = Date.now();

  applySpinToTasks(account.tasks, {
    spin,
    bet: account.bet,
    totalSpins: account.stats.spins
  });

  save();

  res.json({
    spin: { ...spin, nonce },
    player: publicAccount(account),
    jackpots: jackpotView()
  });
});

router.get('/jackpots', (req, res) => {
  res.json({ jackpots: jackpotView() });
});

/** Dogrulanabilir adalet: istemci tohumunu degistir. */
router.post('/fair/client-seed', requireAccount, (req, res) => {
  const seed = String(req.body?.clientSeed || '').slice(0, 64);
  if (!seed) return res.status(400).json({ error: 'clientSeed gerekli.' });
  if (req.account.freeSpins.remaining > 0) {
    return res.status(400).json({ error: 'Bedava dönüşler sırasında tohum değiştirilemez.' });
  }
  req.account.fair.clientSeed = seed;
  req.account.fair.nonce = 0;
  save();
  res.json({ fair: publicAccount(req.account).fair });
});

/** Sunucu tohumunu acikla ve yenisini uret (gecmis spinler dogrulanabilir hale gelir). */
router.post('/fair/rotate', requireAccount, (req, res) => {
  if (req.account.freeSpins.remaining > 0) {
    return res.status(400).json({ error: 'Bedava dönüşler sırasında tohum değiştirilemez.' });
  }
  const revealed = req.account.fair.serverSeed;
  const next = newServerSeed();
  req.account.fair = {
    serverSeed: next,
    serverSeedHash: hashSeed(next),
    clientSeed: crypto.randomBytes(8).toString('hex'),
    nonce: 0
  };
  save();
  res.json({
    revealedServerSeed: revealed,
    revealedHash: hashSeed(revealed),
    fair: publicAccount(req.account).fair
  });
});
