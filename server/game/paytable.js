/**
 * Odeme tablosu.
 * Hat kazanclari: hat basina bahis (bet/line) carpani.
 * Scatter kazanci: TOPLAM bahis carpani.
 */
export const PAYTABLE = {
  STAR:   { 3: 80, 4: 400, 5: 2000 },
  SEVEN:  { 3: 50, 4: 250, 5: 1250 },
  MELON:  { 3: 30, 4: 125, 5: 600 },
  GRAPE:  { 3: 18, 4: 75,  5: 375 },
  BELL:   { 3: 15, 4: 60,  5: 300 },
  PLUM:   { 3: 8,  4: 32,  5: 160 },
  ORANGE: { 3: 8,  4: 32,  5: 160 },
  LEMON:  { 3: 5,  4: 20,  5: 100 },
  CHERRY: { 3: 5,  4: 20,  5: 100 }
};

/** Scatter (DOLLAR) - ekranin herhangi bir yerinde, toplam bahis carpani. */
export const SCATTER_PAY = { 3: 2, 4: 10, 5: 50 };

/** 3+ scatter bedava donus verir. */
export const FREE_SPINS = {
  award: { 3: 12, 4: 15, 5: 20 },
  retrigger: 5,
  multiplier: 3
};

/** Jackpot Cards bonusu (EGT tarzi 4 seviyeli progresif). */
export const JACKPOT = {
  // Her spinde bahsin bu orani havuzlara aktarilir.
  contributionRate: 0.01,
  /**
   * Bonusun tetiklenme sansi REFERANS BAHISTE spin basinadir ve gercek bahisle
   * dogru orantili olceklenir (bkz. shouldTrigger). Boylece jackpot'un RTP'ye
   * katkisi bahis seviyesinden bagimsiz kalir: 2 kat bahis = 2 kat sans.
   * Test icin JACKPOT_CHANCE ile ezilebilir.
   */
  triggerChance: Number(globalThis.process?.env?.JACKPOT_CHANCE || 0.0004),
  referenceBet: 100,
  /** Kart oyunu tahtasi: 4x4 = 16 kart. */
  cardGridSize: 16,
  // Havuz seviyeleri: seed = sifirlandiginda baslangic degeri, share = katki payi
  levels: [
    { id: 'CLUB',    name: 'Sinek',  suit: '♣', seed: 100,    share: 0.34, weight: 44 },
    { id: 'DIAMOND', name: 'Karo',   suit: '♦', seed: 500,    share: 0.28, weight: 30 },
    { id: 'HEART',   name: 'Kupa',   suit: '♥', seed: 2500,   share: 0.22, weight: 18 },
    { id: 'SPADE',   name: 'Maça',   suit: '♠', seed: 12500,  share: 0.16, weight: 8 }
  ]
};
