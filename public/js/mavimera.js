import { api } from './api.js';
import { sfx } from './audio.js';
import { MeraReels, REELS, ROWS } from './mavimera-reels.js';
import { buildSprite, symbolMarkup } from './mavimera-symbols.js';

/**
 * MAVİ MERA arayüzü.
 *
 * Sunucu bir turu tek istekte çözer; buradaki iş yalnızca onu canlandırmak:
 *   çevirme → hat kazançları → balıkçı toplaması → bedava dönüş / seviye.
 * Hiçbir sonuç burada üretilmez.
 */

const state = {
  config: null,
  player: null,
  bet: 40,
  free: { remaining: 0, total: 0, win: 0, fishermen: 0 },
  jackpots: [],
  busy: false,
  turbo: localStorage.getItem('mavimera-turbo') === 'on',
  auto: 0,
  autoRunning: false,
  winCycle: null,
  freeRound: null,
  level: { level: 1, multiplier: 1, fishermen: 0 }
};

let reels = null;
let backend = api;

/* ================== Yardımcılar ================== */
const $ = (id) => document.getElementById(id);
let currency = { symbol: '₺', locale: 'tr-TR' };
const fmt = (n) =>
  Number(n).toLocaleString(currency.locale, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const money = (n) => `${currency.symbol}${fmt(n)}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** Turbo modda bekleme sürelerini kısaltır ama sıfırlamaz. */
const pace = (ms, floor = 0.35) => (state.turbo ? Math.round(ms * floor) : ms);

function toast(message, ms = 2200) {
  const el = $('toast');
  el.textContent = message;
  el.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (el.hidden = true), ms);
}

const openModal = (id) => ($(id).hidden = false);
const closeModal = (id) => ($(id).hidden = true);

/** Bir ekranı, oyuncu dokununcaya (ya da süre dolana) kadar açık tutar. */
function waitForDismiss(screenId, buttonId, timeout = 9000) {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (buttonId) $(buttonId).removeEventListener('click', finish);
      $(screenId).removeEventListener('click', finish);
      resolve();
    };
    const timer = setTimeout(finish, timeout);
    if (buttonId) $(buttonId).addEventListener('click', finish);
    $(screenId).addEventListener('click', finish);
  });
}

/* ================== Yerleşim ================== */
function layout() {
  const app = document.querySelector('.app');
  const topbar = document.querySelector('.topbar');
  const controls = document.querySelector('.controls');
  const logo = document.querySelector('.brand');
  const gap = 3;
  const framePad = 10;

  const reserved =
    topbar.offsetHeight + controls.offsetHeight + (logo?.offsetHeight || 0) + 40 + 44;
  // Yan ahşap raylar "20 HAT" rozetlerini taşır; genişlikten onların payını düş.
  const rail = app.clientWidth >= 400 ? 28 : 12;
  const width = Math.min(app.clientWidth, 620) - 12 - rail * 2;
  const cellW = Math.max(40, (width - framePad * 2 - gap * (REELS - 1)) / REELS);
  const heightCap = (app.clientHeight - reserved - framePad * 2) / ROWS;
  // Maketteki kutucuklar neredeyse kare; sembol görselleri de kare kırpıldı.
  const cellH = Math.max(40, Math.min(cellW * 0.96, heightCap));

  const root = document.documentElement.style;
  root.setProperty('--cell-w', `${Math.floor(cellW)}px`);
  root.setProperty('--cell-h', `${Math.floor(cellH)}px`);
}

/* ================== Üst bilgi ================== */
function renderJackpots(jackpots) {
  state.jackpots = jackpots;
  $('jackpots').innerHTML = jackpots
    .map(
      (j) => `<div class="jp${j.progressive ? ' progressive' : ''}" data-jp="${j.id}"
        style="--tier:${j.color}">
        <span class="jp-name">${j.name}</span>
        <span class="jp-amount">${fmt(Math.floor(j.amount))}</span>
      </div>`
    )
    .join('');
}

function renderPlayer(player) {
  state.player = player;
  $('balance').textContent = money(player.balance);
  $('bet').textContent = money(state.bet);

  const inFree = state.free.remaining > 0;
  $('fs-badge').hidden = !inFree;
  $('fs-count').textContent = state.free.remaining;
  $('fs-mult').textContent = `x${state.level.multiplier}`;
  $('fs-fisher').textContent = state.level.fishermen % (state.config?.collect.perLevel || 4);
  document.body.classList.toggle('free-mode', inFree);

  $('spin-label').textContent = inFree ? 'BEDAVA' : 'ÇEVİR';
  $('bet-up').disabled = inFree;
  $('bet-down').disabled = inFree;
}

/* ================== Kazanç gösterimi ================== */
const lineColor = (i) => `hsl(${190 + ((i * 23) % 140)} 92% 62%)`;

function drawLine(positions, color) {
  const cx = (reel) => reel * (100 / REELS) + 100 / (REELS * 2);
  const cy = (row) => row * (100 / ROWS) + 100 / (ROWS * 2);
  const d = positions.map(([reel, row], i) => `${i ? 'L' : 'M'}${cx(reel)} ${cy(row)}`).join(' ');
  $('lines').innerHTML = `<path d="${d}" stroke="${color}" style="color:${color}"/>`;
}

const clearLines = () => ($('lines').innerHTML = '');

function countUp(el, to, duration = 700) {
  const start = performance.now();
  let coinTick = 0;
  function frame(now) {
    const t = Math.min(1, (now - start) / duration);
    const value = to * (1 - (1 - t) ** 3);
    el.textContent = fmt(Math.round(value));
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

function floatWin(amount) {
  const el = document.createElement('div');
  el.className = 'float-win';
  el.textContent = `+${fmt(amount)}`;
  $('fx').appendChild(el);
  setTimeout(() => el.remove(), 1200);
}

function stopWinCycle() {
  clearInterval(state.winCycle);
  state.winCycle = null;
  clearLines();
  reels.clearEffects();
  $('win-info').textContent = '';
}

const symbolName = (id) => state.config.symbols[id]?.name || id;

function startWinCycle(wins) {
  stopWinCycle();
  if (!wins.length) return;
  let i = 0;
  const show = () => {
    const win = wins[i % wins.length];
    reels.highlight(win.positions);
    drawLine(win.positions, lineColor(win.line));
    $('win-info').textContent =
      `Hat ${win.line + 1} · ${win.count}x ${symbolName(win.symbol)} · ${fmt(win.amount)}`;
    i += 1;
  };
  show();
  state.winCycle = setInterval(show, 1400);
}

async function celebrate(amount, bet) {
  const ratio = bet > 0 ? amount / bet : 0;
  let title = null;
  if (ratio >= 200) title = 'EFSANEVİ AV';
  else if (ratio >= 80) title = 'MUHTEŞEM AV';
  else if (ratio >= 30) title = 'BÜYÜK AV';
  if (!title) return;

  const duration = state.turbo ? 1400 : 2600;
  sfx.bigWin();
  $('celebration-title').textContent = title;
  $('celebration-amount').textContent = '0';
  $('celebration').hidden = false;
  countUp($('celebration-amount'), amount, Math.min(1600, duration - 300));
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

/* ================== Para balığı etiketi ================== */

/** Hücrenin üstündeki tutar. Jackpot balıkları merdivendeki tutarı taşır. */
function moneyLabel(cell) {
  if (cell.jackpot) {
    const live = state.jackpots.find((j) => j.id === cell.jackpot);
    return live ? money(Math.floor(live.amount)) : cell.jackpot;
  }
  return money(cell.value * state.bet);
}

/* ================== Balıkçı toplaması ================== */

/** Hücrenin çerçeve içindeki merkezini yüzde olarak verir. */
function cellCenter(reel, row) {
  const frame = document.querySelector('.frame').getBoundingClientRect();
  const el = reels.cellAt(reel, row);
  if (!el) return null;
  const box = el.getBoundingClientRect();
  return {
    x: ((box.left + box.width / 2 - frame.left) / frame.width) * 100,
    y: ((box.top + box.height / 2 - frame.top) / frame.height) * 100
  };
}

/** Balıkçıdan balığa uzanan olta ipini çizer. */
function castLine(from, to) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'fishline');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('preserveAspectRatio', 'none');
  const midX = (from.x + to.x) / 2;
  const midY = Math.min(from.y, to.y) - 14;
  svg.innerHTML = `<path d="M${from.x} ${from.y} Q${midX} ${midY} ${to.x} ${to.y}"/>`;
  $('fx').appendChild(svg);
  setTimeout(() => svg.remove(), 700);
}

function splash(at) {
  const el = document.createElement('div');
  el.className = 'splash';
  el.style.left = `${at.x}%`;
  el.style.top = `${at.y}%`;
  $('fx').appendChild(el);
  setTimeout(() => el.remove(), 640);
}

/**
 * Toplama sunumu: balıkçılar sallanır, her balığa olta atılır, tutarlar
 * tek tek eklenir ve toplam ortada bir pankartta belirir.
 */
async function playCollect(round) {
  const collect = round.collect;
  const fishers = round.fishers;
  if (!collect || !fishers.length) return;

  stopWinCycle();
  $('win-info').textContent =
    collect.multiplier > 1
      ? `BALIKÇI TOPLUYOR · x${collect.multiplier}`
      : 'BALIKÇI TOPLUYOR';

  for (const [reel, row] of fishers) {
    reels.cellAt(reel, row)?.classList.add('casting');
  }
  sfx.cast();
  await sleep(pace(420));

  const source = cellCenter(fishers[0][0], fishers[0][1]);
  let running = 0;
  const step = pace(320, 0.4);

  for (const cell of collect.cells) {
    const el = reels.cellAt(cell.reel, cell.row);
    const target = cellCenter(cell.reel, cell.row);
    if (source && target) {
      castLine(source, target);
      splash(target);
    }
    el?.classList.add('collected');
    sfx.reelIn(cell.jackpot ? 3 : 1);
    running += cell.award;
    countUp($('win-value'), round.lineWin + round.scatter.pay + running, 260);
    await sleep(step);
  }

  // Toplam pankartı
  const banner = document.createElement('div');
  banner.className = 'collect-banner';
  banner.innerHTML =
    `<b>${money(collect.total)}</b>` +
    `<i>${collect.fishers > 1 ? `${collect.fishers} BALIKÇI · ` : ''}` +
    `${collect.cells.length} BALIK${collect.multiplier > 1 ? ` · x${collect.multiplier}` : ''}</i>`;
  $('fx').appendChild(banner);
  sfx.bigCatch();
  await sleep(pace(1400, 0.45));
  banner.remove();

  for (const [reel, row] of fishers) {
    reels.cellAt(reel, row)?.classList.remove('casting');
  }
  $('win-info').textContent = '';

  collect.jackpotWins.forEach((j) => {
    const el = document.querySelector(`.jp[data-jp="${j.level}"]`);
    el?.classList.add('hit');
    setTimeout(() => el?.classList.remove('hit'), 3000);
  });
}

/* ================== Bedava dönüş ekranları ================== */
function launchScatters(count = 3) {
  const host = $('fs-scatters');
  const origins = [[-38, -30], [38, -30], [0, 34], [-42, 22], [42, 22]];
  host.innerHTML = Array.from({ length: Math.min(count, origins.length) }, (_, i) => {
    const [x, y] = origins[i];
    return `<div class="fly" style="
      left:calc(50% - 37px); top:calc(45% - 37px);
      --fx:${x}vw; --fy:${y}vh;
      animation-delay:${i * 0.11}s">${symbolMarkup('DUMEN')}</div>`;
  }).join('');
  setTimeout(() => (host.innerHTML = ''), 1600);
}

