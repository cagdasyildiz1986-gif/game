import express from 'express';
import {
  createGuest,
  getBySession,
  dropSession,
  register,
  login,
  publicAccount,
  save,
  maybePromoteToAdmin,
  getSettings,
  AVATARS
} from '../store/memory.js';
import { advance } from '../site/tasks.js';

export const router = express.Router();

function tokenFrom(req) {
  const header = req.get('authorization') || '';
  return header.startsWith('Bearer ') ? header.slice(7) : req.body?.token;
}

/** Oturum zorunlu olan rotalar icin ara katman. */
export function requireAccount(req, res, next) {
  const account = getBySession(tokenFrom(req));
  if (!account) {
    return res.status(401).json({ error: 'Oturum bulunamadı. Sayfayı yenileyin.' });
  }
  if (account.banned) {
    return res.status(403).json({ error: 'Bu hesap askıya alınmış. Destek ile iletişime geçin.' });
  }
  const settings = getSettings();
  if (settings.maintenance && account.role !== 'admin') {
    return res.status(503).json({ error: 'Sistem bakımda. Kısa süre sonra tekrar deneyin.' });
  }
  account.lastSeenAt = Date.now();
  req.account = account;
  req.token = tokenFrom(req);
  next();
}

/** Yalnizca admin. */
export function requireAdmin(req, res, next) {
  requireAccount(req, res, () => {
    if (req.account.role !== 'admin') {
      return res.status(403).json({ error: 'Bu işlem için yönetici yetkisi gerekir.' });
    }
    next();
  });
}

/** Oturum varsa ekler, yoksa devam eder. */
export function optionalAccount(req, res, next) {
  req.account = getBySession(tokenFrom(req));
  next();
}

/** Oturum ac veya devam ettir. Hesabi olmayan ziyaretci misafir olarak baslar. */
router.post('/session', (req, res) => {
  const existing = getBySession(tokenFrom(req));
  if (existing) {
    advance(existing.tasks, 'daily-login', 1);
    save();
    return res.json({ token: tokenFrom(req), player: publicAccount(existing) });
  }
  const { account, token } = createGuest();
  advance(account.tasks, 'daily-login', 1);
  save();
  res.json({ token, player: publicAccount(account) });
});

router.get('/me', requireAccount, (req, res) => {
  res.json({ player: publicAccount(req.account) });
});

router.post('/register', (req, res) => {
  const result = register({
    username: String(req.body?.username || '').trim(),
    password: String(req.body?.password || ''),
    existingToken: tokenFrom(req)
  });
  if (result.error) return res.status(400).json({ error: result.error });
  advance(result.account.tasks, 'register', 1);
  const promoted = maybePromoteToAdmin(result.account);
  save();
  if (promoted) {
    console.log(`[admin] "${result.account.username}" yönetici olarak atandı.`);
  }
  res.json({ token: result.token, player: publicAccount(result.account) });
});

router.post('/login', (req, res) => {
  const result = login({
    username: String(req.body?.username || '').trim(),
    password: String(req.body?.password || '')
  });
  if (result.error) return res.status(401).json({ error: result.error });
  if (result.account.banned) {
    return res.status(403).json({ error: 'Bu hesap askıya alınmış.' });
  }
  advance(result.account.tasks, 'daily-login', 1);
  save();
  res.json({ token: result.token, player: publicAccount(result.account) });
});

/** Profil guncelleme: avatar ve gorunen ad. */
router.post('/profile', requireAccount, (req, res) => {
  const account = req.account;
  const { avatar, name } = req.body || {};
  if (avatar !== undefined) {
    if (!AVATARS.includes(avatar)) return res.status(400).json({ error: 'Geçersiz avatar.' });
    account.avatar = avatar;
  }
  if (name !== undefined) {
    const trimmed = String(name).trim().slice(0, 24);
    if (trimmed.length < 2) return res.status(400).json({ error: 'İsim en az 2 karakter olmalı.' });
    account.name = trimmed;
  }
  save();
  res.json({ player: publicAccount(account) });
});

router.get('/avatars', (req, res) => res.json({ avatars: AVATARS }));

router.post('/logout', (req, res) => {
  const token = tokenFrom(req);
  if (token) dropSession(token);
  res.json({ ok: true });
});
