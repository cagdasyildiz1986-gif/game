import { api } from './api.js';
import { sfx } from './audio.js';
import { buildSprite, symbolMarkup } from './yildirim-symbols.js';

/**
 * YILDIRIM · Göklerin Öfkesi arayüzü.
 *
 * Sunucu bir turu (ilk ızgara + tüm tumble adımları + çarpan hesabı) tek
 * istekte çözer ve adım listesi döner. Buradaki iş yalnızca o adımları
 * canlandırmaktır:
 *   düşüş → kazananları vurgula → patlat → yerçekimi + dolum → tekrar
 *   → küreleri topla → çarpanı bas → kazancı say
 *
 * İstemci hiçbir sonuç üretmez.
 */

const REELS = 6;
const ROWS = 5;

const state = {
  config: null,
  player: null,
  bet: 20,
  free: { remaining: 0, total: 0, win: 0, multiplier: 0 },
  busy: false,
  turbo: localStorage.getItem('yildirim-turbo') === 'on',
  auto: 0,
  autoRunning: false,
  freeRound: null
};

let backend = api;
let cellW = 52;
let cellH = 52;
/** tiles[reel][row] -> DOM düğümü */
let tiles = [];
let cols = [];

/* ================== Yardımcılar ================== */
const $ = (id) => document.getElementById(id);
let currency = { symbol: '₺', locale: 'tr-TR' };
const fmt = (n) =>
  Number(n).toLocaleString(currency.locale, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const money = (n) => `${currency.symbol}${fmt(n)}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** Turbo modda süreler kısalır ama sıfırlanmaz — olay yine görülür. */
const pace = (ms, floor = 0.4) => (state.turbo ? Math.round(ms * floor) : ms);

function toast(message, ms = 2200) {
  const el = $('toast');
  el.textContent = message;
  el.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (el.hidden = true), ms);
}

const openModal = (id) => ($(id).hidden = false);
const closeModal = (id) => ($(id).hidden = true);

function waitForDismiss(screenId, buttonId, timeout = 9000) {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      $(buttonId).removeEventListener('click', finish);
      $(screenId).removeEventListener('click', finish);
      resolve();
    };
    const timer = setTimeout(finish, timeout);
    $(buttonId).addEventListener('click', finish);
    $(screenId).addEventListener('click', finish);
  });
}

/* ================== Yerleşim ================== */
function layout() {
  const app = document.querySelector('.app');
  const topbar = document.querySelector('.topbar');
  const controls = document.querySelector('.controls');
  const logo = document.querySelector('.logo');
  const gap = 2;
  const framePad = 20;

  // Yükseklik, hücre boyutuna BAĞLI OLMAYAN ölçülerden hesaplanır; aksi
  // halde sahne yüksekliği ile hücre boyutu birbirini besleyip döngü olur.
  const reserved =
    topbar.offsetHeight + controls.offsetHeight + (logo?.offsetHeight || 0) + 34 + 26;
  const width = Math.min(app.clientWidth, 620) - 12;
  cellW = Math.max(30, Math.floor((width - framePad - gap * (REELS - 1)) / REELS));
  const heightCap = (app.clientHeight - reserved - framePad) / ROWS;
  cellH = Math.max(30, Math.floor(Math.min(cellW * 1.22, heightCap)));

  const root = document.documentElement.style;
  root.setProperty('--cell-w', `${cellW}px`);
  root.setProperty('--cell-h', `${cellH}px`);

  // Var olan taşları yeni ölçüye taşı
  for (let r = 0; r < REELS; r += 1) {
    for (let row = 0; row < ROWS; row += 1) {
      const el = tiles[r]?.[row];
      if (el) el.style.top = `${row * cellH}px`;
    }
  }
}

/* ================== Izgara ================== */
function buildGrid() {
  $('grid').innerHTML = Array.from(
    { length: REELS },
    (_, r) => `<div class="col" data-col="${r}"></div>`
  ).join('');
  cols = [...$('grid').querySelectorAll('.col')];
  tiles = Array.from({ length: REELS }, () => new Array(ROWS).fill(null));
}

const isOrbCell = (cell) => typeof cell === 'object' && cell !== null;

function makeTile(cell) {
  const el = document.createElement('div');
  if (isOrbCell(cell)) {
    el.className = 'tile orb';
    el.dataset.symbol = 'MULT';
    el.dataset.value = cell.value;
    el.innerHTML = `${symbolMarkup('MULT')}<span class="orb-value">x${cell.value}</span>`;
  } else {
    el.className = 'tile';
    el.dataset.symbol = cell;
    el.innerHTML = symbolMarkup(cell);
  }
  return el;
}

/** Bir taşı düşürerek yerine oturtur. */
function armFall(el, fromPx, fall) {
  el.style.setProperty('--fall', `${fall}ms`);
  el.classList.remove('falling', 'landed');
  el.style.transform = `translateY(${fromPx}px)`;
}

function releaseFall(el) {
  el.classList.add('falling');
  el.style.transform = 'translateY(0)';
}

function markLanded(el) {
  el.classList.add('landed');
  if (el.classList.contains('orb')) el.classList.add('arriving');
  setTimeout(() => el.classList.remove('landed', 'arriving'), 520);
}

/** Baştan tüm ızgarayı düşürür (yeni çevirme). */
async function dropAll(grid) {
  const fall = pace(340);
  const stagger = pace(60);

  for (let r = 0; r < REELS; r += 1) {
    cols[r].innerHTML = '';
    for (let row = 0; row < ROWS; row += 1) {
      const el = makeTile(grid[r][row]);
      el.style.top = `${row * cellH}px`;
      armFall(el, -(row + 2) * cellH - 40, fall);
      cols[r].appendChild(el);
      tiles[r][row] = el;
    }
  }

  void $('grid').offsetHeight;
  sfx.spin();

  const waits = [];
  for (let r = 0; r < REELS; r += 1) {
    const delay = r * stagger;
    waits.push(
      sleep(delay).then(() => {
        for (let row = 0; row < ROWS; row += 1) releaseFall(tiles[r][row]);
        return sleep(fall).then(() => {
          sfx.reelStop(r);
          for (let row = 0; row < ROWS; row += 1) markLanded(tiles[r][row]);
        });
      })
    );
  }
  await Promise.all(waits);
}

/** Kazananları patlatır, kalanları düşürür, boşlukları doldurur. */
async function applyTumble(step) {
  const gridEl = $('grid');
  const cleared = step.cleared || [];
  if (!cleared.length) return;

  // 1) Vurgula
  gridEl.classList.add('resolving');
  for (const [r, row] of cleared) tiles[r][row]?.classList.add('win');
  sfx.win(1);
  await sleep(pace(620));

  // 2) Patlat
  for (const [r, row] of cleared) {
    const el = tiles[r][row];
    if (!el) continue;
    el.classList.remove('win');
    el.classList.add('burst');
  }
  sfx.reelStop(3, true);
  await sleep(pace(300));
  for (const [r, row] of cleared) {
    tiles[r][row]?.remove();
    tiles[r][row] = null;
  }
  gridEl.classList.remove('resolving');

  // 3) Yerçekimi + dolum
  const fall = pace(320);
  const fresh = [];
  for (let r = 0; r < REELS; r += 1) {
    const survivors = [];
    for (let row = 0; row < ROWS; row += 1) {
      if (tiles[r][row]) survivors.push({ el: tiles[r][row], oldRow: row });
    }
    const missing = ROWS - survivors.length;
    const column = new Array(ROWS).fill(null);

    for (let row = 0; row < missing; row += 1) {
      const el = makeTile(step.next[r][row]);
      el.style.top = `${row * cellH}px`;
      armFall(el, -(missing - row) * cellH - 30, fall);
      cols[r].appendChild(el);
      column[row] = el;
      fresh.push(el);
    }
    survivors.forEach((s, i) => {
      const newRow = missing + i;
      s.el.style.top = `${newRow * cellH}px`;
      armFall(s.el, -(newRow - s.oldRow) * cellH, fall);
      column[newRow] = s.el;
    });
    tiles[r] = column;
  }

  void gridEl.offsetHeight;
  for (let r = 0; r < REELS; r += 1) {
    for (let row = 0; row < ROWS; row += 1) releaseFall(tiles[r][row]);
  }
  await sleep(fall + 30);
  for (let r = 0; r < REELS; r += 1) {
    for (let row = 0; row < ROWS; row += 1) markLanded(tiles[r][row]);
  }

  // Yeni küre düştüyse gök çakar
  if (fresh.some((el) => el.classList.contains('orb'))) {
    strike(2);
    sfx.coin(7);
  }
  await sleep(pace(140));
}

/* ================== Şimşek ================== */
/** Çerçevenin içine rastgele çizilmiş şimşekler ve bir flaş. */
function strike(count = 1, host = $('bolts')) {
  const frame = document.querySelector('.frame');
  frame.classList.remove('flash');
  void frame.offsetWidth;
  frame.classList.add('flash');
  setTimeout(() => frame.classList.remove('flash'), 420);

  const paths = [];
  for (let i = 0; i < count; i += 1) {
    let x = 12 + Math.random() * 76;
    let d = `M${x.toFixed(1)} -4`;
    for (let y = 6; y <= 104; y += 12 + Math.random() * 8) {
      x += (Math.random() - 0.5) * 26;
      x = Math.max(3, Math.min(97, x));
      d += ` L${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    paths.push(`<path d="${d}" style="animation-delay:${i * 90}ms"/>`);
  }
  host.innerHTML = paths.join('');
  setTimeout(() => {
    if (host.innerHTML.includes(paths[0])) host.innerHTML = '';
  }, 700);
}

