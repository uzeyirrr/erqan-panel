"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import {
  Bell,
  Building2,
  ChartPie,
  Handshake,
  House,
  KeyRound,
  LayoutGrid,
  LogOut,
  Map,
  MapPinned,
  Menu,
  Moon,
  Receipt,
  Settings2,
  Shapes,
  Signpost,
  Store,
  Sun,
  UserRound,
  Users,
  Wallet,
  Wrench,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { money } from "@/lib/format"
import { useApp } from "@/components/app-provider"
import { Loading } from "@/components/kit"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"

// Material 3 gezinme: geniş ekranda gezinme çekmecesi, dar ekranda üst uygulama çubuğu + gezinme çubuğu.
// https://m3.material.io/components/navigation-drawer  https://m3.material.io/components/navigation-bar

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number }

export function userNav(unread: number): NavItem[] {
  return [
    { href: "/dashboard", label: "Özet", icon: ChartPie },
    { href: "/market", label: "Satın al", icon: Store },
    { href: "/listings", label: "İlanlar", icon: Signpost },
    { href: "/my-properties", label: "Mülklerim", icon: Building2 },
    { href: "/offers", label: "Teklifler", icon: Handshake },
    { href: "/wallet", label: "Cüzdan", icon: Wallet },
    { href: "/notifications", label: "Bildirimler", icon: Bell, badge: unread },
    { href: "/account", label: "Hesabım", icon: UserRound },
  ]
}

export const adminNav: NavItem[] = [
  { href: "/admin", label: "Genel bakış", icon: LayoutGrid },
  { href: "/admin/settings", label: "Ayarlar", icon: Settings2 },
  { href: "/admin/types", label: "Mülk tipleri", icon: Shapes },
  { href: "/admin/locations", label: "Konumlar ve stok", icon: MapPinned },
  { href: "/admin/catalog", label: "Özellikler ve yükseltmeler", icon: Wrench },
  { href: "/admin/users", label: "Kullanıcılar", icon: Users },
  { href: "/admin/properties", label: "Mülkler", icon: Map },
  { href: "/admin/rentals", label: "Kiralar", icon: KeyRound },
  { href: "/admin/transactions", label: "İşlemler", icon: Receipt },
]

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin"
  return pathname === href || pathname.startsWith(href + "/")
}

function BadgeCount({ n }: { n: number }) {
  return (
    <span className="figure inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 type-label-small text-on-error">
      {n > 99 ? "99+" : n}
    </span>
  )
}

function DrawerList({ items, pathname, onNavigate }: { items: NavItem[]; pathname: string; onNavigate?: () => void }) {
  return (
    <ul className="grid">
      {items.map((item) => {
        const active = isActive(pathname, item.href)
        const Icon = item.icon
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "state-layer flex h-14 items-center gap-3 rounded-full px-4 type-label-large outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                active ? "bg-secondary-container text-on-secondary-container" : "text-on-surface-variant",
              )}
            >
              <Icon className="size-6 shrink-0" />
              <span className="flex-1 truncate">{item.label}</span>
              {!!item.badge && <BadgeCount n={item.badge} />}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn("flex size-10 items-center justify-center rounded-xl bg-primary text-on-primary", className)} aria-hidden="true">
      <House className="size-6" />
    </span>
  )
}

function Brand() {
  const { config } = useApp()
  return (
    <Link href="/dashboard" className="flex items-center gap-3 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <BrandMark />
      <span className="type-title-large text-on-surface">{config?.general.site_name || "Erqan"}</span>
    </Link>
  )
}

