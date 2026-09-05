import { Shoe } from './deck.js';

/**
 * Cok oyunculu Blackjack masasi.
 *
 * Burada krupiye OYNAR ama karar VERMEZ: sabit kurallarla hareket eder
 * (17 ve uzerinde durur; ayar acikken yumusak 17'de kart ceker).
 * Oyuncular krupiyeye karsi oynar, birbirine karsi degil.
 *
 * Durum makinesi:
 *   betting -> dealing -> insurance? -> playing -> dealer -> payout -> betting
 */

const BETTING_SECONDS = 15;
const PAYOUT_SECONDS = 6;

/** El toplami: As 11 sayilir, batarsa 1'e duser. */
export function handValue(cards) {
  let total = 0;
  let aces = 0;
  for (const card of cards) {
    if (card.r === 14) {
      aces += 1;
      total += 11;
    } else if (card.r >= 10) {
      total += 10;
    } else {
      total += card.r;
    }
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  return { total, soft: aces > 0 };
}

export function isBlackjack(cards) {
  return cards.length === 2 && handValue(cards).total === 21;
}

export class BlackjackTable {
  constructor(options) {
    this.minBet = options.minBet;
    this.maxBet = options.maxBet;
    this.maxSeats = options.maxSeats ?? 5;
    this.actionSeconds = options.actionSeconds ?? 20;
    this.dealerHitsSoft17 = options.dealerHitsSoft17 ?? false;
    this.blackjackPayout = options.blackjackPayout ?? 1.5;
    this.insuranceEnabled = options.insurance ?? true;

    this.shoe = new Shoe(options.deckCount ?? 6);
    this.seats = Array.from({ length: this.maxSeats }, () => null);
    this.dealer = { cards: [], hidden: true };
    this.phase = 'betting';
    this.actingSeat = -1;
    this.actingHand = 0;
    this.deadline = Date.now() + BETTING_SECONDS * 1000;
    this.roundNumber = 0;
    this.log = [];
    this.lastResult = null;
  }

  /* ═══════════ Koltuk ═══════════ */

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
      hands: [],
      pendingBet: 0,
      insurance: 0,
      done: true,
      disconnected: false
    };
    return { seat: index };
  }

  removePlayer(id) {
    const index = this.seats.findIndex((s) => s && s.id === id);
    if (index < 0) return { error: 'Masada değilsin.' };
    const player = this.seats[index];
    // Oynanan elin bahsi masada kalir (cekilmis sayilir)
    const chips = player.chips;
    this.seats[index] = null;
    if (this.phase === 'playing' && this.actingSeat === index) this.advance();
    return { chips, left: true };
  }

  player(id) {
    return this.seats.find((s) => s && s.id === id) || null;
  }

  /* ═══════════ Bahis ═══════════ */

  placeBet(playerId, amount) {
    if (this.phase !== 'betting') return { error: 'Bahis turu kapalı.' };
    const player = this.player(playerId);
    if (!player) return { error: 'Masada değilsin.' };
    const bet = Math.floor(Number(amount) || 0);
    if (bet < this.minBet) return { error: `En az ${this.minBet} bahis yapmalısın.` };
    if (bet > this.maxBet) return { error: `En fazla ${this.maxBet} bahis yapabilirsin.` };
    if (bet > player.chips + player.pendingBet) return { error: 'Yetersiz çip.' };

    player.chips += player.pendingBet - bet;
    player.pendingBet = bet;
    return { ok: true };
  }

  clearBet(playerId) {
    if (this.phase !== 'betting') return { error: 'Bahis turu kapalı.' };
    const player = this.player(playerId);
    if (!player) return { error: 'Masada değilsin.' };
    player.chips += player.pendingBet;
    player.pendingBet = 0;
    return { ok: true };
  }

  readyToDeal() {
    return this.phase === 'betting' && this.seats.some((s) => s && s.pendingBet > 0);
  }

  /* ═══════════ Dagitim ═══════════ */

  deal() {
    if (!this.readyToDeal()) return { error: 'Bahis yapan oyuncu yok.' };
    if (this.shoe.needsShuffle) {
      this.shoe.reset();
      this.pushLog('Ayakkabı karıştırıldı');
    }

    this.roundNumber += 1;
    this.lastResult = null;
    this.dealer = { cards: [], hidden: true };

    const bettors = this.seats.filter((s) => s && s.pendingBet > 0);
    for (const player of bettors) {
      player.hands = [{ cards: [], bet: player.pendingBet, done: false, doubled: false, split: false }];
      player.pendingBet = 0;
      player.insurance = 0;
      player.done = false;
    }
    for (const seat of this.seats) {
      if (seat && !bettors.includes(seat)) {
        seat.hands = [];
        seat.done = true;
      }
    }

    // İki tur: oyunculara ve krupiyeye birer kart
    for (let round = 0; round < 2; round += 1) {
      for (const player of bettors) player.hands[0].cards.push(this.shoe.draw());
      this.dealer.cards.push(this.shoe.draw());
    }

    this.phase = 'playing';
    this.pushLog(`Tur #${this.roundNumber} · ${bettors.length} oyuncu`);

    // Sigorta: krupiyenin acik karti As ise
    if (this.insuranceEnabled && this.dealer.cards[0].r === 14) {
      this.phase = 'insurance';
      this.deadline = Date.now() + 10000;
      return { ok: true };
    }

    this.startPlaying();
    return { ok: true };
  }

  takeInsurance(playerId, take) {
    if (this.phase !== 'insurance') return { error: 'Sigorta turu kapalı.' };
    const player = this.player(playerId);
    if (!player || !player.hands.length) return { error: 'Bu turda elin yok.' };
    if (!take) {
      player.insurance = 0;
      return { ok: true };
    }
    const cost = Math.floor(player.hands[0].bet / 2);
    if (cost > player.chips) return { error: 'Sigorta için yetersiz çip.' };
    player.chips -= cost;
    player.insurance = cost;
    return { ok: true };
  }

  finishInsurance() {
    const dealerBlackjack = isBlackjack(this.dealer.cards);
    for (const seat of this.seats) {
      if (!seat || !seat.insurance) continue;
      if (dealerBlackjack) {
        // Sigorta 2:1 oder
        seat.chips += seat.insurance * 3;
        this.pushLog(`${seat.name} sigortadan ${seat.insurance * 2} kazandı`);
      }
      seat.insurance = 0;
    }
    if (dealerBlackjack) {
      this.dealer.hidden = false;
      this.settleRound();
      return;
    }
    this.startPlaying();
  }

  startPlaying() {
    this.phase = 'playing';
    // Blackjack'i olan eller otomatik tamamlanir
    for (const seat of this.seats) {
      if (!seat) continue;
      for (const hand of seat.hands) {
        if (isBlackjack(hand.cards)) hand.done = true;
      }
      seat.done = seat.hands.every((h) => h.done);
    }
    this.actingSeat = -1;
    this.actingHand = 0;
    this.advance();
  }

  /* ═══════════ Oyuncu aksiyonu ═══════════ */

  legalActions(playerId) {
    if (this.phase === 'betting') return ['bet'];
    if (this.phase === 'insurance') {
      const player = this.player(playerId);
      return player?.hands?.length ? ['insurance-yes', 'insurance-no'] : [];
    }
    if (this.phase !== 'playing') return [];
    const player = this.seats[this.actingSeat];
    if (!player || player.id !== playerId) return [];
    const hand = player.hands[this.actingHand];
    if (!hand || hand.done) return [];

    const actions = ['hit', 'stand'];
    const canAfford = player.chips >= hand.bet;
    if (hand.cards.length === 2 && canAfford) actions.push('double');
    if (
      hand.cards.length === 2 &&
      hand.cards[0].r === hand.cards[1].r &&
      player.hands.length < 4 &&
      canAfford
    ) {
      actions.push('split');
    }
    return actions;
  }

  act(playerId, action) {
    if (this.phase === 'insurance') {
      if (action === 'insurance-yes') return this.takeInsurance(playerId, true);
      if (action === 'insurance-no') return this.takeInsurance(playerId, false);
      return { error: 'Şu an yalnızca sigorta kararı verilebilir.' };
    }
    if (this.phase !== 'playing') return { error: 'Şu an hamle yapılamaz.' };

    const player = this.seats[this.actingSeat];
    if (!player || player.id !== playerId) return { error: 'Sıra sende değil.' };
    const hand = player.hands[this.actingHand];
    if (!hand || hand.done) return { error: 'Bu el tamamlandı.' };
    if (!this.legalActions(playerId).includes(action)) return { error: 'Geçersiz hamle.' };

    switch (action) {
      case 'hit': {
        hand.cards.push(this.shoe.draw());
        const { total } = handValue(hand.cards);
        if (total >= 21) hand.done = true;
        this.pushLog(`${player.name} kart çekti (${total})`);
        break;
      }
      case 'stand': {
        hand.done = true;
        this.pushLog(`${player.name} durdu (${handValue(hand.cards).total})`);
        break;
      }
      case 'double': {
        player.chips -= hand.bet;
        hand.bet *= 2;
        hand.doubled = true;
        hand.cards.push(this.shoe.draw());
        hand.done = true;
        this.pushLog(`${player.name} ikiye katladı (${handValue(hand.cards).total})`);
        break;
      }
      case 'split': {
        const moved = hand.cards.pop();
        player.chips -= hand.bet;
        hand.split = true;
        const newHand = { cards: [moved], bet: hand.bet, done: false, doubled: false, split: true };
        player.hands.splice(this.actingHand + 1, 0, newHand);
        hand.cards.push(this.shoe.draw());
        newHand.cards.push(this.shoe.draw());
        this.pushLog(`${player.name} eli böldü`);
        break;
      }
      default:
        return { error: 'Geçersiz hamle.' };
    }

    player.done = player.hands.every((h) => h.done);
    this.advance();
    return { ok: true };
  }

  timeoutAct() {
    if (this.phase === 'insurance') {
      this.finishInsurance();
      return;
    }
    if (this.phase !== 'playing') return;
    const player = this.seats[this.actingSeat];
    if (player) this.act(player.id, 'stand');
  }

  /** Sirayi bir sonraki tamamlanmamis ele tasir. */
  advance() {
    // Once ayni oyuncunun sonraki eli
    const current = this.seats[this.actingSeat];
    if (current) {
      const nextHand = current.hands.findIndex((h, i) => i > this.actingHand && !h.done);
      if (nextHand >= 0) {
        this.actingHand = nextHand;
        this.deadline = Date.now() + this.actionSeconds * 1000;
        return;
      }
    }
    for (let index = this.actingSeat + 1; index < this.maxSeats; index += 1) {
      const seat = this.seats[index];
      if (seat && seat.hands.some((h) => !h.done)) {
        this.actingSeat = index;
        this.actingHand = seat.hands.findIndex((h) => !h.done);
        this.deadline = Date.now() + this.actionSeconds * 1000;
        return;
      }
    }
    this.playDealer();
  }

  /* ═══════════ Krupiye ═══════════ */

  playDealer() {
    this.phase = 'dealer';
    this.actingSeat = -1;
    this.dealer.hidden = false;

    const anyLive = this.seats.some(
      (s) => s && s.hands.some((h) => handValue(h.cards).total <= 21)
    );

    if (anyLive) {
      // Sabit kural: 17'de dur (ayar acikken yumusak 17'de cek)
      for (;;) {
        const { total, soft } = handValue(this.dealer.cards);
        if (total > 21) break;
        if (total > 17) break;
        if (total === 17 && !(soft && this.dealerHitsSoft17)) break;
        this.dealer.cards.push(this.shoe.draw());
      }
      this.pushLog(`Krupiye ${handValue(this.dealer.cards).total}`);
    }

    this.settleRound();
  }

  settleRound() {
    const dealerHand = handValue(this.dealer.cards);
    const dealerBust = dealerHand.total > 21;
    const dealerBJ = isBlackjack(this.dealer.cards);
    const results = [];

    for (const seat of this.seats) {
      if (!seat || !seat.hands.length) continue;
      for (const hand of seat.hands) {
        const value = handValue(hand.cards);
        const playerBJ = isBlackjack(hand.cards) && !hand.split;
        let outcome;
        let payout = 0;

        if (value.total > 21) {
          outcome = 'bust';
        } else if (playerBJ && !dealerBJ) {
          outcome = 'blackjack';
          payout = Math.floor(hand.bet * (1 + this.blackjackPayout));
        } else if (dealerBJ && !playerBJ) {
          outcome = 'lose';
        } else if (dealerBJ && playerBJ) {
          outcome = 'push';
          payout = hand.bet;
        } else if (dealerBust) {
          outcome = 'win';
          payout = hand.bet * 2;
        } else if (value.total > dealerHand.total) {
          outcome = 'win';
          payout = hand.bet * 2;
        } else if (value.total === dealerHand.total) {
          outcome = 'push';
          payout = hand.bet;
        } else {
          outcome = 'lose';
        }

        seat.chips += payout;
        hand.outcome = outcome;
        hand.payout = payout;
        results.push({
          id: seat.id,
          name: seat.name,
          bet: hand.bet,
          total: value.total,
          outcome,
          payout,
          net: payout - hand.bet
        });
      }
      seat.done = true;
    }

    this.lastResult = {
      roundNumber: this.roundNumber,
      dealerTotal: dealerHand.total,
      dealerBust,
      dealerBlackjack: dealerBJ,
      results
    };
    this.phase = 'payout';
    this.deadline = Date.now() + PAYOUT_SECONDS * 1000;
  }

  /** Yeni bahis turuna gec. */
  reset() {
    for (const seat of this.seats) {
      if (!seat) continue;
      seat.hands = [];
      seat.pendingBet = 0;
      seat.insurance = 0;
      seat.done = true;
    }
    this.dealer = { cards: [], hidden: true };
    this.phase = 'betting';
    this.actingSeat = -1;
    this.actingHand = 0;
    this.deadline = Date.now() + BETTING_SECONDS * 1000;
  }

  pushLog(text) {
    this.log.push({ text, at: Date.now() });
    if (this.log.length > 40) this.log.shift();
  }

  view(viewerId) {
    const dealerCards = this.dealer.hidden
      ? [this.dealer.cards[0], null].filter((c) => c !== undefined)
      : this.dealer.cards;
    return {
      game: 'blackjack',
      phase: this.phase,
      roundNumber: this.roundNumber,
      minBet: this.minBet,
      maxBet: this.maxBet,
      deadline: this.deadline,
      actingSeat: this.actingSeat,
      actingHand: this.actingHand,
      dealerHitsSoft17: this.dealerHitsSoft17,
      blackjackPayout: this.blackjackPayout,
      dealer: {
        cards: dealerCards,
        hidden: this.dealer.hidden,
        total: this.dealer.hidden ? null : handValue(this.dealer.cards).total
      },
      lastResult: this.lastResult,
      log: this.log.slice(-10),
      seats: this.seats.map((seat, index) => {
        if (!seat) return { seat: index, empty: true };
        return {
          seat: index,
          id: seat.id,
          name: seat.name,
          avatar: seat.avatar,
          bot: seat.bot,
          chips: seat.chips,
          pendingBet: seat.pendingBet,
          insurance: seat.insurance,
          isSelf: seat.id === viewerId,
          disconnected: seat.disconnected,
          hands: seat.hands.map((hand) => ({
            cards: hand.cards,
            bet: hand.bet,
            total: handValue(hand.cards).total,
            soft: handValue(hand.cards).soft,
            blackjack: isBlackjack(hand.cards) && !hand.split,
            done: hand.done,
            doubled: hand.doubled,
            split: hand.split,
            outcome: hand.outcome || null,
            payout: hand.payout || 0
          }))
        };
      })
    };
  }
}
