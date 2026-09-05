/**
 * Yonetilebilir sistem ayarlari.
 *
 * Admin panelinden degistirilir, diske yazilir. Oyun matematigini etkileyen
 * ayarlar (RTP hedefi, rake, blackjack kurallari) oyunculara da GOSTERILIR -
 * ayar ile gorunen deger her zaman aynidir.
 */

export const CURRENCIES = {
  TRY: { code: 'TRY', symbol: '₺', name: 'Türk Lirası', locale: 'tr-TR' },
  USD: { code: 'USD', symbol: '$', name: 'Dolar', locale: 'en-US' },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', locale: 'de-DE' },
  CHIP: { code: 'CHIP', symbol: '₳', name: 'Çip', locale: 'tr-TR' }
};

export const DEFAULT_SETTINGS = {
  /** Para birimi. Krediler sanaldir; simge yalnizca gosterim icindir. */
  currency: 'TRY',

  /** Yeni hesaba verilen bakiye. */
  startBalance: 10000,

  /** Misafir hesaplarin oynamasina izin ver. */
  allowGuests: true,

  /** Bakim modu: yalnizca adminler girebilir. */
  maintenance: false,

  slot: {
    /**
     * Hedef RTP (%). Odeme tablosu bu orana gore olceklenir.
     * Temel tablo %95,8 icin ayarlidir; 92 girilirse odemeler 92/95.8 ile carpilir.
     * Oyun ici odeme tablosunda gorunen RTP de bu degerdir.
     */
    rtpTarget: 95.8,
    minRtp: 85,
    maxRtp: 99
  },

  poker: {
    /** Masadan alinan komisyon (%). 0 = komisyonsuz. */
    rakePercent: 0,
    /** El basina en fazla alinacak komisyon (buyuk blind cinsinden). */
    rakeCapBigBlinds: 3,
    /** Oyuncunun aksiyon suresi (saniye). */
    actionSeconds: 25,
    /** Masa basina en fazla oyuncu. */
    maxSeats: 6
  },

  blackjack: {
    /** Krupiye yumusak 17'de kart cekmeli mi? */
    dealerHitsSoft17: false,
    /** Blackjack odemesi: 1.5 = 3:2, 1.2 = 6:5 */
    blackjackPayout: 1.5,
    /** Ayakkabidaki deste sayisi. */
    deckCount: 6,
    /** Sigorta acik mi? */
    insurance: true,
    actionSeconds: 20,
    maxSeats: 5
  },

  tables: {
    /** Varsayilan masa limitleri (kucuk blind / buyuk blind). */
    stakes: [
      { id: 'micro', name: 'Mikro', smallBlind: 10, bigBlind: 20, minBuyIn: 400, maxBuyIn: 4000 },
      { id: 'low', name: 'Düşük', smallBlind: 50, bigBlind: 100, minBuyIn: 2000, maxBuyIn: 20000 },
      { id: 'mid', name: 'Orta', smallBlind: 250, bigBlind: 500, minBuyIn: 10000, maxBuyIn: 100000 },
      { id: 'high', name: 'Yüksek', smallBlind: 1000, bigBlind: 2000, minBuyIn: 40000, maxBuyIn: 400000 }
    ],
    /** Blackjack bahis limitleri. */
    blackjackLimits: [
      { id: 'bj-low', name: 'Düşük', min: 50, max: 2500 },
      { id: 'bj-mid', name: 'Orta', min: 250, max: 12500 },
      { id: 'bj-high', name: 'Yüksek', min: 1000, max: 50000 }
    ],
    /** Bir kullanicinin ayni anda acabilecegi masa sayisi. */
    maxTablesPerUser: 3,
    /** Bos masa kac saniye sonra kapanir. */
    emptyTableTtlSeconds: 300,
    /** Tek oyuncunun deneyebilmesi icin bot koltuklarina izin ver. */
    allowBots: true
  }
};

/** Derin birlestirme - kaydedilmis ayarlar varsayilanlarin uzerine biner. */
export function mergeSettings(base, override) {
  if (!override || typeof override !== 'object') return base;
  const result = Array.isArray(base) ? [...base] : { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (value && typeof value === 'object' && !Array.isArray(value) && typeof base[key] === 'object') {
      result[key] = mergeSettings(base[key], value);
    } else if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

export function currencyOf(settings) {
  return CURRENCIES[settings.currency] || CURRENCIES.CHIP;
}

/**
 * Odeme tablosu carpani: hedef RTP / temel RTP.
 * Temel tablo (server/game/paytable.js) %95,8 icin ayarlidir.
 */
export const BASE_SLOT_RTP = 95.8;

export function slotPayoutScale(settings) {
  const target = Number(settings.slot?.rtpTarget) || BASE_SLOT_RTP;
  const clamped = Math.min(
    settings.slot?.maxRtp ?? 99,
    Math.max(settings.slot?.minRtp ?? 85, target)
  );
  return clamped / BASE_SLOT_RTP;
}

/** Admin panelinin duzenleyebilecegi alanlarin dogrulanmasi. */
export function validateSettings(patch) {
  const errors = [];
  if (patch.currency && !CURRENCIES[patch.currency]) errors.push('Geçersiz para birimi.');
  if (patch.startBalance !== undefined) {
    const value = Number(patch.startBalance);
    if (!Number.isFinite(value) || value < 0 || value > 10_000_000) {
      errors.push('Başlangıç bakiyesi 0 ile 10.000.000 arasında olmalı.');
    }
  }
  if (patch.slot?.rtpTarget !== undefined) {
    const value = Number(patch.slot.rtpTarget);
    if (!Number.isFinite(value) || value < 85 || value > 99) {
      errors.push('RTP hedefi %85 ile %99 arasında olmalı.');
    }
  }
  if (patch.poker?.rakePercent !== undefined) {
    const value = Number(patch.poker.rakePercent);
    if (!Number.isFinite(value) || value < 0 || value > 10) {
      errors.push('Komisyon %0 ile %10 arasında olmalı.');
    }
  }
  if (patch.blackjack?.blackjackPayout !== undefined) {
    const value = Number(patch.blackjack.blackjackPayout);
    if (![1.5, 1.2, 1].includes(value)) {
      errors.push('Blackjack ödemesi 3:2, 6:5 veya 1:1 olabilir.');
    }
  }
  if (patch.blackjack?.deckCount !== undefined) {
    const value = Number(patch.blackjack.deckCount);
    if (![1, 2, 4, 6, 8].includes(value)) errors.push('Deste sayısı 1, 2, 4, 6 veya 8 olmalı.');
  }
  return errors;
}
