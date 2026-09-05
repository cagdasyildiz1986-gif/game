import { buildDeck, shuffle } from './deck.js';
import { evaluateShowdown } from './handEval.js';

/**
 * Texas Hold'em (No-Limit) masa motoru.
 *
 * KRUPIYE = SUNUCU. Ev oyuna KATILMAZ; oyuncular birbirine karsi oynar.
 * Sunucu yalnizca dagitir, sirayi yonetir, potu paylastirir.
 *
 * Durum makinesi:
 *   waiting -> preflop -> flop -> turn -> river -> showdown -> payout -> waiting
 *
 * Tum para hareketleri tamsayidir (kurus/kesir yok).
 */

export const STREETS = ['preflop', 'flop', 'turn', 'river'];

export class HoldemTable {
  /**
   * @param {object} options
   * @param {number} options.smallBlind
   * @param {number} options.bigBlind
   * @param {number} options.maxSeats
   * @param {number} options.actionSeconds
   * @param {number} options.rakePercent
   * @param {number} options.rakeCapBigBlinds
   */
  constructor(options) {
    this.smallBlind = options.smallBlind;
    this.bigBlind = options.bigBlind;
    this.maxSeats = options.maxSeats ?? 6;
    this.actionSeconds = options.actionSeconds ?? 25;
    this.rakePercent = options.rakePercent ?? 0;
    this.rakeCapBigBlinds = options.rakeCapBigBlinds ?? 3;

    /** @type {Array<null|object>} koltuklar */
    this.seats = Array.from({ length: this.maxSeats }, () => null);
    this.phase = 'waiting';
    this.buttonSeat = -1;
    this.deck = [];
    this.board = [];
    this.pot = 0;
    this.sidePots = [];
    this.currentBet = 0;
    this.minRaise = this.bigBlind;
    this.actingSeat = -1;
    this.lastAggressorSeat = -1;
    this.handNumber = 0;
    this.handLog = [];
    this.lastResult = null;
    this.actionDeadline = 0;
  }

  /* ═══════════ Koltuk yonetimi ═══════════ */

  seatPlayer({ id, name, avatar, chips, bot = false }, seatIndex = null) {
    if (this.seats.some((s) => s && s.id === id)) return { error: 'Zaten masadasın.' };
    let index = seatIndex;
    if (index === null || index === undefined || this.seats[index]) {
      index = this.seats.findIndex((s) => !s);
    }
    if (index < 0) return { error: 'Masa dolu.' };

    this.seats[index] = {
      id,
      name,
      avatar,
      bot,
      seat: index,
      chips: Math.floor(chips),
      cards: [],
      bet: 0,
      totalBet: 0,
      folded: false,
      allIn: false,
      sittingOut: false,
      // Ele yeni katilanlar bir sonraki eli bekler
      waitingForHand: this.phase !== 'waiting',
      hasActed: false,
      lastAction: null,
      disconnected: false
    };
    return { seat: index };
  }

  removePlayer(id) {
    const index = this.seats.findIndex((s) => s && s.id === id);
    if (index < 0) return { error: 'Masada değilsin.' };
    const player = this.seats[index];
    // Elin ortasindaysa fold say
    if (this.isHandActive() && !player.folded && !player.waitingForHand) {
      player.folded = true;
      player.lastAction = 'fold';
      this.log(`${player.name} masadan ayrıldı (fold)`);
      this.seats[index] = null;
      this.afterAction();
      return { chips: player.chips, left: true };
    }
    this.seats[index] = null;
    return { chips: player.chips, left: true };
  }

  player(id) {
    return this.seats.find((s) => s && s.id === id) || null;
  }

  activePlayers() {
    return this.seats.filter((s) => s && !s.sittingOut && !s.waitingForHand && s.chips > 0);
  }

  inHand() {
    return this.seats.filter((s) => s && !s.folded && !s.waitingForHand && s.dealt);
  }

  isHandActive() {
    return this.phase !== 'waiting' && this.phase !== 'payout';
  }

  /* ═══════════ El akisi ═══════════ */

  canStart() {
    return this.phase === 'waiting' && this.activePlayers().length >= 2;
  }

