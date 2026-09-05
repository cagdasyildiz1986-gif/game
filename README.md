# 🎰 AURUM — Sosyal Casino Platformu

Mobil öncelikli bir casino sitesi ve içindeki tam sürüm slot oyunu.
**Node.js** sunucu üzerinde çalışır, **PWA** olarak sunulur ve **Capacitor** ile
Android/iOS uygulamasına dönüştürülebilir.

Dört katman vardır:

1. **Site (AURUM)** — lobi, 105 oyunluk katalog, kategoriler, arama, favoriler,
   üyelik, kalıcı bakiye, detaylı profil ve görev/puan sistemi.
2. **Slot (Lucky Reels)** — EGT ve Pragmatic Play tarzı 5x3, 20 sabit hatlı video slot;
   bedava dönüşler, Jackpot Cards bonusu ve sunucu taraflı RNG.
3. **Canlı masalar** — gerçek zamanlı **Texas Hold'em** (oyuncuya karşı, ev oynamaz) ve
   **Blackjack** (krupiye sabit kurallarla oynar). Masa açma, arkadaş daveti, özel masa.
4. **Yönetim paneli** — kullanıcı yönetimi, bakiye tanımlama, oyun kazanç/kayıp
   ayarları (RTP, rake, blackjack kuralları), para birimi ve sistem ayarları.

