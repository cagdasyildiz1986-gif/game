/**
 * Canli masa arayuzu (Texas Hold'em ve Blackjack).
 *
 * Sunucu ile WebSocket uzerinden konusur. Tum oyun kararlari sunucudadir;
 * bu dosya yalnizca durumu cizer ve oyuncunun hamlesini iletir.
 */
import { api } from './api.js';
import { icon } from './icons.js';

const state = {
  player: null,
  ws: null,
  connected: false,
  view: 'lobby',
  lobbyGame: 'holdem',
  tables: [],
  table: null,
  gameState: null,
  legal: [],
  chat: [],
  settings: null,
  raiseAmount: 0,
  showChat: false,
  pendingBet: 0
};

const $ = (id) => document.getElementById(id);
const SUIT = { s: '♠', h: '♥', d: '♦', c: '♣' };
const RANK = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
let currency = { symbol: '₺', locale: 'tr-TR' };

const fmt = (n) =>
  `${currency.symbol}${Number(n || 0).toLocaleString(currency.locale, { maximumFractionDigits: 0 })}`;
const num = (n) => Number(n || 0).toLocaleString(currency.locale, { maximumFractionDigits: 0 });

function toast(text, gold = false) {
  $('toast-host').innerHTML = `<div class="toast${gold ? ' gold' : ''}">${escapeHtml(text)}</div>`;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => ($('toast-host').innerHTML = ''), 2800);
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

/* ═══════ Kart ═══════ */

function cardHtml(card, small = false) {
  if (!card) return `<div class="pc ${small ? 'sm ' : ''}back"></div>`;
  const red = card.s === 'h' || card.s === 'd';
  const rank = RANK[card.r] || String(card.r);
  return `<div class="pc ${small ? 'sm ' : ''}${red ? 'red' : ''} deal">
    <span class="r">${rank}</span><span class="s">${SUIT[card.s]}</span>
  </div>`;
}

/* ═══════ Baglanti ═══════ */

function connect() {
  const base = (window.SLOT_API_BASE || '').replace(/^http/, 'ws').replace(/\/$/, '');
  const url = base
    ? `${base}/live`
    : `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/live`;

  const ws = new WebSocket(url);
  state.ws = ws;

  ws.onopen = () => ws.send(JSON.stringify({ type: 'auth', token: api.token }));

  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    handle(message);
  };

  ws.onclose = () => {
    state.connected = false;
    $('top-sub').textContent = 'Bağlantı koptu · yeniden bağlanılıyor…';
    setTimeout(connect, 2500);
  };

  ws.onerror = () => {
    $('top-sub').textContent = 'Bağlantı hatası';
  };
}

function send(message) {
  if (state.ws?.readyState === WebSocket.OPEN) state.ws.send(JSON.stringify(message));
}

function handle(message) {
  switch (message.type) {
    case 'auth-ok':
      state.connected = true;
      state.player = message.player;
      state.tables = message.tables;
      $('top-sub').textContent = 'Bağlandı';
      render();
      break;
    case 'lobby':
      state.tables = message.tables;
      if (state.view === 'lobby') render();
      break;
    case 'created':
      // Masayi acan otomatik oturur
      openBuyIn(message.table);
      break;
    case 'joined':
      state.view = 'table';
      break;
    case 'state':
      state.table = message.table;
      state.gameState = message.state;
      state.legal = message.legal || [];
      state.chat = message.chat || [];
      if (message.balance !== null && state.player) state.player.balance = message.balance;
      state.view = 'table';
      render();
      break;
    case 'left':
      if (message.error) toast(message.error);
      else toast(`${fmt(message.chips)} bakiyene aktarıldı`, true);
      if (message.player) state.player = message.player;
      state.table = null;
      state.gameState = null;
      state.view = 'lobby';
      send({ type: 'lobby', game: state.lobbyGame });
      render();
      break;
    case 'table-closed':
      toast('Masa kapandı');
      state.view = 'lobby';
      state.table = null;
      render();
      break;
    case 'privacy':
      toast(message.isPrivate ? `Masa özel yapıldı · kod ${message.code}` : 'Masa herkese açık', true);
      break;
    case 'invited':
      showInvite(message.code);
      break;
    case 'error':
      toast(message.error);
      break;
    default:
      break;
  }
}

/* ═══════ Lobi ═══════ */

