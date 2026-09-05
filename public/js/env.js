/**
 * Ortam ayari.
 *
 * Tarayicida (ayni sunucudan servis edilirken) bos birakin -> istekler ayni kaynaga gider.
 * Capacitor ile paketlenmis uygulamada dosyalar cihazdan yuklendigi icin
 * API adresini burada acikca belirtmeniz gerekir, ornek:
 *
 *   window.SLOT_API_BASE = 'https://api.sizinsiteniz.com';
 */
window.SLOT_API_BASE = '';

/**
 * Demo modu. `true` olursa oyun sunucusuz calisir: motor tarayiciya yuklenir.
 * GitHub Pages derlemesi bu degeri otomatik olarak `true` yapar.
 * Uretimde (Node sunucusu veya native uygulama) `false` kalmalidir.
 */
window.SLOT_DEMO = false;
