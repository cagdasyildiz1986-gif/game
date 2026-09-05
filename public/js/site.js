/**
 * AURUM lobi uygulamasi.
 *
 * Hash tabanli yonlendirici + gorunumler. Sunucu API'si ile konusur;
 * statik barindirmada (GitHub Pages) demo arka ucuna duser.
 */
import { api } from './api.js';
import { icon } from './icons.js';
import { coverMarkup } from './cover.js';

/* ═════════ Durum ═════════ */
const state = {
  player: null,
  home: null,
  categories: [],
  backend: api,
  route: null,
  settings: null,
  avatars: []
};

const $ = (id) => document.getElementById(id);
let currency = { symbol: '₺', locale: 'tr-TR' };
const fmt = (n) =>
  Number(n || 0).toLocaleString(currency.locale, { maximumFractionDigits: 0 });
const money = (n) => `${currency.symbol}${fmt(n)}`;
const VOLATILITY = { dusuk: 'Düşük volatilite', orta: 'Orta volatilite', yuksek: 'Yüksek volatilite' };

/* ═════════ Tema ═════════ */
const THEME_KEY = 'aurum-theme';

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* depolama kapali olabilir */
  }
  const btn = $('btn-theme');
  if (btn) btn.innerHTML = icon(theme === 'dark' ? 'sun' : 'moon');
}

function initTheme() {
  let theme = 'light';
  try {
    theme = localStorage.getItem(THEME_KEY) || 'light';
  } catch {
    /* yoksay */
  }
  applyTheme(theme);
}

function toast(message, gold = false) {
  const host = $('toast-host');
  host.innerHTML = `<div class="toast${gold ? ' gold' : ''}">${message}</div>`;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (host.innerHTML = ''), 2600);
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

/* ═════════ Ortak parcalar ═════════ */

function gameCard(game) {
  const badges = [];
  if (game.playable) badges.push('<span class="badge badge-play">OYNA</span>');
  else if (game.isNew) badges.push('<span class="badge badge-new">YENİ</span>');
  else if (game.isHot) badges.push('<span class="badge badge-hot">POPÜLER</span>');
  if (game.hasJackpot) badges.push('<span class="badge badge-jp">JACKPOT</span>');

  return `<button class="game" data-game="${game.id}">
    <div class="game-art">
      ${coverMarkup(game)}
      <div class="badges">${badges.join('')}</div>
      <span class="fav-btn${game.favorite ? ' on' : ''}" data-fav="${game.id}" role="button" tabindex="0"
        aria-label="Favorilere ekle">${icon('heart')}</span>
      <span class="online-tag"><i></i>${game.online}</span>
    </div>
    <div class="game-meta">
      <div class="game-name">${escapeHtml(game.name)}</div>
      <div class="game-provider">${escapeHtml(game.provider)}</div>
    </div>
  </button>`;
}

function heroSlides() {
  return [
    {
      kicker: 'HOŞ GELDİN PAKETİ',
      title: 'Hesabında <em>10.000</em> kredi',
      text: 'Görevleri tamamla, kredin artsın. Gerçek para yok — sadece oyun.',
      cta: 'Ücretsiz Katıl',
      route: '#/kayit',
      palette: ['#1b2559', '#3d54b8', '#e6c069'],
      motif: 'crown'
    },
    {
      kicker: 'ÖNE ÇIKAN OYUN',
      title: '<em>Lucky Reels</em><br>20 hat · x3 bedava dönüş',
      text: 'Jackpot Cards bonusu ve %95,8 RTP ile tam sürüm slot.',
      cta: 'Hemen Oyna',
      route: '#/oyun/lucky-reels',
      palette: ['#241a4d', '#6b52d8', '#f0d79a'],
      motif: 'reels'
    },
    {
      kicker: 'GÖREVLER',
      title: 'Kredini <em>oynayarak</em> kazan',
      text: 'Günlük görevler, kilometre taşları ve sürpriz ödüller seni bekliyor.',
      cta: 'Görevlere Git',
      route: '#/gorevler',
      palette: ['#0a2e26', '#0f8f6b', '#a8ecd6'],
      motif: 'gift'
    }
  ];
}

function heroArt(slide, index) {
  const [dark, main, light] = slide.palette;
  return `<svg viewBox="0 0 400 225" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <linearGradient id="hb${index}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${dark}"/><stop offset="60%" stop-color="#08080f"/>
        <stop offset="100%" stop-color="#04040a"/>
      </linearGradient>
      <radialGradient id="hg${index}" cx="0.78" cy="0.4" r="0.6">
        <stop offset="0%" stop-color="${light}" stop-opacity=".5"/>
        <stop offset="55%" stop-color="${main}" stop-opacity=".22"/>
        <stop offset="100%" stop-color="${main}" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="hm${index}" x1="0" y1="0" x2="0.6" y2="1">
        <stop offset="0%" stop-color="${light}"/><stop offset="100%" stop-color="${main}"/>
      </linearGradient>
    </defs>
    <rect width="400" height="225" fill="url(#hb${index})"/>
    <circle cx="318" cy="96" r="150" fill="url(#hg${index})"/>
    <g opacity=".09" fill="${light}">
      <path d="M318 96 236 -46h12zM318 96 292 -52h8zM318 96 352 -50h9zM318 96 400 -18v22zM318 96 400 178v24z"/>
    </g>
    <g fill="url(#hm${index})" opacity=".9">
      <circle cx="330" cy="104" r="34"/>
      <circle cx="330" cy="104" r="24" fill="#04040a" opacity=".45"/>
      <text x="330" y="116" text-anchor="middle" font-size="30" font-weight="900"
        font-family="Georgia, serif" fill="${light}">₳</text>
    </g>
    <g fill="${main}" opacity=".85">
      <circle cx="286" cy="152" r="15"/><circle cx="372" cy="146" r="11"/>
      <circle cx="308" cy="182" r="9"/><circle cx="356" cy="60" r="8"/>
    </g>
    <g fill="${light}" opacity=".5">
      <path d="M262 44l7 10-7 10-7-10z"/>
      <path d="M382 96c4-6 10-4 10 1 0 4-5 7-10 11-5-4-10-7-10-11 0-5 6-7 10-1z"/>
    </g>
  </svg>`;
}