function renderLobby() {
  const games = [
    ['holdem', "Texas Hold'em", '🂡'],
    ['blackjack', 'Blackjack', '🃏']
  ];
  const list = state.tables.filter((t) => t.game === state.lobbyGame);

  return `
  <div class="wrap" style="padding-bottom:30px">
    <div class="lobby-tabs">
      ${games
        .map(
          ([id, label]) =>
            `<button class="${state.lobbyGame === id ? 'on' : ''}" data-game="${id}">${label}</button>`
        )
        .join('')}
    </div>

    <button class="btn btn-gold btn-block" id="btn-create" style="margin-bottom:14px">
      ${icon('sparkle')} Masa Aç
    </button>
    <button class="btn btn-block" id="btn-code" style="margin-bottom:16px">
      ${icon('lock')} Kod ile Özel Masaya Katıl
    </button>

    <div class="section-head">
      <h3 class="section-title"><span class="bar"></span>Açık Masalar</h3>
      <span class="section-sub">${list.length} masa</span>
    </div>

    ${
      list.length
        ? list
            .map(
              (t) => `<button class="table-card" data-table="${t.id}">
                <div class="table-icon">${t.game === 'holdem' ? '🂡' : '🃏'}</div>
                <div style="flex:1;min-width:0">
                  <div class="table-name">${escapeHtml(t.name)}
                    ${t.isPrivate ? '<span class="private-badge">ÖZEL</span>' : ''}</div>
                  <div class="table-meta">
                    ${
                      t.game === 'holdem'
                        ? `${num(t.stake.smallBlind)}/${num(t.stake.bigBlind)} · giriş ${num(t.buyIn.min)}+`
                        : `${num(t.stake.min)} - ${num(t.stake.max)} bahis`
                    }
                    ${t.bots ? ` · ${t.bots} 🤖` : ''}
                  </div>
                </div>
                <div class="table-seats"><b>${t.players}/${t.maxSeats}</b>oyuncu</div>
              </button>`
            )
            .join('')
        : `<div class="empty">${icon('cards')}<p>Henüz açık masa yok.<br>İlk masayı sen aç!</p></div>`
    }

    <div class="notice" style="margin-top:18px">
      <b>Nasıl çalışır?</b> Masaya otururken bakiyenden çip alınır, kalktığında
      kalan çipin bakiyene geri döner. Hold'em'de <b>ev oynamaz</b> — oyuncular
      birbirine karşı oynar, sunucu yalnızca dağıtır ve potu paylaştırır.
      Tek başınayken denemek için masaya 🤖 bot ekleyebilirsin.
    </div>
  </div>`;
}

/* ═══════ Masa ═══════ */

const SEAT_POSITIONS = {
  6: [[50, 92], [12, 72], [12, 28], [50, 8], [88, 28], [88, 72]],
  5: [[50, 92], [12, 62], [22, 20], [78, 20], [88, 62]],
  4: [[50, 92], [10, 50], [50, 8], [90, 50]]
};

function seatLayout(count) {
  return SEAT_POSITIONS[count] || SEAT_POSITIONS[6];
}

/**
 * Koltuklari kendimiz altta (0. konum) olacak sekilde dondurur.
 * Gercek poker arayuzlerinde oyuncu her zaman ekranin altindadir.
 */
function orderSeats(seats) {
  const selfIndex = seats.findIndex((s) => s.isSelf);
  if (selfIndex < 0) return seats;
  const n = seats.length;
  return seats.map((_, i) => seats[(selfIndex + i) % n]);
}

function renderTable() {
  const gs = state.gameState;
  const table = state.table;
  if (!gs || !table) return '<div class="empty">Masa yükleniyor…</div>';

  return table.game === 'holdem' ? renderHoldem(gs, table) : renderBlackjack(gs, table);
}

