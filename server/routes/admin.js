import express from 'express';
import { requireAdmin } from './auth.js';
import {
  listUsers,
  getUserById,
  adjustBalance,
  setBanned,
  setRole,
  getLedger,
  systemStats,
  getSettings,
  updateSettings,
  publicAccount
} from '../store/memory.js';
import { validateSettings, CURRENCIES, DEFAULT_SETTINGS } from '../site/settings.js';
import { GAMES } from '../site/catalog.js';

export const router = express.Router();

router.use(requireAdmin);

/** Panel ozeti. */
router.get('/overview', (req, res) => {
  res.json({
    stats: systemStats(),
    settings: getSettings(),
    currencies: Object.values(CURRENCIES),
    ledger: getLedger(20),
    gameCount: GAMES.length
  });
});

/* ---- Kullanicilar ---- */

function adminUserView(account) {
  return {
    id: account.id,
    name: account.name,
    username: account.username,
    guest: account.guest,
    role: account.role || 'user',
    banned: Boolean(account.banned),
    avatar: account.avatar,
    balance: account.balance,
    xp: account.xp || 0,
    createdAt: account.createdAt,
    lastSeenAt: account.lastSeenAt || account.createdAt,
    stats: account.stats
  };
}

router.get('/users', (req, res) => {
  const { total, users } = listUsers({
    query: String(req.query.q || ''),
    limit: Math.min(200, Number(req.query.limit) || 50),
    offset: Math.max(0, Number(req.query.offset) || 0)
  });
  res.json({ total, users: users.map(adminUserView) });
});

router.get('/users/:id', (req, res) => {
  const account = getUserById(req.params.id);
  if (!account) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
  res.json({ user: adminUserView(account), detail: publicAccount(account) });
});

/** Bakiye tanimlama (pozitif) veya dusme (negatif). */
router.post('/users/:id/balance', (req, res) => {
  const result = adjustBalance(
    req.params.id,
    req.body?.amount,
    req.body?.reason,
    req.account.username || 'admin'
  );
  if (result.error) return res.status(400).json({ error: result.error });
  res.json({ user: adminUserView(result.account), ledger: getLedger(20) });
});

router.post('/users/:id/ban', (req, res) => {
  const result = setBanned(req.params.id, Boolean(req.body?.banned));
  if (result.error) return res.status(400).json({ error: result.error });
  res.json({ user: adminUserView(result.account) });
});

router.post('/users/:id/role', (req, res) => {
  const result = setRole(req.params.id, String(req.body?.role || 'user'));
  if (result.error) return res.status(400).json({ error: result.error });
  res.json({ user: adminUserView(result.account) });
});

/* ---- Ayarlar ---- */

router.get('/settings', (req, res) => {
  res.json({ settings: getSettings(), defaults: DEFAULT_SETTINGS, currencies: Object.values(CURRENCIES) });
});

router.post('/settings', (req, res) => {
  const patch = req.body?.settings;
  if (!patch || typeof patch !== 'object') {
    return res.status(400).json({ error: 'Ayar verisi eksik.' });
  }
  const errors = validateSettings(patch);
  if (errors.length) return res.status(400).json({ error: errors.join(' ') });
  res.json({ settings: updateSettings(patch) });
});

router.get('/ledger', (req, res) => {
  res.json({ ledger: getLedger(Math.min(200, Number(req.query.limit) || 60)) });
});