function trustBar() {
  const items = [
    ['server', 'Sunucu RNG', 'Sonuçlar sunucuda üretilir'],
    ['lock', 'Kanıtlanabilir', 'HMAC-SHA256 doğrulaması'],
    ['coin', 'Gerçek Para Yok', 'Krediler satın alınamaz'],
    ['shield', '18+ Sorumlu Oyun', 'Yalnızca eğlence']
  ];
  return `<div class="trustbar">
    ${items
      .map(
        ([ico, title, sub]) => `<div class="trust">
          <div class="trust-icon">${icon(ico)}</div>
          <div style="min-width:0">
            <div class="trust-title">${title}</div>
            <div class="trust-sub">${sub}</div>
          </div>
        </div>`
      )
      .join('')}
  </div>`;
}

function jackpotBanner(jackpots) {
  const total = jackpots.reduce((sum, j) => sum + j.amount, 0);
  return `<div class="jackpot-banner">
    <div class="jackpot-label">Progresif Jackpot Havuzu</div>
    <div class="jackpot-total">${money(total)}</div>
    <div class="jackpot-levels">
      ${jackpots
        .map(
          (j) => `<div class="jackpot-level">
            <b>${fmt(j.amount)}</b><span>${j.suit} ${escapeHtml(j.name)}</span>
          </div>`
        )
        .join('')}
    </div>
  </div>`;
}

function footer() {
  return `<footer class="footer">
    <div class="footer-cols">
      <div>
        <h4>Oyunlar</h4>
        <ul>
          <li data-route="#/kategori/slot">Slot</li>
          <li data-route="#/kategori/masa">Masa Oyunları</li>
          <li data-route="#/kategori/rulet">Rulet</li>
          <li data-route="#/kategori/bonus-buy">Bonus Buy</li>
        </ul>
      </div>
      <div>
        <h4>Hesap</h4>
        <ul>
          <li data-route="#/profil">Profilim</li>
          <li data-route="#/gorevler">Görevler</li>
          <li data-route="#/kategori/favoriler">Favorilerim</li>
        </ul>
      </div>
      <div>
        <h4>Yardım</h4>
        <ul>
          <li data-route="#/sayfa/nasil-calisir">Nasıl Çalışır?</li>
          <li data-route="#/sayfa/adalet">Doğrulanabilir Adalet</li>
          <li data-route="#/sayfa/sorumlu-oyun">Sorumlu Oyun</li>
        </ul>
      </div>
      <div>
        <h4>Yasal</h4>
        <ul>
          <li data-route="#/sayfa/kosullar">Kullanım Koşulları</li>
          <li data-route="#/sayfa/gizlilik">Gizlilik</li>
        </ul>
      </div>
    </div>

    <div class="footer-badges">
      <span class="age-badge">18+</span>
      <span class="footer-badge">${icon('shield')} Sunucu taraflı RNG</span>
      <span class="footer-badge">${icon('lock')} Doğrulanabilir adalet</span>
      <span class="footer-badge">${icon('coin')} Gerçek para yok</span>
    </div>

    <p class="footer-legal">
      AURUM bir <b>sosyal casino</b>dur. Oyunlarda kullanılan krediler sanaldır;
      satın alınamaz, nakde çevrilemez ve hiçbir parasal karşılığı yoktur.
      Kredi yalnızca görevler ve oyun içi ödüllerle kazanılır.
      Bu site gerçek para ile bahis kabul etmez ve spor bahisleri içermez.
      18 yaşından küçükler kullanamaz. Oyun bir eğlence aracıdır; gelir kaynağı değildir.
      <br><br>© ${new Date().getFullYear()} AURUM · Tüm hakları saklıdır.
    </p>
  </footer>`;
}

/* ═════════ Gorunumler ═════════ */