function seatHtml(seat, gs, positions, index, game) {
  const [x, y] = positions[index] || [50, 50];
  const style = `left:${x}%;top:${y}%`;

  if (seat.empty) {
    return `<div class="seat" style="${style}">
      <div class="seat-empty" data-sit="${seat.seat}">Boş<br>koltuk</div>
    </div>`;
  }

  const acting = gs.actingSeat === seat.seat;
  const isButton = game === 'holdem' && gs.buttonSeat === seat.seat;
  const won = gs.lastResult?.winners?.some((w) => w.id === seat.id);

  let cardsHtml = '';
  if (game === 'holdem') {
    if (seat.cards) cardsHtml = seat.cards.map((c) => cardHtml(c, true)).join('');
    else cardsHtml = Array.from({ length: seat.cardCount || 0 }, () => cardHtml(null, true)).join('');
  } else {
    const hand = seat.hands?.[0];
    if (hand) cardsHtml = hand.cards.map((c) => cardHtml(c, true)).join('');
  }

  let timer = '';
  if (acting && gs.actionDeadline) {
    const total = (gs.actionSeconds || 25) * 1000;
    const left = Math.max(0, gs.actionDeadline - Date.now());
    timer = `<div class="seat-timer"><i style="width:${(left / total) * 100}%"></i></div>`;
  } else if (acting && gs.deadline) {
    const left = Math.max(0, gs.deadline - Date.now());
    timer = `<div class="seat-timer"><i style="width:${Math.min(100, (left / 20000) * 100)}%"></i></div>`;
  }

  const bet = game === 'holdem' ? seat.bet : seat.pendingBet || seat.hands?.[0]?.bet;

  return `<div class="seat ${acting ? 'acting' : ''} ${seat.folded ? 'folded' : ''}" style="${style}">
    ${isButton ? '<span class="seat-tag tag-btn">D</span>' : ''}
    ${won ? '<span class="seat-tag tag-win">KAZANDI</span>' : ''}
    ${!isButton && !won && seat.lastAction ? `<span class="seat-tag tag-action">${actionLabel(seat.lastAction)}</span>` : ''}
    <div class="seat-cards">${cardsHtml}</div>
    <div class="seat-box">
      <div class="seat-avatar">${seat.bot ? '🤖' : seat.avatar || '🦊'}</div>
      <div class="seat-name">${escapeHtml(seat.name)}${seat.disconnected ? ' ⚠️' : ''}</div>
      <div class="seat-chips">${num(seat.chips)}</div>
      ${timer}
    </div>
    ${bet ? `<span class="seat-bet">${num(bet)}</span>` : ''}
  </div>`;
}

function actionLabel(action) {
  return { fold: 'FOLD', check: 'CHECK', call: 'CALL', raise: 'RAISE', allin: 'ALL-IN' }[action] || '';
}

function renderHoldem(gs, table) {
  const positions = seatLayout(gs.seats.length);
  const ordered = orderSeats(gs.seats);
  const result = gs.lastResult;
  const acting = gs.seats[gs.actingSeat];

  return `
  <div class="felt">
    <div class="felt-surface">
      <div class="table-center">
        <div class="phase-tag">${phaseLabel(gs.phase)}</div>
        <div class="board">${gs.board.map((c) => cardHtml(c)).join('')}</div>
        ${gs.pot ? `<div class="pot">💰 ${num(gs.pot)}</div>` : ''}
        ${
          gs.phase === 'waiting'
            ? `<div class="center-msg">En az 2 oyuncu gerekiyor${table.bots ? '' : ' · 🤖 bot ekleyebilirsin'}</div>`
            : acting && !acting.isSelf
              ? `<div class="center-msg">Sıra: ${escapeHtml(acting.name)}</div>`
              : acting?.isSelf
                ? '<div class="center-msg">Sıra sende</div>'
                : ''
        }
      </div>
      ${ordered.map((s, i) => seatHtml(s, gs, positions, i, 'holdem')).join('')}
      ${
        result && gs.phase === 'payout'
          ? `<div class="result-banner">
              <div class="result-title">${escapeHtml(result.reason)}</div>
              ${result.winners
                .map(
                  (w) =>
                    `<div class="result-line">${escapeHtml(w.name)} · ${num(w.amount)}${w.hand ? ` · ${w.hand}` : ''}</div>`
                )
                .join('')}
            </div>`
          : ''
      }
    </div>
    <button class="chat-toggle" id="btn-chat">${icon('info')}</button>
  </div>

  ${renderHoldemActions(gs)}`;
}

function phaseLabel(phase) {
  return {
    waiting: 'Bekleniyor',
    preflop: 'Preflop',
    flop: 'Flop',
    turn: 'Turn',
    river: 'River',
    payout: 'Dağıtım',
    betting: 'Bahis',
    dealing: 'Dağıtım',
    insurance: 'Sigorta',
    playing: 'Oyun',
    dealer: 'Krupiye'
  }[phase] || phase;
}

