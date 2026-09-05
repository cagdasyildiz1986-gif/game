export const config = {
  port: Number(process.env.PORT || 3000),
  host: process.env.HOST || '0.0.0.0',

  /** Yeni oyuncuya verilen sanal kredi (gercek para degildir). */
  startBalance: Number(process.env.START_BALANCE || 10000),

  /** Toplam bahis seviyeleri (20 hat sabit). */
  betLevels: [20, 40, 100, 200, 400, 1000, 2000],
  defaultBet: 20,

  /** Oyuncu verisinin diske yazilacagi dosya (bos ise sadece bellek). */
  dataFile: process.env.DATA_FILE || 'data/players.json',

  /** Ayni oyuncu icin saniyede en fazla spin (bot/otomasyon korumasi). */
  maxSpinsPerSecond: Number(process.env.MAX_SPINS_PER_SECOND || 12)
};