function renderHome() {
  const data = state.home;
  if (!data) return skeletonHome();

  const slides = heroSlides();

  return `
  <section class="hero" id="hero">
    <div class="hero-track" id="hero-track">
      ${slides
        .map(
          (s, i) => `<div class="hero-slide">
            ${heroArt(s, i)}
            <div class="hero-body">
              <div class="hero-kicker">${s.kicker}</div>
              <h2 class="hero-title">${s.title}</h2>
              <p class="hero-text">${s.text}</p>
              <button class="btn btn-gold hero-cta" data-route="${s.route}">${s.cta}</button>
            </div>
          </div>`
        )
        .join('')}
    </div>
    <div class="hero-dots" id="hero-dots">
      ${slides.map((_, i) => `<i class="${i === 0 ? 'on' : ''}"></i>`).join('')}
    </div>
  </section>

  <div class="pills">
    ${data.categories
      .map(
        (c) => `<button class="pill" data-route="#/kategori/${c.id}">
          ${icon(c.icon)}<span>${escapeHtml(c.name)}</span>
        </button>`
      )
      .join('')}
    <button class="pill" data-route="#/kategori/favoriler">${icon('heart')}<span>Favoriler</span></button>
  </div>

  ${trustBar()}

  ${jackpotBanner(data.jackpots)}

  <section class="section">
    <div class="section-head">
      <h3 class="section-title"><span class="bar"></span>Canlı Masalar</h3>
      <button class="section-more" data-live="1">Masalara Git ${icon('chevron')}</button>
    </div>
    <div class="rail" style="grid-auto-columns:62%">
      <button class="table-card" data-live="holdem" style="margin:0">
        <div class="table-icon">🂡</div>
        <div style="flex:1;min-width:0">
          <div class="table-name">Texas Hold'em</div>
          <div class="table-meta">Oyuncuya karşı · ev oynamaz</div>
        </div>
        ${icon('chevron')}
      </button>
      <button class="table-card" data-live="blackjack" style="margin:0">
        <div class="table-icon">🃏</div>
        <div style="flex:1;min-width:0">
          <div class="table-name">Blackjack</div>
          <div class="table-meta">Krupiyeye karşı · 3:2 ödeme</div>
        </div>
        ${icon('chevron')}
      </button>
    </div>
  </section>

  ${data.rows
    .filter((row) => row.games.length)
    .map(
      (row) => `<section class="section">
        <div class="section-head">
          <h3 class="section-title"><span class="bar"></span>${escapeHtml(row.title)}</h3>
          ${row.subtitle ? `<span class="section-sub">${escapeHtml(row.subtitle)}</span>` : ''}
          <button class="section-more" data-route="#/kategori/${row.id === 'oynanabilir' || row.id === 'son' ? 'tumu' : row.id}">
            Tümünü Gör ${icon('chevron')}
          </button>
        </div>
        <div class="rail">${row.games.map(gameCard).join('')}</div>
      </section>`
    )
    .join('')}

  ${footer()}`;
}

function skeletonHome() {
  return `<div class="skeleton" style="height:200px;margin-top:12px"></div>
  <div class="pills">${Array.from({ length: 6 }, () => '<div class="skeleton pill" style="height:62px"></div>').join('')}</div>
  <div class="skeleton" style="height:120px;margin-top:18px"></div>
  <div class="rail" style="margin-top:18px">
    ${Array.from({ length: 4 }, () => '<div class="skeleton" style="aspect-ratio:.8"></div>').join('')}
  </div>`;
}

async function renderCategory(categoryId, params) {
  const sort = params.get('sirala') || 'populer';
  const provider = params.get('saglayici') || '';
  const category = state.categories.find((c) => c.id === categoryId);
  const title =
    categoryId === 'tumu'
      ? 'Tüm Oyunlar'
      : categoryId === 'favoriler'
        ? 'Favorilerim'
        : category?.name || 'Oyunlar';

  const data = await state.backend.games({ category: categoryId, provider, sort, perPage: 60 });

  const sorts = [
    ['populer', 'Popüler'],
    ['yeni', 'Yeni'],
    ['ad', 'A-Z'],
    ['rtp', 'RTP']
  ];

  return `
  <div class="page-head">
    <button class="icon-btn" data-route="#/">${icon('back')}</button>
    <h1 class="page-title">${escapeHtml(title)}</h1>
    <span class="page-count">${data.total} oyun</span>
  </div>

  <div class="filters">
    ${sorts
      .map(
        ([id, label]) =>
          `<button class="chip${sort === id ? ' on' : ''}" data-sort="${id}">${label}</button>`
      )
      .join('')}
  </div>
  <div class="filters">
    <button class="chip${provider ? '' : ' on'}" data-provider="">Tüm Sağlayıcılar</button>
    ${(state.home?.providers || [])
      .map(
        (p) =>
          `<button class="chip${provider === p ? ' on' : ''}" data-provider="${escapeHtml(p)}">${escapeHtml(p)}</button>`
      )
      .join('')}
  </div>

  ${
    data.games.length
      ? `<div class="grid" style="margin-top:14px">${data.games.map(gameCard).join('')}</div>`
      : `<div class="empty">${icon('search')}<p>Bu filtrede oyun yok.</p></div>`
  }
  ${footer()}`;
}

async function renderSearch(params) {
  const q = params.get('q') || '';
  let results = null;
  if (q.trim().length >= 2) results = await state.backend.searchGames(q);

  return `
  <div class="page-head"><h1 class="page-title">Oyun Ara</h1></div>
  <div class="search-bar">
    ${icon('search')}
    <input id="search-input" type="search" placeholder="Oyun veya sağlayıcı ara..."
      value="${escapeHtml(q)}" autocomplete="off" enterkeyhint="search">
  </div>

  <div class="filters">
    ${state.categories
      .map((c) => `<button class="chip" data-route="#/kategori/${c.id}">${escapeHtml(c.name)}</button>`)
      .join('')}
  </div>

  ${
    results
      ? results.games.length
        ? `<p class="page-count" style="margin:14px 0 8px">${results.total} sonuç</p>
           <div class="grid">${results.games.map(gameCard).join('')}</div>`
        : `<div class="empty">${icon('search')}<p>“${escapeHtml(q)}” için sonuç yok.</p></div>`
      : `<section class="section">
          <div class="section-head"><h3 class="section-title"><span class="bar"></span>Popüler Aramalar</h3></div>
          <div class="filters">
            ${['Altın', 'Rulet', 'Jackpot', 'Bonus', 'Ejder', 'Klasik']
              .map((t) => `<button class="chip" data-search="${t}">${t}</button>`)
              .join('')}
          </div>
        </section>`
  }`;
}