function renderHoldemActions(gs) {
  const me = gs.seats.find((s) => s.isSelf);
  const legal = state.legal;

  if (!me) {
    return `<div class="actions">
      <div class="action-row">
        <button class="action-btn action-raise" id="btn-sit">Masaya Otur</button>
        <button class="action-btn" id="btn-leave-table">Çık</button>
      </div>
    </div>`;
  }

  if (!legal.length) {
    return `<div class="actions">
      <div class="action-row">
        <button class="action-btn" id="btn-addbot">🤖 Bot Ekle</button>
        <button class="action-btn" id="btn-invite">${icon('user')} Davet</button>
        <button class="action-btn" id="btn-leave-table">Kalk</button>
      </div>
    </div>`;
  }

  const toCall = Math.max(0, gs.currentBet - me.bet);
  const maxRaise = me.chips + me.bet;
  const minRaise = Math.min(maxRaise, gs.currentBet + gs.minRaise);
  if (!state.raiseAmount || state.raiseAmount < minRaise || state.raiseAmount > maxRaise) {
    state.raiseAmount = minRaise;
  }

  return `<div class="actions">
    <div class="raise-panel" id="raise-panel">
      <div class="raise-head">
        <span style="font-size:11px;color:var(--muted)">Yükselt</span>
        <span class="raise-value" id="raise-value">${num(state.raiseAmount)}</span>
      </div>
      <input type="range" id="raise-range" min="${minRaise}" max="${maxRaise}" step="${gs.bigBlind}"
        value="${state.raiseAmount}">
      <div class="raise-quick">
        <button data-raise-pct="0.5">½ Pot</button>
        <button data-raise-pct="0.75">¾ Pot</button>
        <button data-raise-pct="1">Pot</button>
        <button data-raise-pct="max">All-in</button>
      </div>
      <button class="btn btn-gold btn-block" id="btn-raise-confirm" style="margin-top:8px">
        ${num(state.raiseAmount)} Yükselt
      </button>
    </div>

    <div class="action-row">
      <button class="action-btn action-fold" data-act="fold" ${legal.includes('fold') ? '' : 'disabled'}>
        Fold
      </button>
      ${
        legal.includes('check')
          ? '<button class="action-btn action-call" data-act="check">Check</button>'
          : `<button class="action-btn action-call" data-act="call" ${legal.includes('call') ? '' : 'disabled'}>
              Call<small>${num(toCall)}</small>
            </button>`
      }
      <button class="action-btn action-raise" id="btn-raise-open" ${legal.includes('raise') ? '' : 'disabled'}>
        Yükselt
      </button>
    </div>
  </div>`;
}

function renderBlackjack(gs, table) {
  const positions = seatLayout(gs.seats.length);
  const ordered = orderSeats(gs.seats);
  const me = gs.seats.find((s) => s.isSelf);

  return `
  <div class="felt">
    <div class="felt-surface">
      <div class="dealer-box">
        <div class="dealer-label">KRUPİYE</div>
        <div class="dealer-cards">${gs.dealer.cards.map((c) => cardHtml(c)).join('') || cardHtml(null)}</div>
        ${gs.dealer.total !== null ? `<div class="dealer-total">${gs.dealer.total}</div>` : ''}
      </div>
      <div class="table-center" style="top:52%">
        <div class="phase-tag">${phaseLabel(gs.phase)}</div>
        ${
          gs.phase === 'betting'
            ? `<div class="center-msg">Bahisleri yapın · ${Math.max(0, Math.ceil((gs.deadline - Date.now()) / 1000))}s</div>`
            : ''
        }
        ${
          gs.lastResult && gs.phase === 'payout'
            ? `<div class="center-msg">Krupiye ${gs.lastResult.dealerTotal}${gs.lastResult.dealerBust ? ' (battı)' : ''}</div>`
            : ''
        }
      </div>
      ${ordered.map((s, i) => seatHtml(s, gs, positions, i, 'blackjack')).join('')}
    </div>
    <button class="chat-toggle" id="btn-chat">${icon('info')}</button>
  </div>

  ${renderBlackjackActions(gs, me)}`;
}

