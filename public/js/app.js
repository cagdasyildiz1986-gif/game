import { api } from './api.js';
import { sfx } from './audio.js';
import { ReelSet } from './reels.js';
import { buildSprite, symbolMarkup } from './symbols.js';

/* ================== Durum ================== */
const state = {
  config: null,
  player: null,
  jackpots: [],
  busy: false,
  turbo: localStorage.getItem('lucky-reels-turbo') === 'on',
  auto: 0,
  autoRunning: false,
  winCycle: null,
  /** Bedava dönüş oturumu: giriş ekranından bitiş özetine kadar biriken veriler. */
  freeRound: null
};

let reelSet = null;
/** Aktif arka uç: sunucu API'si veya (statik barındırmada) tarayıcı demo motoru. */
let backend = api;

/* ================== Yardimcilar ================== */
const $ = (id) => document.getElementById(id);
let currency = { symbol: '₺', locale: 'tr-TR' };
const fmt = (n) =>
  Number(n).toLocaleString(currency.locale, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const money = (n) => `${currency.symbol}${fmt(n)}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function toast(message, ms = 2200) {
  const el = $('toast');
  el.textContent = message;
  el.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => {
    el.hidden = true;
  }, ms);
}

function openModal(id) {
  $(id).hidden = false;
}
function closeModal(id) {
  $(id).hidden = true;
}

/* ================== Yerlesim ================== */
function layout() {
  const app = document.querySelector('.app');
  const topbar = document.querySelector('.topbar');
  const controls = document.querySelector('.controls');
  const logo = document.querySelector('.logo');
  const gap = 3;
  const framePad = 9; // ic bosluk + kenarlik

  // Yukseklik hesabi, hucre boyutuna bagli olmayan olculerden yapilir;
  // aksi halde stage yuksekligi hucre boyutuna, hucre boyutu stage yuksekligine
  // bagli olur ve dongu olusur.
  const reserved =
    topbar.offsetHeight + controls.offsetHeight + (logo?.offsetHeight || 0) + 44 + 44;
  const width = Math.min(app.clientWidth, 620) - 12;
  const cellW = Math.max(40, (width - framePad * 2 - gap * 4) / 5);
  const heightCap = (app.clientHeight - reserved - framePad * 2) / 3;
  const cellH = Math.max(40, Math.min(cellW * 1.45, heightCap));

  const root = document.documentElement.style;
  root.setProperty('--cell-w', `${Math.floor(cellW)}px`);
  root.setProperty('--cell-h', `${Math.floor(cellH)}px`);
}

/* ================== Ust bilgi ================== */
function renderJackpots(jackpots) {
  state.jackpots = jackpots;
  $('jackpots').innerHTML = jackpots
    .map(
      (j) => `<div class="jp ${j.id.toLowerCase()}" data-jp="${j.id}">
        <span class="jp-name"><span class="jp-suit">${j.suit}</span> ${j.name}</span>
        <span class="jp-amount">${fmt(Math.floor(j.amount))}</span>
      </div>`
    )
    .join('');
}

function renderPlayer(player) {
  state.player = player;
  $('balance').textContent = money(player.balance);
  $('bet').textContent = money(player.bet);

  const fs = player.freeSpins;
  const inFree = fs.remaining > 0;
  $('fs-badge').hidden = !inFree;
  $('fs-count').textContent = fs.remaining;
  $('fs-mult').textContent = fs.multiplier || state.config.freeSpins.multiplier;
  $('fs-total').textContent = fmt(state.freeRound?.total || 0);
  document.body.classList.toggle('free-mode', inFree);

  $('spin-label').textContent = fs.remaining > 0 ? 'BEDAVA' : 'ÇEVİR';
  $('bet-up').disabled = fs.remaining > 0;
  $('bet-down').disabled = fs.remaining > 0;
}

/* ================== Kazanc gosterimi ================== */
function lineColor(index) {
  return `hsl(${(index * 47) % 360} 95% 62%)`;
}

function drawLine(positions, color) {
  const svg = $('lines');
  const cx = (reel) => reel * 20 + 10;
  const cy = (row) => row * (100 / 3) + 100 / 6;
  const d = positions.map(([reel, row], i) => `${i ? 'L' : 'M'}${cx(reel)} ${cy(row)}`).join(' ');
  svg.innerHTML = `<path d="${d}" stroke="${color}" style="color:${color}"/>`;
}

function clearLines() {
  $('lines').innerHTML = '';
}

function countUp(el, to, duration = 700) {
  const from = 0;
  const start = performance.now();
  let coinTick = 0;
  function frame(now) {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - (1 - t) ** 3;
    const value = from + (to - from) * eased;
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
  const fx = $('fx');
  const el = document.createElement('div');
  el.className = 'float-win';
  el.textContent = `+${fmt(amount)}`;
  fx.appendChild(el);
  setTimeout(() => el.remove(), 1200);
}

function stopWinCycle() {
  clearInterval(state.winCycle);
  state.winCycle = null;
  clearLines();
  reelSet.clearEffects();
  $('win-info').textContent = '';
}

function startWinCycle(wins) {
  stopWinCycle();
  if (!wins.length) return;
  let i = 0;
  const show = () => {
    const win = wins[i % wins.length];
    reelSet.highlight(win.positions);
    if (win.type === 'line') {
      drawLine(win.positions, lineColor(win.line));
      $('win-info').textContent = `Hat ${win.line + 1} · ${win.count}x ${symbolName(win.symbol)} · ${fmt(win.amount)}`;
    } else {
      clearLines();
      $('win-info').textContent = `${win.count} Scatter · ${fmt(win.amount)}`;
    }
    i += 1;
  };
  show();
  state.winCycle = setInterval(show, 1400);
}

function symbolName(id) {
  return state.config.symbols[id]?.name || id;
}

async function celebrate(amount, bet, { free = false } = {}) {
  const ratio = amount / bet;
  let title = null;
  if (ratio >= 100) title = 'EFSANEVİ KAZANÇ';
  else if (ratio >= 50) title = 'MUHTEŞEM KAZANÇ';
  else if (ratio >= 20) title = 'BÜYÜK KAZANÇ';
  // Bedava dönüşlerde çarpan nedeniyle eşik sık aşılır; tur özeti zaten kutlanır.
  if (free && ratio < 50) title = null;
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

/* ================== Bedava dönüş ekranları ================== */

/** Merkeze uçan scatter sembolleriyle giriş animasyonu. */
function launchScatters(count = 3) {
  const host = $('fs-scatters');
  const origins = [
    [-38, -30], [38, -30], [0, 34], [-42, 22], [42, 22]
  ];
  host.innerHTML = Array.from({ length: Math.min(count, origins.length) }, (_, i) => {
    const [x, y] = origins[i];
    return `<div class="fly" style="
      left:calc(50% - 37px); top:calc(45% - 37px);
      --fx:${x}vw; --fy:${y}vh;
      animation-delay:${i * 0.11}s">${symbolMarkup(state.config.scatter)}</div>`;
  }).join('');
  setTimeout(() => (host.innerHTML = ''), 1600);
}