async function renderGameDetail(id) {
  const { game, similar } = await state.backend.gameDetail(id);
  state.backend.openGame(id).catch(() => {});

  return `
  <div class="page-head">
    <button class="icon-btn" data-back>${icon('back')}</button>
    <h1 class="page-title" style="font-size:17px">${escapeHtml(game.name)}</h1>
  </div>

  <div class="detail-hero">
    <div class="detail-cover">${coverMarkup(game)}</div>
    <div class="detail-info">
      <div class="detail-name">${escapeHtml(game.name)}</div>
      <div class="detail-provider">${escapeHtml(game.provider)}</div>
      <div class="detail-specs">
        <span class="spec">RTP %${game.rtp.toFixed(1).replace('.', ',')}</span>
        <span class="spec">${VOLATILITY[game.volatility] || ''}</span>
        ${game.hasJackpot ? '<span class="spec">Jackpot</span>' : ''}
      </div>
      <div class="detail-actions">
        ${
          game.playable
            ? `<a class="btn btn-gold btn-block" href="${game.page || 'game.html'}">Oyna</a>`
            : `<button class="btn btn-block" disabled>Yakında</button>`
        }
        <button class="btn" data-fav="${game.id}" aria-label="Favori">${icon('heart')}</button>
      </div>
    </div>
  </div>

  ${
    game.playable
      ? ''
      : `<div class="notice">
          Bu oyun katalogda yer alıyor ancak motoru henüz hazır değil.
          Şu an tam olarak oynanabilen oyunlar <b>Lucky Reels</b> ve <b>7 Hot Çan Zinciri</b>.
          Katalogdaki diğer oyunlar site yapısını ve kategori akışını göstermek için duruyor.
        </div>`
  }

  <section class="section">
    <div class="section-head"><h3 class="section-title"><span class="bar"></span>Benzer Oyunlar</h3></div>
    <div class="rail">${similar.map(gameCard).join('')}</div>
  </section>
  ${footer()}`;
}

async function renderTasks() {
  if (!state.player) return '';
  const { tasks } = await state.backend.tasks();
  const daily = tasks.filter((t) => t.period === 'daily');
  const once = tasks.filter((t) => t.period === 'once');

  const card = (t) => `
    <div class="task${t.complete ? ' done' : ''}${t.claimed ? ' claimed' : ''}">
      <div class="task-icon">${icon(t.icon)}</div>
      <div class="task-body">
        <div class="task-name">${escapeHtml(t.name)}</div>
        <div class="task-desc">${escapeHtml(t.description)}</div>
        <div class="task-bar"><i style="width:${Math.min(100, (t.value / t.target) * 100)}%"></i></div>
        <div class="task-progress">${fmt(t.value)} / ${fmt(t.target)}</div>
      </div>
      <div class="task-action">
        ${
          t.claimed
            ? `<span class="task-reward">${icon('check')} Alındı</span>`
            : t.complete
              ? `<button class="btn btn-gold" style="height:36px;padding:0 14px;font-size:12px" data-claim="${t.id}">Topla</button>`
              : `<span class="task-reward">${icon('coin')} ${fmt(t.reward)}</span>`
        }
      </div>
    </div>`;

  return `
  <div class="page-head"><h1 class="page-title">Görevler</h1></div>
  <div class="notice">
    Kredi <b>satılmaz</b>. Tüm krediler görevler ve oyun içi kazançlarla elde edilir.
  </div>

  <section class="section">
    <div class="section-head"><h3 class="section-title"><span class="bar"></span>Günlük Görevler</h3>
      <span class="section-sub">Her gün yenilenir</span></div>
    ${daily.map(card).join('')}
  </section>

  <section class="section">
    <div class="section-head"><h3 class="section-title"><span class="bar"></span>Kilometre Taşları</h3></div>
    ${once.map(card).join('')}
  </section>
  ${footer()}`;
}

