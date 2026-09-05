# 🎰 Lucky Reels — Mobil Slot Oyunu

EGT ve Pragmatic Play tarzı 5x3, 20 sabit hatlı video slot. **Node.js** sunucu üzerinde
çalışır, mobil öncelikli bir **PWA** olarak sunulur ve **Capacitor** ile Android/iOS
uygulamasına dönüştürülebilir.

> ⚠️ Bu proje **eğlence amaçlı sanal kredi** ile çalışır. Gerçek para yatırma, çekme veya
> bahis işlevi **yoktur**. Gerçek parayla oynatmak yasal olarak lisans gerektirir —
> aşağıdaki [Yasal notlar](#yasal-notlar) bölümüne bakın.

---

## Öne çıkanlar

| | |
|---|---|
| **Oyun** | 5 makara × 3 satır, 20 sabit ödeme hattı |
| **Semboller** | 8 ödeme sembolü + Yıldız (WILD) + Dolar (SCATTER) |
| **Özellikler** | Bedava dönüşler (x3 çarpan, retrigger), Jackpot Cards bonusu (4 seviyeli progresif) |
| **RTP** | ~%95,8 (10 milyon dönüşlük simülasyonla ölçülmüş — `npm run simulate`) |
| **Güvenlik** | Tüm matematik ve RNG **sunucuda**; istemci sadece sonucu canlandırır |
| **Adalet** | HMAC-SHA256 tabanlı *provably fair* (sunucu tohumu + istemci tohumu + nonce) |
| **Arayüz** | Mobil öncelikli, dokunmatik, turbo + otomatik oyun, offline kabuk (PWA) |
| **Varlıklar** | Tüm semboller vektörel SVG, tüm sesler Web Audio ile sentezlenir — harici dosya yok |

---

## Hızlı başlangıç

```bash
npm install
npm start           # http://localhost:3000
```

Geliştirme için: `npm run dev` (dosya değişiminde otomatik yeniden başlar).

Telefonunuzdan test etmek için bilgisayarınızın yerel IP'sini kullanın
(`http://192.168.x.x:3000`) ve tarayıcı menüsünden **Ana ekrana ekle** deyin —
uygulama tam ekran PWA olarak açılır.

---

## Proje yapısı

```
server/
  index.js              Express sunucusu + statik dosya servisi
  config.js             Port, başlangıç kredisi, bahis seviyeleri
  game/
    symbols.js          Sembol tanımları (wild / scatter)
    paylines.js         20 sabit ödeme hattı
    paytable.js         Ödeme tablosu, bedava dönüş ve jackpot ayarları
    reels.js            Sanal makara şeritleri (RTP buradan ayarlanır)
    engine.js           Spin çözümleme: hatlar, scatter, çarpanlar
    jackpot.js          Progresif havuzlar + Jackpot Cards mini oyunu
    rng.js              Kriptografik / doğrulanabilir / deterministik RNG
  routes/game.js        REST API
  store/memory.js       Oyuncu deposu (bellek + JSON dosyası)
public/
  index.html            Arayüz iskeleti
  css/style.css         Mobil öncelikli tema
  js/app.js             Oyun akışı ve arayüz mantığı
  js/reels.js           Makara animasyonu (Web Animations API)
  js/symbols.js         SVG sembol sprite'ı
  js/audio.js           Web Audio ile sentezlenen ses efektleri
  js/api.js             Sunucu iletişimi
  js/env.js             API adresi (Capacitor derlemesi için)
  sw.js                 Service worker (offline kabuk)
tools/simulate.js       RTP / volatilite simülasyonu
capacitor.config.json   Native uygulama yapılandırması
```

---

## Oyun matematiği

**Ödeme tablosu** (hat bahsi çarpanı — toplam bahis / 20):

| Sembol | 3× | 4× | 5× |
|---|---|---|---|
| ⭐ Yıldız (WILD) | 80 | 400 | 2000 |
| 7️⃣ Yedi | 50 | 250 | 1250 |
| 🍉 Karpuz | 30 | 125 | 600 |
| 🍇 Üzüm | 18 | 75 | 375 |
| 🔔 Çan | 15 | 60 | 300 |
| 🫐 Erik | 8 | 32 | 160 |
| 🍊 Portakal | 8 | 32 | 160 |
| 🍋 Limon | 5 | 20 | 100 |
| 🍒 Kiraz | 5 | 20 | 100 |

**Scatter (💲 Dolar)** — toplam bahis çarpanı: 3× → 2, 4× → 10, 5× → 50.
3 scatter 12, 4 scatter 15, 5 scatter 20 **bedava dönüş** kazandırır. Bedava dönüşlerde
tüm kazançlar **x3** çarpanlıdır, daha cömert makara şeritleri kullanılır ve yeni
scatterlar +5 dönüş ekler.

**Jackpot Cards** — her ücretli dönüşün ardından rastgele tetiklenir. Aynı türden 3 kart
açan oyuncu ilgili progresif havuzu kazanır: ♣ Sinek, ♦ Karo, ♥ Kupa, ♠ Maça.
Bahsin %1'i havuzlara aktarılır.

### RTP'yi ölçme ve ayarlama

```bash
npm run simulate            # 2.000.000 dönüş
npm run simulate -- 500000  # özel dönüş sayısı
```

Örnek çıktı:

```
Spin sayısı        : 10.000.000
Hat RTP            : 58.74%
Scatter RTP        : 1.72%
Bedava dönüş RTP   : 34.33%
TEMEL OYUN RTP     : 94.80%
Jackpot RTP (katkı): 1.00%
TOPLAM RTP         : 95.80%
Kazanma sıklığı    : 38.10%  (1/2.62 dönüş)
Bonus tetiklenmesi : 1/140 dönüş
En büyük kazanç    : bahsin 1177 katı
```

> Bedava dönüşler RTP'nin üçte birini taşıdığı için kısa simülasyonlarda toplam RTP
> %95–96,5 arasında salınır; 10 milyon dönüşte değer %95,8 civarına oturur.

RTP'yi değiştirmek için iki ayar noktası vardır:

1. `server/game/paytable.js` — ödeme değerleri (hızlı, doğrusal etki)
2. `server/game/reels.js` — makara şeritlerindeki sembol sayıları (isabet sıklığı ve
   volatilite üzerinde etkili)

Her değişiklikten sonra simülasyonu tekrar çalıştırın.

---

## API

Tüm istekler `Authorization: Bearer <token>` başlığı ister (`/config`, `/session`,
`/jackpots` hariç).

| Yöntem | Yol | Açıklama |
|---|---|---|
| `GET` | `/api/config` | Semboller, ödeme tablosu, hatlar, bahis seviyeleri |
| `POST` | `/api/session` | Oturum aç / devam ettir → `token` |
| `GET` | `/api/state` | Oyuncu durumu + jackpot havuzları |
| `POST` | `/api/bet` | Bahis seviyesi değiştir |
| `POST` | `/api/spin` | Dönüş yap → grid, kazançlar, bakiye |
| `GET` | `/api/jackpots` | Güncel progresif havuzlar |
| `POST` | `/api/fair/client-seed` | İstemci tohumunu değiştir |
| `POST` | `/api/fair/rotate` | Sunucu tohumunu açıkla ve yenile |

**Neden sunucu tarafı?** İstemci hiçbir zaman sonucu üretmez. Bakiye, bahis kontrolü,
RNG, ödeme hesabı ve jackpot havuzları tamamen sunucudadır; istemciye yalnızca
sonuç gönderilir. Böylece tarayıcı konsolundan bakiye veya sonuç değiştirilemez.

### Doğrulanabilir adalet

Her dönüş `HMAC-SHA256(serverSeed, clientSeed:nonce:cursor)` çıktısından üretilir.
Sunucu tohumunun SHA-256 özeti önceden gösterilir; oyuncu menüden tohumu açıklattığında
özet ile eşleştirerek geçmiş sonuçların sonradan değiştirilmediğini doğrulayabilir.

---

## Uygulamaya (APK / IPA) dönüştürme

Arayüz saf HTML/CSS/JS olduğu için derleme adımı gerekmez; `public/` klasörü doğrudan
paketlenir.

### 1. Sunucuyu yayına alın

Uygulama sürümünde oyun sunucusu cihazda değil, internette çalışır. Sunucuyu bir VPS,
Render, Railway, Fly.io vb. üzerinde **HTTPS** ile yayınlayın.

### 2. API adresini ayarlayın

`public/js/env.js` dosyasını düzenleyin:

```js
window.SLOT_API_BASE = 'https://api.sizinsiteniz.com';
```

### 3. Capacitor kurulumu

```bash
npm install                 # devDependencies içindeki Capacitor paketlerini kurar
npx cap add android         # veya: npx cap add ios
npm run cap:sync            # public/ klasörünü native projeye kopyalar
npm run cap:android         # Android Studio'da açar
```

### 4. Derleme

- **Android:** Android Studio → *Build → Generate Signed Bundle / APK*.
  Yayın için `.aab` üretin ve Google Play Console'a yükleyin.
- **iOS:** Xcode → *Product → Archive* → App Store Connect.
  (macOS ve Apple Developer hesabı gerekir.)

### Gereksinimler

| Platform | Gerekenler |
|---|---|
| Android | JDK 17, Android Studio, Android SDK 34+ |
| iOS | macOS, Xcode 15+, CocoaPods |

### İkonlar ve açılış ekranı

`public/icons/icon.svg` başlangıç ikonudur. Mağaza sürümü için PNG setine ihtiyaç
duyarsınız:

```bash
npx @capacitor/assets generate --iconBackgroundColor '#0b0716' --splashBackgroundColor '#0b0716'
```

### Mağaza notu

Google Play ve App Store, kumar temalı uygulamalar için ayrı kurallar uygular.
Sanal kredili (gerçek para ödülü olmayan) sosyal casino oyunları genelde kabul edilir
ancak **18+ / 17+ yaş sınırı**, "gerçek para yoktur" ibaresi ve bazı ülkelerde
kısıtlama gerekir. Gerçek parayla oynatma, yalnızca lisanslı geliştirici hesapları ve
izin verilen ülkeler için mümkündür.

---

## Yapılandırma (ortam değişkenleri)

| Değişken | Varsayılan | Açıklama |
|---|---|---|
| `PORT` | `3000` | Sunucu portu |
| `HOST` | `0.0.0.0` | Dinlenecek adres |
| `START_BALANCE` | `10000` | Yeni oyuncunun sanal kredisi |
| `DATA_FILE` | `data/players.json` | Kalıcı kayıt dosyası |
| `MAX_SPINS_PER_SECOND` | `12` | Oyuncu başına hız sınırı |
| `JACKPOT_CHANCE` | `0.0022` | Jackpot bonusu tetiklenme şansı (test için) |

---

## Yol haritası

Bu sürüm tek oyunlu, tek sunuculu bir temeldir. Bir "oyun sitesi" hâline getirmek için
sonraki adımlar:

- [ ] Kullanıcı hesapları (e-posta / telefon doğrulama) ve gerçek veritabanı (Postgres)
- [ ] Oyun lobisi (birden çok slot, arama, favoriler) — `server/game/` modülleri
      oyun başına klasörlenerek çoğaltılabilir
- [ ] Günlük bonus, seviye/XP, görevler, liderlik tablosu
- [ ] Sunucu tarafı oturum geçmişi ve dönüş logları (denetlenebilirlik)
- [ ] Push bildirim (Capacitor Push Notifications)
- [ ] Çoklu dil desteği
- [ ] Gerçek para modeli düşünülüyorsa: lisans, KYC, ödeme sağlayıcı, sorumlu oyun
      araçları (kayıp limiti, kendini dışlama), bağımsız RNG sertifikasyonu (GLI/eCOGRA)

---

## Yasal notlar

- Bu yazılım, sanal kredilerle oynanan bir **eğlence** uygulamasıdır. Krediler satın
  alınamaz, nakde çevrilemez ve parasal değeri yoktur.
- **Gerçek para** ile bahis kabul etmek Türkiye dahil çoğu ülkede lisans gerektirir;
  lisanssız işletmek suçtur. Böyle bir kullanım öncesinde mutlaka hukuki danışmanlık alın.
- Sembol, isim ve tasarımların herhangi bir oyun sağlayıcısının (EGT, Pragmatic Play vb.)
  telif veya ticari markalarını **kopyalamamasına** dikkat edin. Bu projedeki tüm grafikler
  özgün olarak üretilmiştir; klasik meyve teması jenerik bir slot temasıdır.
- Uygulamada 18+ uyarısı ve sorumlu oyun bilgisi gösterin.

---

## Lisans

Özel proje (private). Kullanım hakları proje sahibine aittir.
