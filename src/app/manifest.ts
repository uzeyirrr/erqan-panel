import type { MetadataRoute } from "next"

// Ana ekrana eklenince (iOS, Android, masaüstü) yerel uygulama gibi açılır.
// Simgeler ve iOS açılış ekranları scripts/pwa-assets.py ile üretilir.
export default function manifest(): MetadataRoute.Manifest {
  const shortcutIcon = [{ src: "/icons/shortcut-96.png", sizes: "96x96", type: "image/png" }]
  return {
    id: "/",
    name: "Erqan",
    short_name: "Erqan",
    description: "Sanal emlak yatırımlarınızı yönetin: mülk satın alın, kiraya verin, kazancınızı takip edin.",
    lang: "tr",
    dir: "ltr",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "portrait",
    background_color: "#f2f2f7",
    theme_color: "#f2f2f7",
    categories: ["finance", "business", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Satın Al", short_name: "Satın Al", url: "/market", icons: shortcutIcon },
      { name: "İlanlar", short_name: "İlanlar", url: "/listings", icons: shortcutIcon },
      { name: "Mülklerim", short_name: "Mülklerim", url: "/my-properties", icons: shortcutIcon },
      { name: "Cüzdan", short_name: "Cüzdan", url: "/wallet", icons: shortcutIcon },
    ],
  }
}