function renderBlackjackActions(gs, me) {
  if (!me) {
    return `<div class="actions"><div class="action-row">
      <button class="action-btn action-raise" id="btn-sit">Masaya Otur</button>
      <button class="action-btn" id="btn-leave-table">Çık</button>
    </div></div>`;
  }

  if (gs.phase === 'betting') {
    const chips = [gs.minBet, gs.minBet * 5, gs.minBet * 10, gs.minBet * 25, gs.minBet * 50].filter(
      (c) => c <= gs.maxBet
    );
    return `<div class="actions">
      <div class="bet-chips">
        ${chips.map((c) => `<button class="bet-chip" data-bet="${c}">${num(c)}</button>`).join('')}
      </div>
      <div class="action-row">
        <button class="action-btn" data-bet-clear="1">Temizle</button>
        <button class="action-btn action-raise" data-bet-repeat="1">Tekrarla</button>
        <button class="action-btn" id="btn-leave-table">Kalk</button>
      </div>
    </div>`;
  }

  if (gs.phase === 'insurance' && me.hands?.length) {
    return `<div class="actions"><div class="action-row">
      <button class="action-btn action-call" data-act="insurance-yes">Sigorta Al</button>
      <button class="action-btn" data-act="insurance-no">Hayır</button>
    </div></div>`;
  }

  const legal = state.legal;
  if (!legal.length) {
    return `<div class="actions"><div class="action-row">
      <button class="action-btn" id="btn-addbot">🤖 Bot Ekle</button>
      <button class="action-btn" id="btn-invite">${icon('user')} Davet</button>
      <button class="action-btn" id="btn-leave-table">Kalk</button>
    </div></div>`;
  }

  return `<div class="actions"><div class="action-row">
    <button class="action-btn action-call" data-act="hit" ${legal.includes('hit') ? '' : 'disabled'}>Kart</button>
    <button class="action-btn action-fold" data-act="stand" ${legal.includes('stand') ? '' : 'disabled'}>Dur</button>
    <button class="action-btn" data-act="double" ${legal.includes('double') ? '' : 'disabled'}>x2</button>
    <button class="action-btn" data-act="split" ${legal.includes('split') ? '' : 'disabled'}>Böl</button>
  </div></div>`;
}

/* ═══════ Sayfa ═══════ */

function render() {
  const body = $('live-body');
  if (state.view === 'lobby') {
    $('top-title').textContent = 'Canlı Masalar';
    $('top-sub').textContent = state.connected ? 'Bağlandı' : 'Bağlanıyor…';
    body.innerHTML = renderLobby();
  } else {
    $('top-title').textContent = state.table?.name || 'Masa';
    $('top-sub').textContent =
      state.table?.game === 'holdem'
        ? `${num(state.table.stake.smallBlind)}/${num(state.table.stake.bigBlind)} · el #${state.gameState?.handNumber || 0}`
        : `${num(state.table?.stake.min)} - ${num(state.table?.stake.max)}`;
    body.innerHTML = renderTable();
  }
  $('top-balance').textContent = fmt(state.player?.balance || 0);
  if (state.showChat) renderChat();
}

function renderChat() {
  $('sheet-host').innerHTML = `
  <div class="chat-panel" id="chat-panel">
    <div style="display:flex;align-items:center;margin-bottom:8px">
      <b style="font-size:14px">Masa Sohbeti</b>
      <button class="icon-btn" id="chat-close" style="margin-left:auto">${icon('close')}</button>
    </div>
    <div class="chat-log" id="chat-log">
      ${state.chat
        .map((c) =>
          c.system
            ? `<div class="chat-line system">${escapeHtml(c.text)}</div>`
            : `<div class="chat-line"><b>${escapeHtml(c.name)}:</b> ${escapeHtml(c.text)}</div>`
        )
        .join('')}
    </div>
    <div class="chat-input">
      <input id="chat-text" placeholder="Mesaj yaz…" maxlength="160">
      <button class="btn btn-gold" id="chat-send">Gönder</button>
    </div>
  </div>`;
  const log = $('chat-log');
  if (log) log.scrollTop = log.scrollHeight;
}

/* ═══════ Diyaloglar ═══════ */

