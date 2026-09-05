import express from 'express';
import { CATEGORIES, PROVIDERS, GAMES, GAME_BY_ID, categoryCounts, searchGames } from '../site/catalog.js';
import { taskView, claim, advance, rollDaily } from '../site/tasks.js';
import { publicAccount, save } from '../store/memory.js';
import { requireAccount, optionalAccount } from './auth.js';
import { getSettings } from '../store/memory.js';
import { currencyOf } from '../site/settings.js';
import { jackpotView } from './game.js';

export const router = express.Router();

const MAX_RECENT = 12;

/** Oyuncularin gormesi gereken ayarlar (gizli/idari alanlar haric). */
router.get('/settings', (req, res) => {
  const settings = getSettings();
  res.json({
    currency: currencyOf(settings),
    slot: { rtp: settings.slot.rtpTarget },
    poker: {
      rakePercent: settings.poker.rakePercent,
      actionSeconds: settings.poker.actionSeconds,
      maxSeats: settings.poker.maxSeats
    },
    blackjack: {
      dealerHitsSoft17: settings.blackjack.dealerHitsSoft17,
      blackjackPayout: settings.blackjack.blackjackPayout,
      deckCount: settings.blackjack.deckCount,
      insurance: settings.blackjack.insurance,
      maxSeats: settings.blackjack.maxSeats
    },
    tables: {
      stakes: settings.tables.stakes,
      blackjackLimits: settings.tables.blackjackLimits,
      allowBots: settings.tables.allowBots
    }
  });
});

/** Istemciye gidecek sade oyun kaydi. */
function view(game, account) {
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
    favorite: account ? account.favorites.includes(game.id) : false
  };
}

function byPopularity(a, b) {
  return b.popularity - a.popularity;
}

/** Lobi: kategoriler, vitrin raylari, jackpot havuzlari. */
router.get('/home', optionalAccount, (req, res) => {
  const account = req.account;
  const pick = (filter, sort, limit) =>
    GAMES.filter(filter).sort(sort).slice(0, limit).map((g) => view(g, account));

  const rows = [
    {
      id: 'oynanabilir',
      title: 'Şimdi Oynanabilir',
      subtitle: 'Tam sürüm oyunlar',
      games: pick((g) => g.playable, byPopularity, 12)
    },
    {
      id: 'populer',
      title: 'Popüler Oyunlar',
      games: pick((g) => g.categories.includes('populer'), byPopularity, 12)
    },
    {
      id: 'yeni',
      title: 'Yeni Eklenenler',
      games: pick((g) => g.categories.includes('yeni'), (a, b) => a.order - b.order, 12)
    },
    {
      id: 'jackpot',
      title: 'Jackpot Oyunları',
      games: pick((g) => g.categories.includes('jackpot'), byPopularity, 12)
    },
    {
      id: 'masa',
      title: 'Masa Oyunları',
      games: pick((g) => g.categories.includes('masa'), byPopularity, 12)
    },
    {
      id: 'bonus-buy',
      title: 'Bonus Buy',
      games: pick((g) => g.categories.includes('bonus-buy'), byPopularity, 12)
    }
  ];

  if (account?.recent?.length) {
    const recent = account.recent
      .map((id) => GAME_BY_ID.get(id))
      .filter(Boolean)
      .map((g) => view(g, account));
    if (recent.length) rows.unshift({ id: 'son', title: 'Son Oynadıkların', games: recent });
  }

  res.json({
    categories: CATEGORIES.map((c) => ({ ...c, count: categoryCounts()[c.id] })),
    providers: PROVIDERS,
    rows,
    jackpots: jackpotView(),
    totalGames: GAMES.length
  });
});

/** Kategori listesi (sayfalamali). */
router.get('/games', optionalAccount, (req, res) => {
  const { category, provider, sort = 'populer' } = req.query;
  const page = Math.max(1, Number(req.query.page) || 1);
  const perPage = Math.min(60, Math.max(6, Number(req.query.perPage) || 24));

  let list = GAMES;
  if (category && category !== 'tumu') {
    if (category === 'favoriler') {
      const favorites = req.account?.favorites || [];
      list = list.filter((g) => favorites.includes(g.id));
    } else {
      list = list.filter((g) => g.categories.includes(category));
    }
  }
  if (provider) list = list.filter((g) => g.provider === provider);

  const sorted = [...list];
  if (sort === 'ad') sorted.sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  else if (sort === 'rtp') sorted.sort((a, b) => b.rtp - a.rtp);
  else if (sort === 'yeni') sorted.sort((a, b) => Number(b.isNew) - Number(a.isNew) || a.order - b.order);
  else sorted.sort(byPopularity);

  const start = (page - 1) * perPage;
  res.json({
    total: sorted.length,
    page,
    perPage,
    games: sorted.slice(start, start + perPage).map((g) => view(g, req.account))
  });
});

router.get('/search', optionalAccount, (req, res) => {
  const query = String(req.query.q || '');
  const results = searchGames(query).slice(0, 40);
  res.json({ query, total: results.length, games: results.map((g) => view(g, req.account)) });
});

router.get('/game/:id', optionalAccount, (req, res) => {
  const game = GAME_BY_ID.get(req.params.id);
  if (!game) return res.status(404).json({ error: 'Oyun bulunamadı.' });
  const similar = GAMES.filter(
    (g) => g.id !== game.id && g.categories.some((c) => game.categories.includes(c))
  )
    .sort(byPopularity)
    .slice(0, 8)
    .map((g) => view(g, req.account));
  res.json({ game: view(game, req.account), similar });
});

/** Oyun acildiginda: son oynananlara ekle, "kesfet" gorevini ilerlet. */
router.post('/game/:id/open', requireAccount, (req, res) => {
  const game = GAME_BY_ID.get(req.params.id);
  if (!game) return res.status(404).json({ error: 'Oyun bulunamadı.' });
  const account = req.account;

  account.recent = [game.id, ...account.recent.filter((id) => id !== game.id)].slice(0, MAX_RECENT);

  rollDaily(account.tasks);
  if (!account.tasks.openedToday) account.tasks.openedToday = { day: account.tasks.day, ids: [] };
  if (account.tasks.openedToday.day !== account.tasks.day) {
    account.tasks.openedToday = { day: account.tasks.day, ids: [] };
  }
  if (!account.tasks.openedToday.ids.includes(game.id)) {
    account.tasks.openedToday.ids.push(game.id);
    advance(account.tasks, 'daily-games', account.tasks.openedToday.ids.length, 'set');
  }

  save();
  res.json({ ok: true, player: publicAccount(account) });
});

router.post('/favorite/:id', requireAccount, (req, res) => {
  const game = GAME_BY_ID.get(req.params.id);
  if (!game) return res.status(404).json({ error: 'Oyun bulunamadı.' });
  const account = req.account;
  const index = account.favorites.indexOf(game.id);
  if (index >= 0) account.favorites.splice(index, 1);
  else account.favorites.push(game.id);
  advance(account.tasks, 'favorites', account.favorites.length, 'set');
  save();
  res.json({ favorite: index < 0, favorites: account.favorites });
});

router.get('/tasks', requireAccount, (req, res) => {
  res.json({ tasks: taskView(req.account.tasks), player: publicAccount(req.account) });
});

router.post('/tasks/:id/claim', requireAccount, (req, res) => {
  const result = claim(req.account.tasks, req.params.id);
  if (result.error) return res.status(400).json({ error: result.error });
  req.account.balance += result.reward;
  save();
  res.json({
    reward: result.reward,
    tasks: taskView(req.account.tasks),
    player: publicAccount(req.account)
  });
});
