/**
 * Yonetim paneli.
 *
 * Yalnizca admin rolu erisebilir (sunucu tarafinda da zorlanir).
 * Buradaki tum ayarlar sunucuda dogrulanir; oyun matematigini etkileyen
 * degerler (RTP, blackjack odemesi, komisyon) oyunculara da gosterilir.
 */
import { api } from './api.js';
import { icon } from './icons.js';

const state = { tab: 'ozet', overview: null, users: [], query: '', settings: null, currency: null };
const $ = (id) => document.getElementById(id);

let currency = { symbol: '₺', locale: 'tr-TR' };
const fmt = (n) =>
  `${currency.symbol}${Number(n || 0).toLocaleString(currency.locale, { maximumFractionDigits: 0 })}`;
const num = (n) => Number(n || 0).toLocaleString(currency.locale, { maximumFractionDigits: 0 });
const escapeHtml = (t) =>
  String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function toast(text, gold = false) {
  $('toast-host').innerHTML = `<div class="toast${gold ? ' gold' : ''}">${escapeHtml(text)}</div>`;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => ($('toast-host').innerHTML = ''), 2600);
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'az önce';
  if (min < 60) return `${min} dk önce`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour} sa önce`;
  return `${Math.floor(hour / 24)} gün önce`;
}

/* ═══════ Görünümler ═══════ */

function renderTabs() {
  const tabs = [
    ['ozet', 'Özet'],
    ['kullanicilar', 'Kullanıcılar'],
    ['oyun', 'Oyun Ayarları'],
    ['masa', 'Masa Ayarları'],
    ['sistem', 'Sistem'],
    ['kayitlar', 'Bakiye Kayıtları']
  ];
  return `<div class="admin-tabs">
    ${tabs.map(([id, label]) => `<button class="${state.tab === id ? 'on' : ''}" data-tab="${id}">${label}</button>`).join('')}
  </div>`;
}

function renderOverview() {
  const s = state.overview.stats;
  const kpis = [
    ['Toplam Kullanıcı', num(s.totalUsers), `${num(s.registeredUsers)} kayıtlı · ${num(s.guestUsers)} misafir`],
    ['Bugün Aktif', num(s.activeToday), `${num(s.bannedUsers)} engelli`],
    ['Dolaşımdaki Bakiye', fmt(s.totalBalance), 'tüm hesaplar'],
    ['Toplam Dönüş', num(s.spins), `${fmt(s.wagered)} bahis`],
    ['Ödenen', fmt(s.won), 'oyunculara'],
    ['Kasa Payı', `%${s.houseEdge.toFixed(2)}`, 'gerçekleşen'],
    ['Oyun Sayısı', num(state.overview.gameCount), 'katalogda'],
    ['Jackpot Havuzu', fmt(Object.values(s.jackpots).reduce((a, b) => a + b, 0)), '4 seviye']
  ];

  return `
  <div class="kpi">
    ${kpis
      .map(
        ([label, value, sub]) => `<div class="kpi-card">
          <div class="kpi-label">${label}</div>
          <div class="kpi-value">${value}</div>
          <div class="kpi-sub">${sub}</div>
        </div>`
      )
      .join('')}
  </div>

  <div class="section-head"><h3 class="section-title"><span class="bar"></span>Son Bakiye Hareketleri</h3></div>
  <div class="panel" style="padding:12px">
    ${
      state.overview.ledger.length
        ? state.overview.ledger.map(ledgerRow).join('')
        : '<p class="muted">Henüz hareket yok.</p>'
    }
  </div>`;
}

function ledgerRow(entry) {
  const plus = entry.delta > 0;
  return `<div class="ledger-row">
    <span style="flex:1">${escapeHtml(entry.username || '—')}
      <span style="color:var(--dim)"> · ${escapeHtml(entry.reason)}</span></span>
    <b class="${plus ? 'ledger-plus' : 'ledger-minus'}">${plus ? '+' : ''}${num(entry.delta)}</b>
    <span style="color:var(--dim);white-space:nowrap">${timeAgo(entry.at)}</span>
  </div>`;
}

function renderUsers() {
  return `
  <div class="search-bar">
    ${icon('search')}
    <input id="user-search" placeholder="Kullanıcı adı ara…" value="${escapeHtml(state.query)}">
  </div>
  <p class="page-count" style="margin:12px 0 8px">${state.users.length} kullanıcı</p>
  ${
    state.users.length
      ? state.users.map(userRow).join('')
      : `<div class="empty">${icon('user')}<p>Kullanıcı bulunamadı.</p></div>`
  }`;
}

function userRow(user) {
  return `<div class="urow" data-user="${user.id}">
    <div class="uavatar">${user.avatar || '🦊'}</div>
    <div style="flex:1;min-width:0">
      <div class="uname">${escapeHtml(user.username || user.name)}
        ${user.role === 'admin' ? '<span class="utag tag-admin">ADMIN</span>' : ''}
        ${user.banned ? '<span class="utag tag-banned">ENGELLİ</span>' : ''}
        ${user.guest ? '<span class="utag tag-guest">MİSAFİR</span>' : ''}
      </div>
      <div class="umeta">${num(user.stats?.spins || 0)} dönüş · ${timeAgo(user.lastSeenAt)}</div>
    </div>
    <div class="ubal"><b>${fmt(user.balance)}</b></div>
  </div>`;
}

function renderGameSettings() {
  const s = state.settings;
  return `
  <div class="setting">
    <div class="setting-head">
      <span class="setting-name">Slot RTP Hedefi</span>
      <span class="setting-value" id="rtp-value">%${Number(s.slot.rtpTarget).toFixed(1)}</span>
    </div>
    <input type="range" id="rtp-range" min="85" max="99" step="0.1" value="${s.slot.rtpTarget}">
    <div class="setting-desc">
      Oyuncuya geri dönüş oranı. Ödeme tablosu bu orana göre ölçeklenir —
      <b>%95,8 temel değerdir</b>. Düşürmek kasa payını artırır, kazanma sıklığını değil
      kazanç büyüklüğünü etkiler.
      <br><br>
      <b>Not:</b> Bu değer oyun içi ödeme tablosunda oyunculara da gösterilir; ayar ile
      görünen RTP her zaman aynıdır.
    </div>
  </div>

  <div class="setting">
    <div class="setting-head">
      <span class="setting-name">Poker Komisyonu (rake)</span>
      <span class="setting-value" id="rake-value">%${Number(s.poker.rakePercent).toFixed(1)}</span>
    </div>
    <input type="range" id="rake-range" min="0" max="10" step="0.5" value="${s.poker.rakePercent}">
    <div class="setting-desc">
      Her elde potun bu yüzdesi masadan alınır (yalnızca flop görüldüyse,
      en fazla ${s.poker.rakeCapBigBlinds} büyük blind). %0 = komisyonsuz.
      Hold'em'de ev oynamaz; kasanın tek geliri budur.
    </div>
  </div>

  <div class="setting">
    <div class="setting-head"><span class="setting-name">Blackjack Ödemesi</span></div>
    <div class="seg" id="bj-payout">
      ${[[1.5, '3:2'], [1.2, '6:5'], [1, '1:1']]
        .map(
          ([v, label]) =>
            `<button class="${Number(s.blackjack.blackjackPayout) === v ? 'on' : ''}" data-payout="${v}">${label}</button>`
        )
        .join('')}
    </div>
    <div class="setting-desc">3:2 oyuncu lehine standarttır; 6:5 kasa payını belirgin artırır.</div>
  </div>

  <div class="setting">
    <div class="setting-head"><span class="setting-name">Krupiye yumuşak 17'de kart çeker</span></div>
    <div class="seg" id="bj-soft17">
      <button class="${s.blackjack.dealerHitsSoft17 ? '' : 'on'}" data-soft17="0">Durur (S17)</button>
      <button class="${s.blackjack.dealerHitsSoft17 ? 'on' : ''}" data-soft17="1">Çeker (H17)</button>
    </div>
    <div class="setting-desc">H17 kasa payını yaklaşık %0,2 artırır.</div>
  </div>

  <div class="setting">
    <div class="setting-head"><span class="setting-name">Deste Sayısı</span></div>
    <div class="seg" id="bj-decks">
      ${[1, 2, 4, 6, 8]
        .map((d) => `<button class="${s.blackjack.deckCount === d ? 'on' : ''}" data-decks="${d}">${d}</button>`)
        .join('')}
    </div>
    <div class="setting-desc">Az deste oyuncu lehinedir; 6-8 deste standarttır.</div>
  </div>

  <button class="btn btn-gold btn-block" id="save-game" style="margin-top:14px">Oyun Ayarlarını Kaydet</button>`;
}

function renderTableSettings() {
  const s = state.settings;
  return `
  <div class="setting">
    <div class="setting-head">
      <span class="setting-name">Poker aksiyon süresi</span>
      <span class="setting-value" id="pa-value">${s.poker.actionSeconds} sn</span>
    </div>
    <input type="range" id="pa-range" min="10" max="60" step="5" value="${s.poker.actionSeconds}">
    <div class="setting-desc">Oyuncunun hamle için bekleyeceği süre. Dolunca otomatik check/fold.</div>
  </div>

  <div class="setting">
    <div class="setting-head">
      <span class="setting-name">Poker masası koltuk sayısı</span>
      <span class="setting-value" id="ps-value">${s.poker.maxSeats}</span>
    </div>
    <input type="range" id="ps-range" min="2" max="9" step="1" value="${s.poker.maxSeats}">
  </div>

  <div class="setting">
    <div class="setting-head"><span class="setting-name">Bot koltuklarına izin ver</span></div>
    <div class="seg" id="allow-bots">
      <button class="${s.tables.allowBots ? 'on' : ''}" data-bots="1">Açık</button>
      <button class="${s.tables.allowBots ? '' : 'on'}" data-bots="0">Kapalı</button>
    </div>
    <div class="setting-desc">
      Tek başına deneyen oyuncular masaya 🤖 bot ekleyebilir. Botlar arayüzde
      her zaman robot simgesiyle işaretlenir.
    </div>
  </div>

  <div class="setting">
    <div class="setting-head"><span class="setting-name">Masa limitleri</span></div>
    <div class="setting-desc">
      ${s.tables.stakes
        .map((t) => `<div>• ${escapeHtml(t.name)}: ${num(t.smallBlind)}/${num(t.bigBlind)} · giriş ${num(t.minBuyIn)}-${num(t.maxBuyIn)}</div>`)
        .join('')}
      <div style="margin-top:8px">Blackjack:</div>
      ${s.tables.blackjackLimits
        .map((t) => `<div>• ${escapeHtml(t.name)}: ${num(t.min)} - ${num(t.max)}</div>`)
        .join('')}
    </div>
  </div>

  <button class="btn btn-gold btn-block" id="save-table" style="margin-top:14px">Masa Ayarlarını Kaydet</button>`;
}

function renderSystem() {
  const s = state.settings;
  return `
  <div class="setting">
    <div class="setting-head"><span class="setting-name">Para Birimi</span></div>
    <div class="seg" id="cur-seg" style="flex-wrap:wrap">
      ${state.overview.currencies
        .map(
          (c) =>
            `<button class="${s.currency === c.code ? 'on' : ''}" data-currency="${c.code}">
              ${c.symbol} ${escapeHtml(c.name)}
            </button>`
        )
        .join('')}
    </div>
    <div class="setting-desc">
      Yalnızca gösterim biçimidir. Krediler sanaldır; satın alınamaz, nakde çevrilemez.
      Simge değişikliği bakiyeleri dönüştürmez.
    </div>
  </div>

  <div class="setting">
    <div class="setting-head">
      <span class="setting-name">Yeni hesap başlangıç bakiyesi</span>
      <span class="setting-value" id="sb-value">${num(s.startBalance)}</span>
    </div>
    <input type="range" id="sb-range" min="0" max="100000" step="1000" value="${s.startBalance}">
  </div>

  <div class="setting">
    <div class="setting-head"><span class="setting-name">Misafir oyuna izin ver</span></div>
    <div class="seg" id="guest-seg">
      <button class="${s.allowGuests ? 'on' : ''}" data-guests="1">Açık</button>
      <button class="${s.allowGuests ? '' : 'on'}" data-guests="0">Kapalı</button>
    </div>
  </div>

  <div class="setting">
    <div class="setting-head"><span class="setting-name">Bakım modu</span></div>
    <div class="seg" id="maint-seg">
      <button class="${s.maintenance ? '' : 'on'}" data-maint="0">Kapalı</button>
      <button class="${s.maintenance ? 'on' : ''}" data-maint="1">Açık</button>
    </div>
    <div class="setting-desc">Açıkken yalnızca yöneticiler giriş yapabilir.</div>
  </div>

  <button class="btn btn-gold btn-block" id="save-system" style="margin-top:14px">Sistem Ayarlarını Kaydet</button>`;
}

function renderLedger() {
  return `
  <div class="section-head"><h3 class="section-title"><span class="bar"></span>Bakiye Kayıtları</h3></div>
  <div class="panel" style="padding:12px">
    ${state.overview.ledger.length ? state.overview.ledger.map(ledgerRow).join('') : '<p class="muted">Kayıt yok.</p>'}
  </div>
  <div class="notice" style="margin-top:14px">
    Yönetici tarafından yapılan tüm bakiye tanımlamaları burada iz bırakır.
    Oyun kazanç/kayıpları bu listede yer almaz.
  </div>`;
}

/* ═══════ Kullanıcı işlemleri ═══════ */

function openUser(user) {
  $('sheet-host').innerHTML = `
  <div class="sheet" id="user-sheet">
    <div class="sheet-card">
      <div class="sheet-grip"></div>
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
        <div class="uavatar" style="width:48px;height:48px;flex:0 0 48px;font-size:24px">${user.avatar || '🦊'}</div>
        <div>
          <div style="font-size:17px;font-weight:800">${escapeHtml(user.username || user.name)}</div>
          <div style="font-size:11.5px;color:var(--dim)">
            Bakiye ${fmt(user.balance)} · ${num(user.stats?.spins || 0)} dönüş
          </div>
        </div>
      </div>

      <div class="field">
        <label for="adj-amount">Bakiye tanımla (negatif değer düşer)</label>
        <input id="adj-amount" type="number" placeholder="örn: 5000" inputmode="numeric">
      </div>
      <div class="field">
        <label for="adj-reason">Açıklama</label>
        <input id="adj-reason" placeholder="örn: Turnuva ödülü" maxlength="120">
      </div>
      <div id="user-error"></div>
      <button class="btn btn-gold btn-block" id="adj-apply">Bakiyeyi Güncelle</button>

      <div style="display:flex;gap:8px;margin-top:10px">
        <button class="btn" style="flex:1" id="toggle-ban">
          ${user.banned ? 'Engeli Kaldır' : 'Hesabı Engelle'}
        </button>
        <button class="btn" style="flex:1" id="toggle-role">
          ${user.role === 'admin' ? 'Yöneticiliği Al' : 'Yönetici Yap'}
        </button>
      </div>
      <button class="btn btn-ghost btn-block" id="user-close" style="margin-top:8px;border:none;color:var(--dim)">Kapat</button>
    </div>
  </div>`;

  const sheet = $('user-sheet');
  sheet.onclick = (e) => { if (e.target === sheet) closeSheet(); };
  $('user-close').onclick = closeSheet;

  $('adj-apply').onclick = async () => {
    const amount = Number($('adj-amount').value);
    if (!amount) return ($('user-error').innerHTML = '<div class="form-error">Tutar girin.</div>');
    try {
      const data = await api.adminAdjustBalance(user.id, amount, $('adj-reason').value);
      toast(`${escapeHtml(user.username || user.name)} bakiyesi ${fmt(data.user.balance)}`, true);
      closeSheet();
      await loadUsers();
      await loadOverview();
      render();
    } catch (err) {
      $('user-error').innerHTML = `<div class="form-error">${escapeHtml(err.message)}</div>`;
    }
  };

  $('toggle-ban').onclick = async () => {
    try {
      await api.adminBan(user.id, !user.banned);
      toast(user.banned ? 'Engel kaldırıldı' : 'Hesap engellendi');
      closeSheet();
      await loadUsers();
      render();
    } catch (err) {
      $('user-error').innerHTML = `<div class="form-error">${escapeHtml(err.message)}</div>`;
    }
  };

  $('toggle-role').onclick = async () => {
    try {
      await api.adminRole(user.id, user.role === 'admin' ? 'user' : 'admin');
      toast('Rol güncellendi');
      closeSheet();
      await loadUsers();
      render();
    } catch (err) {
      $('user-error').innerHTML = `<div class="form-error">${escapeHtml(err.message)}</div>`;
    }
  };
}

function closeSheet() {
  $('sheet-host').innerHTML = '';
}

/* ═══════ Veri ═══════ */

async function loadOverview() {
  state.overview = await api.adminOverview();
  state.settings = state.overview.settings;
  const found = state.overview.currencies.find((c) => c.code === state.settings.currency);
  if (found) currency = found;
}

async function loadUsers() {
  const data = await api.adminUsers(state.query);
  state.users = data.users;
}

async function saveSettings(patch, label) {
  try {
    const data = await api.adminSaveSettings(patch);
    state.settings = data.settings;
    const found = state.overview.currencies.find((c) => c.code === data.settings.currency);
    if (found) currency = found;
    toast(`${label} kaydedildi`, true);
    render();
  } catch (err) {
    toast(err.message);
  }
}

/* ═══════ Çizim ═══════ */

function render() {
  const view = $('admin-view');
  let body = '';
  if (state.tab === 'ozet') body = renderOverview();
  else if (state.tab === 'kullanicilar') body = renderUsers();
  else if (state.tab === 'oyun') body = renderGameSettings();
  else if (state.tab === 'masa') body = renderTableSettings();
  else if (state.tab === 'sistem') body = renderSystem();
  else body = renderLedger();

  view.innerHTML = renderTabs() + body;
  bindDynamic();
}

function bindDynamic() {
  const bindRange = (id, valueId, format) => {
    const range = $(id);
    if (!range) return;
    range.oninput = () => ($(valueId).textContent = format(range.value));
  };
  bindRange('rtp-range', 'rtp-value', (v) => `%${Number(v).toFixed(1)}`);
  bindRange('rake-range', 'rake-value', (v) => `%${Number(v).toFixed(1)}`);
  bindRange('pa-range', 'pa-value', (v) => `${v} sn`);
  bindRange('ps-range', 'ps-value', (v) => v);
  bindRange('sb-range', 'sb-value', (v) => num(v));

  const search = $('user-search');
  if (search) {
    search.oninput = () => {
      state.query = search.value;
      clearTimeout(search.timer);
      search.timer = setTimeout(async () => {
        await loadUsers();
        const list = $('admin-view');
        list.innerHTML = renderTabs() + renderUsers();
        bindDynamic();
        $('user-search').focus();
      }, 260);
    };
  }

  // Segment butonlari
  document.querySelectorAll('.seg').forEach((seg) => {
    seg.onclick = (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      seg.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === btn));
    };
  });
}

function bindStatic() {
  document.addEventListener('click', async (e) => {
    const tab = e.target.closest('[data-tab]');
    if (tab) {
      state.tab = tab.dataset.tab;
      if (state.tab === 'kullanicilar' && !state.users.length) await loadUsers();
      render();
      return;
    }

    const userRowEl = e.target.closest('[data-user]');
    if (userRowEl) {
      const user = state.users.find((u) => u.id === userRowEl.dataset.user);
      if (user) openUser(user);
      return;
    }

    const id = e.target.closest('button')?.id;
    if (id === 'save-game') {
      saveSettings(
        {
          slot: { rtpTarget: Number($('rtp-range').value) },
          poker: { rakePercent: Number($('rake-range').value) },
          blackjack: {
            blackjackPayout: Number(document.querySelector('#bj-payout .on')?.dataset.payout ?? 1.5),
            dealerHitsSoft17: document.querySelector('#bj-soft17 .on')?.dataset.soft17 === '1',
            deckCount: Number(document.querySelector('#bj-decks .on')?.dataset.decks ?? 6)
          }
        },
        'Oyun ayarları'
      );
    } else if (id === 'save-table') {
      saveSettings(
        {
          poker: {
            actionSeconds: Number($('pa-range').value),
            maxSeats: Number($('ps-range').value)
          },
          tables: { allowBots: document.querySelector('#allow-bots .on')?.dataset.bots === '1' }
        },
        'Masa ayarları'
      );
    } else if (id === 'save-system') {
      saveSettings(
        {
          currency: document.querySelector('#cur-seg .on')?.dataset.currency || 'TRY',
          startBalance: Number($('sb-range').value),
          allowGuests: document.querySelector('#guest-seg .on')?.dataset.guests === '1',
          maintenance: document.querySelector('#maint-seg .on')?.dataset.maint === '1'
        },
        'Sistem ayarları'
      );
    }
  });
}

/* ═══════ Başlatma ═══════ */

async function boot() {
  bindStatic();
  try {
    const session = await api.session();
    if (!session.player.admin) {
      $('admin-view').innerHTML = `<div class="empty" style="padding-top:60px">${icon('lock')}
        <p>Bu sayfa yalnızca yöneticiler içindir.</p>
        <a class="btn btn-gold" href="./#/" style="margin-top:14px">Siteye Dön</a></div>`;
      return;
    }
    $('admin-who').textContent = `${session.player.username} · yönetici`;
    $('admin-balance').textContent = fmt(session.player.balance);
    await loadOverview();
    $('admin-balance').textContent = fmt(session.player.balance);
    render();
  } catch (err) {
    $('admin-view').innerHTML = `<div class="empty" style="padding-top:60px">${icon('info')}
      <p>${escapeHtml(err.message)}</p></div>`;
  }
}

boot();