  startHand() {
    if (!this.canStart()) return { error: 'Yeterli oyuncu yok.' };

    this.handNumber += 1;
    this.handLog = [];
    this.board = [];
    this.pot = 0;
    this.sidePots = [];
    this.currentBet = 0;
    this.minRaise = this.bigBlind;
    this.lastResult = null;
    this.deck = shuffle(buildDeck(1));

    for (const seat of this.seats) {
      if (!seat) continue;
      seat.cards = [];
      seat.bet = 0;
      seat.totalBet = 0;
      seat.folded = false;
      seat.allIn = false;
      seat.hasActed = false;
      seat.lastAction = null;
      seat.dealt = false;
      // Yeterli cipi olan ve oturmayi bekleyen herkes ele girer
      if (!seat.sittingOut && seat.chips > 0) {
        seat.waitingForHand = false;
        seat.dealt = true;
      } else {
        seat.waitingForHand = true;
      }
    }

    const players = this.seats.filter((s) => s && s.dealt);
    if (players.length < 2) {
      this.phase = 'waiting';
      return { error: 'Yeterli oyuncu yok.' };
    }

    // Buton bir sonraki dolu koltuga kayar
    this.buttonSeat = this.nextOccupiedSeat(this.buttonSeat);

    const heads = players.length === 2;
    // Heads-up: buton kucuk blind, digeri buyuk blind
    const sbSeat = heads ? this.buttonSeat : this.nextOccupiedSeat(this.buttonSeat);
    const bbSeat = this.nextOccupiedSeat(sbSeat);

    this.postBlind(sbSeat, this.smallBlind, 'SB');
    this.postBlind(bbSeat, this.bigBlind, 'BB');

    this.currentBet = this.bigBlind;
    this.minRaise = this.bigBlind;
    this.lastAggressorSeat = bbSeat;

    // Her oyuncuya iki kart
    for (let round = 0; round < 2; round += 1) {
      for (const player of players) player.cards.push(this.deck.pop());
    }

    this.phase = 'preflop';
    // Preflop: BB'den sonraki oyuncu baslar
    this.actingSeat = this.nextActiveSeat(bbSeat);
    this.touchDeadline();
    this.log(`El #${this.handNumber} başladı · ${players.length} oyuncu`);
    return { ok: true };
  }

  postBlind(seatIndex, amount, label) {
    const player = this.seats[seatIndex];
    if (!player) return;
    const paid = Math.min(amount, player.chips);
    player.chips -= paid;
    player.bet = paid;
    player.totalBet = paid;
    if (player.chips === 0) player.allIn = true;
    this.log(`${player.name} ${label} ${paid}`);
  }

  nextOccupiedSeat(from) {
    for (let step = 1; step <= this.maxSeats; step += 1) {
      const index = (from + step + this.maxSeats) % this.maxSeats;
      const seat = this.seats[index];
      if (seat && seat.dealt) return index;
    }
    return from;
  }

  /** Sirasi gelebilecek bir sonraki koltuk (fold/all-in olmayan). */
  nextActiveSeat(from) {
    for (let step = 1; step <= this.maxSeats; step += 1) {
      const index = (from + step + this.maxSeats) % this.maxSeats;
      const seat = this.seats[index];
      if (seat && seat.dealt && !seat.folded && !seat.allIn) return index;
    }
    return -1;
  }

  touchDeadline() {
    this.actionDeadline = Date.now() + this.actionSeconds * 1000;
  }

  /* ═══════════ Oyuncu aksiyonu ═══════════ */