function openCreate() {
  const settings = state.settings;
  const isHoldem = state.lobbyGame === 'holdem';
  const stakes = isHoldem ? settings.tables.stakes : settings.tables.blackjackLimits;

  $('sheet-host').innerHTML = `
  <div class="sheet" id="create-sheet">
    <div class="sheet-card">
      <div class="sheet-grip"></div>
      <h2 class="sheet-title">Masa Aç</h2>
      <p class="sheet-text">${isHoldem ? "Texas Hold'em · ev oynamaz" : 'Blackjack · krupiye sabit kurallarla oynar'}</p>

      <div class="field">
        <label for="c-name">Masa adı</label>
        <input id="c-name" placeholder="örn: Dostlar Masası" maxlength="28">
      </div>

      <div class="field">
        <label>Limit</label>
        <div class="filters" id="c-stakes">
          ${stakes
            .map(
              (s, i) =>
                `<button class="chip${i === 0 ? ' on' : ''}" data-stake="${s.id}">
                  ${escapeHtml(s.name)} · ${isHoldem ? `${num(s.smallBlind)}/${num(s.bigBlind)}` : `${num(s.min)}-${num(s.max)}`}
                </button>`
            )
            .join('')}
        </div>
      </div>

      <div class="field">
        <label>Bot ekle (tek başına denemek için)</label>
        <div class="filters" id="c-bots">
          ${[0, 1, 2, 3]
            .map((n) => `<button class="chip${n === 1 ? ' on' : ''}" data-bots="${n}">${n === 0 ? 'Yok' : `${n} 🤖`}</button>`)
            .join('')}
        </div>
      </div>

      <label style="display:flex;align-items:center;gap:9px;margin:6px 0 14px;font-size:13px">
        <input type="checkbox" id="c-private" style="width:18px;height:18px;accent-color:var(--gold)">
        Özel masa (yalnızca kod ile girilir)
      </label>

      <button class="btn btn-gold btn-block" id="c-create">Masayı Aç</button>
      <button class="btn btn-ghost btn-block" id="c-cancel" style="margin-top:8px;border:none;color:var(--dim)">Vazgeç</button>
    </div>
  </div>`;

  let stakeId = stakes[0].id;
  let botCount = 1;

  $('c-stakes').onclick = (e) => {
    const btn = e.target.closest('[data-stake]');
    if (!btn) return;
    stakeId = btn.dataset.stake;
    $('c-stakes').querySelectorAll('.chip').forEach((c) => c.classList.toggle('on', c === btn));
  };
  $('c-bots').onclick = (e) => {
    const btn = e.target.closest('[data-bots]');
    if (!btn) return;
    botCount = Number(btn.dataset.bots);
    $('c-bots').querySelectorAll('.chip').forEach((c) => c.classList.toggle('on', c === btn));
  };
  $('c-cancel').onclick = closeSheet;
  $('c-create').onclick = () => {
    send({
      type: 'create',
      game: state.lobbyGame,
      name: $('c-name').value,
      stakeId,
      botCount,
      isPrivate: $('c-private').checked
    });
    closeSheet();
  };
}

function openBuyIn(table) {
  const limits = table.buyIn;
  const balance = state.player?.balance || 0;
  const max = Math.min(limits.max, Math.floor(balance));
  const start = Math.min(max, Math.max(limits.min, Math.floor(limits.min * 2)));

  $('sheet-host').innerHTML = `
  <div class="sheet" id="buyin-sheet">
    <div class="sheet-card">
      <div class="sheet-grip"></div>
      <h2 class="sheet-title">Masaya Otur</h2>
      <p class="sheet-text">
        ${escapeHtml(table.name)} · bakiyenden çip alınır, kalktığında kalan çipin geri döner.
      </p>
      ${
        balance < limits.min
          ? `<div class="form-error">Bu masaya oturmak için en az ${fmt(limits.min)} gerekiyor.
              Bakiyen: ${fmt(balance)} · Görevlerden kredi kazanabilirsin.</div>
             <button class="btn btn-block" id="bi-cancel">Kapat</button>`
          : `<div class="raise-head">
              <span style="font-size:11px;color:var(--muted)">Giriş miktarı</span>
              <span class="raise-value" id="bi-value">${num(start)}</span>
            </div>
            <input type="range" id="bi-range" min="${limits.min}" max="${max}"
              step="${Math.max(1, Math.floor(limits.min / 10))}" value="${start}" style="width:100%">
            <div class="raise-quick" style="margin:10px 0 14px">
              <button data-bi="min">Min</button>
              <button data-bi="half">Yarı</button>
              <button data-bi="max">Maks</button>
            </div>
            <button class="btn btn-gold btn-block" id="bi-join">Otur</button>
            <button class="btn btn-ghost btn-block" id="bi-cancel" style="margin-top:8px;border:none;color:var(--dim)">Vazgeç</button>`
      }
    </div>
  </div>`;

  $('bi-cancel').onclick = closeSheet;
  const range = $('bi-range');
  if (!range) return;

  const update = () => ($('bi-value').textContent = num(range.value));
  range.oninput = update;
  document.querySelectorAll('[data-bi]').forEach((btn) => {
    btn.onclick = () => {
      const mode = btn.dataset.bi;
      range.value = mode === 'min' ? limits.min : mode === 'max' ? max : Math.floor((limits.min + max) / 2);
      update();
    };
  });
  $('bi-join').onclick = () => {
    send({ type: 'join', tableId: table.id, buyIn: Number(range.value), code: table.code });
    closeSheet();
  };
}