> ⚠️ Bu proje **eğlence amaçlı sanal kredi** ile çalışır. Gerçek para yatırma, çekme veya
> bahis işlevi **yoktur**. Gerçek parayla oynatmak yasal olarak lisans gerektirir —
> aşağıdaki [Yasal notlar](#yasal-notlar) bölümüne bakın.

---

## Nasıl test edilir

### 1. Tarayıcıdan (kurulum yok) — GitHub Pages demo

**https://cagdasyildiz1986-gif.github.io/game/**

Telefondan da açılır, "Ana ekrana ekle" ile tam ekran uygulama gibi çalışır.
Bu sürüm **demo modundadır**: sunucu olmadığı için oyun motoru (`server/game/`
altındaki aynı modüller) tarayıcıya yüklenir ve bakiye `localStorage`'da tutulur.
Ekranın üstünde "DEMO" rozeti görünür.

> Yayın, `main` dalına her push'ta `.github/workflows/pages.yml` ile otomatik yapılır.
> Repoyu forklarsanız veya yeni bir repoda kurarsanız **Settings → Pages → Build and
> deployment → Source: GitHub Actions** ayarını bir kez elle seçmeniz gerekir; workflow
> token'ının Pages sitesini oluşturma izni yoktur.

### 2. Gerçek mimariyle — GitHub Codespaces

Repo sayfasında **Code → Codespaces → Create codespace** deyin. Devcontainer
bağımlılıkları kurar, `npm start` ile Node sunucusunu başlatır ve 3000 portunu
otomatik açar. Bu, üretimdeki gerçek yapıdır: RNG ve tüm matematik sunucuda çalışır.

### 3. Kendi makinenizde

```bash
npm install && npm start   # http://localhost:3000
```

| | Demo (Pages) | Sunucu (Codespaces / yerel / native) |
|---|---|---|
| RNG ve oyun matematiği | Tarayıcıda | Sunucuda |
| Bakiye | `localStorage` | Sunucuda, kurcalanamaz |
| Doğrulanabilir adalet | Yok | Var |
| Amaç | Hızlı deneme, vitrin | Üretim |

---

## Öne çıkanlar

| | |
|---|---|
| **Site** | 105 oyunluk katalog, 8 kategori, 8 sağlayıcı, arama, favoriler, görevler |
| **Canlı** | Texas Hold'em ve Blackjack, WebSocket, özel masa + davet kodu, bot koltukları |
| **Yönetim** | Kullanıcı/bakiye yönetimi, RTP ve masa ayarları, bakiye kayıt defteri |
| **Para birimi** | TL (₺) varsayılan; USD/EUR/Çip seçilebilir — yalnızca gösterim |
| **Testler** | 63 birim testi + 16 uçtan uca canlı masa testi (`npm test`) |
| **Üyelik** | Kayıt/giriş (scrypt), kalıcı bakiye, misafirden hesaba yükseltme |
| **Puan** | Satılmaz — yalnızca görevlerle ve oyun kazançlarıyla elde edilir |
| **Oyun** | 5 makara × 3 satır, 20 sabit ödeme hattı |
| **Semboller** | 8 ödeme sembolü + Yıldız (WILD) + Dolar (SCATTER) |
| **Özellikler** | Bedava dönüşler (x3 çarpan, retrigger), Jackpot Cards bonusu (4 seviyeli progresif) |
| **RTP** | ~%95,8 (10 milyon dönüşlük simülasyonla ölçülmüş — `npm run simulate`) |
| **Jackpot** | 4 seviyeli progresif; bahisle orantılı tetiklenme (referans bahiste 1/2.500) |
| **Kapaklar** | 105 oyunun kapağı vektörel üretilir — tek bayt görsel dosyası yok |
| **Güvenlik** | Tüm matematik ve RNG **sunucuda**; istemci sadece sonucu canlandırır |
| **Adalet** | HMAC-SHA256 tabanlı *provably fair* (sunucu tohumu + istemci tohumu + nonce) |
| **Arayüz** | Mobil öncelikli, dokunmatik, turbo + otomatik oyun, offline kabuk (PWA) |
| **Tema** | Açık (kurumsal, varsayılan) ve koyu tema — tek token seti, anında geçiş |
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
  site/
    catalog.js          Oyun kataloğu, kategoriler, sağlayıcılar, arama
    tasks.js            Görev tanımları, ilerleme ve ödül mantığı
    settings.js         Yönetilebilir ayarlar (para birimi, RTP, masa kuralları)
  live/
    deck.js             Deste, kriptografik karıştırma, ayakkabı (shoe)
    handEval.js         7 karttan en iyi 5'li el değerlendirme
    holdem.js           Texas Hold'em durum makinesi ve pot dağıtımı
    blackjack.js        Blackjack masası ve krupiye kuralları
    tables.js           Masa yönetimi, buy-in, özel masa, zamanlayıcı
    bots.js             Bot oyuncular (tek başına deneme için)
    ws.js               WebSocket sunucusu ve oda yayını
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
  css/site.css          Tasarım sistemi: açık tema varsayılan, koyu tema
                        `<html data-theme="dark">` ile açılır. Tüm sayfalar
                        aynı token setini (renk, gölge, yarıçap) kullanır.
  index.html            Site (lobi) iskeleti
  game.html             Slot oyunu sayfası
  live.html             Canlı masa (poker / blackjack)
  admin.html            Yönetim paneli
  css/site.css          Site tasarım sistemi
  css/style.css         Oyun teması
  js/site.js            Lobi yönlendiricisi ve görünümleri
  js/live.js            Canlı masa arayüzü (WebSocket istemcisi)
  js/admin.js           Yönetim paneli arayüzü
  js/cover.js           Oyun kapaklarının vektörel üreticisi
  js/icons.js           Arayüz ikonları
  js/app.js             Oyun akışı ve arayüz mantığı
  js/reels.js           Makara animasyonu (Web Animations API)
  js/symbols.js         SVG sembol sprite'ı
  js/audio.js           Web Audio ile sentezlenen ses efektleri
  js/api.js             Sunucu iletişimi
  js/env.js             API adresi ve demo modu bayrağı
  js/demo.js            Sunucusuz demo arka ucu (GitHub Pages sürümü)
  sw.js                 Service worker (offline kabuk)
tools/simulate.js       RTP / volatilite simülasyonu
tools/test-hands.js     El değerlendirici testleri
tools/test-holdem.js    Hold'em motoru testleri (çip korunumu dahil)
tools/test-blackjack.js Blackjack testleri
tools/build-demo.js     GitHub Pages demo derlemesi (dist/)
.github/workflows/      Pages yayın akışı
.devcontainer/          Codespaces yapılandırması
capacitor.config.json   Native uygulama yapılandırması
```

---

## Tasarım sistemi

Kimlik: **lacivert + altın + beyaz** — premium oyun operatörü dili. Neon parlamalar
yerine yumuşak gölgeler, geniş boşluk ve net tipografik hiyerarşi.

- **Açık tema varsayılandır**; koyu tema üst bardaki (masaüstü) veya profildeki
  (mobil) düğmeyle açılır ve `localStorage`'da saklanır.
- Tek token seti: `--surface`, `--line`, `--text`, `--brand`, `--gold`, `--sh*`.
  Koyu tema yalnızca bu değişkenleri yeniden tanımlar; bileşen kuralları ortaktır.
- Tema, CSS yüklenmeden önce `<head>` içinde uygulanır (yanıp sönme olmaz).
- Oyun kabini ve poker keçesi temadan bağımsız olarak zengin/koyu kalır —
  masa oyunlarında doğru olan budur.
- Masaüstünde gerçek üst menü, mobilde alt sekme çubuğu.

---

## Site

**Sayfalar** (hash yönlendirme): ana sayfa, kategori, arama, oyun detayı, görevler,
profil ve bilgi sayfaları (nasıl çalışır, adalet, sorumlu oyun, koşullar, gizlilik).

**Kategoriler:** Popüler, Yeni, Slot, Masa Oyunları, Rulet, Bonus Buy, Jackpot,
Hızlı Oyunlar — ayrıca Favoriler.

**Görev sistemi:** Günlük görevler (giriş, 50 dönüş, 3 oyun keşfi, 20x kazanç) her gün
sıfırlanır; kilometre taşları (ilk dönüş, kayıt, ilk bonus turu, 1.000 dönüş, jackpot)
kalıcıdır. Ödüller `Topla` ile bakiyeye eklenir.

**Oyun kapakları:** Katalogda 105 oyun var ve hiçbiri için görsel dosyası yok.
Her oyunun bir **palet** (16 seçenek) ve **motif**i (24 seçenek) vardır;
`public/js/cover.js` bunlardan arka plan, ışık huzmeleri, motif ve altın konturlu
başlık kilidi olan bir SVG üretir.

**Not:** Şu an tam olarak oynanabilen oyun Lucky Reels'tir. Katalogdaki diğer oyunlar
site yapısını, kategori akışını ve arama deneyimini göstermek için durur; oyun
detay sayfasında bu açıkça belirtilir.

---

## Canlı masalar

### Texas Hold'em

**Krupiye = sunucu. Ev oynamaz** — oyuncular birbirine karşı oynar, sunucu yalnızca
dağıtır, sırayı yönetir ve potu paylaştırır. Zynga Poker mantığında ring (nakit) masa:

- Buton ve blindler her elde döner (heads-up'ta buton küçük blind)
- Preflop → flop → turn → river; fold / check / call / raise / all-in
- Min-raise kuralı, eksik all-in yükseltmeleri min-raise'i değiştirmez
- **Yan potlar** ve eşitlikte pot bölüşümü
- Aksiyon süresi dolunca otomatik check/fold
- Komisyon (rake) yönetici ayarı: yüzde + büyük blind cinsinden tavan, yalnızca flop görüldüyse
- En az 2 oyuncu gerekir

Kart gizliliği motorda zorlanır: `engine.view(viewerId)` yalnızca kendi kartlarını
gönderir, rakip kartları showdown'a kadar `null`'dır.

### Blackjack

Krupiye **oynar ama karar vermez** — sabit kurallarla hareket eder:

- 17'de durur (yönetici H17'yi açabilir)
- Blackjack 3:2 (6:5 ve 1:1 seçilebilir), sigorta 2:1
- Hit / stand / double / split (4 ele kadar)
- 1-8 desteli ayakkabı, kesme kartına gelince karıştırılır

### Masa yönetimi

- **Masa açma:** limit seçilir, isteğe bağlı bot koltukları eklenir
- **Özel masa:** 6 haneli kod üretilir, yalnızca kodu bilen veya davet edilen girer
- **Arkadaş daveti:** kod veya bağlantı paylaşılır (`live.html?kod=XXXXXX`)
- **Buy-in:** masaya otururken bakiyeden çip alınır, kalkınca kalan çip geri döner.
  Çip ile bakiye arasındaki tek geçiş noktası budur; çip üretilemez.
- **Botlar:** tek başına denemek için eklenir, arayüzde **her zaman 🤖 ile işaretlenir**
  ve asla gerçek oyuncu gibi gösterilmez. Yönetici kapatabilir.

> Canlı masalar **sunucu gerektirir**. GitHub Pages demosunda WebSocket yoktur;
> o sürümde masalar devre dışıdır ve ekranda bu açıkça belirtilir.

---

## Yönetim paneli

`/admin.html` — yalnızca yönetici rolündeki hesaplar erişebilir (sunucu tarafında da zorlanır).

**Yönetici nasıl olunur?** Sistemdeki **ilk kayıtlı hesap** otomatik yönetici olur.
Alternatif olarak `ADMIN_USERNAME` ortam değişkeni ile belirlenebilir.

| Sekme | İçerik |
|---|---|
| Özet | Kullanıcı, bakiye, dönüş, kasa payı ve jackpot göstergeleri |
| Kullanıcılar | Arama, **bakiye tanımlama/düşme**, hesap engelleme, rol değiştirme |
| Oyun Ayarları | Slot **RTP hedefi**, poker komisyonu, blackjack ödemesi/S17-H17/deste sayısı |
| Masa Ayarları | Aksiyon süresi, koltuk sayısı, bot izni, limit tablosu |
| Sistem | Para birimi, başlangıç bakiyesi, misafir izni, bakım modu |
| Bakiye Kayıtları | Yönetici bakiye işlemlerinin iz kaydı |

### RTP ayarı hakkında

Slot ödeme tablosu `%95,8` temel değeri için ayarlıdır. Yönetici bir RTP hedefi
girdiğinde ödemeler `hedef / 95.8` oranıyla ölçeklenir.

**Bu değer oyun içi ödeme tablosunda oyunculara da gösterilir** — ayar ile görünen
RTP her zaman aynıdır. Oyuncuya farklı bir oran gösterip arkada başka bir oran
uygulamak mümkün değildir; bu bilinçli bir tasarım kararıdır.

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

### Testler

```bash
npm test          # 63 birim testi (el değerlendirici, Hold'em, Blackjack)
npm run simulate  # RTP / volatilite simülasyonu
```

Hold'em testleri arasında **~15.000 rastgele elde çip korunumu** kontrolü vardır;
bu test, yan potlarda çip kaybına yol açan gerçek bir hatayı yakaladı
(katkıda bulunanların hepsi çekildiğinde yan pot yok sayılıyordu).

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
| `POST` | `/api/auth/session` | Oturum aç / devam ettir (misafir) → `token` |
| `POST` | `/api/auth/register` | Kayıt (misafir hesabı yükseltir, bakiye korunur) |
| `POST` | `/api/auth/login` | Giriş |
| `GET` | `/api/auth/me` | Hesap durumu |
| `GET` | `/api/site/home` | Lobi: kategoriler, vitrin rayları, jackpot havuzları |
| `GET` | `/api/site/games` | Kategori/sağlayıcı/sıralama ile oyun listesi |
| `GET` | `/api/site/search` | Oyun arama |
| `GET` | `/api/site/game/:id` | Oyun detayı + benzerleri |
| `POST` | `/api/site/favorite/:id` | Favori ekle/çıkar |
| `GET` | `/api/site/tasks` | Görevler ve ilerleme |
| `POST` | `/api/site/tasks/:id/claim` | Görev ödülünü topla |
| `POST` | `/api/auth/profile` | Avatar ve görünen ad güncelleme |
| `GET` | `/api/site/settings` | Herkese açık ayarlar (para birimi, masa limitleri, kurallar) |
| `GET` | `/api/admin/overview` | Yönetim özeti (yalnızca admin) |
| `GET` | `/api/admin/users` | Kullanıcı listesi/arama |
| `POST` | `/api/admin/users/:id/balance` | Bakiye tanımlama / düşme |
| `POST` | `/api/admin/users/:id/ban` | Hesap engelleme |
| `POST` | `/api/admin/settings` | Sistem ve oyun ayarları |
| `WS` | `/live` | Canlı masalar (auth, create, join, action, bet, chat, invite) |
| `GET` | `/api/config` | Semboller, ödeme tablosu, hatlar, bahis seviyeleri, RTP, para birimi |
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

- [x] Oyun lobisi (katalog, kategoriler, arama, favoriler)
- [x] Kullanıcı hesapları ve kalıcı bakiye
- [x] Görev/puan sistemi
- [ ] Gerçek veritabanı (Postgres) — `server/store/memory.js` yerine adaptör
- [ ] E-posta / telefon doğrulama, parola sıfırlama
- [x] Çok oyunculu Texas Hold'em ve Blackjack
- [x] Yönetim paneli ve bakiye yönetimi
- [x] Seviye/XP ve detaylı profil
- [ ] Rulet motoru (masa yapısı hazır)
- [ ] Liderlik tablosu ve turnuvalar
- [ ] Arkadaş listesi ve doğrudan mesaj
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
