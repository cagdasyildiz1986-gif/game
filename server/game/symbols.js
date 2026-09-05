/**
 * Sembol tanimlari.
 * EGT "meyve" temasi + Pragmatic tarzi wild/scatter mekanigi.
 */
export const SYMBOLS = {
  CHERRY:     { id: 'CHERRY',     name: 'Kiraz',      kind: 'low' },
  LEMON:      { id: 'LEMON',      name: 'Limon',      kind: 'low' },
  ORANGE:     { id: 'ORANGE',     name: 'Portakal',   kind: 'low' },
  PLUM:       { id: 'PLUM',       name: 'Erik',       kind: 'low' },
  BELL:       { id: 'BELL',       name: 'Çan',        kind: 'mid' },
  GRAPE:      { id: 'GRAPE',      name: 'Üzüm',       kind: 'mid' },
  MELON:      { id: 'MELON',      name: 'Karpuz',     kind: 'high' },
  SEVEN:      { id: 'SEVEN',      name: 'Yedi',       kind: 'high' },
  STAR:       { id: 'STAR',       name: 'Yıldız',     kind: 'wild' },
  DOLLAR:     { id: 'DOLLAR',     name: 'Dolar',      kind: 'scatter' }
};

export const WILD = 'STAR';
export const SCATTER = 'DOLLAR';

export const SYMBOL_IDS = Object.keys(SYMBOLS);

/** Wild hangi sembollerin yerine gecebilir (scatter haric hepsi). */
export function canSubstitute(symbolId) {
  return symbolId !== SCATTER && symbolId !== WILD;
}
