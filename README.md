# 🎰 AURUM — Sosyal Casino Platformu

Mobil öncelikli bir casino sitesi ve içindeki tam sürüm slot oyunu.
**Node.js** sunucu üzerinde çalışır, **PWA** olarak sunulur ve **Capacitor** ile
Android/iOS uygulamasına dönüştürülebilir.

Dört katman vardır:

1. **Site (AURUM)** — lobi, 107 oyunluk katalog, kategoriler, arama, favoriler,
   üyelik, kalıcı bakiye, detaylı profil ve görev/puan sistemi.
2. **Slotlar** — üç tam oynanabilir motor, hepsi sunucu taraflı RNG ile.
   Her oyunun kendi teması, paleti ve arayüzü vardır:
   - **Lucky Reels** — 5x3, 20 sabit hat; bedava dönüşler ve Jackpot Cards bonusu.
   - **7 HOT · Çan Zinciri** — 5x4, 40 hat; scatter tutmalı respin, "tut ve kazan"
     çan turu ve dört kademeli jackpot merdiveni.
   - **YILDIRIM · Göklerin Öfkesi** — 6x5, **hat yok** (8+ sembol nerede olursa ödüyor);
     tumble (patla-düş-doldur) ve gökten yıldırımla inen çarpan küreleri.
     Bedava dönüşte çarpan birikir.
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
| **Site** | 107 oyunluk katalog, 8 kategori, 8 sağlayıcı, arama, favoriler, görevler |
| **Canlı** | Texas Hold'em ve Blackjack, WebSocket, özel masa + davet kodu, bot koltukları |
| **Yönetim** | Kullanıcı/bakiye yönetimi, RTP ve masa ayarları, bakiye kayıt defteri |
| **Para birimi** | TL (₺) varsayılan; USD/EUR/Çip seçilebilir — yalnızca gösterim |
| **Testler** | 82 birim testi + 16 uçtan uca canlı masa testi (`npm test`) |
| **Üyelik** | Kayıt/giriş (scrypt), kalıcı bakiye, misafirden hesaba yükseltme |
| **Puan** | Satılmaz — yalnızca görevlerle ve oyun kazançlarıyla elde edilir |
| **Lucky Reels** | 5×3, 20 hat · bedava dönüş (x3, retrigger) · Jackpot Cards · RTP ~%95,8 |
| **7 HOT** | 5×4, 40 hat · scatter tutmalı respin · Çan Zinciri (tut & kazan) · RTP ~%95,6 |
| **YILDIRIM** | 6×5, hat yok · tumble · biriken çarpan küreleri · RTP ~%95,4 |
| **Jackpotlar** | Lucky Reels: 4 progresif havuz · 7 HOT: Mini/Minör/Majör sabit + Grand progresif |
| **Kapaklar** | 107 oyunun kapağı vektörel üretilir — tek bayt görsel dosyası yok |
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
    session.js          Bir spinin oyuncu durumuna etkisi (sunucu + demo ortak)
    rng.js              Kriptografik / doğrulanabilir / deterministik RNG
  games/sevenhot/       7 HOT · Çan Zinciri (5x4, 40 hat)
    config.js           Semboller, ödeme tablosu, çan değerleri, jackpot merdiveni, şeritler
    paylines.js         40 sabit ödeme hattı
    engine.js           Çevirme, hat/scatter değerlendirme, tutmalı respin, çan turu
    session.js          Tur akışı: bakiye, bedava dönüş, jackpot muhasebesi
  games/yildirim/       YILDIRIM · Göklerin Öfkesi (6x5, hat yok)
    config.js           Semboller, ödeme tablosu, hücre ağırlıkları, küre merdiveni
    engine.js           Izgara üretimi, 8+ sayımı, tumble/yerçekimi, küre düşürme
    session.js          Tur akışı: çarpan kuralı (temel / bedava dönüş), tavan
  routes/game.js        Lucky Reels REST API
  routes/sevenhot.js    7 HOT REST API
  routes/yildirim.js    YILDIRIM REST API
  store/memory.js       Oyuncu deposu (bellek + JSON dosyası)