async function renderProfile() {
  const p = state.player;
  if (!p) return '';
  const initial = (p.username || p.name || 'M').charAt(0).toLocaleUpperCase('tr');
  const level = p.level || { level: 1, current: 0, need: 500 };
  const rtp = p.stats.wagered > 0 ? ((p.stats.won / p.stats.wagered) * 100).toFixed(1) : '—';
  const net = p.stats.won - p.stats.wagered;

  if (!state.avatars.length) {
    try {
      state.avatars = (await state.backend.avatars()).avatars;
    } catch {
      state.avatars = [];
    }
  }

  const historyRows = (p.history || []).slice(0, 12);

  return `
  <div class="page-head"><h1 class="page-title">Profil</h1></div>

  <div class="profile-head">
    <button class="avatar" id="btn-avatar" style="border:none;cursor:pointer">
      ${p.avatar || initial}
    </button>
    <div style="flex:1;min-width:0">
      <div class="profile-name">${escapeHtml(p.username || 'Misafir Oyuncu')}
        ${p.admin ? '<span class="badge badge-hot" style="margin-left:6px">YÖNETİCİ</span>' : ''}</div>
      <div class="profile-tag">${p.guest ? 'Misafir hesap · kaydet ki kaybolmasın' : `Üyelik: ${new Date(p.createdAt).toLocaleDateString('tr-TR')}`}</div>
      <div class="level-row">
        <span class="level-badge">SV ${level.level}</span>
        <div class="level-bar"><i style="width:${Math.min(100, (level.current / level.need) * 100)}%"></i></div>
        <span class="level-xp">${fmt(level.current)}/${fmt(level.need)}</span>
      </div>
    </div>
    ${
      p.guest
        ? `<button class="btn btn-gold" style="height:38px;padding:0 14px;font-size:13px" data-route="#/kayit">Kayıt Ol</button>`
        : `<button class="icon-btn" id="btn-logout" aria-label="Çıkış">${icon('logout')}</button>`
    }
  </div>

  <div class="stats">
    <div class="stat"><div class="stat-label">Bakiye</div><div class="stat-value">${money(p.balance)}</div></div>
    <div class="stat"><div class="stat-label">Toplam Dönüş</div><div class="stat-value">${fmt(p.stats.spins)}</div></div>
    <div class="stat"><div class="stat-label">En Büyük Kazanç</div><div class="stat-value">${fmt(p.stats.biggestWin)}</div></div>
    <div class="stat"><div class="stat-label">Net Sonuç</div>
      <div class="stat-value" style="color:${net >= 0 ? 'var(--teal)' : '#ff9daa'}">
        ${net >= 0 ? '+' : ''}${fmt(net)}
      </div></div>
    <div class="stat"><div class="stat-label">Toplam Bahis</div><div class="stat-value">${fmt(p.stats.wagered)}</div></div>
    <div class="stat"><div class="stat-label">Getiri Oranı</div><div class="stat-value">${rtp === '—' ? '—' : `%${rtp}`}</div></div>
    <div class="stat"><div class="stat-label">Favoriler</div><div class="stat-value">${p.favorites.length}</div></div>
    <div class="stat"><div class="stat-label">Seviye</div><div class="stat-value">${level.level}</div></div>
  </div>

  ${
    p.guest
      ? `<div class="notice" style="margin-top:16px">
          Misafir olarak oynuyorsun. Bu cihazın verisi silinirse bakiyen kaybolur.
          <b>Ücretsiz hesap</b> açarsan bakiyen ve istatistiklerin sunucuda korunur —
          üstelik 2.500 kredi görev ödülü kazanırsın.
        </div>`
      : ''
  }

  <section class="section">
    <div class="section-head"><h3 class="section-title"><span class="bar"></span>Son Hareketler</h3></div>
    ${
      historyRows.length
        ? `<div class="panel" style="padding:12px">
            ${historyRows
              .map(
                (h) => `<div class="hist-row">
                  <span class="hist-icon">${h.type === 'jackpot' ? '👑' : h.type === 'table' ? '🂡' : '🎰'}</span>
                  <div style="flex:1;min-width:0">
                    <div class="hist-name">${escapeHtml(h.game || 'Oyun')}</div>
                    <div class="hist-time">${new Date(h.at).toLocaleString('tr-TR')}</div>
                  </div>
                  <b class="${(h.net ?? h.win - h.bet) >= 0 ? 'hist-plus' : 'hist-minus'}">
                    ${(h.net ?? h.win - h.bet) >= 0 ? '+' : ''}${fmt(h.net ?? h.win - h.bet)}
                  </b>
                </div>`
              )
              .join('')}
          </div>`
        : '<p class="page-count">Henüz kayıtlı hareket yok. Büyük kazançlar ve masa oturumları burada görünür.</p>'
    }
  </section>

  <section class="section">
    <div class="section-head"><h3 class="section-title"><span class="bar"></span>Hesap</h3></div>
    <div class="panel" style="padding:4px 0">
      ${
        p.admin
          ? `<a class="btn btn-ghost btn-block" style="justify-content:flex-start;border:none" href="admin.html">
              ${icon('shield')} Yönetim Paneli</a>`
          : ''
      }
      <button class="btn btn-ghost btn-block" style="justify-content:flex-start;border:none"
        id="btn-theme-profile">${icon(document.documentElement.dataset.theme === 'dark' ? 'sun' : 'moon')}
        ${document.documentElement.dataset.theme === 'dark' ? 'Açık Tema' : 'Koyu Tema'}</button>
      <button class="btn btn-ghost btn-block" style="justify-content:flex-start;border:none"
        data-route="#/kategori/favoriler">${icon('heart')} Favorilerim</button>
      <button class="btn btn-ghost btn-block" style="justify-content:flex-start;border:none"
        data-route="#/gorevler">${icon('trophy')} Görevlerim</button>
      <button class="btn btn-ghost btn-block" style="justify-content:flex-start;border:none"
        data-route="#/sayfa/adalet">${icon('lock')} Doğrulanabilir Adalet</button>
      <button class="btn btn-ghost btn-block" style="justify-content:flex-start;border:none"
        data-route="#/sayfa/sorumlu-oyun">${icon('info')} Sorumlu Oyun</button>
    </div>
  </section>
  ${footer()}`;
}

