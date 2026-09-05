import express from 'express';
import crypto from 'node:crypto';
import { config } from '../config.js';
import { applySpin } from '../game/session.js';
import { ProvablyFairRng, newServerSeed, hashSeed } from '../game/rng.js';
import { PAYTABLE, SCATTER_PAY, FREE_SPINS, JACKPOT } from '../game/paytable.js';
import { PAYLINES } from '../game/paylines.js';
import { SYMBOLS, WILD, SCATTER } from '../game/symbols.js';
import {
  createPlayer,
  getPlayer,
  getJackpots,
  publicPlayer,
  round2,
  save
} from '../store/memory.js';

export const router = express.Router();

function auth(req, res, next) {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : req.body?.token;
  const player = getPlayer(token);
  if (!player) return res.status(401).json({ error: 'Oturum bulunamadı. Yeniden giriş yapın.' });
  req.player = player;
  next();
}

/** Basit hiz siniri: ayni oyuncunun saniyedeki spin sayisi. */
function rateLimit(player) {
  const now = Date.now();
  if (!player.spinWindow) player.spinWindow = { start: 0, count: 0 };
  if (now - player.spinWindow.start > 1000) {
    player.spinWindow = { start: now, count: 0 };
  }
  player.spinWindow.count += 1;
  return player.spinWindow.count <= config.maxSpinsPerSecond;
}

function jackpotView() {
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
  res.json({
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

/** Oturum ac / devam ettir. */
router.post('/session', (req, res) => {
  const existing = getPlayer(req.body?.token);
  if (existing) {
    return res.json({ token: existing.token, player: publicPlayer(existing), jackpots: jackpotView() });
  }
  const name = String(req.body?.name || 'Misafir').slice(0, 24);
  const player = createPlayer(name);
  res.json({ token: player.token, player: publicPlayer(player), jackpots: jackpotView() });
});

router.get('/state', auth, (req, res) => {
  res.json({ player: publicPlayer(req.player), jackpots: jackpotView() });
});

/** Bahis seviyesi degistir. */
router.post('/bet', auth, (req, res) => {
  const bet = Number(req.body?.bet);
  if (!config.betLevels.includes(bet)) {
    return res.status(400).json({ error: 'Geçersiz bahis seviyesi.' });
  }
  if (req.player.freeSpins.remaining > 0) {
    return res.status(400).json({ error: 'Bedava dönüşler sırasında bahis değiştirilemez.' });
  }
  req.player.bet = bet;
  save();
  res.json({ player: publicPlayer(req.player) });
});

/** Spin - tum matematik sunucuda calisir, istemci sadece sonucu canlandirir. */
router.post('/spin', auth, (req, res) => {
  const player = req.player;

  if (!rateLimit(player)) {
    return res.status(429).json({ error: 'Çok hızlı. Biraz yavaşlayın.' });
  }

  const rng = new ProvablyFairRng(player.fair.serverSeed, player.fair.clientSeed, player.fair.nonce);
  const nonce = player.fair.nonce;
  player.fair.nonce += 1;

  const { error, spin } = applySpin({
    player,
    pools: getJackpots(),
    rng,
    bet: req.body?.bet,
    betLevels: config.betLevels
  });

  if (error) return res.status(400).json({ error });

  save();

  res.json({
    spin: { ...spin, nonce },
    player: publicPlayer(player),
    jackpots: jackpotView()
  });
});

router.get('/jackpots', (req, res) => {
  res.json({ jackpots: jackpotView() });
});

/** Dogrulanabilir adalet: istemci tohumunu degistir. */
router.post('/fair/client-seed', auth, (req, res) => {
  const seed = String(req.body?.clientSeed || '').slice(0, 64);
  if (!seed) return res.status(400).json({ error: 'clientSeed gerekli.' });
  if (req.player.freeSpins.remaining > 0) {
    return res.status(400).json({ error: 'Bedava dönüşler sırasında tohum değiştirilemez.' });
  }
  req.player.fair.clientSeed = seed;
  req.player.fair.nonce = 0;
  save();
  res.json({ fair: publicPlayer(req.player).fair });
});

/** Sunucu tohumunu acikla ve yenisini uret (gecmis spinler dogrulanabilir hale gelir). */
router.post('/fair/rotate', auth, (req, res) => {
  if (req.player.freeSpins.remaining > 0) {
    return res.status(400).json({ error: 'Bedava dönüşler sırasında tohum değiştirilemez.' });
  }
  const revealed = req.player.fair.serverSeed;
  const next = newServerSeed();
  req.player.fair = {
    serverSeed: next,
    serverSeedHash: hashSeed(next),
    clientSeed: crypto.randomBytes(8).toString('hex'),
    nonce: 0
  };
  save();
  res.json({
    revealedServerSeed: revealed,
    revealedHash: hashSeed(revealed),
    fair: publicPlayer(req.player).fair
  });
});
