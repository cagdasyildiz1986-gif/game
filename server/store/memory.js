import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { config } from '../config.js';
import { createPools } from '../game/jackpot.js';
import { newServerSeed, hashSeed } from '../game/rng.js';
import { round2 } from '../game/session.js';
import { initialTaskState } from '../site/tasks.js';

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
  jackpots: createPools()
};

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
          jackpots: state.jackpots
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
    balance: config.startBalance,
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
    spinWindow: { start: 0, count: 0 }
  };
}

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

export function publicAccount(account) {
  return {
    id: account.id,
    name: account.name,
    username: account.username,
    guest: account.guest,
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
    fair: {
      serverSeedHash: account.fair.serverSeedHash,
      clientSeed: account.fair.clientSeed,
      nonce: account.fair.nonce
    }
  };
}

export { round2 };

load();