function DrawerBody({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const { user, unread, isAdmin, currency, logout } = useApp()
  const { resolvedTheme, setTheme } = useTheme()
  const router = useRouter()
  return (
    <div className="flex h-full flex-col">
      <div className="px-4 pt-4 pb-3">
        <Brand />
      </div>
      <Link
        href="/wallet"
        onClick={onNavigate}
        className="state-layer mx-3 mb-2 rounded-xl bg-surface-container-highest px-4 py-3 text-on-surface outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="type-label-medium text-on-surface-variant">Bakiyeniz</div>
        <div className="figure type-title-large">{money(user?.credit, currency)}</div>
      </Link>
      <nav className="flex-1 overflow-y-auto px-3 pb-3" aria-label="Ana menü">
        <DrawerList items={userNav(unread)} pathname={pathname} onNavigate={onNavigate} />
        {isAdmin && (
          <>
            <div className="mx-4 my-2 h-px bg-outline-variant" />
            <div className="flex h-14 items-center px-4 type-title-small text-on-surface-variant">Yönetim</div>
            <DrawerList items={adminNav} pathname={pathname} onNavigate={onNavigate} />
          </>
        )}
      </nav>
      <div className="flex items-center gap-1 border-t border-outline-variant px-3 py-2">
        <Link
          href="/account"
          onClick={onNavigate}
          className="state-layer min-w-0 flex-1 truncate rounded-full px-3 py-2 type-label-large text-on-surface-variant outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {user?.name || user?.email}
        </Link>
        <button
          type="button"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          className="state-layer flex size-10 items-center justify-center rounded-full text-on-surface-variant outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={resolvedTheme === "dark" ? "Açık temaya geç" : "Koyu temaya geç"}
        >
          {resolvedTheme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
        </button>
        <button
          type="button"
          onClick={() => {
            logout()
            router.replace("/login")
          }}
          className="state-layer flex size-10 items-center justify-center rounded-full text-on-surface-variant outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Çıkış yap"
        >
          <LogOut className="size-5" />
        </button>
      </div>
    </div>
  )
}

const BAR_ITEMS = ["/dashboard", "/market", "/listings", "/my-properties"]

function CompactNav({ pathname }: { pathname: string }) {
  const { unread, user, currency } = useApp()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const items = userNav(unread).filter((i) => BAR_ITEMS.includes(i.href))

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <>
      {/* Küçük üst uygulama çubuğu: kaydırınca surface-container rengine geçer */}
      <header
        className={cn(
          "sticky top-0 z-30 flex h-16 items-center gap-1 px-1 transition-colors lg:hidden",
          scrolled ? "bg-surface-container" : "bg-surface",
        )}
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="state-layer flex size-12 items-center justify-center rounded-full text-on-surface"
          aria-label="Menüyü aç"
        >
          <Menu className="size-6" />
        </button>
        <Link href="/dashboard" className="flex-1 truncate type-title-large text-on-surface">
          Erqan
        </Link>
        <Link href="/wallet" className="state-layer figure rounded-full px-3 py-2 type-label-large text-on-surface-variant">
          {money(user?.credit, currency)}
        </Link>
        <Link
          href="/notifications"
          className="state-layer relative flex size-12 items-center justify-center rounded-full text-on-surface-variant"
          aria-label={unread ? `Bildirimler, ${unread} okunmamış` : "Bildirimler"}
        >
          <Bell className="size-6" />
          {unread > 0 && <span className="absolute top-2.5 right-2.5 size-1.5 rounded-full bg-error" />}
        </Link>
      </header>

      {/* Gezinme çubuğu */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid h-20 grid-cols-4 bg-surface-container pb-[env(safe-area-inset-bottom)] lg:hidden"
        aria-label="Alt menü"
      >
        {items.map((item) => {
          const Icon = item.icon
          const active = isActive(pathname, item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className="group flex flex-col items-center justify-center gap-1 outline-none"
            >
              <span
                className={cn(
                  "state-layer flex h-8 w-16 items-center justify-center rounded-full transition-colors group-focus-visible:ring-2 group-focus-visible:ring-ring",
                  active ? "bg-secondary-container text-on-secondary-container" : "text-on-surface-variant",
                )}
              >
                <Icon className="size-6" />
              </span>
              <span className={cn("type-label-medium", active ? "text-on-surface" : "text-on-surface-variant")}>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Modal gezinme çekmecesi */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="p-0" showCloseButton={false}>
          <SheetHeader className="sr-only">
            <SheetTitle>Menü</SheetTitle>
          </SheetHeader>
          <DrawerBody pathname={pathname} onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  )
}

/** Giriş gerektiren tüm sayfaların iskeleti. `admin` ise yalnızca yöneticiler görebilir. */
export function AppShell({ children, admin }: { children: React.ReactNode; admin?: boolean }) {
  const { ready, user, isAdmin, config } = useApp()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!ready) return
    if (!user) router.replace(`/login?next=${encodeURIComponent(pathname)}`)
    else if (admin && !isAdmin) router.replace("/dashboard")
  }, [ready, user, admin, isAdmin, router, pathname])

  if (!ready || !user || (admin && !isAdmin)) return <Loading className="min-h-screen" />

  if (config?.general.maintenance && !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h1 className="type-headline-small">Kısa bir bakım molası</h1>
          <p className="mt-2 type-body-medium text-on-surface-variant">{config.general.maintenance_message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen lg:pl-[304px]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[304px] bg-surface-container-low lg:block">
        <DrawerBody pathname={pathname} />
      </aside>
      <CompactNav pathname={pathname} />
      {config?.general.maintenance && isAdmin && (
        <div className="bg-tertiary-container px-4 py-3 type-body-medium text-on-tertiary-container">
          Bakım modu açık: kullanıcılar şu anda paneli kullanamıyor.
        </div>
      )}
      <main className="mx-auto max-w-6xl px-4 pt-4 pb-28 sm:px-6 lg:px-8 lg:pt-8 lg:pb-12">{children}</main>
    </div>
  )
}