/**
 * Bedava dönüş GİRİŞ ekranı.
 * Otomatik kapanmaz - oyuncu BAŞLA'ya basana kadar bekler ki tura girdiği
 * kesinlikle fark edilsin. (Uzun süre dokunulmazsa kendiliğinden başlar.)
 */
async function showFreeSpinsIntro(count, scatterCount, retrigger = false) {
  sfx.bigWin();
  launchScatters(Math.max(3, scatterCount || 3));

  $('fs-intro').querySelector('.fs-headline').textContent = retrigger
    ? 'EK DÖNÜŞ!'
    : 'KAZANDIN!';
  $('fs-intro').querySelector('.fs-ribbon').textContent = retrigger
    ? `${scatterCount} SCATTER`
    : 'SCATTER';
  $('fs-intro-count').textContent = '0';
  $('fs-intro-mult').textContent = `x${state.config.freeSpins.multiplier}`;
  $('fs-intro').hidden = false;

  // Sayıyı yuvarlayarak göster
  setTimeout(() => countUp($('fs-intro-count'), count, 900), 650);

  await new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      $('fs-intro-start').removeEventListener('click', finish);
      $('fs-intro').removeEventListener('click', finish);
      resolve();
    };
    const timer = setTimeout(finish, retrigger ? 3200 : 9000);
    $('fs-intro-start').addEventListener('click', finish);
    $('fs-intro').addEventListener('click', finish);
  });

  $('fs-intro').hidden = true;
  sfx.click();
}

