# Erqan Tasarım Sistemi — Apple Human Interface Guidelines

Panel, [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines)
üzerine kuruludur ve **iPhone önceliklidir**: telefonda yerel bir iOS 26 uygulamasından ayırt
edilemeyecek şekilde görünmeli ve davranmalıdır. Geniş ekranda aynı dil iPadOS / macOS kenar
çubuğu düzenine dönüşür.

## Temel ilkeler

- **İçerik önce, kontroller Liquid Glass katmanında.** Sekme çubuğu, üst çubuk düğmeleri, menüler ve
  bildirim kapsülleri `glass` / `glass-thick` materyalini kullanır. İçerik katmanında (kartlar,
  listeler) cam kullanılmaz ([Materials](https://developer.apple.com/design/human-interface-guidelines/materials)).
- **Gruplu listeler.** Sayfaların çoğu `bg-grouped` (açık gri / siyah) zemin üzerinde beyaz
  (`bg-grouped-secondary`) yuvarlatılmış bölümlerden oluşur — iOS Ayarlar gibi.
- **Tek vurgu rengi.** Etkileşimli her şey `tint` rengindedir (erqan.com mavisi `#0F91E3`; admin
  **Ayarlar > Genel > Marka rengi** ile değiştirebilir). Anlam taşıyan renkler iOS sistem renkleridir.
- **Dokunma hedefi en az 44 pt**, basınca geri bildirim (`press-scale`, `press-dim`, `press-row`).
- **Güvenli alanlar** (`pt-safe`, `pb-safe`, `env(safe-area-inset-*)`) ve `viewport-fit=cover`.
- Açık / koyu görünüm, *Şeffaflığı Azalt* ve *Kontrastı Artır* ayarları desteklenir.

## Renkler (`src/app/globals.css`)

| Rol | Tailwind sınıfı | Not |
|---|---|---|
| Vurgu | `text-tint`, `bg-tint`, `text-tint-foreground` | Bağlantı, birincil düğme, seçili sekme |
| Etiket | `text-label`, `text-label-secondary`, `text-label-tertiary`, `text-label-quaternary` | Birincil / ikincil / devre dışı metin |
| Dolgu | `bg-fill`, `bg-fill-secondary`, `bg-fill-tertiary`, `bg-fill-quaternary` | Kontrol zeminleri, gri düğmeler, arama alanı |
| Zemin | `bg-grouped`, `bg-grouped-secondary`, `bg-grouped-tertiary` | Sayfa, bölüm kartı, kart içindeki alan |
| Düz zemin | `bg-background`, `bg-background-secondary`, `bg-background-tertiary` | Gruplu olmayan ekranlar |
| Ayırıcı | `border-separator`, `bg-separator`, `after:hairline` | 0,5 pt çizgi |
| Sistem | `text-system-red`, `bg-system-green`, … (`red orange yellow green mint teal cyan blue indigo purple pink brown gray gray2…gray6`) | iOS 26 değerleri |
| Anlam | `text-gain`, `text-loss` | Kazanç / kayıp tutarları |

Koyu görünümde sayfa ve uyarılar (`data-elevated`) bir ton açık "yükseltilmiş" renkleri kullanır.

## Tipografi

SF Pro (Apple cihazlarda sistem yazı tipi), diğer platformlarda Inter. iOS metin stilleri
(Dynamic Type "Large"):

| Sınıf | Boyut / satır | Kalınlık | Kullanım |
|---|---|---|---|
| `text-large-title` | 34 / 41 | Bold | Sayfa büyük başlığı |
| `text-title1` | 28 / 34 | Bold | Detay başlığı |
| `text-title2` | 22 / 28 | Bold | Özet değerleri |
| `text-title3` | 20 / 25 | Semibold | Kart başlığı, fiyat |
| `text-headline` | 17 / 22 | Semibold | Satır başlığı, çubuk başlığı |
| `text-body` | 17 / 22 | Regular | Varsayılan metin |
| `text-callout` | 16 / 21 | Regular | |
| `text-subheadline` | 15 / 20 | Regular | Açıklamalar, alt başlık |
| `text-footnote` | 13 / 18 | Regular | Bölüm başlık/altbilgisi, zaman |
| `text-caption1` / `text-caption2` | 12 / 16, 11 / 13 | Regular | Etiketler, grafik |

Tutarlar `tabular-nums` ile yazılır.

## Şekil

`rounded-section` (26, gruplu bölüm), `rounded-card` (22, kart), `rounded-field` (12, metin alanı),
`rounded-alert` (34), `rounded-sheet` (38); düğmeler, sekme çubuğu, etiketler kapsül (`rounded-full`).

## Bileşenler

**Temel (`src/components/ui`)**

| Bileşen | iOS karşılığı |
|---|---|
| `Button` — `default` (borderedProminent), `secondary` (gri bordered), `ghost` (borderless), `glass`, `destructive`, `destructive-secondary`, `link`; boyutlar `xs 28`, `sm 34`, `default 44`, `lg 52`, `icon*` | Buttons |
| `Input`, `Textarea` | Text fields (satır içinde `inlineInput` ile kenarsız) |
| `Switch` | Toggle (51×31, sistem yeşili) |
| `Checkbox` | Daire içinde onay işareti (çoklu seçim) |
| `Tabs` / `Segmented` | Segmented control (kayan kapsül) |
| `Dialog` + `DialogHeader{title, action}` + `DialogBody` | Sheet (tutamaç, aşağı kaydırarak kapatma, klavye farkındalığı) |
| `AlertDialog*` / kit `ConfirmDialog` | Alert (sola hizalı metin, kapsül düğmeler) |
| `Spinner` | Activity indicator |
| `Toaster` (sonner) | Üstten inen Liquid Glass kapsül |

**Kalıplar (`src/components/kit.tsx`)**

| Bileşen | Kullanım |
|---|---|
| `PageHeader{title, description, actions, back, largeTitle}` | Gezinme çubuğu + büyük başlık; kaydırınca küçük başlık ve kaydırma kenarı efekti. Sekme kökü değilse geri düğmesi. |
| `BarButton`, `BarGroup` | Üst çubukta Liquid Glass simge düğmeleri |
| `Section{header, footer, actions, plain}` | Gruplu bölüm (liste veya serbest içerik) |
| `Row{href/onClick, icon, iconColor, leading, title, subtitle, detail, accessory, destructive}` | Liste satırı; ayırıcı metnin başından başlar |
| `RowItem`, `FieldRow{label}` + `inlineInput`, `Field` | Serbest satır, satır içi form alanı, üst etiketli alan |
| `IconTile`, `Avatar` | Ayarlar tarzı renkli simge kutucuğu, baş harfli avatar |
| `Tag{tone}`, `StatusBadge`, `Money`, `Stat` | Kapsül etiket, mülk durumu, tutar, değer |
| `Chips`, `SearchField`, `NativeSelect{inline}` | Yatay filtre kapsülleri, arama alanı, sistem seçicisi |
| `EmptyState`, `Loading`, `ErrorState`, `Notice` | İçerik yok, yükleniyor, hata, bilgi notu |

## Gezinme (`src/components/app-shell.tsx`, `src/components/nav.ts`)

- **iPhone:** içeriğin üzerinde yüzen Liquid Glass sekme çubuğu — Özet, Satın Al, İlanlar,
  Mülklerim, Hesap (HIG: beş veya daha az sekme). Cüzdan, Teklifler, Bildirimler ve Yönetim
  Hesap sekmesindeki listeden açılır; bu sayfalarda solda geri düğmesi görünür.
- **Geniş ekran (≥ 1024 px):** yüzen cam kenar çubuğu (iPadOS 26), sekme çubuğu gizlenir.
- Sayfa içi seçim: 2–4 seçenek → `Segmented`; çok seçenek → `Chips`; ayrıntılı filtre → sayfa (sheet).
- Oluştur / düzenle → sayfa (sheet), onay / geri alınamaz işlem → uyarı (alert).

## Hareket ve jestler

- **Push / pop:** alt sayfaya gidince yeni sayfa sağdan kayarak gelir (React `ViewTransition`,
  `globals.css`); geri dönünce eski sayfa sağa kayar, önceki sayfa soldan gelir (`app-shell.tsx`).
  Sekmeler arası geçiş anlıktır; Safari'nin kendi kaydırma animasyonu varsa tekrar oynatılmaz.
- **Kenardan kaydırarak geri gitme** ve **aşağı çekerek yenileme** yalnızca ana ekrana eklenmiş
  uygulamada (standalone) çalışır; tarayıcıda tarayıcının kendi hareketleri geçerlidir.
- **Sayfalar (sheet)** tutamaçtan aşağı kaydırılarak kapanır; bildirimler sola kaydırılarak silinir.
- *Hareketi Azalt* açıksa tüm animasyonlar kapanır.

## Simgeler

[Phosphor](https://phosphoricons.com) (SF Symbols'e en yakın açık kaynak set). Sekme çubuğu ve
simge kutucuklarında `weight="fill"`, diğer yerlerde varsayılan (`regular`) veya `bold` (küçük
oklar). Sunucu bileşenlerinde `@phosphor-icons/react/ssr` kullanılır.