  /**
   * @param {string} playerId
   * @param {'fold'|'check'|'call'|'raise'|'allin'} action
   * @param {number} [amount] raise icin TOPLAM bahis
   */
  act(playerId, action, amount = 0) {
    if (!this.isHandActive()) return { error: 'Şu an el oynanmıyor.' };
    const player = this.seats[this.actingSeat];
    if (!player || player.id !== playerId) return { error: 'Sıra sende değil.' };

    const toCall = this.currentBet - player.bet;

    switch (action) {
      case 'fold': {
        player.folded = true;
        player.lastAction = 'fold';
        this.log(`${player.name} fold`);
        break;
      }
      case 'check': {
        if (toCall > 0) return { error: 'Check yapılamaz, önce görmelisin.' };
        player.lastAction = 'check';
        this.log(`${player.name} check`);
        break;
      }
      case 'call': {
        if (toCall <= 0) return { error: 'Görülecek bahis yok.' };
        const paid = Math.min(toCall, player.chips);
        player.chips -= paid;
        player.bet += paid;
        player.totalBet += paid;
        if (player.chips === 0) player.allIn = true;
        player.lastAction = player.allIn ? 'allin' : 'call';
        this.log(`${player.name} ${player.allIn ? 'all-in' : 'call'} ${paid}`);
        break;
      }
      case 'raise':
      case 'allin': {
        const target =
          action === 'allin' ? player.bet + player.chips : Math.floor(Number(amount) || 0);
        if (target <= this.currentBet && action === 'raise') {
          return { error: 'Yükseltme mevcut bahsin üzerinde olmalı.' };
        }
        const need = target - player.bet;
        if (need > player.chips) return { error: 'Yetersiz çip.' };

        const raiseBy = target - this.currentBet;
        const isAllIn = need === player.chips;
        // Tam olmayan all-in yukseltmeleri min-raise'i degistirmez
        if (action === 'raise' && raiseBy < this.minRaise && !isAllIn) {
          return { error: `En az ${this.currentBet + this.minRaise} yükseltmelisin.` };
        }

        player.chips -= need;
        player.bet = target;
        player.totalBet += need;
        if (player.chips === 0) player.allIn = true;

        if (target > this.currentBet) {
          if (raiseBy >= this.minRaise) this.minRaise = raiseBy;
          this.currentBet = target;
          this.lastAggressorSeat = player.seat;
          // Yeni yukseltme: digerlerinin aksiyonu sifirlanir
          for (const seat of this.seats) {
            if (seat && seat !== player && !seat.folded && !seat.allIn) seat.hasActed = false;
          }
        }
        player.lastAction = player.allIn ? 'allin' : 'raise';
        this.log(`${player.name} ${player.allIn ? 'all-in' : 'raise'} ${target}`);
        break;
      }
      default:
        return { error: 'Geçersiz hamle.' };
    }

    player.hasActed = true;
    this.afterAction();
    return { ok: true };
  }

  /** Sure dolunca: gorulecek bahis yoksa check, varsa fold. */
  timeoutAct() {
    const player = this.seats[this.actingSeat];
    if (!player) return;
    const toCall = this.currentBet - player.bet;
    this.act(player.id, toCall > 0 ? 'fold' : 'check');
  }

  afterAction() {
    const alive = this.seats.filter((s) => s && s.dealt && !s.folded);

    // Tek oyuncu kaldi -> pot ona
    if (alive.length <= 1) {
      this.collectBets();
      this.finishHand(alive.map((p) => p.id), 'Diğer oyuncular çekildi');
      return;
    }

    const canAct = this.seats.filter((s) => s && s.dealt && !s.folded && !s.allIn);
    const everyoneActed = canAct.every((s) => s.hasActed && s.bet === this.currentBet);

    if (everyoneActed || canAct.length === 0) {
      this.nextStreet();
      return;
    }

    const next = this.nextActiveSeat(this.actingSeat);
    if (next === -1) {
      this.nextStreet();
      return;
    }
    this.actingSeat = next;
    this.touchDeadline();
  }

  /** Sokak bahislerini pota tasir. */
  collectBets() {
    for (const seat of this.seats) {
      if (!seat) continue;
      this.pot += seat.bet;
      seat.bet = 0;
      seat.hasActed = false;
    }
    this.currentBet = 0;
    this.minRaise = this.bigBlind;
  }

