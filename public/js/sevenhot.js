import { api } from './api.js';
import { sfx } from './audio.js';
import { HotReels, REELS, ROWS } from './sevenhot-reels.js';
import { buildSprite, symbolMarkup, bellSprite } from './sevenhot-symbols.js';

/**
 * 7 HOT · Çan Zinciri arayüzü.
 *
 * Sunucu bir turu tek istekte baştan sona çözer ve "adım listesi" döner.
 * Buradaki iş yalnızca o adımları sırayla canlandırmaktır:
 *   temel çevirme → scatter tutmalı respin → Çan Zinciri → bedava dönüş.
 * Hiçbir sonuç burada üretilmez.
 */

const state = {
  config: null,
  player: null,
  bet: 40,
  free: { remaining: 0, total: 0, win: 0 },
  jackpots: [],
  busy: false,
  turbo: localStorage.getItem('sevenhot-turbo') === 'on',
  auto: 0,
  autoRunning: false,
  winCycle: null,
  freeRound: null
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
  const logo = document.querySelector('.brand');
  const gap = 3;
  const framePad = 9;

  const reserved =
    topbar.offsetHeight + controls.offsetHeight + (logo?.offsetHeight || 0) + 44 + 44;
  const width = Math.min(app.clientWidth, 620) - 12;
  const cellW = Math.max(36, (width - framePad * 2 - gap * (REELS - 1)) / REELS);
  const heightCap = (app.clientHeight - reserved - framePad * 2) / ROWS;
  const cellH = Math.max(34, Math.min(cellW * 1.5, heightCap));

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
  $('fs-total').textContent = fmt(state.freeRound?.total || 0);
  document.body.classList.toggle('free-mode', inFree);

  $('spin-label').textContent = inFree ? 'BEDAVA' : 'ÇEVİR';
  $('bet-up').disabled = inFree;
  $('bet-down').disabled = inFree;
}

/* ================== Kazanç gösterimi ================== */
const lineColor = (i) => `hsl(${(i * 47) % 360} 95% 62%)`;

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

function startWinCycle(wins) {
  stopWinCycle();
  if (!wins.length) return;
  let i = 0;
  const show = () => {
    const win = wins[i % wins.length];
    reels.highlight(win.positions);
    if (win.type === 'line') {
      drawLine(win.positions, lineColor(win.line));
      $('win-info').textContent =
        `Hat ${win.line + 1} · ${win.count}x ${symbolName(win.symbol)} · ${fmt(win.amount)}`;
    } else {
      clearLines();
      $('win-info').textContent = `${win.count} Scatter · ${fmt(win.amount)}`;
    }
    i += 1;
  };
  show();
  state.winCycle = setInterval(show, 1400);
}

const symbolName = (id) => state.config.symbols[id]?.name || id;