/** Bedava dönüş BİTİŞ özeti. */
async function showFreeSpinsOutro(round, bet) {
  sfx.bigWin();
  $('fs-outro-total').textContent = '0';
  $('fs-outro-spins').textContent = fmt(round.spins);
  $('fs-outro-best').textContent = fmt(round.best);
  $('fs-outro-mult').textContent = `x${bet > 0 ? Math.round(round.total / bet) : 0}`;
  $('fs-outro').hidden = false;
  countUp($('fs-outro-total'), round.total, 1500);

  await new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      $('fs-outro-collect').removeEventListener('click', finish);
      $('fs-outro').removeEventListener('click', finish);
      resolve();
    };
    const timer = setTimeout(finish, 9000);
    $('fs-outro-collect').addEventListener('click', finish);
    $('fs-outro').addEventListener('click', finish);
  });

  $('fs-outro').hidden = true;
  sfx.click();
}

/* ================== Jackpot bonusu ================== */
/**
 * 4x4 kart tahtasi. Oyuncu kart secer; secilen kareye SUNUCUNUN belirledigi
 * siradaki kart gelir. Yani secim sunumsaldir, sonucu degistiremez -
 * bu sayede istemci jackpot seviyesini manipule edemez.
 */
async function showJackpot(jackpotWin) {
  sfx.jackpot();
  const container = $('jackpot-cards');
  const gridSize = jackpotWin.gridSize || 16;
  const draws = jackpotWin.draws;

  container.innerHTML = Array.from(
    { length: gridSize },
    (_, i) => `<button class="card back" data-slot="${i}" aria-label="Kart aç"></button>`
  ).join('');
  $('jackpot-result').hidden = true;
  $('jackpot-close').hidden = true;
  $('jackpot-hint').hidden = false;
  $('jackpot-tally').innerHTML = '';
  openModal('modal-jackpot');

  const counts = {};
  let revealed = 0;

  const updateTally = () => {
    $('jackpot-tally').innerHTML = state.config.jackpotLevels
      .map((level) => {
        const n = counts[level.id] || 0;
        return `<span class="tally${n ? ' has' : ''}">${level.suit}
          <b>${n}</b><i>/3</i></span>`;
      })
      .join('');
  };
  updateTally();

  await new Promise((resolve) => {
    container.addEventListener('click', function onPick(event) {
      const card = event.target.closest('.card.back');
      if (!card || revealed >= draws.length) return;

      const draw = draws[revealed];
      revealed += 1;
      counts[draw.id] = (counts[draw.id] || 0) + 1;

      const red = draw.suit === '♥' || draw.suit === '♦';
      card.classList.remove('back');
      card.classList.add('flip');
      if (red) card.classList.add('red');
      card.textContent = draw.suit;
      card.disabled = true;
      sfx.click();
      updateTally();

      if (counts[draw.id] >= 3) {
        container.removeEventListener('click', onPick);
        container.querySelectorAll('.card.back').forEach((c) => (c.disabled = true));
        // Kazandiran turun kartlarini vurgula
        [...container.children].forEach((c) => {
          if (c.textContent === draw.suit) c.classList.add('winner');
        });
        setTimeout(resolve, 500);
      }
    });
  });

  sfx.bigWin();
  $('jackpot-hint').hidden = true;
  const result = $('jackpot-result');
  result.innerHTML = `${jackpotWin.suit} ${jackpotWin.name} JACKPOT<br>
    <span style="font-size:30px">${fmt(jackpotWin.amount)}</span>`;
  result.hidden = false;
  $('jackpot-close').hidden = false;

  const el = document.querySelector(`.jp[data-jp="${jackpotWin.levelId}"]`);
  el?.classList.add('hit');
  setTimeout(() => el?.classList.remove('hit'), 3000);

  await new Promise((resolve) => {
    $('jackpot-close').onclick = () => {
      closeModal('modal-jackpot');
      resolve();
    };
  });
}