  nextStreet() {
    this.collectBets();

    const canAct = this.seats.filter((s) => s && s.dealt && !s.folded && !s.allIn);

    if (this.phase === 'preflop') {
      this.board.push(this.deck.pop(), this.deck.pop(), this.deck.pop());
      this.phase = 'flop';
      this.log('Flop açıldı');
    } else if (this.phase === 'flop') {
      this.board.push(this.deck.pop());
      this.phase = 'turn';
      this.log('Turn açıldı');
    } else if (this.phase === 'turn') {
      this.board.push(this.deck.pop());
      this.phase = 'river';
      this.log('River açıldı');
    } else {
      this.showdown();
      return;
    }

    // Herkes all-in ise kalan kartlar acilir ve showdown'a gidilir
    if (canAct.length <= 1) {
      this.nextStreet();
      return;
    }

    this.actingSeat = this.nextActiveSeat(this.buttonSeat);
    for (const seat of this.seats) if (seat) seat.hasActed = false;
    this.touchDeadline();
  }

  showdown() {
    const contenders = this.seats.filter((s) => s && s.dealt && !s.folded);
    const evaluated = evaluateShowdown(
      contenders.map((p) => ({ id: p.id, cards: [...p.cards, ...this.board] }))
    );
    this.finishHand(evaluated.winners, 'Showdown', evaluated.results);
  }

  /**
   * Yan potlar dahil pot dagitimi.
   * Her oyuncunun ele koydugu toplam (totalBet) baz alinir.
   */
  distributePots(resultsMap) {
    const contenders = this.seats.filter((s) => s && s.dealt);
    const levels = [...new Set(contenders.map((p) => p.totalBet))].sort((a, b) => a - b);

    const pots = [];
    let previous = 0;
    for (const level of levels) {
      const slice = level - previous;
      if (slice <= 0) continue;
      const contributors = contenders.filter((p) => p.totalBet >= level);
      const amount = slice * contributors.length;

      let eligible = contributors.filter((p) => !p.folded).map((p) => p.id);
      if (!eligible.length) {
        // Bu pota katkida bulunanlarin HEPSI cekildi (ornegin kisa yigin all-in
        // olduktan sonra iki oyuncu yan potu buyutup sonra fold etti).
        // Pot yok olamaz: elde kalan oyuncu(lar)a gider.
        eligible = contenders.filter((p) => !p.folded).map((p) => p.id);
      }
      if (!eligible.length) {
        // Teorik olarak ulasilmaz (birinin kalmasi gerekir); yine de cip
        // yok olmasin diye katki verenlere iade edilir.
        eligible = contributors.map((p) => p.id);
      }
      pots.push({ amount, eligible });
      previous = level;
    }

    // Komisyon (rake) - yalnizca flop goruldu ise
    const rakeCap = this.rakeCapBigBlinds * this.bigBlind;
    let rakeTaken = 0;
    if (this.rakePercent > 0 && this.board.length > 0) {
      const total = pots.reduce((sum, p) => sum + p.amount, 0);
      rakeTaken = Math.min(rakeCap, Math.floor((total * this.rakePercent) / 100));
    }

    const payouts = new Map();
    let rakeLeft = rakeTaken;

    for (const pot of pots) {
      if (!pot.eligible.length) continue;
      let amount = pot.amount;
      if (rakeLeft > 0) {
        const take = Math.min(rakeLeft, amount);
        amount -= take;
        rakeLeft -= take;
      }
      // Bu pota hak kazananlar arasindaki en iyi el(ler)
      let winners = pot.eligible;
      if (resultsMap) {
        let best = null;
        winners = [];
        for (const id of pot.eligible) {
          const hand = resultsMap.get(id);
          if (!hand) continue;
          if (!best || compareScoreArrays(hand.score, best) > 0) {
            best = hand.score;
            winners = [id];
          } else if (compareScoreArrays(hand.score, best) === 0) {
            winners.push(id);
          }
        }
      }
      const share = Math.floor(amount / winners.length);
      let remainder = amount - share * winners.length;
      for (const id of winners) {
        // Artan cip butona en yakin oyuncuya
        const extra = remainder > 0 ? 1 : 0;
        remainder -= extra;
        payouts.set(id, (payouts.get(id) || 0) + share + extra);
      }
    }

    return { payouts, rake: rakeTaken };
  }