async function celebrate(amount, bet) {
  const ratio = bet > 0 ? amount / bet : 0;
  let title = null;
  if (ratio >= 200) title = 'EFSANEVİ KAZANÇ';
  else if (ratio >= 80) title = 'MUHTEŞEM KAZANÇ';
  else if (ratio >= 30) title = 'BÜYÜK KAZANÇ';
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

/* ================== Scatter tutmalı respin ================== */
async function playScatterRespins(respin) {
  $('win-info').textContent = 'SCATTER TUTULDU · yeniden dönüyor';
  for (const step of respin.steps) {
    reels.markHeld(step.held);
    sfx.anticipation(600);
    await sleep(pace(650));
    await reels.spinTo(step.grid, {
      turbo: state.turbo,
      held: step.held,
      bells: step.bells,
      bellLabel
    });
    if (step.gained > 0) {
      sfx.win(2);
      floatWin(0);
      $('win-info').textContent = `+${step.gained} SCATTER · toplam ${step.scatterCount}`;
      await sleep(pace(600));
    }
  }
  reels.clearHeld();
  $('win-info').textContent = '';
}

/* ================== Çan Zinciri ================== */

/** Bir çanın o anki nakit değeri (jackpot çanları merdivendeki tutarı taşır). */
function bellWorth(cell) {
  if (cell.award !== undefined) return cell.award;
  if (cell.jackpot) return state.jackpots.find((j) => j.id === cell.jackpot)?.amount || 0;
  if (cell.boost) return state.config.bellRound.boostCashout * state.bet;
  return (cell.value || 0) * state.bet;
}

/** Bir çanın hücre etiketi. Jackpot çanlarında rozet zaten sembolün üstündedir. */
function bellLabel(cell) {
  if (cell.jackpot && !cell.converted) return '';
  if (cell.boost) return 'BOOST';
  if (cell.award !== undefined) return money(cell.award);
  if (cell.value !== undefined) return money(cell.value * state.bet);
  return '';
}

function emptyBoard() {
  return Array.from({ length: REELS }, () => Array.from({ length: ROWS }, () => null));
}

function updateBellHud({ respins, filled, total }) {
  if (respins !== undefined) {
    $('bell-respins').textContent = respins;
    $('bell-respins').classList.toggle('low', respins <= 1);
  }
  if (filled !== undefined) $('bell-filled').textContent = filled;
  if (total !== undefined) $('bell-total').textContent = fmt(total);
}

/** Giriş ekranı: tetikleyici çanlar merkeze doğru uçar. */
async function showBellIntro(round) {
  sfx.jackpot();
  const host = $('bell-parade');
  const spots = [
    [16, 24], [50, 14], [84, 24], [26, 66], [74, 66], [50, 80]
  ];
  host.innerHTML = round.start
    .slice(0, spots.length)
    .map((cell, i) => {
      const [px, py] = spots[i];
      return `<div style="position:absolute;left:${px}%;top:${py}%;transform:translate(-50%,-50%);
        animation-delay:${i * 0.09}s">${symbolMarkup(bellSprite(cell))}</div>`;
    })
    .join('');

  $('bell-intro').querySelector('.fs-ribbon').textContent = `${round.start.length} ÇAN`;
  $('bell-intro').querySelector('.fs-big').textContent = state.config.bellRound.respins;
  $('bell-intro').hidden = false;
  await waitForDismiss('bell-intro', 'bell-intro-start', state.turbo ? 2600 : 7000);
  $('bell-intro').hidden = true;
  host.innerHTML = '';
  sfx.click();
}

/** Bitiş ekranı: toplam, çarpan ve kazanılan jackpotlar. */
async function showBellOutro(round) {
  sfx.bigWin();
  $('bell-outro-title').textContent = round.full
    ? 'TAM EKRAN!'
    : round.grandAwarded
      ? 'GRAND JACKPOT!'
      : 'ÇAN ZİNCİRİ BİTTİ';
  $('bell-outro-total').textContent = '0';
  $('bell-outro-cells').textContent = round.cellCount;
  $('bell-outro-spins').textContent = round.spins;
  $('bell-outro-mult').textContent = `x${round.multiplier}`;
  $('bell-outro-jackpots').innerHTML = round.jackpotWins
    .map((j) => {
      const color = state.jackpots.find((l) => l.id === j.level)?.color || '#b8892b';
      return `<span style="--tier:${color}">${j.name} · ${fmt(j.amount)}</span>`;
    })
    .join('');
  $('bell-outro').hidden = false;
  countUp($('bell-outro-total'), round.total, 1500);
  await waitForDismiss('bell-outro', 'bell-outro-collect', state.turbo ? 3200 : 9000);
  $('bell-outro').hidden = true;
  sfx.click();
}

/** Turun tamamını canlandırır. */
async function playBellRound(round) {
  document.body.classList.add('bell-mode');
  await showBellIntro(round);

  const board = emptyBoard();
  for (const cell of round.start) board[cell.reel][cell.row] = cell;

  reels.renderBoard(board, bellLabel);
  $('bell-hud').hidden = false;
  let filled = round.start.length;
  let respins = state.config.bellRound.respins;
  let running = round.start.reduce((sum, c) => sum + bellWorth(c), 0);
  updateBellHud({ respins, filled, total: running });
  await sleep(pace(500));

  for (const step of round.steps) {
    await reels.flickerEmpty(pace(520));
    for (const cell of step.landed) {
      board[cell.reel][cell.row] = cell;
      reels.dropBell(cell, bellLabel);
      running += bellWorth(cell);
      sfx.reelStop(2, Boolean(cell.jackpot));
      updateBellHud({ total: running });
      await sleep(pace(200));
    }
    filled = step.filled;
    respins = step.respins;
    updateBellHud({ respins, filled });
    if (step.landed.length) sfx.win(1);
    await sleep(pace(260));
  }

  // ── Tur sonu dönüşümleri ──
  const settled = emptyBoard();
  for (const cell of round.cells) settled[cell.reel][cell.row] = cell;

  const converted = round.cells.filter((c) => c.converted);
  if (converted.length) {
    $('win-info').textContent = round.grandAwarded
      ? 'BOOST ÇANI NAKDE DÖNÜYOR'
      : 'GRAND için 3 çan gerekiyordu · çanlar nakde dönüyor';
    await sleep(pace(700));
  }
  if (round.multiplier > 1) {
    $('win-info').textContent = `TAM EKRAN · TÜM NAKİT ÇANLAR x${round.multiplier}`;
    sfx.bigWin();
    await sleep(pace(900));
  }
  reels.renderBoard(settled, bellLabel);
  updateBellHud({ total: round.total });
  $('win-info').textContent = '';
  await sleep(pace(700));

  await showBellOutro(round);
  $('bell-hud').hidden = true;
  reels.exitBoard();
  document.body.classList.remove('bell-mode');

  round.jackpotWins.forEach((j) => {
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
      animation-delay:${i * 0.11}s">${symbolMarkup('SCATTER')}</div>`;
  }).join('');
  setTimeout(() => (host.innerHTML = ''), 1600);
}

async function showFreeSpinsIntro(count, scatterCount, retrigger) {
  sfx.bigWin();
  launchScatters(Math.max(3, scatterCount || 3));
  $('fs-intro').querySelector('.fs-headline').textContent = retrigger ? 'EK DÖNÜŞ!' : 'KAZANDIN!';
  $('fs-intro').querySelector('.fs-ribbon').textContent = `${scatterCount} SCATTER`;
  $('fs-intro-count').textContent = '0';
  $('fs-intro').hidden = false;
  setTimeout(() => countUp($('fs-intro-count'), count, 900), 650);
  await waitForDismiss('fs-intro', 'fs-intro-start', retrigger ? 3200 : 9000);
  $('fs-intro').hidden = true;
  sfx.click();
}

async function showFreeSpinsOutro(round, bet) {
  sfx.bigWin();
  $('fs-outro-total').textContent = '0';
  $('fs-outro-spins').textContent = fmt(round.spins);
  $('fs-outro-best').textContent = fmt(round.best);
  $('fs-outro-mult').textContent = `x${bet > 0 ? Math.round(round.total / bet) : 0}`;
  $('fs-outro').hidden = false;
  countUp($('fs-outro-total'), round.total, 1500);
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
    data = await backend.hot.spin(state.bet);
  } catch (err) {
    toast(err.message);
    stopAuto();
    state.busy = false;
    $('spin').disabled = false;
    return;
  }

  const { round, player, jackpots } = data;
  renderJackpots(jackpots);

  // 1) Temel çevirme
  await reels.spinTo(round.grid, {
    turbo: state.turbo,
    bells: round.baseBells,
    bellLabel
  });
  // Yeni kazanılan bedava dönüşler sayaca HEMEN yazılmaz: giriş ekranı
  // gösterilmeden sayacın belirmesi sürprizi bozuyordu.
  const deferFreeCount = round.freeSpinsAwarded > 0 && !round.free;
  if (!deferFreeCount) state.free.remaining = round.freeSpinsLeft;
  renderPlayer(player);

  if (round.baseWin > 0) {
    countUp($('win-value'), round.baseWin, state.turbo ? 350 : 700);
    floatWin(round.baseWin);
    sfx.win(Math.min(3, Math.floor(round.baseWin / state.bet / 5)));
    startWinCycle(round.wins);
    await sleep(pace(700));
  }

  // 2) Scatter tutmalı respin
  if (round.scatterRespin) {
    stopWinCycle();
    await playScatterRespins(round.scatterRespin);
    if (round.scatterRespin.finalWin > 0) {
      countUp($('win-value'), round.totalWin, state.turbo ? 350 : 700);
      floatWin(round.scatterRespin.finalWin);
      startWinCycle(round.scatterRespin.finalWins);
      await sleep(pace(700));
    }
  }

  // 3) Çan Zinciri
  if (round.bellRound) {
    stopWinCycle();
    await playBellRound(round.bellRound);
  }

  if (round.totalWin > 0) countUp($('win-value'), round.totalWin, 500);

  // Çan Zinciri ve bedava dönüş turlarının kendi kutlama ekranları var;
  // jenerik "büyük kazanç" perdesi araya girip olayı bulanıklaştırmasın.
  if (round.freeSpinsAwarded === 0 && !round.bellRound) {
    await celebrate(round.totalWin, round.bet);
  }

  // 4) Bedava dönüş muhasebesi
  if (round.free && state.freeRound) {
    state.freeRound.spins += 1;
    state.freeRound.total += round.totalWin;
    if (round.totalWin > state.freeRound.best) state.freeRound.best = round.totalWin;
    $('fs-total').textContent = fmt(state.freeRound.total);
  }

  if (round.freeSpinsAwarded > 0) {
    const retrigger = Boolean(round.free);
    if (!retrigger) state.freeRound = { spins: 0, total: 0, best: 0, bet: round.bet };
    await showFreeSpinsIntro(round.freeSpinsAwarded, round.scatter.count, retrigger);
    state.free.remaining = round.freeSpinsLeft;
    renderPlayer(state.player);
  }

  if (round.freeSpinsSummary !== null && round.freeSpinsSummary !== undefined) {
    const summary = state.freeRound || { spins: 0, best: 0 };
    summary.total = round.freeSpinsSummary;
    await showFreeSpinsOutro(summary, summary.bet || round.bet);
    state.freeRound = null;
    document.body.classList.remove('free-mode');
    $('fs-total').textContent = '0';
  }

  state.busy = false;
  $('spin').disabled = false;

  if (state.free.remaining > 0) {
    const hadWin = round.totalWin > 0;
    await sleep(state.turbo ? (hadWin ? 900 : 500) : hadWin ? 1900 : 1100);
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
  const order = ['SEVEN', 'BAR', 'MELON', 'GRAPE', 'ORANGE', 'PLUM', 'LEMON', 'CHERRY'];

  const rows = order
    .map((id) => {
      const pays = c.paytable[id];
      const list = [5, 4, 3]
        .filter((n) => pays[n])
        .map((n) => `<span>${n}× <b>${fmt(pays[n] * perLine)}</b></span>`)
        .join('');
      return `<div class="pt-row">${symbolMarkup(id)}
        <div><div>${c.symbols[id].name}</div><div class="pt-pays">${list}</div></div></div>`;
    })
    .join('');

  const scatterList = [5, 4, 3]
    .filter((n) => c.scatterPay[n])
    .map((n) => `<span>${n}× <b>${fmt(c.scatterPay[n] * bet)}</b></span>`)
    .join('');

  const tiers = c.jackpotLevels
    .map((l) => {
      const live = state.jackpots.find((j) => j.id === l.id);
      const desc = l.progressive
        ? 'Progresif havuz · her dönüşten katkı alır'
        : `Toplam bahsin ${l.fixed} katı`;
      return `<div class="hot-tier" style="--tier:${l.color}">
        <b>${l.name}</b><span>${desc}</span><em>${money(live?.amount || 0)}</em></div>`;
    })
    .join('');

  const bellFaces = ['BELL', 'BELL_MINI', 'BELL_MINOR', 'BELL_MAJOR', 'BELL_GRAND', 'BELL_BOOST']
    .map((id) => {
      const caption =
        { BELL: 'Nakit', BELL_MINI: 'Mini', BELL_MINOR: 'Minör',
          BELL_MAJOR: 'Majör', BELL_GRAND: 'Grand', BELL_BOOST: 'Boost' }[id] || id;
      return `<figure>${symbolMarkup(id)}<figcaption>${caption}</figcaption></figure>`;
    })
    .join('');

  $('paytable-body').innerHTML = `
    <p class="pt-note">Değerler ${money(bet)} toplam bahis içindir (${c.lines} sabit hat).</p>
    ${rows}
    <div class="pt-section">Wild</div>
    <div class="pt-row">${symbolMarkup('WILD')}
      <div><div>Wild <span class="pt-tag">YALNIZCA 2·3·4. MAKARA</span></div>
      <div class="pt-pays"><span>Scatter ve çan dışındaki tüm sembollerin yerine geçer.</span></div></div></div>
    <div class="pt-section">Scatter</div>
    <div class="pt-row">${symbolMarkup('SCATTER')}
      <div><div>Dolar <span class="pt-tag">SCATTER</span></div>
      <div class="pt-pays">${scatterList}</div></div></div>
    <p class="pt-note">
      Scatter ekranın herhangi bir yerinde öder. Ekranda ${c.scatterRespin.min}–${c.scatterRespin.max}
      scatter varsa <b>scatter'lı makaralar tutulur</b> ve kalanlar yeniden döner; yeni scatter
      gelmezse respin biter. 3 scatter <b>${c.freeSpins[3]} bedava dönüş</b> verir
      (4 scatter: ${c.freeSpins[4]}, 5 scatter: ${c.freeSpins[5]}).
    </p>
    <div class="pt-section">Çan Zinciri</div>
    <div class="hot-bellgrid">${bellFaces}</div>
    <p class="pt-note">
      Ekrana <b>${c.bellRound.trigger} çan</b> düşerse tur başlar. Çanlar kilitlenir,
      kalan hücreler döner. Her yeni çan sayacı <b>${c.bellRound.respins}</b> dönüşe sıfırlar;
      dönüş hakkı biterse tur kapanır ve tüm çanlar ödenir.<br>
      • Ekranı tamamen doldurursanız nakit çanlar <b>x${c.bellRound.fullScreenMultiplier}</b>
      (Boost çanı varsa <b>x${c.bellRound.boostMultiplier}</b>) çarpanla ödenir.<br>
      • <b>Boost</b> çanı tur sonunda toplam bahsin ${c.bellRound.boostCashout} katı nakde döner.<br>
      • <b>Grand</b> çanı sık düşer ama tek başına ödemez: jackpot için ekranda
      <b>${c.bellRound.grandRequired} tane</b> gerekir. Olmazsa her biri toplam bahsin
      ${c.bellRound.grandFallback[0]}–${c.bellRound.grandFallback[1]} katı nakde döner.
    </p>
    <div class="pt-section">Jackpot Merdiveni</div>
    <div class="hot-tiers">${tiers}</div>
    <div class="pt-section">Kurallar</div>
    <p class="pt-note">
      • Kazançlar soldan sağa, 1. makaradan itibaren bitişik makaralarda oluşur.<br>
      • Her hattın yalnızca en yüksek kazancı ödenir.<br>
      • Hat kazançları hat bahsi, scatter ve çan kazançları toplam bahis ile çarpılır.<br>
      • Bedava dönüşlerde çan sembolü bulunmaz.
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
    const data = await backend.hot.setBet(next);
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
    localStorage.setItem('sevenhot-turbo', state.turbo ? 'on' : 'off');
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
    $('demo-badge').hidden = false;
  }

  try {
    const config = await backend.hot.config();
    state.config = config;
    if (config.currency) currency = config.currency;
    state.bet = config.defaultBet;

    await backend.session('Misafir');
    const st = await backend.hot.state();
    state.bet = st.state.bet;
    state.free = st.state.free;
    renderJackpots(st.jackpots);

    $('loader').hidden = true;
    $('app').hidden = false;

    layout();
    reels = new HotReels($('reels'));
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