/* ================== Sayaçlar ================== */
function countUp(el, to, duration = 700, { int = false } = {}) {
  const from = Number(String(el.dataset.value || 0));
  const start = performance.now();
  let coinTick = 0;
  el.dataset.value = to;
  function frame(now) {
    const t = Math.min(1, (now - start) / duration);
    const value = from + (to - from) * (1 - (1 - t) ** 3);
    el.textContent = fmt(int ? Math.round(value) : Math.round(value * 100) / 100);
    if (t < 1) {
      if (now - coinTick > 90) {
        coinTick = now;
        sfx.coin(Math.floor(t * 10));
      }
      requestAnimationFrame(frame);
    } else {
      el.textContent = fmt(to);
    }
  }
  requestAnimationFrame(frame);
}

function resetWin() {
  const el = $('win-value');
  el.dataset.value = 0;
  el.textContent = '0';
  $('win-info').textContent = '';
}

/* ================== Üst bilgi ================== */
function renderPlayer(player) {
  if (player) state.player = player;
  $('balance').textContent = money(state.player.balance);
  $('bet').textContent = money(state.bet);

  const inFree = state.free.remaining > 0;
  document.body.classList.toggle('free-mode', inFree);
  // Kalıcı çarpan yalnızca bedava dönüşte anlamlıdır; temel oyunda
  // üst şeritte oyunun kimliği durur.
  $('mode-chip').hidden = inFree;
  $('hud-mult-wrap').hidden = !inFree;
  $('hud-free-wrap').hidden = !inFree;
  $('hud-free').textContent = state.free.remaining;
  $('spin-label').textContent = inFree ? 'BEDAVA' : 'ÇEVİR';
  $('bet-up').disabled = inFree;
  $('bet-down').disabled = inFree;
  setMultiplierHud(inFree ? state.free.multiplier : 0, false);
}