/* ================== Spin dongusu ================== */
async function doSpin() {
  if (state.busy) return;
  const isFree = state.player.freeSpins.remaining > 0;
  if (!isFree && state.player.balance < state.player.bet) {
    toast('Yetersiz bakiye. Menüden oturumu sıfırlayabilirsiniz.');
    stopAuto();
    return;
  }

  state.busy = true;
  stopWinCycle();
  $('spin').disabled = true;
  $('win-value').textContent = '0';

  let data;
  try {
    data = await backend.spin(state.player.bet);
  } catch (err) {
    toast(err.message);
    stopAuto();
    state.busy = false;
    $('spin').disabled = false;
    return;
  }

  const { spin, player, jackpots } = data;
  renderJackpots(jackpots);

  await reelSet.spinTo(spin.grid, {
    turbo: state.turbo,
    scatterSymbol: state.config.scatter
  });

  renderPlayer(player);

  if (spin.totalWin > 0) {
    countUp($('win-value'), spin.totalWin, state.turbo ? 350 : 700);
    floatWin(spin.totalWin);
    sfx.win(Math.min(3, Math.floor(spin.totalWin / state.player.bet / 5)));
    startWinCycle(spin.wins);
  }

  if (spin.jackpot) {
    await showJackpot(spin.jackpot);
  }

  // Bedava dönüş kazanıldıysa jenerik "büyük kazanç" ekranı GÖSTERİLMEZ:
  // turun kendi giriş ekranı zaten kutlamadır ve araya girmesi olayı
  // anlaşılmaz kılıyordu. Scatter ödemesi tur özetine dahildir.
  if (spin.freeSpinsAwarded === 0) {
    await celebrate(spin.totalWin, state.player.bet, { free: spin.free });
  }

  // --- Bedava dönüş turu kaydı ---
  if (spin.free && state.freeRound) {
    state.freeRound.spins += 1;
    state.freeRound.total += spin.totalWin;
    if (spin.totalWin > state.freeRound.best) state.freeRound.best = spin.totalWin;
    $('fs-total').textContent = fmt(state.freeRound.total);
  }

  if (spin.freeSpinsAwarded > 0) {
    const retrigger = Boolean(spin.free);
    if (!retrigger) {
      state.freeRound = { spins: 0, total: 0, best: 0, bet: state.player.bet };
    }
    await showFreeSpinsIntro(spin.freeSpinsAwarded, spin.scatterCount, retrigger);
    renderPlayer(state.player);
  }

  if (spin.freeSpinsSummary !== null && spin.freeSpinsSummary !== undefined) {
    const round = state.freeRound || { spins: 0, total: spin.freeSpinsSummary, best: 0 };
    round.total = spin.freeSpinsSummary;
    await showFreeSpinsOutro(round, round.bet || state.player.bet);
    state.freeRound = null;
    document.body.classList.remove('free-mode');
    $('fs-total').textContent = '0';
  }

  state.busy = false;
  $('spin').disabled = false;

  // Bedava dönüşler otomatik oynanır. Tempo bilerek yavaştır: kazanç
  // vurgusunun ve çarpanın görülmesi için turbo modda bile alt sınır vardır.
  if (state.player.freeSpins.remaining > 0) {
    const hadWin = spin.totalWin > 0;
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

/* ================== Odeme tablosu ================== */
function renderPaytable() {
  const { paytable, scatterPay, symbols, wild, scatter, freeSpins, paylines, jackpotLevels } =
    state.config;
  const bet = state.player.bet;
  const perLine = bet / paylines.length;

  const order = ['STAR', 'SEVEN', 'MELON', 'GRAPE', 'BELL', 'PLUM', 'ORANGE', 'LEMON', 'CHERRY'];

  const rows = order
    .map((id) => {
      const pays = paytable[id];
      const tag =
        id === wild ? '<span class="pt-tag">WILD</span>' : '';
      const list = [5, 4, 3]
        .filter((n) => pays[n])
        .map((n) => `<span>${n}× <b>${fmt(pays[n] * perLine)}</b></span>`)
        .join('');
      return `<div class="pt-row">${symbolMarkup(id)}
        <div><div>${symbols[id].name} ${tag}</div><div class="pt-pays">${list}</div></div></div>`;
    })
    .join('');

  const scatterList = [5, 4, 3]
    .filter((n) => scatterPay[n])
    .map((n) => `<span>${n}× <b>${fmt(scatterPay[n] * bet)}</b></span>`)
    .join('');

  $('paytable-body').innerHTML = `
    <p class="pt-note">Değerler ${fmt(bet)} toplam bahis içindir (20 sabit hat).</p>
    ${rows}
    <div class="pt-section">Scatter</div>
    <div class="pt-row">${symbolMarkup(scatter)}
      <div><div>${symbols[scatter].name} <span class="pt-tag">SCATTER</span></div>
      <div class="pt-pays">${scatterList}</div></div></div>
    <p class="pt-note">
      Scatter ekranın herhangi bir yerinde öder ve 3 veya daha fazlası
      <b>${freeSpins.award[3]} bedava dönüş</b> kazandırır (4 scatter: ${freeSpins.award[4]},
      5 scatter: ${freeSpins.award[5]}). Bedava dönüşlerde tüm kazançlar
      <b>x${freeSpins.multiplier}</b> çarpanlıdır ve yeni scatterlar
      +${freeSpins.retrigger} dönüş ekler.
    </p>
    <div class="pt-section">Kurallar</div>
    <p class="pt-note">
      • Kazançlar soldan sağa, 1. makaradan itibaren bitişik makaralarda oluşur.<br>
      • Yıldız (WILD) scatter dışındaki tüm sembollerin yerine geçer ve kendisi de öder.<br>
      • Her hattın yalnızca en yüksek kazancı ödenir.<br>
      • Hat kazançları hat bahsi, scatter kazançları toplam bahis ile çarpılır.
    </p>
    <div class="pt-section">Jackpot Cards</div>
    <p class="pt-note">
      Herhangi bir ücretli dönüşün ardından rastgele tetiklenebilir. Aynı türden 3 kart
      açan oyuncu o seviyenin progresif jackpot'unu kazanır:
      ${jackpotLevels.map((l) => `${l.suit} ${l.name}`).join(' · ')}.
    </p>
    <div class="pt-section">Ödeme Hatları</div>
    <p class="pt-note">${paylines.length} sabit hat.</p>
  `;
}

/* ================== Adalet & istatistik ================== */
function renderFair() {
  const fair = state.player.fair;
  $('fair-body').innerHTML = `
    <p class="pt-note">
      Her dönüşün sonucu <b>sunucu tohumu</b>, <b>istemci tohumu</b> ve artan bir
      <b>nonce</b> değerinden HMAC-SHA256 ile üretilir. Sunucu tohumunun SHA-256 özeti
      önceden gösterilir; tohumu açıkladığınızda geçmiş dönüşlerin değiştirilmediğini
      doğrulayabilirsiniz.
    </p>
    <div class="kv"><span>Sunucu tohumu özeti</span><span></span></div>
    <p class="mono">${fair.serverSeedHash}</p>
    <div class="kv"><span>İstemci tohumu</span><span class="mono">${fair.clientSeed}</span></div>
    <div class="kv"><span>Nonce</span><span>${fair.nonce}</span></div>
    <button class="wide-btn" id="fair-rotate">🔄 Tohumu açıkla ve yenile</button>
    <div id="fair-reveal"></div>
  `;
  $('fair-rotate').onclick = async () => {
    try {
      const data = await backend.rotateSeed();
      $('fair-reveal').innerHTML = `
        <div class="pt-section">Açıklanan sunucu tohumu</div>
        <p class="mono">${data.revealedServerSeed}</p>
        <p class="pt-note">Bu tohumun SHA-256 özeti yukarıda gösterilen değerle aynı olmalıdır.</p>
        <p class="mono">${data.revealedHash}</p>`;
      const st = await backend.state();
      renderPlayer(st.player);
    } catch (err) {
      toast(err.message);
    }
  };
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
    <p class="pt-note">Teorik RTP %${(state.config.rtp ?? 95.8).toFixed(1).replace('.', ',')};
      kısa oturumlarda sapma normaldir.</p>
  `;
}

/* ================== Bahis ================== */
async function changeBet(direction) {
  const levels = state.config.betLevels;
  const index = levels.indexOf(state.player.bet);
  const next = levels[Math.min(levels.length - 1, Math.max(0, index + direction))];
  if (next === state.player.bet) return;
  sfx.click();
  try {
    const data = await backend.setBet(next);
    renderPlayer(data.player);
  } catch (err) {
    toast(err.message);
  }
}

/* ================== Baslatma ================== */
function bindEvents() {
  $('spin').addEventListener('click', () => {
    sfx.unlock();
    if (state.autoRunning) {
      stopAuto();
      return;
    }
    doSpin();
  });

  $('bet-up').addEventListener('click', () => changeBet(1));
  $('bet-down').addEventListener('click', () => changeBet(-1));

  $('btn-turbo').addEventListener('click', () => {
    state.turbo = !state.turbo;
    localStorage.setItem('lucky-reels-turbo', state.turbo ? 'on' : 'off');
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

  $('auto-options').innerHTML = [10, 25, 50, 100]
    .map((n) => `<button class="chip" data-auto="${n}">${n}</button>`)
    .join('') + '<button class="chip" data-auto="inf">∞</button>';
  $('auto-options').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-auto]');
    if (!btn) return;
    const raw = btn.dataset.auto;
    startAuto(raw === 'inf' ? Infinity : Number(raw));
  });
  $('auto-stop').addEventListener('click', () => {
    stopAuto();
    closeModal('modal-auto');
  });

  $('btn-sound').addEventListener('click', () => {
    const on = sfx.toggle();
    $('btn-sound').textContent = on ? '🔊' : '🔇';
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
  $('menu-fair').addEventListener('click', () => {
    renderFair();
    closeModal('modal-menu');
    openModal('modal-fair');
  });
  $('menu-stats').addEventListener('click', () => {
    renderStats();
    closeModal('modal-menu');
    openModal('modal-stats');
  });
  $('menu-reset').addEventListener('click', async () => {
    stopAuto();
    backend.clearToken();
    const data = await backend.session('Misafir');
    renderPlayer(data.player);
    renderJackpots(data.jackpots || (await backend.jackpots()).jackpots);
    closeModal('modal-menu');
    toast('Yeni oturum başlatıldı');
  });

  document.querySelectorAll('[data-close]').forEach((btn) => {
    btn.addEventListener('click', () => {
      btn.closest('.modal').hidden = true;
    });
  });
  document.querySelectorAll('.modal').forEach((modal) => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal && !modal.classList.contains('jackpot-modal')) modal.hidden = true;
    });
  });

  window.addEventListener('resize', layout);
  window.addEventListener('orientationchange', () => setTimeout(layout, 200));

  // Boslukla cevirme (masaustu test icin)
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      if (!state.busy) doSpin();
    }
  });
}

async function boot() {
  document.getElementById('sprite-host').innerHTML = buildSprite();

  // Statik barındırmada (GitHub Pages) sunucu yoktur; oyun motoru tarayıcıda çalışır.
  if (window.SLOT_DEMO) {
    const { demoApi } = await import('./demo.js');
    backend = demoApi;
    document.getElementById('demo-badge').hidden = false;
    // Doğrulanabilir adalet sunucu tohumu gerektirir; demo modunda yoktur.
    document.getElementById('menu-fair').hidden = true;
  }

  try {
    // Oturum ucu artik jackpot havuzlarini icermiyor; ayri uctan alinir.
    const [config, session, pools] = await Promise.all([
      backend.config(),
      backend.session('Misafir'),
      backend.jackpots()
    ]);
    state.config = config;
    if (config.currency) currency = config.currency;
    renderJackpots(session.jackpots || pools.jackpots);

    $('loader').hidden = true;
    $('app').hidden = false;

    layout();
    reelSet = new ReelSet($('reels'));
    renderPlayer(session.player);
    bindEvents();
    layout();
  } catch (err) {
    $('loader').innerHTML = `<p style="color:#ff9d9d;padding:20px;text-align:center">
      Sunucuya bağlanılamadı.<br><span class="mono">${err.message}</span></p>`;
  }
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

boot();
