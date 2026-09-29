# Erqan — Yeniden Yazım Planı

> Durum: **Taslak / tartışmada** — kodlamaya başlanmadı.
> Son güncelleme: 2026-09-29

Bu belge, mevcut projenin incelenmesinden çıkan özellikleri, alınan kararları, yeni sistemin tasarımını ve tartışılacak yeni özellikleri içerir.

**Ana ilke:** Sistemdeki tüm sayısal değerler, kurallar ve özellik anahtarları **admin panelindeki Ayarlar** üzerinden yönetilir. Kodda sabit (hard-coded) iş kuralı bulunmaz.

---

## 1. Mevcut Sistemden Anlaşılan Özellikler

### Hesap
- E-posta + şifre ile kayıt / giriş (PocketBase auth)
- Her kullanıcının **kredi** bakiyesi var (USD)
- Profilde ad ve e-posta düzenleme

### Satın Alma (Dashboard)
Merkezi stoktan 3 mülk tipi satılıyor:

| Tip | Kiracı kapasitesi | Açıklama |
|---|---|---|
| Arsa | 1 | Evler bitince üzerine ev yapılabilir |
| Ev | 2 | Almak için önce 5 kez kirada kalmak gerekir |
| Ev Premium | 5 | Şartsız, direkt alınır |

- Fiyat ve kalan adet `settings` koleksiyonundan geliyor
- Satın alınca kredi düşüyor, stok azalıyor

### Mülklerim
- Sahip olunan mülklerde kira fiyatı / satış fiyatı düzenleme
- Durumu "Boş" ↔ "Kiralık" değiştirme
- "Kiraladıklarım" sekmesi

### Kiralık Mülkler
- Başkalarının kiralık mülklerini listeleme ve kiralama (30 gün)
- Kiracı limiti dolunca mülk "Kirada" olur
- Süre dolunca kiracı çıkarılır

### PWA
- Kurulabilir uygulama, offline desteği, bildirimler
- Türkçe arayüz, masaüstünde sidebar, mobilde alt menü

### Mevcut sistemde yarım / eksik kalanlar
- "Satılık" durumu ve satış fiyatı var ama kullanıcılar arası satış yok
- "Para Yükle" butonu çalışmıyor
- Arsaya ev inşası yok
- Kira geliri ev sahibine gitmiyor (para kayboluyor)
- "5 kira şartı" hiçbir yerde kontrol edilmiyor
- Admin paneli yok

### Eski koddaki kritik sorunlar (yeniden yazım gerekçesi)
- Kredi, stok ve başkasının mülkü **istemciden** güncelleniyor → herkes kendine sınırsız kredi verebilir
- İşlemler atomik değil, eşzamanlı işlemlerde stok/kiracı listesi bozuluyor
- `pb_hooks` cron'u çalışmıyor (yanlış API, cron değil)
- Service worker var olmayan ikonları cache'lediği için kurulamıyor