function setMultiplierHud(value, bump = true) {
  const el = $('hud-mult');
  el.textContent = `x${fmt(Math.max(1, value))}`;
  el.closest('.hud-item').classList.toggle('charged', value >= 10);
  if (bump) {
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');
  }
}

const symbolName = (id) => state.config.symbols[id]?.name || id;

/* ================== Çarpan toplama ================== */
/** Küreler merkeze uçar, değerleri toplanır, çarpan damgalanır. */
async function collectMultipliers(round) {
  if (!round.orbs.length) return;

  const gridEl = $('grid');
  const box = gridEl.getBoundingClientRect();
  const cx = box.left + box.width / 2;
  const cy = box.top + box.height / 2;

  $('collector-value').textContent = 'x0';
  $('collector').hidden = false;
  strike(3);
  sfx.anticipation(600);
  await sleep(pace(260));

  // Küreleri tek tek merkeze çek, toplamı say
  let running = round.free ? round.multiplierBefore : 0;
  const sorted = [...round.orbs].sort((a, b) => a.value - b.value);
  for (const orb of sorted) {
    const el = tiles[orb.reel]?.[orb.row];
    if (el) {
      const r = el.getBoundingClientRect();
      el.classList.add('collecting');
      el.style.transform =
        `translate(${cx - (r.left + r.width / 2)}px, ${cy - (r.top + r.height / 2)}px) scale(.4)`;
    }
    running += orb.value;
    $('collector-value').textContent = `x${fmt(running)}`;
    sfx.coin(Math.min(9, orb.value));
    await sleep(pace(180));
  }

  // Son damga
  const final = round.free ? round.multiplierAfter : round.orbTotal;
  const valueEl = $('collector-value');
  valueEl.textContent = `x${fmt(Math.max(1, final))}`;
  valueEl.classList.remove('slam');
  void valueEl.offsetWidth;
  valueEl.classList.add('slam');
  sfx.bigWin();
  if (final >= 25) {
    document.body.classList.add('shake');
    setTimeout(() => document.body.classList.remove('shake'), 420);
  }
  await sleep(pace(900));
  $('collector').hidden = true;

  // Toplanan küreler yerlerine sönük olarak döner; ızgarada delik kalmaz.
  for (const orb of round.orbs) {
    const el = tiles[orb.reel]?.[orb.row];
    if (!el) continue;
    el.classList.remove('collecting');
    el.classList.add('spent');
    el.style.transform = 'translateY(0)';
  }

  setMultiplierHud(round.free ? round.multiplierAfter : final);
}