public/
  css/site.css          Tasarım sistemi: açık tema varsayılan, koyu tema
                        `<html data-theme="dark">` ile açılır. Tüm sayfalar
                        aynı token setini (renk, gölge, yarıçap) kullanır.
  index.html            Site (lobi) iskeleti
  game.html             Lucky Reels oyun sayfası
  sevenhot.html         7 HOT · Çan Zinciri oyun sayfası
  yildirim.html         YILDIRIM · Göklerin Öfkesi oyun sayfası
  live.html             Canlı masa (poker / blackjack)
  admin.html            Yönetim paneli
  css/site.css          Site tasarım sistemi
  css/style.css         Oyun teması
  js/site.js            Lobi yönlendiricisi ve görünümleri
  js/live.js            Canlı masa arayüzü (WebSocket istemcisi)
  js/admin.js           Yönetim paneli arayüzü
  js/cover.js           Oyun kapaklarının vektörel üreticisi
  js/icons.js           Arayüz ikonları
  js/app.js             Lucky Reels akışı ve arayüz mantığı
  js/reels.js           Makara animasyonu (Web Animations API)
  js/symbols.js         SVG sembol sprite'ı (meyve seti ortak)
  js/sevenhot.js        7 HOT tur canlandırması (respin, çan turu, bedava dönüş)
  js/sevenhot-reels.js  5x4 makara + makara tutma + kilitli çan tahtası
  js/sevenhot-symbols.js  BAR, alevli 7, alevli WILD ve çan ailesi
  js/yildirim.js        Tumble canlandırması, küre toplama, biriken çarpan
  js/yildirim-symbols.js  Altın kabartmalar (boğa, miğfer, kartal, kurs) + fasetli taşlar
  img/                  YILDIRIM'a ait kapak, logo ve arka plan görselleri
  js/audio.js           Web Audio ile sentezlenen ses efektleri
  js/api.js             Sunucu iletişimi
  js/env.js             API adresi ve demo modu bayrağı
  js/demo.js            Sunucusuz demo arka ucu (GitHub Pages sürümü)
  sw.js                 Service worker (offline kabuk)
tools/simulate.js       Lucky Reels RTP / volatilite simülasyonu
tools/simulate-7hot.js  7 HOT RTP simülasyonu (bileşen bileşen döküm)
tools/simulate-yildirim.js  YILDIRIM RTP simülasyonu (tumble dağılımı dahil)
tools/test-hands.js     El değerlendirici testleri
tools/test-holdem.js    Hold'em motoru testleri (çip korunumu dahil)
tools/test-blackjack.js Blackjack testleri
tools/test-sevenhot.js  7 HOT tur değişmezleri (bakiye, çan tahtası, jackpot kuralları)
tools/test-yildirim.js  YILDIRIM tur değişmezleri (tumble bütünlüğü, çarpan kuralı, tavan)
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

**Oyun kapakları:** Katalogdaki 107 oyunun neredeyse tamamı için görsel dosyası yoktur.
Her oyunun bir **palet** (16 seçenek) ve **motif**i (24 seçenek) vardır;
`public/js/cover.js` bunlardan arka plan, ışık huzmeleri, motif ve altın konturlu
başlık kilidi olan bir SVG üretir. Kendi kapak görseli tanımlanmış oyunlar
(`COVER_IMAGES`) bu üretimi atlar — şu an yalnızca YILDIRIM.

**Not:** Şu an tam olarak oynanabilen oyunlar **Lucky Reels**, **7 HOT · Çan Zinciri**
ve **YILDIRIM · Göklerin Öfkesi**'dir.
Katalogdaki diğer oyunlar site yapısını, kategori akışını ve arama deneyimini göstermek
için durur; oyun detay sayfasında bu açıkça belirtilir.

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

### Lucky Reels (5×3, 20 hat)

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

**Scatter (💲 Dolar)** — toplam bahis çarpanı: 3× → 1,5 · 4× → 7 · 5× → 40.
Ekranda 2–4 scatter varsa **scatter'lı makaralar tutulur** ve kalanlar yeniden döner.
Makaralar **en az 2 tur** döner — yeni scatter gelmese bile; 5 scatter'a ulaşılırsa
dizi hemen biter. 3 scatter **7 bedava dönüş** verir (4 scatter: 13, 5 scatter: 22).

**Jackpot Cards** — her ücretli dönüşün ardından rastgele tetiklenir. Aynı türden 3 kart
açan oyuncu ilgili progresif havuzu kazanır: ♣ Sinek, ♦ Karo, ♥ Kupa, ♠ Maça.
Bahsin %1'i havuzlara aktarılır.

### 7 HOT · Çan Zinciri (5×4, 40 hat)

Meyve slotu + **tut ve kazan** (hold & win) çan turu. Bu mekanik ailesi sektörde
yaygındır; buradaki semboller, oranlar, ödeme tablosu ve denge bu projeye özgüdür.

