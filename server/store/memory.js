import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { config } from '../config.js';
import { createPools } from '../game/jackpot.js';
import { newServerSeed, hashSeed } from '../game/rng.js';
import { round2 } from '../game/session.js';
import { initialTaskState } from '../site/tasks.js';
import { DEFAULT_SETTINGS, mergeSettings } from '../site/settings.js';

/**
 * Hesap ve oturum deposu (bellek ici + JSON dosyasina kalici yazma).
 *
 * Uretimde bu modulun yerine Postgres/Redis adaptoru yazilabilir; disari acilan
 * arayuz (createGuest / register / login / getBySession ...) aynidir.
 *
 * Misafir hesap: kullanici adi/parola olmadan olusur. Kayit olurken ayni hesap
 * yukseltilir, boylece oyuncu bakiyesini ve istatistiklerini kaybetmez.
 */

const state = {
  users: new Map(), // id -> account
  usernames: new Map(), // kucuk harfli kullanici adi -> id
  sessions: new Map(), // token -> id
  jackpots: createPools(),
  settings: { ...DEFAULT_SETTINGS },
  ledger: [] // son bakiye hareketleri (admin gorunumu icin)
};

const LEDGER_LIMIT = 500;

let saveTimer = null;

function dataPath() {
  return config.dataFile ? path.resolve(process.cwd(), config.dataFile) : null;
}

export function load() {
  const file = dataPath();
  if (!file || !fs.existsSync(file)) return;
  try {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    state.users = new Map(Object.entries(raw.users || {}));
    state.usernames = new Map(Object.entries(raw.usernames || {}));
    state.sessions = new Map(Object.entries(raw.sessions || {}));
    state.jackpots = { ...state.jackpots, ...(raw.jackpots || {}) };
    state.settings = mergeSettings(DEFAULT_SETTINGS, raw.settings);
    state.ledger = Array.isArray(raw.ledger) ? raw.ledger.slice(-LEDGER_LIMIT) : [];
  } catch (err) {
    console.warn('[store] kayit dosyasi okunamadi:', err.message);
  }
}

export function save() {
  const file = dataPath();
  if (!file) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(
        file,
        JSON.stringify({
          users: Object.fromEntries(state.users),
          usernames: Object.fromEntries(state.usernames),
          sessions: Object.fromEntries(state.sessions),
          jackpots: state.jackpots,
          settings: state.settings,
          ledger: state.ledger
        })
      );
    } catch (err) {
      console.warn('[store] kayit yazilamadi:', err.message);
    }
  }, 500);
  saveTimer.unref?.();
}

/* ============ Parola ============ */

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash: derived };
}