/* ================== Bedava dönüş ekranları ================== */
function launchScatters(count) {
  const host = $('fs-scatters');
  const origins = [[-38, -30], [38, -30], [0, 34], [-42, 22], [42, 22], [0, -38]];
  host.innerHTML = Array.from({ length: Math.min(count, origins.length) }, (_, i) => {
    const [x, y] = origins[i];
    return `<div class="fly" style="
      left:calc(50% - 37px); top:calc(45% - 37px);
      --fx:${x}vw; --fy:${y}vh;
      animation-delay:${i * 0.1}s">${symbolMarkup('SCATTER')}</div>`;
  }).join('');
  setTimeout(() => (host.innerHTML = ''), 1600);
}

async function showFreeIntro(count, scatterCount, retrigger) {
  sfx.bigWin();
  launchScatters(Math.max(4, scatterCount));
  strike(4, $('fs-intro').querySelector('.screen-bolts'));
  $('fs-intro').querySelector('.fs-headline').textContent = retrigger ? 'FIRTINA SÜRÜYOR' : 'GÖKLER AÇILDI';
  $('fs-intro').querySelector('.fs-ribbon').textContent = `${scatterCount} YILDIRIM`;
  $('fs-intro-count').dataset.value = 0;
  $('fs-intro-count').textContent = '0';
  $('fs-intro').hidden = false;
  setTimeout(() => countUp($('fs-intro-count'), count, 900, { int: true }), 600);
  await waitForDismiss('fs-intro', 'fs-intro-start', retrigger ? 3200 : 9000);
  $('fs-intro').hidden = true;
  sfx.click();
}

async function showFreeOutro(summary, bet) {
  sfx.bigWin();
  const el = $('fs-outro-total');
  el.dataset.value = 0;
  el.textContent = '0';
  $('fs-outro-spins').textContent = fmt(summary.spins);
  $('fs-outro-mult').textContent = `x${fmt(Math.max(1, summary.multiplier))}`;
  $('fs-outro-x').textContent = `x${bet > 0 ? Math.round(summary.total / bet) : 0}`;
  $('fs-outro').hidden = false;
  countUp(el, summary.total, 1600);
  await waitForDismiss('fs-outro', 'fs-outro-collect');
  $('fs-outro').hidden = true;
  sfx.click();
}

async function celebrate(amount, bet) {
  const ratio = bet > 0 ? amount / bet : 0;
  let title = null;
  if (ratio >= 300) title = 'EFSANEVİ KAZANÇ';
  else if (ratio >= 100) title = 'MUHTEŞEM KAZANÇ';
  else if (ratio >= 40) title = 'BÜYÜK KAZANÇ';
  if (!title) return;

  const duration = state.turbo ? 1400 : 2600;
  sfx.bigWin();
  $('celebration-title').textContent = title;
  const el = $('celebration-amount');
  el.dataset.value = 0;
  el.textContent = '0';
  $('celebration').hidden = false;
  countUp(el, amount, Math.min(1600, duration - 300));
  await Promise.race([
    sleep(duration),
    new Promise((resolve) => {
      const handler = () => {
        $('celebration').removeEventListener('click', handler);
        resolve();
      };
      $('celebration').addEventListener('click', handler);
    })
  ]);
  $('celebration').hidden = true;
}