**Ödeme tablosu** (hat bahsi çarpanı — toplam bahis / 40):

| Sembol | 3× | 4× | 5× |
|---|---|---|---|
| 7️⃣ Yedi | 40 | 200 | 1000 |
| 🟨 Bar | 25 | 120 | 600 |
| 🍉 Karpuz | 15 | 60 | 300 |
| 🍇 Üzüm | 12 | 45 | 220 |
| 🍊 Portakal | 6 | 27 | 130 |
| 🫐 Erik | 6 | 27 | 130 |
| 🍋 Limon | 4 | 15 | 80 |
| 🍒 Kiraz | 4 | 15 | 80 |

**WILD** yalnızca 2., 3. ve 4. makarada görünür; scatter ve çan yerine geçmez.

**Scatter (💲 Dolar)** — toplam bahis çarpanı: 3× → 2, 4× → 10, 5× → 50.
Ekranda 2–4 scatter varsa **scatter'lı makaralar tutulur**, kalanlar yeniden döner;
yeni scatter gelmezse respin biter. 3 scatter 8, 4 scatter 15, 5 scatter 25
**bedava dönüş** verir. Bedava dönüş şeritlerinde çan bulunmaz.

**Çan Zinciri** — ekrana 5 çan düşerse tur başlar. Çanlar kilitlenir, boş kareler
döner; her yeni çan sayacı 3 dönüşe sıfırlar. Tur sonunda tüm çanlar ödenir.

- Ekran tamamen dolarsa nakit çanlar **x3** (Boost çanı varsa **x4**) çarpanla ödenir.
- **Boost** çanı tur sonunda toplam bahsin 10 katı nakde döner.
- **Grand** çanı bilerek sık düşer ama tek başına ödemez: jackpot için ekranda
  **3 tane** gerekir. Olmazsa her biri toplam bahsin 15–35 katı nakde döner.

**Jackpot merdiveni** — Mini (bahsin 12 katı), Minör (34), Majör (300) **sabit**
katlardır; böylece her bahis seviyesinde adil çalışırlar. Grand tek **progresif**
havuzdur ve her dönüşün %1,2'sinden beslenir.

Tutarlar bilerek küçük tutulur, karşılığında jackpot çanları **sık** düşer:
Mini 1/747 dönüş, Minör 1/2.217, Majör 1/30.303, Grand 1/95.238. Oyuncu bir
oturumda gerçekten jackpot görür — büyük ama hiç gelmeyen bir merdiven yerine
kademeli ve ulaşılabilir bir yapı tercih edildi.

4 milyon dönüşlük ölçüm: hat %46,3 · scatter %5,1 · bedava dönüş %7,4 ·
Çan Zinciri %36,9 → **toplam %95,6**.

### YILDIRIM · Göklerin Öfkesi (6×5, hat yok)

Hat yoktur: bir sembolden ekranın **herhangi bir yerinde 8 veya daha fazla** varsa öder.
Kazananlar patlar, üsttekiler düşer, boşluklar dolar — kazanç kalmayana kadar (**tumble**).

**Ödeme tablosu** (toplam bahis çarpanı):

| Sembol | 8-9 | 10-11 | 12+ |
|---|---|---|---|
| 🐂 Boğa | 4 | 12 | 30 |
| ⛑️ Tunç Miğfer | 1,6 | 5 | 15 |
| 🦅 Çift Başlı Kartal | 1 | 3 | 9 |
| ☀️ Güneş Kursu | 0,7 | 1,8 | 6 |
| 🔴 Kor Taşı | 0,46 | 1,25 | 4,2 |
| 🟣 Mor Taş | 0,35 | 0,9 | 3 |
| 🟡 Kehribar | 0,26 | 0,62 | 2,3 |
| 🟢 Zümrüt | 0,19 | 0,47 | 1,7 |
| 🔵 Gök Taşı | 0,13 | 0,31 | 1,15 |

**Çarpan küreleri** — x2'den x500'e kadar değer taşır. Ödeme yapmaz, kazançla patlamaz,
yerçekimiyle düşer. Bir küre ekrana geleceği zaman **gökten o hücreye bir yıldırım
düşer**: tahta beyaza boğulur, ekran sarsılır ve küre çarpma noktasında belirir.

- **Temel oyun:** tumble dizisi bittiğinde ekrandaki tüm kürelerin değeri toplanır ve
  o dizinin kazancını çarpar, sonra sıfırlanır.
