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
  const brand = document.querySelector('.brand');
  const winbar = document.querySelector('.winbar');
  const gap = 2;
  // Çerçeve kenarlığı (4x2) + çerçeve dolgusu (9x2) + tahta dolgusu (2x2)
  const frameChrome = 30;

  const width = Math.min(app.clientWidth, 640) - 12;
  cellW = Math.max(28, Math.floor((width - frameChrome - gap * (REELS - 1)) / REELS));

  // Yükseklik, hücre boyutuna BAĞLI OLMAYAN gerçek ölçülerden çıkarılır;
  // aksi halde sahne yüksekliği ile hücre boyutu birbirini besler.
  const winbarH = (winbar?.offsetHeight || 34) + 8;
  const reserved =
    topbar.offsetHeight +
    controls.offsetHeight +
    (brand?.offsetHeight || 0) +
    winbarH + frameChrome + 22;
  const heightCap = (app.clientHeight - reserved) / ROWS;
  cellH = Math.max(28, Math.floor(Math.min(cellW * 1.22, heightCap)));

  const root = document.documentElement.style;
  root.setProperty('--cell-w', `${cellW}px`);
  root.setProperty('--cell-h', `${cellH}px`);

  // Emniyet kemeri: hesap tutmazsa (yazı tipi, güvenli alan, tarayıcı çubuğu)
  // kazanç bandı alt panellere değene kadar hücreyi küçült.
  if (winbar && controls) {
    for (let guard = 0; guard < 8; guard += 1) {
      if (winbar.getBoundingClientRect().bottom <= controls.getBoundingClientRect().top - 2) break;
      cellH = Math.max(24, cellH - 4);
      root.setProperty('--cell-h', `${cellH}px`);
    }
  }

  const layer = $('bolts');
  if (layer) {
    const r = layer.getBoundingClientRect();
    if (r.width && r.height) {
      layer.setAttribute('viewBox', `0 0 ${Math.round(r.width)} ${Math.round(r.height)}`);
    }
  }

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
  setTimeout(() => el.classList.remove('landed'), 300);
}

/** Küre hücrelerini bulur — yıldırım bunlara düşer. */
function findNewOrbs(cells) {
  const out = [];
  for (const { reel, row } of cells) {
    const el = tiles[reel]?.[row];
    if (el?.classList.contains('orb')) out.push({ reel, row, el });
  }
  return out;
}

/** Küreleri önce gizler; yıldırım çarpınca ortaya çıkarır. */
function hideOrbs(orbs) {
  for (const o of orbs) o.el.style.visibility = 'hidden';
}
function revealOrbs(orbs) {
  orbs.forEach((o, i) => {
    o.el.style.visibility = '';
    o.el.classList.add('arriving');
    sfx.zap(i * 0.06);
    setTimeout(() => o.el.classList.remove('arriving'), 520);
  });
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
  sfx.stormSpin();

  const waits = [];
  for (let r = 0; r < REELS; r += 1) {
    const delay = r * stagger;
    waits.push(
      sleep(delay).then(() => {
        for (let row = 0; row < ROWS; row += 1) releaseFall(tiles[r][row]);
        return sleep(fall).then(() => {
          sfx.gemLand(r);
          for (let row = 0; row < ROWS; row += 1) markLanded(tiles[r][row]);
        });
      })
    );
  }
  await Promise.all(waits);

  // Bu çevirmede küre geldiyse gökten üstlerine yıldırım iner.
  const all = [];
  for (let r = 0; r < REELS; r += 1) {
    for (let row = 0; row < ROWS; row += 1) all.push({ reel: r, row });
  }
  const orbs = findNewOrbs(all);
  if (orbs.length) {
    hideOrbs(orbs);
    await sleep(pace(160));
    await strikeCells(orbs);
    revealOrbs(orbs);
  }
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
  sfx.gemBreak(cleared.length);
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

  // Yeni küre düştüyse gökten üstüne yıldırım iner
  const newOrbs = [];
  for (let r = 0; r < REELS; r += 1) {
    for (let row = 0; row < ROWS; row += 1) {
      const el = tiles[r][row];
      if (fresh.includes(el) && el.classList.contains('orb')) newOrbs.push({ reel: r, row, el });
    }
  }
  if (newOrbs.length) {
    hideOrbs(newOrbs);
    await sleep(pace(120));
    await strikeCells(newOrbs);
    revealOrbs(newOrbs);
  }
  await sleep(pace(140));
}

