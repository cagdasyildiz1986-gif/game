/**
 * Oyun katalogu.
 *
 * Kapak gorselleri harici dosya degildir: her oyunun bir PALET ve MOTIF'i vardir,
 * istemci bunlardan vektorel kapagi uretir (public/js/cover.js). Boylece yuzlerce
 * oyun tek bir bayt gorsel indirmeden birbirinden ayirt edilebilir gorunur.
 *
 * Oyun isimleri ozgundur; hicbir saglayicinin marka veya oyun adi kullanilmaz.
 */

export const CATEGORIES = [
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
  'Aurum Studios',
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
const RAW = [
  ['Lucky Reels', ['slot', 'populer', 'jackpot'], 'ember', 'fruit', 'yuksek', 95.8, 'lucky-reels'],
  ['7 Hot Çan Zinciri', ['slot', 'populer', 'yeni', 'jackpot'], 'lava', 'bell', 'yuksek', 95.6, 'sevenhot'],
  ['Yıldırım Göklerin Öfkesi', ['slot', 'populer', 'yeni', 'bonus-buy'], 'amethyst', 'phoenix', 'yuksek', 95.4, 'yildirim'],

  ['Altın Firavun', ['slot', 'populer'], 'sand', 'pyramid', 'yuksek', 96.1],
  ['Ejder Hazinesi', ['slot', 'populer', 'jackpot'], 'crimson', 'dragon', 'yuksek', 95.4],
  ['Kristal Mağara', ['slot', 'yeni'], 'ice', 'gem', 'orta', 96.4],
  ['Zümrüt Ormanı', ['slot'], 'jade', 'lotus', 'orta', 96.0],
  ['Kayıp Tapınak', ['slot', 'bonus-buy'], 'vine', 'mask', 'yuksek', 95.7],
  ['Gece Yarısı Kulübü', ['slot', 'yeni'], 'midnight', 'star', 'dusuk', 96.6],
  ['Kızıl Kurt', ['slot', 'populer'], 'onyx', 'wolf', 'yuksek', 95.2],
  ['Deniz Feneri', ['slot'], 'ocean', 'anchor', 'orta', 96.2],
  ['Bereket Sepeti', ['slot', 'populer'], 'vine', 'fruit', 'dusuk', 96.5],
  ['Sonsuz Yaz', ['slot', 'yeni'], 'rose', 'wave', 'orta', 96.3],
  ['Şans Nalı', ['slot'], 'sand', 'horseshoe', 'dusuk', 96.7],
  ['Kayıp Kitap', ['slot', 'bonus-buy', 'populer'], 'copper', 'book', 'yuksek', 95.5],
  ['Anka Yükselişi', ['slot', 'bonus-buy'], 'lava', 'phoenix', 'yuksek', 95.1],
  ['Buzul Kraliçesi', ['slot', 'yeni'], 'ice', 'crown', 'orta', 96.2],
  ['Joker Gecesi', ['slot'], 'amethyst', 'joker', 'orta', 96.0],
  ['Altın Çan', ['slot', 'hizli'], 'sand', 'bell', 'dusuk', 96.8],
  ['Korsan Koyu', ['slot', 'bonus-buy'], 'ocean', 'skull', 'yuksek', 95.6],
  ['Mistik Maske', ['slot'], 'abyss', 'mask', 'orta', 96.1],
  ['Elmas Hattı', ['slot', 'jackpot'], 'midnight', 'diamond', 'yuksek', 95.3],
  ['Yonca Tarlası', ['slot', 'hizli'], 'toxic', 'clover', 'dusuk', 96.9],
  ['Kraliyet Mührü', ['slot', 'populer', 'jackpot'], 'royal', 'crown', 'yuksek', 95.0],
  ['Volkan Kalbi', ['slot', 'bonus-buy'], 'lava', 'phoenix', 'yuksek', 94.9],
  ['Yıldız Tozu', ['slot', 'yeni'], 'amethyst', 'star', 'orta', 96.4],
  ['Safir Nehri', ['slot'], 'ocean', 'wave', 'orta', 96.3],
  ['Bronz Kapı', ['slot'], 'copper', 'coin', 'orta', 96.0],
  ['Çöl Rüzgarı', ['slot'], 'sand', 'pyramid', 'orta', 96.2],
  ['Kadife Kule', ['slot', 'yeni'], 'royal', 'gem', 'orta', 96.1],
  ['Gizli Bahçe', ['slot'], 'jade', 'lotus', 'dusuk', 96.6],
  ['Kanlı Ay', ['slot', 'bonus-buy'], 'crimson', 'wolf', 'yuksek', 95.4],
  ['Altın Balık', ['slot', 'populer'], 'ice', 'wave', 'orta', 96.2],
  ['Kum Saati', ['slot'], 'copper', 'gem', 'orta', 96.0],
  ['Uğur Böceği', ['slot', 'hizli'], 'toxic', 'clover', 'dusuk', 96.7],
  ['Karanlık Orman', ['slot'], 'vine', 'wolf', 'yuksek', 95.5],
  ['Piramit Sırrı', ['slot', 'jackpot'], 'sand', 'pyramid', 'yuksek', 95.2],
  ['Neon Şehir', ['slot', 'yeni'], 'amethyst', 'star', 'orta', 96.3],
  ['Kayıp Mürekkep', ['slot', 'bonus-buy'], 'abyss', 'book', 'yuksek', 95.6],
  ['Altın Kase', ['slot'], 'sand', 'coin', 'orta', 96.1],
  ['Buz Ejderi', ['slot', 'bonus-buy'], 'ice', 'dragon', 'yuksek', 95.3],
  ['Meyve Bahçesi', ['slot', 'hizli', 'populer'], 'vine', 'fruit', 'dusuk', 96.8],
  ['Yakut Kalp', ['slot'], 'crimson', 'gem', 'orta', 96.2],
  ['Fırtına Tanrısı', ['slot', 'populer'], 'abyss', 'phoenix', 'yuksek', 95.1],
  ['Gümüş Nal', ['slot'], 'onyx', 'horseshoe', 'orta', 96.4],
  ['Sisli Liman', ['slot'], 'ocean', 'anchor', 'orta', 96.0],
  ['Kraliçe Taşı', ['slot', 'jackpot'], 'royal', 'crown', 'yuksek', 95.0],
  ['Alev Çiçeği', ['slot', 'yeni'], 'lava', 'lotus', 'orta', 96.2],
  ['Yeşil Vadi', ['slot'], 'jade', 'clover', 'dusuk', 96.6],
  ['Maskeli Balo', ['slot', 'bonus-buy'], 'amethyst', 'mask', 'yuksek', 95.5],
  ['Altın Anahtar', ['slot'], 'sand', 'coin', 'orta', 96.1],
  ['Kâşifin Günlüğü', ['slot', 'bonus-buy'], 'copper', 'book', 'yuksek', 95.4],
  ['Yıldız Kapısı', ['slot', 'yeni'], 'midnight', 'star', 'orta', 96.3],
  ['Kayıp Şehir', ['slot', 'jackpot'], 'vine', 'mask', 'yuksek', 95.2],
  ['Şeker Diyarı', ['slot', 'populer'], 'rose', 'fruit', 'orta', 96.4],
  ['Mor Şafak', ['slot'], 'amethyst', 'wave', 'orta', 96.0],
  ['Demir Kale', ['slot'], 'onyx', 'skull', 'yuksek', 95.7],
  ['Bal Peteği', ['slot', 'hizli'], 'sand', 'clover', 'dusuk', 96.9],
  ['Kar Tanesi', ['slot', 'yeni'], 'ice', 'diamond', 'orta', 96.2],
  ['Kızıl Elma', ['slot', 'hizli'], 'crimson', 'fruit', 'dusuk', 96.7],
  ['Gökyüzü Sarayı', ['slot', 'bonus-buy'], 'midnight', 'crown', 'yuksek', 95.3],
  ['Derin Mavi', ['slot'], 'ocean', 'wave', 'orta', 96.1],
  ['Altın Çağ', ['slot', 'jackpot', 'populer'], 'sand', 'crown', 'yuksek', 95.1],

  ['Klasik Rulet', ['rulet', 'masa', 'populer'], 'crimson', 'wheel', 'dusuk', 97.3],
  ['Avrupa Ruleti', ['rulet', 'masa'], 'jade', 'wheel', 'dusuk', 97.3],
  ['Fransız Ruleti', ['rulet', 'masa'], 'royal', 'wheel', 'dusuk', 98.6],
  ['Amerikan Ruleti', ['rulet', 'masa'], 'onyx', 'wheel', 'dusuk', 94.7],
  ['Hızlı Rulet', ['rulet', 'hizli'], 'ember', 'wheel', 'dusuk', 97.3],
  ['Altın Rulet', ['rulet', 'jackpot'], 'sand', 'wheel', 'orta', 97.0],
  ['Mini Rulet', ['rulet', 'hizli'], 'ice', 'wheel', 'dusuk', 97.1],
  ['Çift Sıfır Rulet', ['rulet', 'masa'], 'abyss', 'wheel', 'dusuk', 94.7],

  ['Blackjack Klasik', ['masa', 'populer'], 'jade', 'cards', 'dusuk', 99.4],
  ['Blackjack VIP', ['masa'], 'royal', 'cards', 'dusuk', 99.5],
  ['Bakara', ['masa'], 'crimson', 'cards', 'dusuk', 98.9],
  ['Punto Banco', ['masa'], 'onyx', 'cards', 'dusuk', 98.8],
  ['Casino Hold’em', ['masa'], 'midnight', 'cards', 'orta', 97.8],
  ['Üç Kart Poker', ['masa'], 'copper', 'cards', 'orta', 96.6],
  ['Karayip Pokeri', ['masa'], 'ocean', 'cards', 'orta', 97.2],
  ['Oasis Poker', ['masa'], 'sand', 'cards', 'orta', 96.9],
  ['Rus Pokeri', ['masa'], 'ice', 'cards', 'orta', 97.4],
  ['Sic Bo', ['masa', 'hizli'], 'lava', 'gem', 'orta', 97.2],
  ['Craps', ['masa'], 'vine', 'gem', 'orta', 98.6],
  ['Keno', ['masa', 'hizli'], 'amethyst', 'star', 'yuksek', 95.0],
  ['Video Poker Deluxe', ['masa'], 'abyss', 'cards', 'orta', 99.1],
  ['Joker Poker', ['masa'], 'amethyst', 'joker', 'orta', 98.6],
  ['Pai Gow', ['masa'], 'rose', 'cards', 'dusuk', 97.5],
  ['Rulet Şov', ['masa', 'rulet', 'populer'], 'ember', 'wheel', 'orta', 96.8],

  ['Çarkıfelek', ['hizli', 'populer'], 'ember', 'wheel', 'orta', 96.3],
  ['Mayın Tarlası', ['hizli', 'yeni'], 'toxic', 'skull', 'yuksek', 97.0],
  ['Yükselen Çarpan', ['hizli', 'populer'], 'lava', 'phoenix', 'yuksek', 97.0],
  ['Zar Düellosu', ['hizli'], 'copper', 'gem', 'orta', 97.5],
  ['Kazı Kazan Altın', ['hizli'], 'sand', 'coin', 'orta', 95.8],
  ['Kazı Kazan Elmas', ['hizli'], 'ice', 'diamond', 'orta', 95.9],
  ['Şans Kutusu', ['hizli', 'yeni'], 'rose', 'gem', 'orta', 96.1],
  ['Yazı Tura', ['hizli'], 'onyx', 'coin', 'dusuk', 98.0],
  ['Piyango Çekilişi', ['hizli'], 'royal', 'star', 'yuksek', 94.5],
  ['Hızlı Bingo', ['hizli'], 'jade', 'clover', 'orta', 95.5],

  ['Mega Servet', ['jackpot', 'populer'], 'sand', 'crown', 'yuksek', 94.2],
  ['Sonsuz Jackpot', ['jackpot'], 'lava', 'coin', 'yuksek', 94.0],
  ['Elmas Kule Jackpot', ['jackpot'], 'ice', 'diamond', 'yuksek', 94.4],
  ['Kraliyet Serveti', ['jackpot'], 'royal', 'crown', 'yuksek', 94.1],
  ['Altın Kasa', ['jackpot', 'yeni'], 'copper', 'coin', 'yuksek', 94.3],

  ['Bonus Avcısı', ['bonus-buy', 'yeni'], 'ember', 'gift', 'yuksek', 95.8],
  ['Anında Bonus', ['bonus-buy'], 'amethyst', 'gift', 'yuksek', 95.6],
  ['Süper Çevrim', ['bonus-buy', 'populer'], 'lava', 'phoenix', 'yuksek', 95.4],
  ['Bonus Kapısı', ['bonus-buy'], 'midnight', 'gift', 'yuksek', 95.5],
  ['Altın Bilet', ['bonus-buy'], 'sand', 'gift', 'yuksek', 95.7]
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

/** Oynanabilir motorların arayüz sayfaları. */
export const ENGINE_PAGES = {
  'lucky-reels': 'game.html',
  sevenhot: 'sevenhot.html',
  yildirim: 'yildirim.html'
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
