# Erqan Panel

Sanal emlak platformu Erqan'ın kullanıcı ve yönetim paneli (`panel.erqan.com`).
Kullanıcılar dünyanın farklı şehirlerinde mülk satın alır, kiraya verir, satar, teklif verir,
arsasına ev inşa eder ve kira gelirini takip eder. Tüm kurallar admin panelinden yönetilir.

Kararlar için: [PLAN.md](PLAN.md) · Tasarım sistemi (Apple HIG, iOS 26): [DESIGN.md](DESIGN.md)

## Yapı

```
pocketbase/            Backend (PocketBase 0.40)
  pb_migrations/       Şema, API kuralları, başlangıç verisi
  pb_hooks/            İş kuralları: satın alma, kira, satış, teklif, inşaat, cron
  tests/e2e.mjs        Uçtan uca backend testi
  Dockerfile           api.erqan.com imajı
src/                   Panel (Next.js 16, React 19, Tailwind 4, Base UI, Apple HIG / iOS 26)
  app/(auth)           Giriş, kayıt
  app/(app)            Kullanıcı sayfaları
  app/(app)/admin      Yönetim paneli
Dockerfile             panel.erqan.com imajı
```

**Güvenlik ilkesi:** Kredi, stok ve sahiplik yalnızca `pb_hooks` içindeki endpoint'lerden,
tek bir veritabanı transaction'ı içinde değişir. İstemci bu alanlara doğrudan yazamaz.

## Yerelde çalıştırma

1. [PocketBase 0.40.4](https://github.com/pocketbase/pocketbase/releases/tag/v0.40.4) binary'sini `.pb/` klasörüne indirin.
2. Backend:
   ```bash
   ERQAN_ADMIN_EMAILS=siz@ornek.com ./.pb/pocketbase serve \
     --dir=.pb/pb_data --hooksDir=pocketbase/pb_hooks \
     --migrationsDir=pocketbase/pb_migrations --http=127.0.0.1:8091
   ```
   `ERQAN_ADMIN_EMAILS` içindeki e-postalarla kayıt olan kullanıcılar admin olur.
3. Panel: `.env.local` içine `NEXT_PUBLIC_PB_URL=http://127.0.0.1:8091` yazın, ardından
   ```bash
   npm install
   npm run dev
   ```

## Test

Boş bir veritabanıyla başlatılmış PocketBase'e karşı:

```bash
ERQAN_ADMIN_EMAILS=admin@test.local ./.pb/pocketbase serve --dir=.pb/test_data ...   # yukarıdaki gibi
./.pb/pocketbase superuser upsert su@test.local 'Passw0rd123!' --dir=.pb/test_data
PB_URL=http://127.0.0.1:8091 node pocketbase/tests/e2e.mjs
```

## Deploy (Dokploy)

| Servis | Build | Port | Domain | Ortam değişkenleri |
|---|---|---|---|---|
| `pocketbase` | `pocketbase/Dockerfile` | 8090 | `api.erqan.com` | `PB_SUPERUSER_EMAIL`, `PB_SUPERUSER_PASSWORD`, `ERQAN_ADMIN_EMAILS` |
| `panel` | `Dockerfile` | 3000 | `panel.erqan.com` | build arg: `NEXT_PUBLIC_PB_URL=https://api.erqan.com` |

- PocketBase verisi `/pb/pb_data` volume'unda kalıcıdır.
- `main` dalına push'ta iki servis de otomatik yeniden build edilir; migration'lar açılışta uygulanır.
- Repo herkese açıktır: şifre ve anahtarlar yalnızca Dokploy ortam değişkenlerinde tutulur.