/* ================== Şimşek ================== */

/**
 * Gökten aşağı, verilen noktaya zikzak çizen bir şimşek yolu üretir.
 * Koordinatlar şimşek katmanının PİKSEL uzayındadır (0,0 = katmanın tepesi,
 * yani çerçevenin epey üstü). Hedefe yaklaştıkça sapma azalır.
 */
function boltPath(toX, toY, spread = 46) {
  const w = $('bolts').getBoundingClientRect().width || 360;
  let d = `M${(toX + (Math.random() - 0.5) * spread).toFixed(1)} -12`;
  const steps = 6 + Math.floor(Math.random() * 3);
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    const y = -12 + (toY + 12) * t;
    const x = toX + (1 - t) * spread * (Math.random() - 0.5);
    d += ` L${Math.max(-8, Math.min(w + 8, x)).toFixed(1)} ${y.toFixed(1)}`;
  }
  return d;
}

/** Bir hücrenin merkezini şimşek katmanının koordinatlarına çevirir. */
function cellPoint(reel, row) {
  const el = tiles[reel]?.[row];
  const layer = $('bolts').getBoundingClientRect();
  if (!el) return { x: layer.width / 2, y: layer.height / 2 };
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2 - layer.left, y: r.top + r.height / 2 - layer.top };
}

/** Tahtayı beyaza boğan kısa flaş. */
function flashBoard() {
  const board = document.querySelector('.board');
  board.classList.remove('flash');
  void board.offsetWidth;
  board.classList.add('flash');
  setTimeout(() => board.classList.remove('flash'), 400);
}

/** Rastgele yerlere düşen atmosferik şimşekler. */
function strike(count = 1, host = $('bolts')) {
  flashBoard();
  sfx.thunder();
  const box = host.getBoundingClientRect();
  const paths = [];
  for (let i = 0; i < count; i += 1) {
    paths.push(
      `<path d="${boltPath(box.width * (0.12 + Math.random() * 0.76), box.height * 0.9, 60)}"
        style="animation-delay:${i * 90}ms"/>`
    );
  }
  host.innerHTML = paths.join('');
  setTimeout(() => (host.innerHTML = ''), 760);
}

/**
 * ÇARPAN YILDIRIMI — küre bir hücreye ineceği zaman gökten o hücreye
 * bir şimşek düşer, çarpma anında ışık halkası açılır ve küre belirir.
 */
async function strikeCells(targets) {
  if (!targets.length) return;
  const host = $('bolts');
  const paths = targets.map((t, i) => {
    const { x, y } = cellPoint(t.reel, t.row);
    return `<path class="thick" d="${boltPath(x, y, 40)}" style="animation-delay:${i * 110}ms"/>`;
  });
  host.innerHTML = paths.join('');
  flashBoard();
  // Çarpanın inişi oyunun en belirgin sesidir.
  sfx.thunder({ big: true });

  document.body.classList.add('shake');
  setTimeout(() => document.body.classList.remove('shake'), 380);

  for (let i = 0; i < targets.length; i += 1) {
    const el = tiles[targets[i].reel]?.[targets[i].row];
    if (el) {
      el.classList.add('struck');
      setTimeout(() => el.classList.remove('struck'), 420);
    }
    if (i < targets.length - 1) await sleep(pace(110));
  }
  setTimeout(() => (host.innerHTML = ''), 760);
  await sleep(pace(240));
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

  // Üst şerit temel oyunda boştur; bedava dönüşte kalan dönüş ve
  // biriken kalıcı çarpan burada durur.
  $('free-hud').hidden = !inFree;
  if (inFree) {
    $('mode-text').textContent =
      `BEDAVA ${state.free.remaining} · ÇARPAN x${fmt(Math.max(1, state.free.multiplier))}`;
  }

  $('spin-label').textContent = inFree ? 'BEDAVA' : 'ÇEVİR';
  $('bet-up').disabled = inFree;
  $('bet-down').disabled = inFree;
  $('btn-bet').disabled = inFree;
}