/** Avatar secme sayfasi. */
function openAvatarPicker() {
  const host = $('sheet-host');
  host.innerHTML = `
  <div class="sheet" id="avatar-sheet">
    <div class="sheet-card">
      <div class="sheet-grip"></div>
      <h2 class="sheet-title">Avatarını Seç</h2>
      <div class="avatar-grid">
        ${state.avatars
          .map(
            (a) =>
              `<button class="avatar-pick${a === state.player.avatar ? ' on' : ''}" data-avatar="${a}">${a}</button>`
          )
          .join('')}
      </div>
      <div class="field" style="margin-top:14px">
        <label for="pf-name">Görünen ad</label>
        <input id="pf-name" value="${escapeHtml(state.player.name || '')}" maxlength="24">
      </div>
      <button class="btn btn-gold btn-block" id="pf-save">Kaydet</button>
      <button class="btn btn-ghost btn-block" id="pf-cancel"
        style="margin-top:8px;border:none;color:var(--dim)">Vazgeç</button>
    </div>
  </div>`;

  let picked = state.player.avatar;
  host.querySelectorAll('[data-avatar]').forEach((btn) => {
    btn.onclick = () => {
      picked = btn.dataset.avatar;
      host.querySelectorAll('.avatar-pick').forEach((b) => b.classList.toggle('on', b === btn));
    };
  });
  $('pf-cancel').onclick = () => (host.innerHTML = '');
  $('pf-save').onclick = async () => {
    try {
      const data = await state.backend.updateProfile({ avatar: picked, name: $('pf-name').value });
      state.player = data.player;
      host.innerHTML = '';
      toast('Profil güncellendi', true);
      render();
    } catch (err) {
      toast(err.message);
    }
  };
}

const PAGES = {
  'nasil-calisir': {
    title: 'Nasıl Çalışır?',
    body: `<p>AURUM sanal kredilerle oynanan bir sosyal casinodur. Krediler
      <b>satın alınamaz</b>; görevleri tamamlayarak ve oyunlarda kazanarak elde edilir.</p>
    <p>Tüm oyun sonuçları <b>sunucuda</b> üretilir. Tarayıcı yalnızca sunucudan gelen
      sonucu canlandırır; bakiye veya sonuç istemciden değiştirilemez.</p>
    <p>Bakiyen hesabına bağlıdır. Misafir olarak başlarsan bu cihazda saklanır;
      ücretsiz hesap açarsan sunucuda güvenle tutulur.</p>`
  },
  adalet: {
    title: 'Doğrulanabilir Adalet',
    body: `<p>Her dönüşün sonucu <b>HMAC-SHA256(sunucu tohumu, istemci tohumu:nonce)</b>
      ile üretilir. Sunucu tohumunun SHA-256 özeti önceden gösterilir.</p>
    <p>Tohumu açıklattığında, özetin açıklanan tohumla eşleştiğini kontrol ederek
      geçmiş sonuçların sonradan değiştirilmediğini kanıtlayabilirsin.</p>
    <p>Bu ekran oyun içi menüden (Lucky Reels → Menü → Doğrulanabilir Adalet) açılır.</p>`
  },
  'sorumlu-oyun': {
    title: 'Sorumlu Oyun',
    body: `<p>Bu site 18 yaş ve üzeri içindir. Oyun bir <b>eğlence</b> aracıdır,
      gelir kaynağı değildir.</p>
    <p>Buradaki krediler parasal değer taşımaz. Yine de oyun oynama alışkanlığın
      günlük hayatını etkiliyorsa ara vermeyi düşün.</p>
    <p>Kendine zaman sınırı koy, uyku ve iş saatlerinde oynama, kaybettiğini
      "geri kazanma" hissiyle oynamayı sürdürme.</p>
    <p>Türkiye'de yardım için: <b>Yeşilay Danışmanlık Merkezi (YEDAM) 115</b>.</p>`
  },
  kosullar: {
    title: 'Kullanım Koşulları',
    body: `<p>Bu hizmet olduğu gibi sunulur. Sanal kredilerin parasal karşılığı yoktur,
      devredilemez ve nakde çevrilemez.</p>
    <p>Hesabını başkasıyla paylaşma. Otomasyon, bot veya oyun sonuçlarını manipüle
      etmeye yönelik girişimler hesabın kapatılmasına yol açar.</p>
    <p>Bu site gerçek para ile bahis kabul etmez ve spor bahisleri içermez.</p>`
  },
  gizlilik: {
    title: 'Gizlilik',
    body: `<p>Yalnızca hesabın için gereken veriyi tutarız: kullanıcı adı, parolanın
      şifrelenmiş özeti (scrypt), bakiye, oyun istatistikleri ve tercihlerin.</p>
    <p>Reklam takibi yapılmaz, üçüncü taraflara veri satılmaz.</p>
    <p>Misafir hesabında veriler yalnızca oturum belirteciyle ilişkilidir.</p>`
  }
};

function renderPage(slug) {
  const page = PAGES[slug];
  if (!page) return `<div class="empty">${icon('info')}<p>Sayfa bulunamadı.</p></div>`;
  return `
  <div class="page-head">
    <button class="icon-btn" data-back>${icon('back')}</button>
    <h1 class="page-title">${page.title}</h1>
  </div>
  <div class="panel" style="padding:16px;margin-top:12px;font-size:13.5px;line-height:1.7;color:#cfc9e0">
    ${page.body}
  </div>
  ${footer()}`;
}

/* ═════════ Kayit / giris sayfasi ═════════ */

