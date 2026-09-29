import {
  Bell,
  Buildings,
  ChartPieSlice,
  Handshake,
  Key,
  MapPinArea,
  Receipt,
  Shapes,
  SlidersHorizontal,
  Signpost,
  SquaresFour,
  Storefront,
  UserCircle,
  Users,
  Wallet,
  Wrench,
  MapTrifold,
} from "@phosphor-icons/react"

// Uygulamanın bilgi mimarisi. iPhone'da en sık kullanılan beş bölüm sekme çubuğunda durur
// (HIG: beş veya daha az sekme); diğer bölümlere "Hesap" sekmesindeki listeden gidilir.
// Geniş ekranda aynı yapı iPadOS kenar çubuğu olarak gösterilir.

export type NavIcon = React.ComponentType<{ className?: string; weight?: "regular" | "bold" | "fill" }>
export type NavItem = { href: string; label: string; icon: NavIcon; color: string }

export const TABS: NavItem[] = [
  { href: "/dashboard", label: "Özet", icon: ChartPieSlice, color: "blue" },
  { href: "/market", label: "Satın Al", icon: Storefront, color: "green" },
  { href: "/listings", label: "İlanlar", icon: Signpost, color: "orange" },
  { href: "/my-properties", label: "Mülklerim", icon: Buildings, color: "indigo" },
  { href: "/account", label: "Hesap", icon: UserCircle, color: "gray" },
]

/** Hesap sekmesinin altındaki bölümler (kenar çubuğunda da listelenir). */
export const MORE: NavItem[] = [
  { href: "/wallet", label: "Cüzdan", icon: Wallet, color: "green" },
  { href: "/offers", label: "Teklifler", icon: Handshake, color: "orange" },
  { href: "/notifications", label: "Bildirimler", icon: Bell, color: "red" },
]

export const ADMIN: NavItem[] = [
  { href: "/admin", label: "Genel Bakış", icon: SquaresFour, color: "blue" },
  { href: "/admin/settings", label: "Ayarlar", icon: SlidersHorizontal, color: "gray" },
  { href: "/admin/types", label: "Mülk Tipleri", icon: Shapes, color: "indigo" },
  { href: "/admin/locations", label: "Konumlar ve Stok", icon: MapPinArea, color: "green" },
  { href: "/admin/catalog", label: "Özellikler ve Yükseltmeler", icon: Wrench, color: "orange" },
  { href: "/admin/users", label: "Kullanıcılar", icon: Users, color: "cyan" },
  { href: "/admin/properties", label: "Mülkler", icon: MapTrifold, color: "teal" },
  { href: "/admin/rentals", label: "Kiralar", icon: Key, color: "yellow" },
  { href: "/admin/transactions", label: "İşlemler", icon: Receipt, color: "purple" },
]

/**
 * Uygulama içi geçmiş derinliği: istemci tarafı ileri gezinmede artar, geri gezinmede azalır.
 * Geri düğmesi, derinlik 0 ise (sayfa doğrudan açıldıysa) tarayıcı geçmişi yerine üst sayfaya gider.
 */
export const navStack = { depth: 0 }

export function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin"
  return pathname === href || pathname.startsWith(href + "/")
}

/** Sekme kökleri: geri düğmesi göstermeyen, büyük başlıklı sayfalar. */
export function isTabRoot(pathname: string) {
  return TABS.some((t) => t.href === pathname)
}

/** Bir sayfanın hangi sekmeye ait olduğu (sekme çubuğunda seçili gösterilir). */
export function tabOf(pathname: string): string {
  const direct = TABS.find((t) => isActive(pathname, t.href))
  if (direct) return direct.href
  if (pathname.startsWith("/properties/")) return "/my-properties"
  // Cüzdan, teklifler, bildirimler, profil ve yönetim Hesap sekmesinin altındadır.
  return "/account"
}

/** Doğrudan açılan bir alt sayfada geri düğmesinin gideceği üst sayfa. */
export function parentOf(pathname: string): string {
  if (pathname.startsWith("/admin/")) return "/admin"
  if (pathname === "/admin") return "/account"
  if (pathname.startsWith("/properties/")) return "/my-properties"
  if (pathname.startsWith("/users/")) return "/listings"
  return tabOf(pathname)
}