/** Bedava dönüşte biriken çarpanı üst şeritte parlatır. */
function setMultiplierHud(value, bump = true) {
  if (state.free.remaining <= 0 && !bump) return;
  $('mode-text').textContent =
    `BEDAVA ${state.free.remaining} · ÇARPAN x${fmt(Math.max(1, value))}`;
  if (bump) {
    const pill = $('free-hud');
    pill.classList.remove('bump');
    void pill.offsetWidth;
    pill.classList.add('bump');
    setTimeout(() => pill.classList.remove('bump'), 500);
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
  await sleep(pace(260));

  // Küreleri tek tek merkeze çek, toplamı say
  let running = round.free ? round.multiplierBefore : 0;
  const sorted = [...round.orbs].sort((a, b) => a.value - b.value);
  for (let i = 0; i < sorted.length; i += 1) {
    const orb = sorted[i];
    const el = tiles[orb.reel]?.[orb.row];
    if (el) {
      const r = el.getBoundingClientRect();
      el.classList.add('collecting');
      el.style.transform =
        `translate(${cx - (r.left + r.width / 2)}px, ${cy - (r.top + r.height / 2)}px) scale(.4)`;
    }
    running += orb.value;
    $('collector-value').textContent = `x${fmt(running)}`;
    sfx.charge(i);
    await sleep(pace(180));
  }

  // Son damga
  const final = round.free ? round.multiplierAfter : round.orbTotal;
  const valueEl = $('collector-value');
  valueEl.textContent = `x${fmt(Math.max(1, final))}`;
  valueEl.classList.remove('slam');
  void valueEl.offsetWidth;
  valueEl.classList.add('slam');
  sfx.thunder({ big: true });
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
async function setBet(next) {
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

async function changeBet(direction) {
  const levels = state.config.betLevels;
  const index = levels.indexOf(state.bet);
  return setBet(levels[Math.min(levels.length - 1, Math.max(0, index + direction))]);
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

  // Bahis seçimi — hem hap hem OTOMATİK düğmesi aynı listeyi açar
  const openBets = () => {
    if (state.free.remaining > 0) {
      toast('Bedava dönüşler sırasında bahis değiştirilemez.');
      return;
    }
    $('bet-options').innerHTML = state.config.betLevels
      .map((b) => `<button class="chip${b === state.bet ? ' active' : ''}" data-bet="${b}">${money(b)}</button>`)
      .join('');
    openModal('modal-bet');
  };
  $('btn-bet').addEventListener('click', openBets);
  $('bet-options').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-bet]');
    if (!btn) return;
    closeModal('modal-bet');
    await setBet(Number(btn.dataset.bet));
  });

  $('btn-paytable').addEventListener('click', () => {
    renderPaytable();
    openModal('modal-paytable');
  });

  $('btn-settings').addEventListener('click', () => {
    sfx.click();
    openModal('modal-menu');
  });
  $('btn-daily').addEventListener('click', () => {
    sfx.click();
    location.href = './#/gorevler';
  });
  $('btn-tournament').addEventListener('click', () => {
    sfx.click();
    toast('Turnuvalar yakında — şimdilik görevlerden puan kazanabilirsiniz.', 2800);
  });
  $('btn-info').addEventListener('click', () => {
    sfx.click();
    renderPaytable();
    openModal('modal-paytable');
  });

  $('btn-auto').addEventListener('click', () => {
    sfx.click();
    if (state.autoRunning) {
      stopAuto();
      toast('Otomatik oyun durduruldu');
      return;
    }
    openModal('modal-auto');
  });
  // Büyük dokunma hedefleri: üç sütunluk ızgara, sonuncusu tam genişlik
  $('auto-options').innerHTML =
    [10, 25, 50, 100, 250]
      .map((n) => `<button class="auto-opt" data-auto="${n}"><b>${n}</b><i>DÖNÜŞ</i></button>`)
      .join('') +
    '<button class="auto-opt" data-auto="inf"><b>∞</b><i>DURDURANA KADAR</i></button>';
  $('auto-options').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-auto]');
    if (!btn) return;
    startAuto(btn.dataset.auto === 'inf' ? Infinity : Number(btn.dataset.auto));
  });
  $('auto-stop').addEventListener('click', () => {
    stopAuto();
    closeModal('modal-auto');
  });

  const soundIcon = (on) =>
    on
      ? '<path d="M4 9h4l5-4v14l-5-4H4zM16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>'
      : '<path d="M4 9h4l5-4v14l-5-4H4zM17 9l5 6M22 9l-5 6" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>';
  $('icon-sound').innerHTML = soundIcon(sfx.enabled);
  $('btn-sound').addEventListener('click', () => {
    $('icon-sound').innerHTML = soundIcon(sfx.toggle());
  });

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
    const logoImg = document.querySelector('.brand-logo');
    if (logoImg && !logoImg.complete) logoImg.addEventListener('load', layout, { once: true });
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