function authSheet(mode = 'kayit') {
  const host = $('sheet-host');
  host.innerHTML = `
  <div class="sheet" id="auth-sheet">
    <div class="sheet-card">
      <div class="sheet-grip"></div>
      <div class="tabs">
        <button class="${mode === 'kayit' ? 'on' : ''}" data-tab="kayit">Kayıt Ol</button>
        <button class="${mode === 'giris' ? 'on' : ''}" data-tab="giris">Giriş Yap</button>
      </div>
      <h2 class="sheet-title" id="auth-title">${mode === 'kayit' ? 'Ücretsiz hesap aç' : 'Tekrar hoş geldin'}</h2>
      <p class="sheet-text" id="auth-text">
        ${
          mode === 'kayit'
            ? 'Bakiyen ve istatistiklerin kaydedilsin. Hiçbir ödeme bilgisi istenmez — bu bir sosyal casinodur.'
            : 'Kullanıcı adın ve parolanla devam et.'
        }
      </p>
      <div id="auth-error"></div>
      <div class="field">
        <label for="auth-user">Kullanıcı adı</label>
        <input id="auth-user" autocomplete="username" autocapitalize="off" spellcheck="false" placeholder="orn: sansli_kedi">
      </div>
      <div class="field">
        <label for="auth-pass">Parola</label>
        <input id="auth-pass" type="password" autocomplete="${mode === 'kayit' ? 'new-password' : 'current-password'}" placeholder="En az 6 karakter">
      </div>
      <button class="btn btn-gold btn-block" id="auth-submit">${mode === 'kayit' ? 'Hesap Oluştur' : 'Giriş Yap'}</button>
      <button class="btn btn-ghost btn-block" style="margin-top:8px;border:none;color:var(--dim)" id="auth-close">
        ${mode === 'kayit' ? 'Misafir olarak devam et' : 'Vazgeç'}
      </button>
    </div>
  </div>`;

  const sheet = $('auth-sheet');
  let current = mode;

  sheet.addEventListener('click', (e) => {
    if (e.target === sheet) closeSheet();
  });
  $('auth-close').onclick = closeSheet;

  sheet.querySelectorAll('[data-tab]').forEach((btn) => {
    btn.onclick = () => authSheet(btn.dataset.tab);
  });

  $('auth-submit').onclick = async () => {
    const username = $('auth-user').value.trim();
    const password = $('auth-pass').value;
    const errorBox = $('auth-error');
    errorBox.innerHTML = '';
    $('auth-submit').disabled = true;
    try {
      const data =
        current === 'kayit'
          ? await state.backend.register(username, password)
          : await state.backend.login(username, password);
      state.player = data.player;
      closeSheet();
      renderChrome();
      toast(current === 'kayit' ? 'Hesabın hazır! 🎉' : 'Hoş geldin!', true);
      navigate('#/profil');
    } catch (err) {
      errorBox.innerHTML = `<div class="form-error">${escapeHtml(err.message)}</div>`;
    } finally {
      const submit = $('auth-submit');
      if (submit) submit.disabled = false;
    }
  };

  $('auth-pass').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') $('auth-submit').click();
  });
}

function closeSheet() {
  $('sheet-host').innerHTML = '';
  if (location.hash === '#/kayit' || location.hash === '#/giris') {
    history.replaceState(null, '', '#/');
    state.route = '#/';
    renderChrome();
  }
}

/* ═════════ Yonlendirici ═════════ */

function parseRoute() {
  const hash = location.hash || '#/';
  const [path, queryString] = hash.slice(1).split('?');
  return { path: path || '/', params: new URLSearchParams(queryString || '') };
}

function navigate(hash) {
  if (location.hash === hash) render();
  else location.hash = hash;
}

async function render() {
  const { path, params } = parseRoute();
  state.route = path;
  const view = $('view');
  const segments = path.split('/').filter(Boolean);

  try {
    if (path === '/' || segments.length === 0) {
      if (!state.home) {
        view.innerHTML = skeletonHome();
        state.home = await state.backend.home();
        state.categories = state.home.categories;
      }
      view.innerHTML = renderHome();
      startHeroCarousel();
    } else if (segments[0] === 'kategori') {
      view.innerHTML = '<div class="skeleton" style="height:60vh;margin-top:16px"></div>';
      view.innerHTML = await renderCategory(segments[1] || 'tumu', params);
    } else if (segments[0] === 'ara') {
      view.innerHTML = await renderSearch(params);
      const input = $('search-input');
      if (input) {
        input.focus({ preventScroll: true });
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') navigate(`#/ara?q=${encodeURIComponent(input.value)}`);
        });
      }
    } else if (segments[0] === 'oyun') {
      view.innerHTML = '<div class="skeleton" style="height:50vh;margin-top:16px"></div>';
      view.innerHTML = await renderGameDetail(segments[1]);
    } else if (segments[0] === 'gorevler') {
      view.innerHTML = await renderTasks();
    } else if (segments[0] === 'profil') {
      view.innerHTML = await renderProfile();
    } else if (segments[0] === 'sayfa') {
      view.innerHTML = renderPage(segments[1]);
    } else if (segments[0] === 'kayit' || segments[0] === 'giris') {
      view.innerHTML = renderHome();
      authSheet(segments[0]);
    } else {
      view.innerHTML = `<div class="empty">${icon('info')}<p>Sayfa bulunamadı.</p></div>`;
    }
  } catch (err) {
    view.innerHTML = `<div class="empty">${icon('info')}<p>${escapeHtml(err.message)}</p></div>`;
  }

  window.scrollTo({ top: 0 });
  renderChrome();
}