### erqan.com tanıtım sitesinden çıkarımlar
Tanıtım sitesi (https://erqan.com/) ürünü şöyle konumluyor: *"Emlak yatırımlarınızı sanal dünyada yönetin"*.

- Bu repo, sitedeki **"Giriş" / "Kaydol"** butonlarının yönlendirdiği paneldir: `https://panel.erqan.com/`
- Vaat edilen akış: **Kolay kayıt → Mülk seçimi → Kira belirleme → Ödeme tahsili**. Panel bu akışı birebir karşılamalı.
- Sitede **"arsa, ev veya villa"** geçiyor. Panelde villa tipi yok, bu yüzden mülk tipleri admin'den yönetilebilir olmalı (bkz. `property_types`).
- Sitede **Avrupa, Asya, Amerika ve Afrika'da birçok ülke** geçiyor. Panelde konum kavramı yok, bu bir **ülke/şehir/konum** özelliğine işaret ediyor (bkz. Bölüm 7).
- Sitede *"kira fiyatını konum, rekabet ve özelliklere göre belirleyin"* deniyor. Konum ve özellik alanları bu yüzden anlamlı.
- **"Gerçek zamanlı kazanç takibi"** ve **"portföy yönetimi"** vaat ediliyor. Bunun için panelde bir kazanç/portföy özeti gerekiyor.
- **"Mobil uygulama"** vaat ediliyor. Bunu PWA karşılayabilir.
- Menüde bir **"Paketler"** bölümü var ama içeriği yok. Satın alma seçenekleri (mülk tipleri) orada listelenebilir.
- Sitedeki sorunlar (panel dışında): menü linklerinin hepsi ana sayfaya gidiyor, `/hakimizda/` sayfası 404 veriyor, sitede fiyat ve kural bilgisi yok.

---

## 2. Sorulan Sorular ve Kararlar

| # | Soru | Karar |
|---|---|---|
| 1 | Backend olarak ne kullanılsın? (PocketBase / Next.js API + PostgreSQL / Supabase) | **PocketBase kalsın** — iş mantığı PocketBase hook'larına taşınacak |
| 2 | Kredi kullanıcıya nasıl yüklenecek? (Admin elle / Online ödeme / Şimdilik yok) | **Şimdilik yok** — ödeme entegrasyonu yok; admin panelinden manuel düzeltme yapılabilir |
| 3 | Yeni sürümde hangi ek özellikler olsun? | **Admin paneli**, **Kira sahibe aktarılsın**, **Kullanıcılar arası satış**, **Arsaya ev inşası** |
| 4 | Kira nasıl işlesin? (Tek seferlik 30 gün / Otomatik yenileme) | **Otomatik yenileme** — her dönem bakiyeden tahsil, yetmezse kira biter |
| 5 | Admin neyi yönetecek? | **Her şeyi** — tüm kurallar Ayarlar'dan yönetilir (bkz. Bölüm 5) |
| 6 | PocketBase sürümü / mevcut veriler? | **PocketBase en güncel sürümle sıfırdan kurulacak**, `api.erqan.com` şu an boş — veri taşıma yok |
| 7 | Hangi yeni özellikler ilk sürüme girsin? | **Yüksek ve orta öncelikli özelliklerin tamamı** (bkz. Bölüm 7) |
| 8 | Deploy nereye, nasıl? | **Doğrudan production** (Dokploy), domain'ler `api.erqan.com` / `panel.erqan.com`; repo herkese açık kalabilir |
| 9 | Tasarım sistemi? | **Material Design 3** (m3.material.io), token + mevcut bileşenler yöntemiyle (bkz. Bölüm 10) |
| 10 | M3 ana (seed) rengi? | **erqan.com'un ana rengi `#0F91E3`** (admin ayarlardan değiştirebilir) |
| 11 | Mülk görseli yokken parsel çizimi? | **Kaldırıldı**; düz M3 yer tutucu (tip ikonu + tonal konteyner) |

### Varsayılan kabul edilenler (admin ayarından değiştirilebilir)
- Para birimi: **USD** (sembol ayarlardan değiştirilebilir)
- Arsaya inşaat: varsayılan **her zaman açık**; "yalnızca hedef tipin stoğu 0 iken" seçeneği ayarlarda
- Çalışma şekli: yeni **`rewrite`** branch'i

### Henüz cevaplanmamış sorular
- [ ] erqan.com'daki "Paketler" bölümünde ne gösterilmeli? (Önerilen: mülk tipleri ve fiyatları)

---

## 3. Mimari

```
┌─────────────────────┐        ┌──────────────────────────────┐
│  Next.js (sadece UI) │ ─────► │ PocketBase (api.erqan.com)   │
│  - sayfalar          │  HTTP  │  - pb_migrations (şema)      │
│  - admin paneli      │        │  - pb_hooks                  │
│  - PWA               │        │     • özel endpoint'ler      │
└─────────────────────┘        │     • cron (kira tahsilatı)  │
                               │     • transaction'lar        │
                               └──────────────────────────────┘
```

- **Tüm para/stok/sahiplik değiştiren işlemler** yalnızca PocketBase özel endpoint'lerinde (`routerAdd`) ve `$app.runInTransaction` içinde yapılır.
- **API kuralları kilitli:** istemci `credit`, `settings`, başkasının mülkü, `rentals`, `transactions` üzerinde doğrudan yazma yapamaz.
- **Şema kodda:** `pb_migrations/` ile versiyonlanır.
- **Cron:** `cronAdd` ile düzenli çalışır (kira tahsilatı, süre kontrolü).
- **Her kredi hareketi** `transactions` tablosuna yazılır (denetlenebilirlik).

### Özel endpoint'ler (taslak)

| Endpoint | Açıklama |
|---|---|
| `POST /api/erqan/buy` | Merkezi stoktan mülk satın al |
| `POST /api/erqan/rent` | Mülk kirala |
| `POST /api/erqan/rent/cancel` | Kirayı sonlandır |
| `POST /api/erqan/listing` | Mülkü kiralık / satılık / boş yap, fiyat belirle |
| `POST /api/erqan/purchase-listing` | Başka kullanıcının satılık mülkünü satın al |
| `POST /api/erqan/build` | Arsaya ev inşa et |
| `POST /api/erqan/upgrade` | Mülke yükseltme uygula |
| `POST /api/erqan/offer` | Satılık mülke teklif ver |
| `POST /api/erqan/offer/respond` | Teklifi kabul et / reddet / geri çek |
| `POST /api/erqan/notifications/read` | Bildirimleri okundu işaretle |
| `GET /api/erqan/portfolio` | Portföy ve kazanç özeti |
| `GET /api/erqan/users/:id/public` | Herkese açık kullanıcı profili |
| `POST /api/erqan/admin/*` | Admin işlemleri (ayar, kredi düzeltme, kullanıcı yönetimi) |

---

## 4. Veri Modeli (taslak)

### `users`
| Alan | Tip | Not |
|---|---|---|
| name | text | |
| credit | number | Yalnızca sunucu yazar |
| role | select (`user`, `admin`) | |
| rent_count | number | Tamamlanan/ödenen kira dönemi sayısı |
| banned | bool | Admin tarafından engelleme |
| referral_code | text (benzersiz) | Davet kodu |
| referred_by | relation → users | Davet eden kullanıcı |
| reputation | number | İtibar puanı (ödenen kira, tamamlanan satış vb. ile artar) |

### `property_types`
Mülk tipleri sabit kodlanmaz, admin tarafından yönetilir.

| Alan | Tip | Not |
|---|---|---|
| key | text | `land`, `home`, `home_premium` … |
| name | text | Görünen ad |
| description | text | |
| price | number | Taban satış fiyatı (şehir çarpanı ile çarpılır) |
| tenant_limit | number | Kiracı kapasitesi |
| required_rent_count | number | Satın almak için gereken kira sayısı (Ev = 5) |
| buildable_to | relation → property_types | Arsa → Ev gibi dönüşüm hedefi |
| build_cost | number | İnşaat maliyeti |
| active | bool | Satışa açık mı |
| sort | number | Görünüm sırası |
| image | file | |

### `properties`
| Alan | Tip | Not |
|---|---|---|
| owner | relation → users | |
| type | relation → property_types | |
| city | relation → cities | |
| name | text | |
| status | select (`empty`, `rent`, `rented`, `sale`) | |
| rent_price | number | |
| sale_price | number | |
| tenant_limit | number | Tip limiti + yükseltmelerden gelen ek |
| area_m2 | number | Mülk özelliği |
| rooms | number | Mülk özelliği |
| features | json | Havuz, bahçe, otopark vb. (liste admin'den yönetilir) |
| image | file | |

### `continents` / `countries` / `cities`
Konum hiyerarşisi, admin tarafından yönetilir.

| Koleksiyon | Alanlar |
|---|---|
| `continents` | name, sort, active |
| `countries` | continent, name, code, flag, active |
| `cities` | country, name, price_multiplier, active |

### `city_stock`
Her şehirde her mülk tipinden kaç adet satılabileceği.

| Alan | Tip | Not |
|---|---|---|
| city | relation → cities | |
| type | relation → property_types | |
| stock | number | Kalan adet |

Satış fiyatı: `property_types.price × cities.price_multiplier`

### `upgrades`
Admin'in tanımladığı yükseltme kataloğu.

| Alan | Tip | Not |
|---|---|---|
| name | text | ör. "Ek oda", "Havuz" |
| description | text | |
| cost | number | |
| tenant_limit_bonus | number | Kiracı kapasitesine ek |
| rent_cap_bonus_pct | number | Maksimum kira fiyatına % ek |
| applicable_types | relation → property_types (çoklu) | |
| max_per_property | number | |
| active | bool | |

### `property_upgrades`
| Alan | Tip |
|---|---|
| property | relation → properties |
| upgrade | relation → upgrades |
| paid | number |

### `offers`
| Alan | Tip | Not |
|---|---|---|
| property | relation → properties | |
| buyer | relation → users | |
| amount | number | Teklif anında alıcının bakiyesinden **bloke edilir** |
| status | select (`pending`, `accepted`, `rejected`, `withdrawn`, `expired`) | |
| expires | date | Süre: admin ayarı |

### `notifications`
| Alan | Tip | Not |
|---|---|---|
| user | relation → users | |
| kind | text | `rent_charged`, `rent_warning`, `rent_ended`, `new_tenant`, `sold`, `offer_received` … |
| title | text | |
| body | text | |
| link | text | Uygulama içi yönlendirme |
| read | bool | |

PocketBase realtime ile anlık gelir (sayfa yenilemeden).

### `rentals`
| Alan | Tip | Not |
|---|---|---|
| property | relation → properties | |
| tenant | relation → users | |
| price | number | Kiralama anındaki fiyat |
| started | date | |
| next_charge | date | Bir sonraki tahsilat |
| active | bool | |
| cancel_at_period_end | bool | Kiracı iptal etti, dönem sonunda yenilenmeyecek |
| warned | bool | Bu dönem için "bakiye yetersiz" uyarısı gönderildi mi |
| ended_reason | select (`cancelled`, `insufficient_credit`, `sold`, `admin`) | |

### `transactions`
| Alan | Tip | Not |
|---|---|---|
| user | relation → users | |
| amount | number | + / − |
| kind | select (`purchase`, `rent_pay`, `rent_income`, `sale`, `sale_income`, `build`, `upgrade`, `offer_hold`, `offer_release`, `referral_bonus`, `signup_bonus`, `commission`, `admin_adjust`) | |
| ref_property | relation → properties | |
| note | text | |

### `settings` (tek kayıt)
Bkz. Bölüm 5.

---

## 5. Admin Ayarları — Admin Her Şeyi Yönetir

Admin paneli `/admin` altında, yalnızca `role = admin` kullanıcılar erişebilir.

### Genel
- Site adı, logo, tema rengi
- Para birimi sembolü (varsayılan: USD)
- Bakım modu (açık/kapalı + mesaj)
- Yeni kayıt açık/kapalı
- Yeni kullanıcıya başlangıç kredisi

### Mülk tipleri (`property_types`)
- Yeni tip ekleme / düzenleme / pasifleştirme
- Taban fiyat, kiracı limiti, açıklama, görsel
- Satın alma şartı (gereken kira sayısı)
- Dönüşüm hedefi ve inşaat maliyeti (Arsa → Ev)
- Varsayılan tohum verisi: Arsa, Ev, Ev Premium, Villa

### Konumlar
- Kıta / ülke / şehir ekleme, düzenleme, pasifleştirme
- Şehir fiyat çarpanı
- Şehir × mülk tipi stok tablosu (toplu düzenleme)

### Mülk özellikleri ve yükseltmeler
- Seçilebilir özellik listesi (havuz, bahçe, otopark …)
- Yükseltme kataloğu: ad, maliyet, kiracı kapasitesi bonusu, kira tavanı bonusu, uygulanabilir tipler, mülk başına üst sınır

### Teklifler
- Teklif sistemi açık/kapalı
- Teklif geçerlilik süresi (gün)
- Minimum teklif (satış fiyatının %'si)
- Kullanıcı başına aynı anda en fazla bekleyen teklif sayısı

### Bildirimler
- Kira bitmeden uyarı: kaç gün önce
- Hangi olayların bildirim üreteceği (olay bazında aç/kapa)

### Referans (davet) sistemi
- Açık/kapalı
- Davet edene bonus, davet edilene bonus
- Bonus şartı: kayıtta / davet edilen ilk kirasını ödediğinde / ilk mülkünü aldığında
- Kullanıcı başına maksimum davet bonusu

### İtibar puanı
- Her olayın puan değeri (ödenen kira, tamamlanan satış, iptal edilen kira vb.)

### Kira kuralları
- Kira dönemi süresi (gün) — varsayılan 30
- Otomatik yenileme açık/kapalı
- Bakiye yetmezse: kira hemen bitsin / X gün tolerans
- Minimum / maksimum kira fiyatı
- Kira komisyonu (%) — sistemin kesintisi
- Kullanıcı başına maksimum aktif kira sayısı

### Satış kuralları
- Kullanıcılar arası satış açık/kapalı
- Satış komisyonu (%)
- Minimum / maksimum satış fiyatı
- Kiracısı olan mülk satılabilir mi (evet → kiracılar yeni sahibe devredilir / hayır → engellenir)

### İnşaat kuralları
- Arsaya inşaat açık/kapalı
- İnşaat şartı: her zaman / yalnızca hedef tipin stoğu 0 iken
- İnşaat süresi (anında / X gün sonra tamamlanır)

### Özellik anahtarları (feature flags)
- Satın alma, kiralama, satış, teklif, inşaat, yükseltme, referans, herkese açık profil, PWA bildirimleri — her biri ayrı ayrı açılıp kapatılabilir

### Kullanıcı yönetimi
- Kullanıcı listesi, arama
- Kredi ekleme / çıkarma (sebep notu zorunlu, `transactions`'a yazılır)
- Rol değiştirme (user/admin)
- Kullanıcıyı engelleme

### Mülk ve kira yönetimi
- Tüm mülkleri görme, sahibini değiştirme, silme
- Aktif kiraları görme, zorla sonlandırma

### Raporlar
- İşlem geçmişi (filtrelenebilir)
- Toplam dolaşımdaki kredi, komisyon geliri, satılan/kalan stok, aktif kira sayısı
- Şehir/ülke bazında dağılım, bekleyen teklifler, referans istatistikleri

---

## 6. İş Kuralları

### Merkezi stoktan satın alma
1. Kullanıcı şehir ve mülk tipi seçer
2. Özellik açık mı, tip ve şehir aktif mi, `city_stock` > 0 mı?
3. Kullanıcının `rent_count ≥ required_rent_count` mı?
4. Fiyat = `tip.price × şehir.price_multiplier`; kredi yeterli mi?
5. **Tek transaction:** kredi düş → şehir stoğu −1 → mülk oluştur (`empty`) → `transactions` kaydı

### Kiralama
1. Mülk `rent` durumunda mı, kiracı limiti dolmamış mı, kiracı sahibi değil mi, zaten kiralamamış mı?
2. İlk dönem ücreti tahsil edilir: kiracıdan düş → komisyon ayrıldıktan sonra sahibe ekle
3. `rentals` kaydı (`next_charge = şimdi + dönem`), kiracının `rent_count` +1
4. Limit dolduysa mülk `rented`

### Otomatik kira tahsilatı (cron, her saat)
- `next_charge ≤ şimdi` olan aktif kiralar için:
  - Kiracı iptal etmişse (`cancel_at_period_end`) → kira biter, tahsilat yapılmaz
  - Bakiye yeterli → tahsil et, sahibe aktar, `next_charge` ileri al, `rent_count` +1, itibar +
  - Yetersiz → kira biter (`insufficient_credit`), mülk tekrar `rent` olur, iki tarafa bildirim
- `next_charge` tarihine uyarı süresi kadar kalmış ve bakiye yetmiyorsa → bir kez "bakiye yetersiz" uyarısı

### Kiracının iptali
- Kiracı "iptal et" der → `cancel_at_period_end = true`; dönem sonuna kadar kiracı kalır, sonra yenilenmez
- Dönem bitmeden vazgeçerse iptali geri alabilir

### Kullanıcılar arası satış
- Sahip mülkü `sale` yapar ve fiyat belirler
- Alıcı öder → komisyon ayrılır → satıcıya aktarılır → sahiplik değişir → mülk `empty` olur
- Bekleyen tüm teklifler `expired` olur, bloke edilen tutarlar sahiplerine iade edilir

### Teklif sistemi
- Alıcı satılık mülke teklif verir → tutar bakiyesinden bloke edilir (`offer_hold`)
- Sahip kabul eder → satış akışı teklif tutarıyla çalışır
- Sahip reddeder / alıcı geri çeker / süre dolar → bloke iade edilir (`offer_release`)

### Arsaya ev inşası
- Arsa sahibi, `build_cost` öder → mülkün tipi hedef tipe (Ev) dönüşür, kiracı limiti güncellenir
- Ayar "yalnızca hedef tipin stoğu 0 iken" ise o şehirdeki hedef tip stoğu kontrol edilir

### Yükseltme
- Yükseltme mülk tipine uygun mu, mülk başına üst sınır aşılmadı mı, kredi yeterli mi?
- Kredi düş → `property_upgrades` kaydı → mülkün `tenant_limit` değeri artar

### Referans
- Kayıtta davet kodu girilirse `referred_by` bağlanır
- Admin'in seçtiği şart gerçekleşince (kayıt / ilk kira / ilk mülk) iki tarafa bonus, bir kez

### Portföy / kazanç paneli
- Toplam mülk değeri (satın alma fiyatı + yükseltmeler), aylık kira geliri, aktif kiracı sayısı
- Son 12 ayın gelir/gider grafiği (`transactions` üzerinden)

---

## 7. Yeni Özellikler

Her özellik admin ayarlarından açılıp kapatılabilir şekilde tasarlanır.

### ✅ İlk sürüm — Tanıtım sitesiyle uyum (erqan.com'da vaat edilenler)
- [x] **Konum sistemi:** Admin kıta, ülke ve şehir tanımlar. Her şehrin kendi stoğu ve fiyat çarpanı olur. Mülk bir şehre bağlanır, kiralık listesi konuma göre filtrelenir.
- [x] **Villa tipi:** Admin'den eklenecek yeni bir mülk tipi (varsayılan tohum verisinde bulunur).
- [x] **Portföy / kazanç paneli:** Toplam mülk değeri, aylık kira geliri, aktif kiracılar ve gelir grafiği.
- [x] **Mülk özellikleri:** Metrekare, oda sayısı, havuz gibi alanlar.

### ✅ İlk sürüm — Yüksek öncelik
- [x] **Bildirim merkezi** — uygulama içi bildirimler: "kira tahsil edildi", "bakiye yetersiz, kira 3 gün sonra bitecek", "mülkün satıldı", "yeni kiracın var"
- [x] **Cüzdan / işlem geçmişi sayfası** — kullanıcı kendi `transactions` kayıtlarını görür
- [x] **Kira bitmeden uyarı** — bakiye bir sonraki tahsilata yetmiyorsa önceden uyarı (kaç gün önce: admin ayarı)
- [x] **Kiracının kirayı iptal etmesi** — dönem sonunda yenilenmez

### ✅ İlk sürüm — Orta öncelik
- [x] **Mülk detay sayfası** — görsel, geçmiş kiracılar, gelir grafiği
- [x] **Mülk yükseltmeleri** — kiracı kapasitesini veya kira değerini artıran ücretli yükseltmeler (yükseltme listesi admin'den yönetilir)
- [x] **Teklif sistemi** — satılık mülke fiyat teklifi verme, sahibin kabul/ret etmesi
- [x] **Arama ve filtreler** — kiralık/satılık listesinde tip, konum, fiyat aralığı, sıralama
- [x] **Kullanıcı profili (herkese açık)** — sahip olduğu mülk sayısı, itibar puanı
- [x] **Referans (davet) sistemi** — davet eden ve edilen kullanıcıya bonus kredi (admin ayarı)

### Düşük öncelik / ileride
- [ ] **Online ödeme ile kredi yükleme** (Stripe / iyzico) — şimdilik kapsam dışı
- [ ] **Günlük giriş ödülü** — admin ayarlı miktar
- [ ] **Liderlik tablosu** — en çok mülk / en yüksek kira geliri
- [ ] **Harita / şehir görünümü** — mülklerin konumlandırıldığı görsel bir harita
- [ ] **Çoklu dil** (TR / EN)
- [ ] **Push bildirimleri** (PWA Web Push)
- [ ] **Denetim kaydı (audit log)** — admin işlemlerinin kaydı

---

## 8. Uygulama Aşamaları (taslak)

1. **Altyapı:** PocketBase (en güncel sürüm) ve panel için Dockerfile'lar + Dokploy servisleri, tüm koleksiyonların migration'ları, API kuralları, tohum verisi (tipler, örnek konumlar, ayarlar); Next.js projesi temizliği, tipli API katmanı, auth + route koruması
2. **Çekirdek:** Konum seçerek satın alma, mülklerim, kiralama, otomatik tahsilat cron'u, kira iptali, işlem kaydı, cüzdan sayfası
3. **Bildirimler:** Bildirim merkezi (realtime), kira uyarıları
4. **Admin paneli:** Tüm ayarlar, mülk tipleri, konumlar ve stok, yükseltme kataloğu, kullanıcı/kredi yönetimi, raporlar
5. **Pazar yeri:** Kullanıcılar arası satış, teklif sistemi, arama ve filtreler, arsaya inşaat, yükseltmeler
6. **Sosyal:** Mülk detay sayfası, herkese açık profil ve itibar, referans sistemi, portföy/kazanç paneli
7. **PWA ve cila:** İkonlar, doğru service worker, mobil deneyim
8. **Test:** Endpoint'ler için testler, kritik akışların uçtan uca testi

---

## 9. Deploy (Dokploy)

Build ve yayın **Dokploy** üzerinden yapılır (`panel.yezuri.com`). Dokploy'da **Erqan** projesi mevcut ve şu an boş (ortam: `production`).

Diğer projelerdeki düzen incelendi (ör. Türkiye Fındık): panel GitHub'dan **Dockerfile** ile build ediliyor, `main`'e push'ta **otomatik deploy** oluyor, domain'lerde TLS Cloudflare tarafında.

### Servisler

| Servis | Kaynak | Build | Port | Domain |
|---|---|---|---|---|
| `pocketbase` | GitHub `uzeyirrr/erqan-panel` | `pocketbase/Dockerfile` | 8090 | `api.erqan.com` |
| `panel` | GitHub `uzeyirrr/erqan-panel` | `Dockerfile` (Next.js standalone) | 3000 | `panel.erqan.com` |

**Neden PocketBase hazır imajla değil de repodan build ediliyor?** Diğer projelerde PocketBase hazır imajla (raw compose) kuruluyor. Erqan'da iş mantığı `pb_hooks` ve `pb_migrations` içinde olduğu için PocketBase de repodan build edilir. Böylece hook ve şema değişiklikleri push ile otomatik yayına çıkar, migration'lar açılışta kendiliğinden uygulanır.

- `pocketbase/Dockerfile`: resmi PocketBase binary'si (sürüm sabitlenir) + `COPY pb_hooks pb_migrations`
- `pb_data` kalıcı volume'a bağlanır, yeniden deploy'da veri kaybolmaz
- Superuser e-posta ve şifresi Dokploy ortam değişkeninde tutulur, repoda **asla** bulunmaz
- Panel build argümanı: `NEXT_PUBLIC_PB_URL=https://api.erqan.com`

### Gizli bilgiler
- Repo **herkese açık (public)**. Hiçbir anahtar veya şifre commit edilmez.
- Dokploy API anahtarı yerel `.env.local` dosyasında (`.gitignore`'da) durur.

### Yedekleme
- PocketBase'in dahili otomatik yedeklemesi (günlük) açılır; hedef olarak S3 uyumlu depolama önerilir.

### Açık sorular
- [ ] Domain'ler `api.erqan.com` / `panel.erqan.com` olarak kalsın mı? DNS Cloudflare'de mi?
- [ ] Geliştirme sürecinde ayrı bir test ortamı (ör. `rewrite` branch'inden `staging`) istenir mi?

---

## 10. Tasarım Sistemi: Material Design 3

Referans: https://m3.material.io — MUI yalnızca Material Design 2'yi desteklediği için kullanılmadı.

- **Renk:** Tüm roller Google'ın `@material/material-color-utilities` kütüphanesiyle tek ana renkten üretilir (`src/lib/m3-theme.ts`, Fidelity şeması). Varsayılan `#0F91E3` (erqan.com). Açık ve koyu tema otomatik. Admin **Ayarlar > Genel > Marka rengi** alanından değiştirirse tüm arayüz o renkten yeniden üretilir.
- **Uygulama renkleri:** Kazanç ve mülk tipi renkleri (arsa, ev, premium, villa) M3 "custom color" olarak ana renkle harmonize edilir.
- **Tipografi:** Roboto, M3 tip ölçeği (`type-display-*`, `type-headline-*`, `type-title-*`, `type-body-*`, `type-label-*`).
- **Şekil:** extra-small 4 (metin alanı), small 8 (chip, menü), medium 12 (kart), large 16 (çekmece), extra-large 28 (diyalog), full (buton).
- **Yükselti ve durum:** M3 gölge seviyeleri `shadow-e1…e5`; hover %8, focus/pressed %10 durum katmanı (`state-layer`).
- **Bileşenler:** Base UI üzerinde M3 stilleri: filled/tonal/outlined/text/elevated butonlar, outlined metin alanı, primary tabs, M3 switch ve checkbox, diyalog, menü, snackbar, düz tooltip.
- **Gezinme:** Geniş ekranda gezinme çekmecesi; dar ekranda üst uygulama çubuğu, gezinme çubuğu ve modal çekmece.