async function showFreeSpinsIntro(count, scatterCount) {
  sfx.bigCatch();
  launchScatters(Math.max(3, scatterCount || 3));
  $('fs-intro').querySelector('.fs-ribbon').textContent = `${scatterCount} DÜMEN`;
  $('fs-intro-count').textContent = '0';
  $('fs-intro').hidden = false;
  setTimeout(() => countUp($('fs-intro-count'), count, 900), 650);
  await waitForDismiss('fs-intro', 'fs-intro-start', 9000);
  $('fs-intro').hidden = true;
  sfx.click();
}

/** Seviye merdiveni: hangi basamakta olduğumuzu gösterir. */
function renderLadder(level) {
  const levels = state.config.collect.levels;
  $('level-ladder').innerHTML = levels
    .map((m, i) => {
      const cls = i + 1 === level ? 'now' : i + 1 < level ? 'done' : '';
      return `<span class="${cls}">x${m}</span>`;
    })
    .join('');
}

async function showLevelUp(levelInfo) {
  sfx.levelUp();
  $('level-up').querySelector('.fs-ribbon').textContent =
    `${state.config.collect.perLevel} BALIKÇI`;
  renderLadder(levelInfo.after);
  $('level-mult').textContent = `x${levelInfo.multiplier}`;
  $('level-extra').textContent = levelInfo.extraSpins;
  $('level-up').hidden = false;
  await waitForDismiss('level-up', null, state.turbo ? 1400 : 2600);
  $('level-up').hidden = true;
}