  finishHand(winnerIds, reason, resultsMap = null) {
    this.collectBets();
    const { payouts, rake } = this.distributePots(resultsMap);

    const winners = [];
    for (const [id, amount] of payouts) {
      const player = this.seats.find((s) => s && s.id === id);
      if (!player) continue;
      player.chips += amount;
      winners.push({
        id,
        name: player.name,
        amount,
        hand: resultsMap?.get(id)?.name || null,
        cards: resultsMap ? player.cards : null
      });
    }

    this.lastResult = {
      handNumber: this.handNumber,
      reason,
      winners,
      rake,
      board: [...this.board],
      showdown: Boolean(resultsMap),
      hands: resultsMap
        ? [...resultsMap.entries()].map(([id, hand]) => {
            const player = this.seats.find((s) => s && s.id === id);
            return { id, name: player?.name, cards: player?.cards, hand: hand.name };
          })
        : []
    };

    for (const winner of winners) {
      this.log(`${winner.name} ${winner.amount} kazandı${winner.hand ? ` (${winner.hand})` : ''}`);
    }

    this.phase = 'payout';
    this.pot = 0;
    this.actingSeat = -1;
    this.actionDeadline = 0;
  }

  /** El bitiminden sonra temizlik; cipi biten oyuncular oturur bekler. */
  settle() {
    for (const seat of this.seats) {
      if (!seat) continue;
      seat.cards = [];
      seat.bet = 0;
      seat.totalBet = 0;
      seat.dealt = false;
      seat.hasActed = false;
      seat.lastAction = null;
      if (seat.chips <= 0) seat.sittingOut = true;
    }
    this.board = [];
    this.phase = 'waiting';
  }

  log(text) {
    this.handLog.push({ text, at: Date.now() });
    if (this.handLog.length > 60) this.handLog.shift();
  }

  /**
   * Istemciye gonderilecek gorunum.
   * Kendi kartlarindan baskasi ASLA gonderilmez (showdown haric).
   */
  view(viewerId) {
    const showAll = this.phase === 'payout' && this.lastResult?.showdown;
    return {
      phase: this.phase,
      handNumber: this.handNumber,
      board: this.board,
      pot: this.pot + this.seats.reduce((sum, s) => sum + (s?.bet || 0), 0),
      currentBet: this.currentBet,
      minRaise: this.minRaise,
      smallBlind: this.smallBlind,
      bigBlind: this.bigBlind,
      buttonSeat: this.buttonSeat,
      actingSeat: this.actingSeat,
      actionDeadline: this.actionDeadline,
      actionSeconds: this.actionSeconds,
      lastResult: this.lastResult,
      log: this.handLog.slice(-12),
      seats: this.seats.map((seat, index) => {
        if (!seat) return { seat: index, empty: true };
        const isSelf = seat.id === viewerId;
        const revealed =
          isSelf || (showAll && !seat.folded && seat.cards?.length);
        return {
          seat: index,
          id: seat.id,
          name: seat.name,
          avatar: seat.avatar,
          bot: seat.bot,
          chips: seat.chips,
          bet: seat.bet,
          folded: seat.folded,
          allIn: seat.allIn,
          sittingOut: seat.sittingOut,
          waiting: seat.waitingForHand,
          disconnected: seat.disconnected,
          lastAction: seat.lastAction,
          isSelf,
          cardCount: seat.cards?.length || 0,
          cards: revealed ? seat.cards : null
        };
      })
    };
  }

  /** Bir oyuncunun yapabilecegi hamleler. */
  legalActions(playerId) {
    if (!this.isHandActive()) return [];
    const player = this.seats[this.actingSeat];
    if (!player || player.id !== playerId) return [];
    const toCall = this.currentBet - player.bet;
    const actions = ['fold'];
    if (toCall <= 0) actions.push('check');
    else if (player.chips > 0) actions.push('call');
    if (player.chips > toCall) actions.push('raise');
    if (player.chips > 0) actions.push('allin');
    return actions;
  }
}

function compareScoreArrays(a, b) {
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i += 1) {
    const x = a[i] ?? -1;
    const y = b[i] ?? -1;
    if (x !== y) return x > y ? 1 : -1;
  }
  return 0;
}