/* ================== Tur döngüsü ================== */
async function doSpin() {
  if (state.busy) return;
  const wasFree = state.free.remaining > 0;
  if (!wasFree && state.player.balance < state.bet) {
    toast('Yetersiz bakiye.');
    stopAuto();
    return;
  }

  state.busy = true;
  $('spin').disabled = true;
  resetWin();

  let data;
  try {
    data = await backend.storm.spin(state.bet);
  } catch (err) {
    toast(err.message);
    stopAuto();
    state.busy = false;
    $('spin').disabled = false;
    return;
  }

  const { round, player } = data;
  state.player = player;
  $('balance').textContent = money(player.balance);

  // Yeni kazanılan bedava dönüşler giriş ekranından önce sayaca yazılmaz.
  const deferFree = round.freeSpinsAwarded > 0 && !round.free;
  if (!deferFree) state.free.remaining = round.freeSpinsLeft;
  if (round.free) state.free.multiplier = round.multiplierBefore;
  renderPlayer(player);

  // 1) İlk ızgara
  await dropAll(round.steps[0].grid);

  // 2) Tumble dizisi
  let running = 0;
  for (const step of round.steps) {
    if (!step.wins.length) break;
    running += step.win;
    const best = step.wins.reduce((a, b) => (b.amount > a.amount ? b : a));
    $('win-info').textContent =
      `${best.count}x ${symbolName(best.symbol)}${step.wins.length > 1 ? ` +${step.wins.length - 1}` : ''}`;
    countUp($('win-value'), running, pace(500));
    await applyTumble(step);
  }

  // 3) Çarpan küreleri
  if (round.orbs.length && running > 0) {
    await collectMultipliers({ ...round, free: round.free });
  } else if (round.orbs.length && round.free) {
    // Kazanç olmasa da bedava dönüşte küreler toplama eklenir
    await collectMultipliers({ ...round, free: true });
  }

  // 4) Scatter
  if (round.scatter.count >= 4 || (round.free && round.freeSpinsAwarded > 0)) {
    for (const [r, row] of round.scatter.positions) tiles[r]?.[row]?.classList.add('win');
    strike(3);
    await sleep(pace(700));
  }

  if (round.totalWin > 0) countUp($('win-value'), round.totalWin, pace(650));
  if (round.capped) $('win-info').textContent = 'TAVAN KAZANÇ';

  await sleep(pace(500));

  // Kutlama — bedava dönüş turlarının kendi ekranı var
  if (round.freeSpinsAwarded === 0) await celebrate(round.totalWin, round.bet);

  // 5) Bedava dönüş muhasebesi
  if (round.free && state.freeRound) {
    state.freeRound.spins += 1;
    state.freeRound.total += round.totalWin;
  }
  if (round.free) state.free.multiplier = round.multiplierAfter;

  if (round.freeSpinsAwarded > 0) {
    const retrigger = Boolean(round.free);
    if (!retrigger) {
      state.freeRound = { spins: 0, total: 0 };
      state.free.multiplier = 0;
    }
    await showFreeIntro(round.freeSpinsAwarded, round.scatter.count, retrigger);
    state.free.remaining = round.freeSpinsLeft;
  }

  renderPlayer(state.player);

  if (round.freeSpinsSummary) {
    await showFreeOutro(round.freeSpinsSummary, round.bet);
    state.freeRound = null;
    state.free.multiplier = 0;
    document.body.classList.remove('free-mode');
    renderPlayer(state.player);
  }

  state.busy = false;
  $('spin').disabled = false;

  if (state.free.remaining > 0) {
    await sleep(state.turbo ? 500 : 1100);
    return doSpin();
  }

  if (state.autoRunning) {
    if (!wasFree) {
      if (state.auto !== Infinity) state.auto -= 1;
      if (state.auto <= 0) {
        stopAuto();
        return;
      }
    }
    await sleep(state.turbo ? 200 : 600);
    if (state.autoRunning) return doSpin();
  }
}

function startAuto(count) {
  state.auto = count;
  state.autoRunning = true;
  $('btn-auto').classList.add('active');
  closeModal('modal-auto');
  if (!state.busy) doSpin();
}

function stopAuto() {
  state.autoRunning = false;
  state.auto = 0;
  $('btn-auto').classList.remove('active');
}

