import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { config } from '../config.js';
import { createPools } from '../game/jackpot.js';
import { newServerSeed, hashSeed } from '../game/rng.js';

/**
 * Basit bellek ici depo + JSON dosyasina kalici yazma.
 * Gercek uretimde bu modulun yerine Postgres/Redis adaptoru yazilabilir;
 * disari acilan arayuz (getPlayer/createPlayer/save) aynidir.
 */

const state = {
  players: new Map(),
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
    state.players = new Map(Object.entries(raw.players || {}));
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
        JSON.stringify({ players: Object.fromEntries(state.players), jackpots: state.jackpots })
      );
    } catch (err) {
      console.warn('[store] kayit yazilamadi:', err.message);
    }
  }, 500);
  saveTimer.unref?.();
}

export function createPlayer(name = 'Misafir') {
  const serverSeed = newServerSeed();
  const player = {
    id: crypto.randomUUID(),
    token: crypto.randomBytes(24).toString('hex'),
    name,
    balance: config.startBalance,
    bet: config.defaultBet,
    createdAt: Date.now(),
    freeSpins: { remaining: 0, total: 0, multiplier: 1, win: 0 },
    stats: { spins: 0, wagered: 0, won: 0, biggestWin: 0 },
    fair: {
      serverSeed,
      serverSeedHash: hashSeed(serverSeed),
      clientSeed: crypto.randomBytes(8).toString('hex'),
      nonce: 0
    },
    lastSpinAt: 0,
    spinWindow: { start: 0, count: 0 }
  };
  state.players.set(player.token, player);
  save();
  return player;
}

export function getPlayer(token) {
  return token ? state.players.get(token) : undefined;
}

export function getJackpots() {
  return state.jackpots;
}

export function publicPlayer(player) {
  return {
    id: player.id,
    name: player.name,
    balance: round2(player.balance),
    bet: player.bet,
    freeSpins: { ...player.freeSpins, win: round2(player.freeSpins.win) },
    stats: {
      ...player.stats,
      wagered: round2(player.stats.wagered),
      won: round2(player.stats.won),
      biggestWin: round2(player.stats.biggestWin)
    },
    fair: {
      serverSeedHash: player.fair.serverSeedHash,
      clientSeed: player.fair.clientSeed,
      nonce: player.fair.nonce
    }
  };
}

export function round2(value) {
  return Math.round(value * 100) / 100;
}

load();
