/**
 * Basit bot oyuncular.
 *
 * AMAC: tek basina test/deneme. Bir masada baska insan yokken oyunun
 * calistigini gormek icin. Botlar arayuzde her zaman 🤖 ile isaretlenir ve
 * asla gercek oyuncu gibi gosterilmez.
 *
 * Strateji bilerek basittir - rakip modelleme veya blof yoktur.
 */

const BOT_NAMES = ['Robo Ali', 'Bot Zeynep', 'Sanal Kemal', 'Otomat Efe', 'Devre Selin'];
const BOT_AVATARS = ['🤖', '👾', '🛸', '⚙️', '🔮'];

export function makeBot(index) {
  return {
    id: `bot-${index}-${Math.random().toString(36).slice(2, 7)}`,
    name: BOT_NAMES[index % BOT_NAMES.length],
    avatar: BOT_AVATARS[index % BOT_AVATARS.length],
    bot: true
  };
}

/** Hold'em botu: pot oranina ve el gucune gore kaba karar. */
export function holdemBotAction(table, player) {
  const legal = table.legalActions(player.id);
  if (!legal.length) return null;

  const toCall = table.currentBet - player.bet;
  const pot = table.pot + table.seats.reduce((sum, s) => sum + (s?.bet || 0), 0);
  const potOdds = toCall > 0 ? toCall / (pot + toCall) : 0;

  // Kart gucu: preflop cift/yuksek kart, sonrasinda board ile birlesim
  const strength = estimateStrength(player.cards, table.board);

  // Cok kotu el + pahali cagri -> fold
  if (toCall > 0 && strength < potOdds * 0.85) {
    return legal.includes('check') ? { action: 'check' } : { action: 'fold' };
  }

  // Guclu el -> ara sira yukselt
  if (strength > 0.72 && legal.includes('raise') && Math.random() < 0.55) {
    const target = Math.min(
      player.bet + player.chips,
      table.currentBet + Math.max(table.minRaise, Math.floor(pot * 0.6))
    );
    if (target > table.currentBet) return { action: 'raise', amount: target };
  }

  if (toCall > 0 && legal.includes('call')) return { action: 'call' };
  if (legal.includes('check')) return { action: 'check' };
  return { action: 'fold' };
}

/** 0-1 arasi kaba el gucu. */
function estimateStrength(hole, board) {
  if (!hole?.length) return 0;
  const [a, b] = hole;
  if (!board?.length) {
    if (a.r === b.r) return 0.6 + (a.r / 14) * 0.35;
    const high = Math.max(a.r, b.r);
    const suited = a.s === b.s ? 0.06 : 0;
    const connected = Math.abs(a.r - b.r) <= 2 ? 0.05 : 0;
    return Math.min(0.85, (high / 14) * 0.55 + suited + connected);
  }
  const all = [...hole, ...board];
  const counts = new Map();
  for (const card of all) counts.set(card.r, (counts.get(card.r) || 0) + 1);
  const best = Math.max(...counts.values());
  const suits = new Map();
  for (const card of all) suits.set(card.s, (suits.get(card.s) || 0) + 1);
  const flushish = Math.max(...suits.values());

  let score = 0.25;
  if (best === 2) score = 0.5;
  if (best === 3) score = 0.75;
  if (best >= 4) score = 0.95;
  if (flushish >= 5) score = Math.max(score, 0.88);
  else if (flushish === 4) score = Math.max(score, 0.55);
  // Kendi kartlari board ile eslesiyor mu
  const paired = hole.some((c) => board.some((x) => x.r === c.r));
  if (paired) score += 0.08;
  return Math.min(0.97, score);
}

/** Blackjack botu: temel strateji (basitlestirilmis). */
export function blackjackBotAction(table, player) {
  const legal = table.legalActions(player.id);
  if (!legal.length) return null;
  const hand = player.hands[table.actingHand];
  if (!hand) return { action: 'stand' };

  const value = handTotal(hand.cards);
  const dealerUp = table.dealer.cards[0]?.r || 10;
  const dealerStrong = dealerUp >= 7 || dealerUp === 14;

  if (legal.includes('split') && hand.cards[0].r === 14) return { action: 'split' };
  if (legal.includes('split') && hand.cards[0].r === 8) return { action: 'split' };
  if (legal.includes('double') && value.total === 11) return { action: 'double' };
  if (legal.includes('double') && value.total === 10 && !dealerStrong) return { action: 'double' };

  if (value.soft) {
    if (value.total <= 17) return { action: 'hit' };
    return { action: 'stand' };
  }
  if (value.total <= 11) return { action: 'hit' };
  if (value.total >= 17) return { action: 'stand' };
  return { action: dealerStrong ? 'hit' : 'stand' };
}

function handTotal(cards) {
  let total = 0;
  let aces = 0;
  for (const card of cards) {
    if (card.r === 14) { aces += 1; total += 11; }
    else if (card.r >= 10) total += 10;
    else total += card.r;
  }
  while (total > 21 && aces > 0) { total -= 10; aces -= 1; }
  return { total, soft: aces > 0 };
}

/** Bot bahsi (blackjack). */
export function blackjackBotBet(table, player) {
  const bet = Math.min(table.maxBet, Math.max(table.minBet, Math.floor(player.chips * 0.05)));
  return Math.min(bet, player.chips);
}