/* ================== Ödeme tablosu ================== */
function renderPaytable() {
  const c = state.config;
  const bet = state.bet;
  const [t1, t2, t3] = c.tiers;

  const rows = c.paySymbols
    .map((id) => {
      const p = c.paytable[id];
      return `<div class="st-row">
        <span class="st-name">${symbolMarkup(id)}${c.symbols[id].name}</span>
        <b>${fmt(p[t1] * bet)}</b><b>${fmt(p[t2] * bet)}</b><b>${fmt(p[t3] * bet)}</b>
      </div>`;
    })
    .join('');

  const orbs = c.orbValues.map((v) => `<span>x${v}</span>`).join('');

  $('paytable-body').innerHTML = `
    <p class="pt-note">
      <b>Hat yoktur.</b> Bir sembolden ekranın herhangi bir yerinde
      <b>${c.minCluster} veya daha fazla</b> varsa öder. Değerler ${money(bet)} toplam bahis içindir.
    </p>
    <div class="st-tier-head">
      <span>Sembol</span><span>${t1}-${t2 - 1}</span><span>${t2}-${t3 - 1}</span><span>${t3}+</span>
    </div>
    ${rows}

    <div class="pt-section">Tumble</div>
    <p class="pt-note">
      Kazanan semboller patlar, üsttekiler düşer ve boşluklar yenileriyle dolar.
      Bu döngü <b>kazanç kalmayana kadar</b> sürer; hepsi tek bahsin içindedir.
    </p>

    <div class="pt-section">Çarpan Küreleri</div>
    <div class="pt-row">${symbolMarkup('MULT')}
      <div><div>Yıldırım Küresi</div>
      <div class="pt-pays"><span>Ödeme yapmaz, patlamaz — yerçekimiyle düşer.</span></div></div></div>
    <div class="st-orbs">${orbs}</div>
    <p class="pt-note">
      <b>Temel oyun:</b> tumble dizisi bittiğinde ekrandaki tüm kürelerin değerleri
      toplanır ve o dizinin kazancını çarpar.<br>
      <b>Bedava dönüş:</b> toplam, tur boyunca yaşayan <b>kalıcı çarpana</b> eklenir ve
      bundan sonraki her kazancı çarpar. Kazançsız dönüşte düşen küreler de eklenir.
    </p>

    <div class="pt-section">Scatter</div>
    <div class="pt-row">${symbolMarkup('SCATTER')}
      <div><div>Yıldırım <span class="pt-tag">SCATTER</span></div>
      <div class="pt-pays">${[6, 5, 4]
        .filter((n) => c.scatterPay[n])
        .map((n) => `<span>${n}× <b>${fmt(c.scatterPay[n] * bet)}</b></span>`)
        .join('')}</div></div></div>
    <p class="pt-note">
      4 scatter <b>${c.freeSpins[4]}</b>, 5 scatter <b>${c.freeSpins[5]}</b>,
      6 scatter <b>${c.freeSpins[6]}</b> bedava dönüş verir. Scatter'lar tumble
      boyunca ekranda kalır ve birikir. Bedava dönüş sırasında
      <b>${c.retrigger.min}+</b> scatter <b>+${c.retrigger.spins}</b> dönüş ekler.
    </p>

    <div class="pt-section">Kurallar</div>
    <p class="pt-note">
      • Sembolün ekrandaki konumu fark etmez, yalnızca adedi sayılır.<br>
      • Aynı dizide birden çok sembol ödeyebilir; hepsi toplanır.<br>
      • Bir turda ödenebilecek en yüksek tutar toplam bahsin <b>${c.maxWin}</b> katıdır.
    </p>
  `;
}

function renderStats() {
  const s = state.player.stats;
  const rtp = s.wagered > 0 ? ((s.won / s.wagered) * 100).toFixed(2) : '—';
  $('stats-body').innerHTML = `
    <div class="kv"><span>Toplam dönüş</span><span>${fmt(s.spins)}</span></div>
    <div class="kv"><span>Toplam bahis</span><span>${fmt(s.wagered)}</span></div>
    <div class="kv"><span>Toplam kazanç</span><span>${fmt(s.won)}</span></div>
    <div class="kv"><span>En büyük kazanç</span><span>${fmt(s.biggestWin)}</span></div>
    <div class="kv"><span>Oturum getirisi</span><span>${rtp === '—' ? '—' : `%${rtp}`}</span></div>
    <p class="pt-note">Teorik RTP %${String(state.config.rtp).replace('.', ',')};
      kısa oturumlarda sapma normaldir.</p>
  `;
}