function openCodeJoin() {
  $('sheet-host').innerHTML = `
  <div class="sheet" id="code-sheet">
    <div class="sheet-card">
      <div class="sheet-grip"></div>
      <h2 class="sheet-title">Özel Masaya Katıl</h2>
      <p class="sheet-text">Arkadaşının paylaştığı 6 haneli masa kodunu gir.</p>
      <div class="field">
        <input id="code-input" placeholder="ÖRN: K7P2QM" maxlength="6"
          style="text-align:center;letter-spacing:6px;font-size:20px;text-transform:uppercase">
      </div>
      <button class="btn btn-gold btn-block" id="code-join">Katıl</button>
      <button class="btn btn-ghost btn-block" id="code-cancel" style="margin-top:8px;border:none;color:var(--dim)">Vazgeç</button>
    </div>
  </div>`;
  $('code-cancel').onclick = closeSheet;
  $('code-join').onclick = () => {
    const code = $('code-input').value.trim().toUpperCase();
    if (code.length !== 6) return toast('Kod 6 haneli olmalı');
    // Once masayi bul, sonra buy-in ekrani
    const found = state.tables.find((t) => t.code === code);
    if (found) {
      closeSheet();
      openBuyIn(found);
    } else {
      // Sunucu tarafinda ara
      send({ type: 'join', code, buyIn: 0 });
      toast('Masa aranıyor…');
    }
  };
}

function showInvite(code) {
  const link = `${location.origin}${location.pathname}?kod=${code}`;
  $('sheet-host').innerHTML = `
  <div class="sheet" id="invite-sheet">
    <div class="sheet-card">
      <div class="sheet-grip"></div>
      <h2 class="sheet-title">Arkadaş Davet Et</h2>
      <p class="sheet-text">Bu kodu veya bağlantıyı paylaş; masaya doğrudan gelsinler.</p>
      <div class="invite-code">${code}</div>
      <button class="btn btn-gold btn-block" id="inv-copy">Bağlantıyı Kopyala</button>
      <button class="btn btn-ghost btn-block" id="inv-close" style="margin-top:8px;border:none;color:var(--dim)">Kapat</button>
    </div>
  </div>`;
  $('inv-close').onclick = closeSheet;
  $('inv-copy').onclick = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast('Bağlantı kopyalandı', true);
    } catch {
      toast(link);
    }
  };
}

function closeSheet() {
  $('sheet-host').innerHTML = '';
  state.showChat = false;
}

/* ═══════ Olaylar ═══════ */