function verifyPassword(password, salt, expected) {
  const { hash } = hashPassword(password, salt);
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(expected, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/* ============ Hesap ============ */

function newAccount(name) {
  const serverSeed = newServerSeed();
  return {
    id: crypto.randomUUID(),
    name,
    username: null,
    salt: null,
    passwordHash: null,
    guest: true,
    role: 'user',
    banned: false,
    avatar: pickAvatar(),
    xp: 0,
    balance: state.settings.startBalance ?? config.startBalance,
    bet: config.defaultBet,
    createdAt: Date.now(),
    freeSpins: { remaining: 0, total: 0, multiplier: 1, win: 0 },
    stats: { spins: 0, wagered: 0, won: 0, biggestWin: 0 },
    favorites: [],
    recent: [],
    tasks: initialTaskState(),
    fair: {
      serverSeed,
      serverSeedHash: hashSeed(serverSeed),
      clientSeed: crypto.randomBytes(8).toString('hex'),
      nonce: 0
    },
    lastSpinAt: 0,
    lastSeenAt: Date.now(),
    spinWindow: { start: 0, count: 0 },
    history: [],
    friends: []
  };
}

const AVATARS = ['🦊', '🐺', '🦁', '🐯', '🐼', '🦅', '🐉', '🦈', '🐍', '🦂', '🐙', '🦉'];
function pickAvatar() {
  return AVATARS[crypto.randomInt(AVATARS.length)];
}
export { AVATARS };

function issueSession(userId) {
  const token = crypto.randomBytes(24).toString('hex');
  state.sessions.set(token, userId);
  return token;
}

export function createGuest(name = 'Misafir') {
  const account = newAccount(name);
  state.users.set(account.id, account);
  const token = issueSession(account.id);
  save();
  return { account, token };
}

export function getBySession(token) {
  if (!token) return undefined;
  const id = state.sessions.get(token);
  return id ? state.users.get(id) : undefined;
}

export function dropSession(token) {
  state.sessions.delete(token);
  save();
}

export const USERNAME_RULE = /^[a-zA-Z0-9_]{3,20}$/;

/**
 * Kayit. Mevcut misafir oturumu varsa o hesap yukseltilir (bakiye korunur),
 * yoksa yeni hesap acilir.
 */
export function register({ username, password, existingToken }) {
  if (!USERNAME_RULE.test(username)) {
    return { error: 'Kullanıcı adı 3-20 karakter olmalı; harf, rakam ve _ kullanın.' };
  }
  if (typeof password !== 'string' || password.length < 6) {
    return { error: 'Parola en az 6 karakter olmalı.' };
  }
  const key = username.toLowerCase();
  if (state.usernames.has(key)) {
    return { error: 'Bu kullanıcı adı alınmış.' };
  }

  let account = getBySession(existingToken);
  let token = existingToken;

  if (account && account.guest) {
    // Misafir hesabi yukselt - bakiye, istatistik ve favoriler korunur.
  } else {
    const created = createGuest(username);
    account = created.account;
    token = created.token;
  }

  const { salt, hash } = hashPassword(password);
  account.username = username;
  account.name = username;
  account.salt = salt;
  account.passwordHash = hash;
  account.guest = false;
  state.usernames.set(key, account.id);
  save();
  return { account, token };
}

export function login({ username, password }) {
  const id = state.usernames.get(String(username || '').toLowerCase());
  const account = id ? state.users.get(id) : null;
  if (!account || !account.passwordHash) {
    return { error: 'Kullanıcı adı veya parola hatalı.' };
  }
  if (!verifyPassword(password, account.salt, account.passwordHash)) {
    return { error: 'Kullanıcı adı veya parola hatalı.' };
  }
  const token = issueSession(account.id);
  save();
  return { account, token };
}

export function getJackpots() {
  return state.jackpots;
}

export function levelFromXp(xp) {
  // Her seviye bir oncekinden %35 daha fazla XP ister.
  let level = 1;
  let need = 500;
  let total = 0;
  while (xp >= total + need && level < 100) {
    total += need;
    need = Math.round(need * 1.35);
    level += 1;
  }
  return { level, current: xp - total, need, total };
}

export function publicAccount(account) {
  const level = levelFromXp(account.xp || 0);
  return {
    id: account.id,
    name: account.name,
    username: account.username,
    guest: account.guest,
    role: account.role || 'user',
    admin: (account.role || 'user') === 'admin',
    banned: Boolean(account.banned),
    avatar: account.avatar || '🦊',
    xp: account.xp || 0,
    level,
    createdAt: account.createdAt,
    balance: round2(account.balance),
    bet: account.bet,
    freeSpins: { ...account.freeSpins, win: round2(account.freeSpins.win) },
    stats: {
      ...account.stats,
      wagered: round2(account.stats.wagered),
      won: round2(account.stats.won),
      biggestWin: round2(account.stats.biggestWin)
    },
    favorites: account.favorites,
    recent: account.recent,
    friends: account.friends || [],
    history: (account.history || []).slice(-30).reverse(),
    fair: {
      serverSeedHash: account.fair.serverSeedHash,
      clientSeed: account.fair.clientSeed,
      nonce: account.fair.nonce
    }
  };
}

/* ============ Ayarlar ============ */

export function getSettings() {
  return state.settings;
}

export function updateSettings(patch) {
  state.settings = mergeSettings(state.settings, patch);
  save();
  return state.settings;
}

/* ============ Admin ============ */

/** Ilk kayitli hesap veya ADMIN_USERNAME ile eslesen hesap admin olur. */
export function maybePromoteToAdmin(account) {
  const configured = (process.env.ADMIN_USERNAME || '').toLowerCase();
  const registeredCount = [...state.users.values()].filter((u) => u.username).length;
  if (configured && account.username?.toLowerCase() === configured) {
    account.role = 'admin';
    return true;
  }
  if (!configured && registeredCount === 1) {
    account.role = 'admin';
    return true;
  }
  return false;
}

export function listUsers({ query = '', limit = 50, offset = 0 } = {}) {
  const q = query.toLocaleLowerCase('tr').trim();
  const all = [...state.users.values()]
    .filter((u) => !q || (u.username || u.name || '').toLocaleLowerCase('tr').includes(q))
    .sort((a, b) => (b.lastSeenAt || b.createdAt) - (a.lastSeenAt || a.createdAt));
  return { total: all.length, users: all.slice(offset, offset + limit) };
}

export function getUserById(id) {
  return state.users.get(id);
}

/** Admin bakiye tanimlama / dusme. */
export function adjustBalance(userId, amount, reason, byUsername) {
  const account = state.users.get(userId);
  if (!account) return { error: 'Kullanıcı bulunamadı.' };
  const delta = Number(amount);
  if (!Number.isFinite(delta) || delta === 0) return { error: 'Geçersiz tutar.' };
  if (account.balance + delta < 0) return { error: 'Bakiye eksiye düşemez.' };

  account.balance = round2(account.balance + delta);
  recordLedger({
    userId,
    username: account.username || account.name,
    delta: round2(delta),
    balance: account.balance,
    reason: String(reason || 'Admin düzeltmesi').slice(0, 120),
    by: byUsername || 'admin'
  });
  save();
  return { account };
}

export function setBanned(userId, banned) {
  const account = state.users.get(userId);
  if (!account) return { error: 'Kullanıcı bulunamadı.' };
  if (account.role === 'admin' && banned) return { error: 'Admin hesabı engellenemez.' };
  account.banned = Boolean(banned);
  save();
  return { account };
}

export function setRole(userId, role) {
  const account = state.users.get(userId);
  if (!account) return { error: 'Kullanıcı bulunamadı.' };
  if (!['user', 'admin'].includes(role)) return { error: 'Geçersiz rol.' };
  const admins = [...state.users.values()].filter((u) => u.role === 'admin');
  if (account.role === 'admin' && role !== 'admin' && admins.length <= 1) {
    return { error: 'Son admin hesabının rolü değiştirilemez.' };
  }
  account.role = role;
  save();
  return { account };
}

function recordLedger(entry) {
  state.ledger.push({ ...entry, at: Date.now() });
  if (state.ledger.length > LEDGER_LIMIT) state.ledger.splice(0, state.ledger.length - LEDGER_LIMIT);
}

export function getLedger(limit = 60) {
  return state.ledger.slice(-limit).reverse();
}

/** Oyuncu gecmisine kayit ekler (profil ekraninda gosterilir). */
export function recordHistory(account, entry) {
  if (!account.history) account.history = [];
  account.history.push({ ...entry, at: Date.now() });
  if (account.history.length > 100) account.history.splice(0, account.history.length - 100);
}

export function addXp(account, amount) {
  account.xp = (account.xp || 0) + Math.max(0, Math.round(amount));
}

export function systemStats() {
  const users = [...state.users.values()];
  const registered = users.filter((u) => u.username);
  const wagered = users.reduce((sum, u) => sum + (u.stats?.wagered || 0), 0);
  const won = users.reduce((sum, u) => sum + (u.stats?.won || 0), 0);
  const spins = users.reduce((sum, u) => sum + (u.stats?.spins || 0), 0);
  const balance = users.reduce((sum, u) => sum + (u.balance || 0), 0);
  const dayAgo = Date.now() - 86400000;
  return {
    totalUsers: users.length,
    registeredUsers: registered.length,
    guestUsers: users.length - registered.length,
    activeToday: users.filter((u) => (u.lastSeenAt || 0) > dayAgo).length,
    bannedUsers: users.filter((u) => u.banned).length,
    totalBalance: round2(balance),
    wagered: round2(wagered),
    won: round2(won),
    spins,
    houseEdge: wagered > 0 ? round2(((wagered - won) / wagered) * 100) : 0,
    jackpots: { ...state.jackpots }
  };
}

export { round2 };

load();
