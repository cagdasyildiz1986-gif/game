/**
 * DEMO MODU — sunucusuz oynatma (GitHub Pages gibi statik barındırma için).
 *
 * Sunucu API'sinin birebir aynısını tarayıcıda taklit eder ve
 * `server/game/` altındaki GERÇEK oyun modüllerini kullanır (derlemede
 * `engine/` klasörüne kopyalanır), böylece matematik sunucuyla aynıdır.
 *
 * Not: Demo modunda RNG istemcide çalışır — bu yalnızca vitrin/test içindir.
 * Üretimde sunucu modu kullanılır (bkz. public/js/env.js).
 */
import { applySpin, round2 } from '../engine/session.js';
import { createPools, JACKPOT_LEVELS } from '../engine/jackpot.js';
import { PAYTABLE, SCATTER_PAY, FREE_SPINS } from '../engine/paytable.js';
import { PAYLINES } from '../engine/paylines.js';
import { SYMBOLS, WILD, SCATTER } from '../engine/symbols.js';

const STORAGE_KEY = 'lucky-reels-demo-state';
const BET_LEVELS = [20, 40, 100, 200, 400, 1000, 2000];
const START_BALANCE = 10000;

class BrowserRng {
  float() {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0] / 2 ** 32;
  }
  int(max) {
    return Math.floor(this.float() * max);
  }
}

const rng = new BrowserRng();

function freshState() {
  return {
    player: {
      id: 'demo',
      name: 'Misafir',
      balance: START_BALANCE,
      bet: 100,
      freeSpins: { remaining: 0, total: 0, multiplier: 1, win: 0 },
      stats: { spins: 0, wagered: 0, won: 0, biggestWin: 0 },
      lastSpinAt: 0
    },
    pools: createPools()
  };
}

let state = load();

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (raw?.player?.freeSpins && raw?.pools) return raw;
  } catch {
    /* bozuk kayit - sifirdan basla */
  }
  return freshState();
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* depolama kapali olabilir - oyun yine de calisir */
  }
}

function publicPlayer() {
  const p = state.player;
  return {
    id: p.id,
    name: p.name,
    balance: round2(p.balance),
    bet: p.bet,
    freeSpins: { ...p.freeSpins, win: round2(p.freeSpins.win) },
    stats: {
      ...p.stats,
      wagered: round2(p.stats.wagered),
      won: round2(p.stats.won),
      biggestWin: round2(p.stats.biggestWin)
    },
    fair: { serverSeedHash: 'demo', clientSeed: 'demo', nonce: p.stats.spins }
  };
}

function jackpotView() {
  return JACKPOT_LEVELS.map((level) => ({
    id: level.id,
    name: level.name,
    suit: level.suit,
    amount: round2(state.pools[level.id])
  }));
}

export const demoApi = {
  demo: true,
  clearToken() {
    state = freshState();
    persist();
  },
  async config() {
    return {
      symbols: SYMBOLS,
      wild: WILD,
      scatter: SCATTER,
      paytable: PAYTABLE,
      scatterPay: SCATTER_PAY,
      freeSpins: FREE_SPINS,
      paylines: PAYLINES,
      betLevels: BET_LEVELS,
      defaultBet: 100,
      reels: 5,
      rows: 3,
      jackpotLevels: JACKPOT_LEVELS.map(({ id, name, suit }) => ({ id, name, suit }))
    };
  },
  async session() {
    return { token: 'demo', player: publicPlayer(), jackpots: jackpotView() };
  },
  async state() {
    return { player: publicPlayer(), jackpots: jackpotView() };
  },
  async setBet(bet) {
    if (!BET_LEVELS.includes(bet)) throw new Error('Geçersiz bahis seviyesi.');
    if (state.player.freeSpins.remaining > 0) {
      throw new Error('Bedava dönüşler sırasında bahis değiştirilemez.');
    }
    state.player.bet = bet;
    persist();
    return { player: publicPlayer() };
  },
  async spin(bet) {
    const { error, spin } = applySpin({
      player: state.player,
      pools: state.pools,
      rng,
      bet,
      betLevels: BET_LEVELS
    });
    if (error) throw new Error(error);
    persist();
    return { spin: { ...spin, nonce: state.player.stats.spins }, player: publicPlayer(), jackpots: jackpotView() };
  },
  async jackpots() {
    return { jackpots: jackpotView() };
  },
  async setClientSeed() {
    throw new Error('Doğrulanabilir adalet yalnızca sunucu modunda çalışır.');
  },
  async rotateSeed() {
    throw new Error('Doğrulanabilir adalet yalnızca sunucu modunda çalışır.');
  }
};