function bindEvents() {
  document.addEventListener('click', (e) => {
    const gameTab = e.target.closest('[data-game]');
    if (gameTab) {
      state.lobbyGame = gameTab.dataset.game;
      send({ type: 'lobby', game: state.lobbyGame });
      render();
      return;
    }

    const tableCard = e.target.closest('[data-table]');
    if (tableCard) {
      const table = state.tables.find((t) => t.id === tableCard.dataset.table);
      if (table) openBuyIn(table);
      return;
    }

    const act = e.target.closest('[data-act]');
    if (act && !act.disabled) {
      send({ type: 'action', action: act.dataset.act });
      const panel = $('raise-panel');
      if (panel) panel.classList.remove('on');
      return;
    }

    const betChip = e.target.closest('[data-bet]');
    if (betChip) {
      state.pendingBet += Number(betChip.dataset.bet);
      send({ type: 'bet', amount: state.pendingBet });
      return;
    }
    if (e.target.closest('[data-bet-clear]')) {
      state.pendingBet = 0;
      send({ type: 'bet', clear: true });
      return;
    }
    if (e.target.closest('[data-bet-repeat]')) {
      const last = state.gameState?.seats.find((s) => s.isSelf)?.hands?.[0]?.bet;
      state.pendingBet = last || state.gameState?.minBet || 0;
      send({ type: 'bet', amount: state.pendingBet });
      return;
    }

    const sit = e.target.closest('[data-sit]');
    if (sit && state.table) {
      openBuyIn(state.table);
      return;
    }

    const raisePct = e.target.closest('[data-raise-pct]');
    if (raisePct) {
      const gs = state.gameState;
      const me = gs.seats.find((s) => s.isSelf);
      const max = me.chips + me.bet;
      const value =
        raisePct.dataset.raisePct === 'max'
          ? max
          : Math.min(max, gs.currentBet + Math.floor(gs.pot * Number(raisePct.dataset.raisePct)));
      state.raiseAmount = Math.max(Math.min(max, gs.currentBet + gs.minRaise), value);
      const range = $('raise-range');
      if (range) range.value = state.raiseAmount;
      $('raise-value').textContent = num(state.raiseAmount);
      $('btn-raise-confirm').textContent = `${num(state.raiseAmount)} Yükselt`;
      return;
    }

    switch (e.target.closest('button')?.id) {
      case 'btn-create':
        openCreate();
        break;
      case 'btn-code':
        openCodeJoin();
        break;
      case 'btn-leave-table':
        send({ type: 'leave' });
        break;
      case 'btn-addbot':
        send({ type: 'add-bot' });
        break;
      case 'btn-invite':
        send({ type: 'set-private', isPrivate: true });
        setTimeout(() => send({ type: 'invite', userId: state.player.id }), 250);
        break;
      case 'btn-raise-open': {
        const panel = $('raise-panel');
        panel?.classList.toggle('on');
        break;
      }
      case 'btn-raise-confirm':
        send({ type: 'action', action: 'raise', amount: state.raiseAmount });
        $('raise-panel')?.classList.remove('on');
        break;
      case 'btn-chat':
        state.showChat = true;
        renderChat();
        break;
      case 'chat-close':
        closeSheet();
        break;
      case 'chat-send': {
        const input = $('chat-text');
        if (input?.value.trim()) {
          send({ type: 'chat', text: input.value });
          input.value = '';
        }
        break;
      }
      default:
        break;
    }
  });

  document.addEventListener('input', (e) => {
    if (e.target.id === 'raise-range') {
      state.raiseAmount = Number(e.target.value);
      $('raise-value').textContent = num(state.raiseAmount);
      const confirm = $('btn-raise-confirm');
      if (confirm) confirm.textContent = `${num(state.raiseAmount)} Yükselt`;
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.id === 'chat-text') $('chat-send')?.click();
  });

  // Süre çubuklarını akıcı tut
  setInterval(() => {
    if (state.view !== 'table' || !state.gameState) return;
    document.querySelectorAll('.seat.acting .seat-timer i').forEach((bar) => {
      const gs = state.gameState;
      const deadline = gs.actionDeadline || gs.deadline;
      if (!deadline) return;
      const total = (gs.actionSeconds || 20) * 1000;
      const left = Math.max(0, deadline - Date.now());
      bar.style.width = `${Math.min(100, (left / total) * 100)}%`;
    });
  }, 500);
}

/* ═══════ Başlatma ═══════ */

async function boot() {
  bindEvents();

  if (window.SLOT_DEMO) {
    $('live-body').innerHTML = `
      <div class="wrap"><div class="empty" style="padding-top:60px">
        ${icon('cards')}
        <p style="max-width:340px;margin:0 auto;line-height:1.6">
          <b>Canlı masalar sunucu gerektirir.</b><br><br>
          Bu GitHub Pages demosunda sunucu yok, bu yüzden çok oyunculu poker ve
          blackjack masaları çalışmaz. Denemek için projeyi
          <code>npm start</code> ile çalıştırın veya Codespaces'te açın.
        </p>
      </div></div>`;
    $('top-sub').textContent = 'Demo modu · masalar devre dışı';
    return;
  }

  try {
    const session = await api.session();
    state.player = session.player;
    const config = await api.config();
    if (config.currency) currency = config.currency;
    state.settings = await api.publicSettings();
  } catch (err) {
    toast('Bağlantı hatası: ' + err.message);
  }

  connect();

  // Davet bağlantısı ile gelindiyse kodu doldur
  const code = new URLSearchParams(location.search).get('kod');
  if (code) setTimeout(() => { openCodeJoin(); $('code-input').value = code.toUpperCase(); }, 900);
}

boot();
