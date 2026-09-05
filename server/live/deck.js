import crypto from 'node:crypto';

/**
 * Standart 52 kartlik deste.
 * Kart gosterimi: { r: 2..14, s: 'h'|'d'|'c'|'s' }
 * r: 11=J, 12=Q, 13=K, 14=A
 */

export const SUITS = ['s', 'h', 'd', 'c'];
export const SUIT_SYMBOL = { s: '♠', h: '♥', d: '♦', c: '♣' };
export const RANK_LABEL = {
  2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9',
  10: '10', 11: 'J', 12: 'Q', 13: 'K', 14: 'A'
};

export function cardLabel(card) {
  return `${RANK_LABEL[card.r]}${SUIT_SYMBOL[card.s]}`;
}

export function buildDeck(deckCount = 1) {
  const cards = [];
  for (let d = 0; d < deckCount; d += 1) {
    for (const s of SUITS) {
      for (let r = 2; r <= 14; r += 1) cards.push({ r, s });
    }
  }
  return cards;
}

/**
 * Fisher-Yates, kriptografik RNG ile.
 * Dagitim sonuclari asla istemciden etkilenmez.
 */
export function shuffle(cards) {
  const deck = [...cards];
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(i + 1);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

/** Ayakkabi (shoe): coklu deste + kesme kartı. */
export class Shoe {
  constructor(deckCount = 6, penetration = 0.75) {
    this.deckCount = deckCount;
    this.penetration = penetration;
    this.reset();
  }
  reset() {
    this.cards = shuffle(buildDeck(this.deckCount));
    this.cutIndex = Math.floor(this.cards.length * this.penetration);
    this.dealt = 0;
  }
  /** Kesme kartina ulasildi mi (el bitiminde karistirilir). */
  get needsShuffle() {
    return this.dealt >= this.cutIndex;
  }
  draw() {
    if (this.dealt >= this.cards.length) this.reset();
    const card = this.cards[this.dealt];
    this.dealt += 1;
    return card;
  }
}