async function showFreeSpinsOutro(summary) {
  sfx.bigCatch();
  $('fs-outro-total').textContent = '0';
  $('fs-outro-spins').textContent = fmt(summary.spins);
  $('fs-outro-fishers').textContent = fmt(summary.fishermen);
  $('fs-outro-mult').textContent = `x${summary.multiplier}`;
  $('fs-outro').hidden = false;
  countUp($('fs-outro-total'), summary.total, 1500);
  await waitForDismiss('fs-outro', 'fs-outro-collect');
  $('fs-outro').hidden = true;
  sfx.click();
}

/* ================== Tur döngüsü ================== */
async function doSpin() {
  if (state.busy) return;
  const isFree = state.free.remaining > 0;
  if (!isFree && state.player.balance < state.bet) {
    toast('Yetersiz bakiye.');
    stopAuto();
    return;
  }

  state.busy = true;
  stopWinCycle();
  $('spin').disabled = true;
  $('win-value').textContent = '0';

  let data;
  try {
    data = await backend.mera.spin(state.bet);
  } catch (err) {
    toast(err.message);
    stopAuto();
    state.busy = false;
    $('spin').disabled = false;
    return;
  }

  const { round, player, jackpots } = data;
  renderJackpots(jackpots);

  // 1) Çevirme — para balıkları tutarlarıyla birlikte gelir
  await reels.spinTo(round.grid, {
    turbo: state.turbo,
    money: round.money,
    moneyLabel
  });

  // Yeni kazanılan bedava dönüşler sayaca HEMEN yazılmaz: giriş ekranı
  // gösterilmeden sayacın belirmesi sürprizi bozuyor.
  const deferFreeCount = round.freeSpinsAwarded > 0 && !round.free;
  if (!deferFreeCount) state.free.remaining = round.freeSpinsLeft;
  state.level = {
    level: round.level.after,
    multiplier: round.level.multiplier,
    fishermen: round.level.fishermenAfter
  };
  renderPlayer(player);

  // 2) Hat ve dümen kazançları
  const symbolWin = round.lineWin + round.scatter.pay;
  if (symbolWin > 0) {
    countUp($('win-value'), symbolWin, state.turbo ? 350 : 700);
    floatWin(symbolWin);
    sfx.win(Math.min(3, Math.floor(symbolWin / state.bet / 5)));
    startWinCycle(round.wins);
    await sleep(pace(700));
  }

  // 3) Balıkçı toplaması
  if (round.collect) {
    await playCollect(round);
  }

  if (round.totalWin > 0) countUp($('win-value'), round.totalWin, 500);

  // 4) Seviye atlama
  if (round.level.ups > 0) {
    await showLevelUp(round.level);
    renderPlayer(state.player);
  }

  // Bedava dönüş turunun kendi kutlaması var; jenerik perde araya girmesin.
  if (round.freeSpinsAwarded === 0) {
    await celebrate(round.totalWin, round.bet);
  }

  // 5) Bedava dönüş muhasebesi
  if (round.free && state.freeRound) {
    state.freeRound.spins += 1;
    state.freeRound.total += round.totalWin;
  }

  if (round.freeSpinsAwarded > 0) {
    state.freeRound = { spins: 0, total: 0, bet: round.bet };
    state.level = { level: 1, multiplier: 1, fishermen: 0 };
    await showFreeSpinsIntro(round.freeSpinsAwarded, round.scatter.count);
    state.free.remaining = round.freeSpinsLeft;
    renderPlayer(state.player);
  }

  if (round.freeSpinsSummary) {
    await showFreeSpinsOutro(round.freeSpinsSummary);
    state.freeRound = null;
    state.level = { level: 1, multiplier: 1, fishermen: 0 };
    document.body.classList.remove('free-mode');
    renderPlayer(state.player);
  }

  state.busy = false;
  $('spin').disabled = false;

  if (state.free.remaining > 0) {
    const hadWin = round.totalWin > 0;
    await sleep(state.turbo ? (hadWin ? 900 : 500) : hadWin ? 1700 : 1000);
    return doSpin();
  }

  if (state.autoRunning) {
    if (!isFree) {
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
  const perLine = bet / c.lines;
  const order = ['LUFER', 'KIRMIZI', 'LEVREK', 'CIPURA', 'FENER', 'MARTI', 'MAKARA', 'YEM', 'KUTU'];

  const rows = order
    .map((id) => {
      const pays = c.paytable[id];
      const list = [5, 4, 3]
        .filter((n) => pays[n])
        .map((n) => `<span>${n}× <b>${fmt(pays[n] * perLine)}</b></span>`)
        .join(' ');
      return `<div class="pt-row">${symbolMarkup(id)}
        <div><div>${c.symbols[id].name}</div><div class="pt-pays">${list}</div></div></div>`;
    })
    .join('');

  const scatterList = [5, 4, 3]
    .filter((n) => c.scatterPay[n])
    .map((n) => `<span>${n}× <b>${fmt(c.scatterPay[n] * bet)}</b></span>`)
    .join(' ');

  const cash = c.moneyValues.filter((v) => v.value !== undefined);
  const jack = c.moneyValues.filter((v) => v.jackpot);
  const moneyGrid =
    cash
      .map((v) => `<div class="mv">${symbolMarkup('PARA')}<div>${money(v.value * bet)}</div></div>`)
      .join('') +
    jack
      .map((v) => {
        const live = state.jackpots.find((j) => j.id === v.jackpot);
        return `<div class="mv jp">${symbolMarkup(`PARA_${v.jackpot}`)}
          <div>${live ? money(Math.floor(live.amount)) : v.jackpot}</div></div>`;
      })
      .join('');

  const ladder = c.collect.levels
    .map((m, i) => `<span>${i + 1}. seviye <b>x${m}</b></span>`)
    .join(' · ');

  $('paytable-body').innerHTML = `
    <p class="pt-note">Değerler ${money(bet)} toplam bahis içindir (${c.lines} sabit hat).</p>
    ${rows}
    <div class="pt-section">Balıkçı (Wild)</div>
    <div class="pt-row">${symbolMarkup('BALIKCI')}
      <div><div>Balıkçı Teknesi <span class="pt-tag">TOPLAYICI WILD</span></div>
      <div class="pt-pays"><span>Dümen ve para balığı dışındaki tüm sembollerin yerine geçer.
        Temel oyunda 2·3·4. makarada, bedava dönüşte <b>beş makarada</b> görünür.</span></div></div></div>
    <div class="pt-section">Dümen (Scatter)</div>
    <div class="pt-row">${symbolMarkup('DUMEN')}
      <div><div>Dümen <span class="pt-tag">SCATTER</span></div>
      <div class="pt-pays">${scatterList}</div></div></div>
    <p class="pt-note">
      3 dümen <b>${c.freeSpins[3]} bedava dönüş</b> verir
      (4 dümen: ${c.freeSpins[4]}, 5 dümen: ${c.freeSpins[5]}).
    </p>
    <div class="pt-section">Para Balığı</div>
    <div class="mera-moneygrid">${moneyGrid}</div>
    <p class="pt-note">
      Para balığı kendi başına ödemez. Ekranda <b>balıkçı varsa</b>, balıkçı
      ekrandaki <b>tüm</b> para balıklarını toplar. İki balıkçı varsa tutarlar
      <b>iki kez</b> ödenir. Değer, balık ekranda belirdiği anda üstünde yazar.
    </p>
    <div class="pt-section">Seviye Merdiveni</div>
    <p class="pt-note">
      Bedava dönüş boyunca toplanan her <b>${c.collect.perLevel} balıkçı</b> bir üst
      basamağa çıkarır ve tura <b>${c.collect.extraSpins} dönüş</b> ekler:<br>
      ${ladder}<br>
      Merdivenin tepesinden sonra çarpan x${c.collect.levels.at(-1)}'da kalır ama her
      ${c.collect.perLevel} balıkçı yine ${c.collect.extraSpins} dönüş ekler.
    </p>
    <div class="pt-section">Kurallar</div>
    <p class="pt-note">
      • Kazançlar soldan sağa, 1. makaradan itibaren bitişik makaralarda oluşur.<br>
      • Her hattın yalnızca en yüksek kazancı ödenir.<br>
      • Hat kazançları hat bahsi; dümen ve para balığı kazançları toplam bahis ile çarpılır.<br>
      • Jackpot yalnızca o para balığı <b>toplanınca</b> ödenir ve seviye çarpanından etkilenmez.<br>
      • Tur başına kazanç tavanı bahsin <b>${fmt(c.maxWin)}</b> katıdır.
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
    const data = await backend.mera.setBet(next);
    state.bet = data.state.bet;
    renderJackpots(data.jackpots);
    renderPlayer(state.player);
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
    localStorage.setItem('mavimera-turbo', state.turbo ? 'on' : 'off');
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

  const soundIcon = (on) =>
    on
      ? '<path d="M4 9h4l5-4v14l-5-4H4zM16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>'
      : '<path d="M4 9h4l5-4v14l-5-4H4zM17 9l5 6M22 9l-5 6" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>';
  document.getElementById('icon-sound').innerHTML = soundIcon(sfx.enabled);
  $('btn-sound').addEventListener('click', () => {
    document.getElementById('icon-sound').innerHTML = soundIcon(sfx.toggle());
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
    const config = await backend.mera.config();
    state.config = config;
    if (config.currency) currency = config.currency;
    state.bet = config.defaultBet;

    await backend.session('Misafir');
    const st = await backend.mera.state();
    state.bet = st.state.bet;
    state.free = st.state.free;
    renderJackpots(st.jackpots);

    $('loader').hidden = true;
    $('app').hidden = false;

    layout();
    reels = new MeraReels($('reels'));
    renderPlayer(st.player);
    bindEvents();
    layout();
  } catch (err) {
    $('loader').innerHTML = `<p style="color:#ff9d9d;padding:20px;text-align:center">
      Sunucuya bağlanılamadı.<br><span class="mono">${err.message}</span></p>`;
  }
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}

boot();
