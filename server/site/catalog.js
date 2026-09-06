/**
 * Oyun katalogu.
 *
 * Kapak gorselleri harici dosya degildir: her oyunun bir PALET ve MOTIF'i vardir,
 * istemci bunlardan vektorel kapagi uretir (public/js/cover.js). Boylece yuzlerce
 * oyun tek bir bayt gorsel indirmeden birbirinden ayirt edilebilir gorunur.
 *
 * Oyun isimleri ozgundur; hicbir saglayicinin marka veya oyun adi kullanilmaz.
 */

/**
 * Olası kategoriler. Listeye yalnızca EN AZ BİR oyunu olanlar çıkar
 * (bkz. CATEGORIES); böylece katalog küçüldüğünde boş sekme kalmaz.
 */
const ALL_CATEGORIES = [
  { id: 'populer', name: 'Popüler', icon: 'flame' },
  { id: 'yeni', name: 'Yeni', icon: 'sparkle' },
  { id: 'slot', name: 'Slot', icon: 'reels' },
  { id: 'masa', name: 'Masa Oyunları', icon: 'cards' },
  { id: 'rulet', name: 'Rulet', icon: 'wheel' },
  { id: 'bonus-buy', name: 'Bonus Buy', icon: 'gift' },
  { id: 'jackpot', name: 'Jackpot', icon: 'crown' },
  { id: 'hizli', name: 'Hızlı Oyunlar', icon: 'bolt' }
];

export const PROVIDERS = [
  'Star Studios',
  'Neon Forge',
  'Kismet Games',
  'Golden Anvil',
  'Vertex Play',
  'Blue Whale',
  'Nordlys',
  'Pharaon Works'
];

/** Kapak paletleri - [koyu zemin, ana renk, vurgu] */
export const PALETTES = {
  ember:    ['#2a0d05', '#ff6b1f', '#ffd166'],
  royal:    ['#12082e', '#7b3ff2', '#ffd166'],
  jade:     ['#04231c', '#12b886', '#c3fae8'],
  crimson:  ['#2b0410', '#e01b48', '#ffb3c1'],
  ocean:    ['#031a2e', '#1c7ed6', '#a5d8ff'],
  midnight: ['#0a0a1f', '#4c6ef5', '#dbe4ff'],
  sand:     ['#2c1c05', '#d9a406', '#ffe8a3'],
  vine:     ['#0f2005', '#5cb800', '#d8f5a2'],
  amethyst: ['#1c0630', '#b14aed', '#f3d9ff'],
  copper:   ['#2a1206', '#c9662b', '#ffd8a8'],
  ice:      ['#04202b', '#22b8cf', '#c5f6fa'],
  rose:     ['#2b0a1e', '#f06595', '#ffdeeb'],
  onyx:     ['#0c0c0f', '#8d99ae', '#edf2f4'],
  toxic:    ['#0f2b04', '#94d82d', '#f4fce3'],
  lava:     ['#280505', '#ff3c00', '#ffc078'],
  abyss:    ['#050d1a', '#3b5bdb', '#91a7ff']
};

/** Kapak motifleri - cover.js icinde vektorel karsiliklari var. */
export const MOTIFS = [
  'crown', 'pyramid', 'gem', 'fruit', 'bell', 'coin', 'dragon', 'book',
  'wolf', 'wave', 'star', 'joker', 'skull', 'anchor', 'lotus', 'horseshoe',
  'diamond', 'clover', 'phoenix', 'mask'
];

/**
 * Katalog kaynagi: [ad, kategoriler, palet, motif, volatilite, rtp]
 * "oynanabilir" olanlar ayrica engine alanina sahiptir.
 */
/**
 * Katalog kaynagi: [ad, kategoriler, palet, motif, volatilite, rtp, motor]
 *
 * Katalogda YALNIZCA gercekten oynanabilen oyunlar bulunur. Vitrini
 * doldurmak icin "yakinda" kartlari tutulmaz; her kart tiklanip oynanir.
 * Canli masalar (Texas Hold'em, Blackjack) bu listede degildir; onlarin
 * kendi bolumu ve sayfasi vardir (live.html).
 */
const RAW = [
  ['Mavi Mera', ['slot', 'populer', 'yeni', 'jackpot'], 'ocean', 'anchor', 'yuksek', 95.8, 'mavimera'],
  ['7 Hot Çan Zinciri', ['slot', 'populer', 'yeni', 'jackpot'], 'lava', 'bell', 'yuksek', 95.1, 'sevenhot'],
  ['Yıldırım Göklerin Öfkesi', ['slot', 'populer', 'yeni', 'bonus-buy'], 'amethyst', 'phoenix', 'yuksek', 95.4, 'yildirim'],
  ['Lucky Reels', ['slot', 'populer', 'jackpot'], 'ember', 'fruit', 'yuksek', 95.8, 'lucky-reels']
];

function slugify(name) {
  return name
    .toLocaleLowerCase('tr')
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Deterministik sahte "cevrimici oyuncu" ve populerlik degerleri. */
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/**
 * Kapak görseli olan oyunlar. Diğerlerinin kapağı public/js/cover.js
 * tarafından palet + motiften vektörel olarak üretilir.
 */
export const COVER_IMAGES = {
  yildirim: 'img/yildirim-cover.webp',
  sevenhot: 'img/sevenhot-cover.webp',
  mavimera: 'img/mavimera-cover.webp'
};

/** Oynanabilir motorların arayüz sayfaları. */
export const ENGINE_PAGES = {
  'lucky-reels': 'game.html',
  sevenhot: 'sevenhot.html',
  yildirim: 'yildirim.html',
  mavimera: 'mavimera.html'
};

export const GAMES = RAW.map(([name, categories, palette, motif, volatility, rtp, engine], index) => {
  const id = slugify(name);
  const h = hash(id);
  return {
    id,
    name,
    categories,
    provider: PROVIDERS[h % PROVIDERS.length],
    palette,
    motif,
    volatility,
    rtp,
    engine: engine || null,
    playable: Boolean(engine),
    page: engine ? ENGINE_PAGES[engine] || null : null,
    cover: engine ? COVER_IMAGES[engine] || null : null,
    isNew: categories.includes('yeni'),
    isHot: categories.includes('populer'),
    hasJackpot: categories.includes('jackpot'),
    /** Vitrin siralamasi ve "cevrimici" rozeti icin deterministik degerler. */
    popularity: (h >> 3) % 1000,
    online: 40 + ((h >> 5) % 260),
    order: index
  };
});

export const GAME_BY_ID = new Map(GAMES.map((g) => [g.id, g]));

/** Yalnızca en az bir oyunu olan kategoriler görünür. */
export const CATEGORIES = ALL_CATEGORIES.filter((c) =>
  GAMES.some((g) => g.categories.includes(c.id))
);

export function categoryCounts() {
  const counts = {};
  for (const category of CATEGORIES) {
    counts[category.id] = GAMES.filter((g) => g.categories.includes(category.id)).length;
  }
  return counts;
}

/** Arama: ad, saglayici ve kategori adlarinda buyuk/kucuk harf duyarsiz. */
export function searchGames(query) {
  const q = query.toLocaleLowerCase('tr').trim();
  if (!q) return [];
  return GAMES.filter(
    (g) =>
      g.name.toLocaleLowerCase('tr').includes(q) ||
      g.provider.toLocaleLowerCase('tr').includes(q) ||
      g.categories.some((c) => c.includes(q))
  );
}