/* ================== Bahis ================== */
async function changeBet(direction) {
  const levels = state.config.betLevels;
  const index = levels.indexOf(state.bet);
  const next = levels[Math.min(levels.length - 1, Math.max(0, index + direction))];
  if (next === state.bet) return;
  sfx.click();
  try {
    const data = await backend.storm.setBet(next);
    state.bet = data.state.bet;
    renderPlayer();
  } catch (err) {
    toast(err.message);
  }
}

/* ================== Başlatma ================== */
function bindEvents() {
  $('spin').addEventListener('click', () => {
    sfx.unlock();
    if (state.autoRunning) return stopAuto();
    doSpin();
  });
  $('bet-up').addEventListener('click', () => changeBet(1));
  $('bet-down').addEventListener('click', () => changeBet(-1));

  $('btn-turbo').addEventListener('click', () => {
    state.turbo = !state.turbo;
    localStorage.setItem('yildirim-turbo', state.turbo ? 'on' : 'off');
    $('btn-turbo').classList.toggle('active', state.turbo);
    sfx.click();
  });
  $('btn-turbo').classList.toggle('active', state.turbo);

  $('btn-auto').addEventListener('click', () => {
    sfx.click();
    if (state.autoRunning) {
      stopAuto();
      toast('Otomatik oyun durduruldu');
      return;
    }
    openModal('modal-auto');
  });
  $('auto-options').innerHTML =
    [10, 25, 50, 100].map((n) => `<button class="chip" data-auto="${n}">${n}</button>`).join('') +
    '<button class="chip" data-auto="inf">∞</button>';
  $('auto-options').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-auto]');
    if (!btn) return;
    startAuto(btn.dataset.auto === 'inf' ? Infinity : Number(btn.dataset.auto));
  });
  $('auto-stop').addEventListener('click', () => {
    stopAuto();
    closeModal('modal-auto');
  });

  $('btn-sound').addEventListener('click', () => {
    $('btn-sound').textContent = sfx.toggle() ? '🔊' : '🔇';
  });
  $('btn-sound').textContent = sfx.enabled ? '🔊' : '🔇';

  $('btn-menu').addEventListener('click', () => {
    sfx.click();
    openModal('modal-menu');
  });
  $('menu-paytable').addEventListener('click', () => {
    renderPaytable();
    closeModal('modal-menu');
    openModal('modal-paytable');
  });
  $('menu-stats').addEventListener('click', () => {
    renderStats();
    closeModal('modal-menu');
    openModal('modal-stats');
  });

  document.querySelectorAll('[data-close]').forEach((btn) => {
    btn.addEventListener('click', () => (btn.closest('.modal').hidden = true));
  });
  document.querySelectorAll('.modal').forEach((modal) => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.hidden = true;
    });
  });

  window.addEventListener('resize', layout);
  window.addEventListener('orientationchange', () => setTimeout(layout, 200));
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      if (!state.busy) doSpin();
    }
  });
}

async function boot() {
  $('sprite-host').innerHTML = buildSprite();

  if (window.SLOT_DEMO) {
    const { demoApi } = await import('./demo.js');
    backend = demoApi;
    $('demo-badge').hidden = false;
  }

  try {
    const config = await backend.storm.config();
    state.config = config;
    if (config.currency) currency = config.currency;
    state.bet = config.defaultBet;

    await backend.session('Misafir');
    const st = await backend.storm.state();
    state.bet = st.state.bet;
    state.free = st.state.free;

    $('loader').hidden = true;
    $('app').hidden = false;

    layout();
    buildGrid();
    renderPlayer(st.player);
    bindEvents();
    layout();

    // Açılışta ızgarayı sunucudan gelen bir tur olmadan doldur (yalnızca sunum)
    await dropAll(
      Array.from({ length: REELS }, () =>
        Array.from({ length: ROWS }, () => {
          const pool = config.paySymbols;
          return pool[Math.floor(Math.random() * pool.length)];
        })
      )
    );
  } catch (err) {
    $('loader').innerHTML = `<p style="color:#ff9d9d;padding:20px;text-align:center">
      Sunucuya bağlanılamadı.<br><span class="mono">${err.message}</span></p>`;
  }
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}

boot();
