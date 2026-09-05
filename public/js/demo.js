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
import {
  CATEGORIES,
  PROVIDERS,
  GAMES,
  GAME_BY_ID,
  categoryCounts,
  searchGames as catalogSearch
} from '../engine/site/catalog.js';
import { initialTaskState, taskView, claim as claimTask, advance, applySpinToTasks, rollDaily }
  from '../engine/site/tasks.js';

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

/** Sunucudaki ile ayni seviye egrisi. */
function levelFromXp(xp) {
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

function freshState() {
  return {
    player: {
      id: 'demo',
      name: 'Misafir',
      username: null,
      guest: true,
      avatar: '🦊',
      xp: 0,
      createdAt: Date.now(),
      history: [],
      balance: START_BALANCE,
      bet: 20,
      freeSpins: { remaining: 0, total: 0, multiplier: 1, win: 0 },
      stats: { spins: 0, wagered: 0, won: 0, biggestWin: 0 },
      favorites: [],
      recent: [],
      tasks: initialTaskState(),
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
    favorites: p.favorites,
    recent: p.recent,
    username: p.username,
    guest: p.guest,
    admin: false,
    avatar: p.avatar || '🦊',
    createdAt: p.createdAt || Date.now(),
    xp: p.xp || 0,
    level: levelFromXp(p.xp || 0),
    history: (p.history || []).slice(-30).reverse(),
    fair: { serverSeedHash: 'demo', clientSeed: 'demo', nonce: p.stats.spins }
  };
}

/* ═══════ Katalog yardimcilari (sunucudaki site rotalarinin aynisi) ═══════ */

function gameView(game) {
  return {
    id: game.id,
    name: game.name,
    provider: game.provider,
    categories: game.categories,
    palette: game.palette,
    motif: game.motif,
    volatility: game.volatility,
    rtp: game.rtp,
    playable: game.playable,
    engine: game.engine,
    isNew: game.isNew,
    isHot: game.isHot,
    hasJackpot: game.hasJackpot,
    online: game.online,
    favorite: state.player.favorites.includes(game.id)
  };
}

const byPopularity = (a, b) => b.popularity - a.popularity;

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
      currency: { code: 'TRY', symbol: '₺', name: 'Türk Lirası', locale: 'tr-TR' },
      rtp: 95.8,
      symbols: SYMBOLS,
      wild: WILD,
      scatter: SCATTER,
      paytable: PAYTABLE,
      scatterPay: SCATTER_PAY,
      freeSpins: FREE_SPINS,
      paylines: PAYLINES,
      betLevels: BET_LEVELS,
      defaultBet: 20,
      reels: 5,
      rows: 3,
      jackpotLevels: JACKPOT_LEVELS.map(({ id, name, suit }) => ({ id, name, suit }))
    };
  },
  async session() {
    advance(state.player.tasks, 'daily-login', 1);
    persist();
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
    state.player.xp = (state.player.xp || 0) + Math.max(1, Math.round(state.player.bet / 10));
    applySpinToTasks(state.player.tasks, {
      spin,
      bet: state.player.bet,
      totalSpins: state.player.stats.spins
    });
    persist();
    return { spin: { ...spin, nonce: state.player.stats.spins }, player: publicPlayer(), jackpots: jackpotView() };
  },
  async jackpots() {
    return { jackpots: jackpotView() };
  },

  /* ---- Hesap (demo: yerel) ---- */
  async me() {
    return { player: publicPlayer() };
  },
  async publicSettings() {
    return {
      currency: { code: 'TRY', symbol: '₺', name: 'Türk Lirası', locale: 'tr-TR' },
      slot: { rtp: 95.8 },
      poker: { rakePercent: 0, actionSeconds: 25, maxSeats: 6 },
      blackjack: { dealerHitsSoft17: false, blackjackPayout: 1.5, deckCount: 6, insurance: true, maxSeats: 5 },
      tables: { stakes: [], blackjackLimits: [], allowBots: false }
    };
  },
  async avatars() {
    return { avatars: ['🦊', '🐺', '🦁', '🐯', '🐼', '🦅', '🐉', '🦈', '🐍', '🦂', '🐙', '🦉'] };
  },
  async updateProfile(patch) {
    if (patch.avatar) state.player.avatar = patch.avatar;
    if (patch.name) state.player.name = String(patch.name).trim().slice(0, 24);
    persist();
    return { player: publicPlayer() };
  },
  async register(username, password) {
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      throw new Error('Kullanıcı adı 3-20 karakter olmalı; harf, rakam ve _ kullanın.');
    }
    if (!password || password.length < 6) throw new Error('Parola en az 6 karakter olmalı.');
    // Demo modunda sunucu yok: hesap yalnizca bu tarayicida saklanir.
    state.player.username = username;
    state.player.name = username;
    state.player.guest = false;
    advance(state.player.tasks, 'register', 1);
    persist();
    return { token: 'demo', player: publicPlayer() };
  },
  async login(username, password) {
    if (!state.player.username) throw new Error('Demo modunda önce kayıt olun.');
    if (username !== state.player.username) throw new Error('Kullanıcı adı veya parola hatalı.');
    if (!password || password.length < 6) throw new Error('Kullanıcı adı veya parola hatalı.');
    return { token: 'demo', player: publicPlayer() };
  },
  async logout() {
    state = freshState();
    persist();
  },

  /* ---- Site ---- */
  async home() {
    const pick = (filter, sort, limit) => GAMES.filter(filter).sort(sort).slice(0, limit).map(gameView);
    const rows = [
      { id: 'oynanabilir', title: 'Şimdi Oynanabilir', subtitle: 'Tam sürüm oyunlar',
        games: pick((g) => g.playable, byPopularity, 12) },
      { id: 'populer', title: 'Popüler Oyunlar',
        games: pick((g) => g.categories.includes('populer'), byPopularity, 12) },
      { id: 'yeni', title: 'Yeni Eklenenler',
        games: pick((g) => g.categories.includes('yeni'), (a, b) => a.order - b.order, 12) },
      { id: 'jackpot', title: 'Jackpot Oyunları',
        games: pick((g) => g.categories.includes('jackpot'), byPopularity, 12) },
      { id: 'masa', title: 'Masa Oyunları',
        games: pick((g) => g.categories.includes('masa'), byPopularity, 12) },
      { id: 'bonus-buy', title: 'Bonus Buy',
        games: pick((g) => g.categories.includes('bonus-buy'), byPopularity, 12) }
    ];
    if (state.player.recent.length) {
      const recent = state.player.recent.map((id) => GAME_BY_ID.get(id)).filter(Boolean).map(gameView);
      if (recent.length) rows.unshift({ id: 'son', title: 'Son Oynadıkların', games: recent });
    }
    const counts = categoryCounts();
    return {
      categories: CATEGORIES.map((c) => ({ ...c, count: counts[c.id] })),
      providers: PROVIDERS,
      rows,
      jackpots: jackpotView(),
      totalGames: GAMES.length
    };
  },
  async games({ category, provider, sort = 'populer', perPage = 60, page = 1 } = {}) {
    let list = GAMES;
    if (category && category !== 'tumu') {
      list = category === 'favoriler'
        ? list.filter((g) => state.player.favorites.includes(g.id))
        : list.filter((g) => g.categories.includes(category));
    }
    if (provider) list = list.filter((g) => g.provider === provider);
    const sorted = [...list];
    if (sort === 'ad') sorted.sort((a, b) => a.name.localeCompare(b.name, 'tr'));
    else if (sort === 'rtp') sorted.sort((a, b) => b.rtp - a.rtp);
    else if (sort === 'yeni') sorted.sort((a, b) => Number(b.isNew) - Number(a.isNew) || a.order - b.order);
    else sorted.sort(byPopularity);
    const start = (page - 1) * perPage;
    return { total: sorted.length, page, perPage, games: sorted.slice(start, start + perPage).map(gameView) };
  },
  async searchGames(q) {
    const results = catalogSearch(q).slice(0, 40);
    return { query: q, total: results.length, games: results.map(gameView) };
  },
  async gameDetail(id) {
    const game = GAME_BY_ID.get(id);
    if (!game) throw new Error('Oyun bulunamadı.');
    const similar = GAMES.filter(
      (g) => g.id !== game.id && g.categories.some((c) => game.categories.includes(c))
    ).sort(byPopularity).slice(0, 8).map(gameView);
    return { game: gameView(game), similar };
  },
  async openGame(id) {
    const game = GAME_BY_ID.get(id);
    if (!game) throw new Error('Oyun bulunamadı.');
    const p = state.player;
    p.recent = [game.id, ...p.recent.filter((x) => x !== game.id)].slice(0, 12);
    rollDaily(p.tasks);
    if (!p.tasks.openedToday || p.tasks.openedToday.day !== p.tasks.day) {
      p.tasks.openedToday = { day: p.tasks.day, ids: [] };
    }
    if (!p.tasks.openedToday.ids.includes(game.id)) {
      p.tasks.openedToday.ids.push(game.id);
      advance(p.tasks, 'daily-games', p.tasks.openedToday.ids.length, 'set');
    }
    persist();
    return { ok: true, player: publicPlayer() };
  },
  async toggleFavorite(id) {
    const favorites = state.player.favorites;
    const index = favorites.indexOf(id);
    if (index >= 0) favorites.splice(index, 1);
    else favorites.push(id);
    advance(state.player.tasks, 'favorites', favorites.length, 'set');
    persist();
    return { favorite: index < 0, favorites };
  },
  async tasks() {
    return { tasks: taskView(state.player.tasks), player: publicPlayer() };
  },
  async claimTask(id) {
    const result = claimTask(state.player.tasks, id);
    if (result.error) throw new Error(result.error);
    state.player.balance += result.reward;
    persist();
    return { reward: result.reward, tasks: taskView(state.player.tasks), player: publicPlayer() };
  },
  async setClientSeed() {
    throw new Error('Doğrulanabilir adalet yalnızca sunucu modunda çalışır.');
  },
  async rotateSeed() {
    throw new Error('Doğrulanabilir adalet yalnızca sunucu modunda çalışır.');
  }
};