/* ═════════ Hero karuseli ═════════ */
let heroTimer = null;
function startHeroCarousel() {
  clearInterval(heroTimer);
  const track = $('hero-track');
  const dots = $('hero-dots');
  if (!track) return;
  let index = 0;
  const count = track.children.length;
  const show = (i) => {
    index = (i + count) % count;
    track.style.transform = `translateX(-${index * 100}%)`;
    [...dots.children].forEach((d, j) => d.classList.toggle('on', j === index));
  };
  heroTimer = setInterval(() => show(index + 1), 5500);

  // Dokunmatik kaydirma
  let startX = null;
  track.addEventListener('touchstart', (e) => (startX = e.touches[0].clientX), { passive: true });
  track.addEventListener(
    'touchend',
    (e) => {
      if (startX === null) return;
      const delta = e.changedTouches[0].clientX - startX;
      if (Math.abs(delta) > 40) show(index + (delta < 0 ? 1 : -1));
      startX = null;
    },
    { passive: true }
  );
}

/* ═════════ Ust bar ve alt bar ═════════ */

function renderChrome() {
  if (state.player) $('balance').textContent = money(state.player.balance);

  $('btn-account').innerHTML = icon('user');
  $('btn-account').classList.toggle('has-dot', Boolean(state.player?.guest));

  const navs = [
    ['nav-home', 'home', 'Ana Sayfa', '#/'],
    ['nav-search', 'search', 'Oyun Ara', '#/ara'],
    ['nav-tasks', 'trophy', 'Görevler', '#/gorevler'],
    ['nav-profile', 'user', 'Profil', '#/profil']
  ];
  for (const [id, ico, label, route] of navs) {
    const el = $(id);
    el.innerHTML = `${icon(ico)}<span>${label}</span>`;
    const path = route.slice(1);
    el.classList.toggle('on', state.route === path || (path === '/' && state.route === '/'));
  }
  $('nav-play').innerHTML = icon('spin');

  document.querySelectorAll('#mainnav [data-nav]').forEach((link) => {
    link.classList.toggle('on', link.dataset.nav === state.route);
  });
}

/* ═════════ Olay delegasyonu ═════════ */

function bindGlobalEvents() {
  document.addEventListener('click', async (e) => {
    const fav = e.target.closest('[data-fav]');
    if (fav) {
      e.preventDefault();
      e.stopPropagation();
      try {
        const result = await state.backend.toggleFavorite(fav.dataset.fav);
        document
          .querySelectorAll(`[data-fav="${fav.dataset.fav}"]`)
          .forEach((el) => el.classList.toggle('on', result.favorite));
        toast(result.favorite ? 'Favorilere eklendi' : 'Favorilerden çıkarıldı');
      } catch (err) {
        toast(err.message);
      }
      return;
    }

    const claim = e.target.closest('[data-claim]');
    if (claim) {
      try {
        const data = await state.backend.claimTask(claim.dataset.claim);
        state.player = data.player;
        toast(`+${fmt(data.reward)} kredi kazandın!`, true);
        render();
      } catch (err) {
        toast(err.message);
      }
      return;
    }

    const searchChip = e.target.closest('[data-search]');
    if (searchChip) {
      navigate(`#/ara?q=${encodeURIComponent(searchChip.dataset.search)}`);
      return;
    }

    const sortChip = e.target.closest('[data-sort]');
    if (sortChip) {
      const { path, params } = parseRoute();
      params.set('sirala', sortChip.dataset.sort);
      navigate(`#${path}?${params}`);
      return;
    }

    const providerChip = e.target.closest('[data-provider]');
    if (providerChip) {
      const { path, params } = parseRoute();
      if (providerChip.dataset.provider) params.set('saglayici', providerChip.dataset.provider);
      else params.delete('saglayici');
      navigate(`#${path}?${params}`);
      return;
    }

    const game = e.target.closest('[data-game]');
    if (game) {
      navigate(`#/oyun/${game.dataset.game}`);
      return;
    }

    const route = e.target.closest('[data-route]');
    if (route) {
      navigate(route.dataset.route);
      return;
    }

    if (e.target.closest('[data-back]')) {
      history.length > 1 ? history.back() : navigate('#/');
    }
  });

  $('btn-theme').onclick = () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
  };

  $('btn-account').onclick = () => {
    if (state.player?.guest) authSheet('kayit');
    else navigate('#/profil');
  };
  $('btn-earn').onclick = (e) => {
    e.stopPropagation();
    navigate('#/gorevler');
  };
  $('balance-chip').onclick = () => navigate('#/gorevler');
  $('nav-play').onclick = () => {
    location.href = 'game.html';
  };

  document.addEventListener('click', (e) => {
    if (e.target.closest('#btn-logout')) {
      state.backend.logout().then(() => location.reload());
    }
    if (e.target.closest('#btn-avatar')) openAvatarPicker();
    if (e.target.closest('#btn-theme-profile')) {
      applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
      render();
    }
    const live = e.target.closest('[data-live]');
    if (live) location.href = 'live.html';
  });

  window.addEventListener('hashchange', render);
}

/* ═════════ Baslatma ═════════ */

async function boot() {
  initTheme();

  if (window.SLOT_DEMO) {
    const { demoApi } = await import('./demo.js');
    state.backend = demoApi;
  }

  bindGlobalEvents();

  try {
    const session = await state.backend.session();
    state.player = session.player;
    try {
      state.settings = await state.backend.publicSettings();
      if (state.settings?.currency) currency = state.settings.currency;
    } catch {
      /* demo modunda ayar ucu olmayabilir */
    }
  } catch (err) {
    toast('Sunucuya bağlanılamadı: ' + err.message);
  }

  await render();
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}

boot();