- **Bedava dönüş:** toplam, tur boyunca yaşayan **kalıcı çarpana** eklenir ve bundan
  sonraki her kazancı çarpar. Kazançsız dönüşte düşen küreler de eklenir — oyunun
  en büyük kazançları buradan çıkar.

**Scatter (⚡ Yıldırım)** — 4× → 2, 5× → 10, 6× → 50 toplam bahis. 4 scatter 12,
5 scatter 18, 6 scatter 25 bedava dönüş verir. Scatter'lar tumble boyunca ekranda
kalıp birikir; bedava dönüşte 3+ scatter +5 dönüş ekler.

Tur başına en yüksek ödeme toplam bahsin **5.000 katıdır**.

1 milyon dönüşlük ölçüm: temel oyun %54,7 · bedava dönüş %40,7 → **toplam %95,4**.
Bedava dönüş 1/250 dönüş, kazanma sıklığı %46, ortalama 0,79 tumble.

### Testler

```bash
npm test                # 82 birim testi (el değerlendirici, Hold'em, Blackjack, 7 HOT, YILDIRIM)
npm run simulate        # Lucky Reels RTP / volatilite simülasyonu
npm run simulate:7hot   # 7 HOT RTP simülasyonu
npm run simulate:storm  # YILDIRIM RTP simülasyonu
```

Hold'em testleri arasında **~15.000 rastgele elde çip korunumu** kontrolü vardır;
bu test, yan potlarda çip kaybına yol açan gerçek bir hatayı yakaladı
(katkıda bulunanların hepsi çekildiğinde yan pot yok sayılıyordu).

7 HOT testi 300.000 turu oynatıp her turda bakiye muhasebesini, çan tahtasının
kapasitesini, Grand'ın üç-çan kuralını ve tam ekran çarpanının Majör/Grand'a
uygulanmadığını doğrular.

YILDIRIM testi 200.000 turda tumble bütünlüğünü (ödeyen her sembolün ızgarada
gerçekten o adette bulunması, dizinin kazançsız bitmesi, kürelerin ödeme sembolü
sayılmaması), iki ayrı çarpan kuralını ve kazanç tavanını doğrular.

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
| `GET` | `/api/config` | Lucky Reels: semboller, ödeme tablosu, hatlar, bahisler, RTP |
| `POST` | `/api/bet` | Lucky Reels bahis seviyesi değiştir |
| `POST` | `/api/spin` | Lucky Reels dönüşü → grid, kazançlar, bakiye |
| `GET` | `/api/jackpots` | Lucky Reels progresif havuzları |
| `GET` | `/api/sevenhot/config` | 7 HOT: semboller, ödeme tablosu, çan turu kuralları, jackpot merdiveni |
| `GET` | `/api/sevenhot/state` | 7 HOT: bahis ve kalan bedava dönüş |
| `POST` | `/api/sevenhot/bet` | 7 HOT bahis seviyesi değiştir |
| `POST` | `/api/sevenhot/spin` | 7 HOT turu → temel çevirme + respin adımları + çan turu |
| `GET` | `/api/sevenhot/jackpots` | 7 HOT jackpot merdiveni (bahse göre) |
| `GET` | `/api/yildirim/config` | YILDIRIM: semboller, ödeme tablosu, küre merdiveni, kurallar |
| `GET` | `/api/yildirim/state` | YILDIRIM: bahis, kalan bedava dönüş, kalıcı çarpan |
| `POST` | `/api/yildirim/bet` | YILDIRIM bahis seviyesi değiştir |
| `POST` | `/api/yildirim/spin` | YILDIRIM turu → ilk ızgara + tüm tumble adımları + çarpan |
| `POST` | `/api/fair/client-seed` | İstemci tohumunu değiştir |
| `POST` | `/api/fair/rotate` | Sunucu tohumunu açıkla ve yenile |

**Neden sunucu tarafı?** İstemci hiçbir zaman sonucu üretmez. Bakiye, bahis kontrolü,
RNG, ödeme hesabı ve jackpot havuzları tamamen sunucudadır; istemciye yalnızca
sonuç gönderilir. Böylece tarayıcı konsolundan bakiye veya sonuç değiştirilemez.

7 HOT ve YILDIRIM'da bir tur **tek istekte** baştan sona sunucuda çözülür ve
istemciye adım adım canlandırılacak bir betimleme döner (7 HOT: çevirme → tutmalı
respin → Çan Zinciri; YILDIRIM: ilk ızgara → tumble adımları → çarpan hesabı). Ara durum istemcide tutulmadığı için kurcalanacak bir şey kalmaz ve
bağlantı koparsa bakiye tutarlı kalır.

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
