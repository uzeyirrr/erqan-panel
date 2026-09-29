"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { ViewTransition, useEffect, useLayoutEffect, useRef } from "react"
import { Wrench } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { money } from "@/lib/format"
import { useApp } from "@/components/app-provider"
import { AppIcon } from "@/components/brand"
import { Avatar, EmptyState, Loading } from "@/components/kit"
import { EdgeSwipeBack, skipNextNavAnimation } from "@/components/edge-swipe-back"
import { PullToRefresh } from "@/components/pull-to-refresh"
import { ADMIN, MORE, TABS, isActive, isTabRoot, navStack, tabOf, type NavItem } from "@/components/nav"

// iOS 26 gezinmesi: iPhone'da içeriğin üzerinde yüzen Liquid Glass sekme çubuğu;
// geniş ekranda (iPadOS / Mac) aynı bölümler yüzen bir kenar çubuğunda.
// https://developer.apple.com/design/human-interface-guidelines/tab-bars
// https://developer.apple.com/design/human-interface-guidelines/sidebars

function Badge({ n, className }: { n: number; className?: string }) {
  return (
    <span
      className={cn(
        "flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-system-red px-1 text-caption2 font-semibold text-white tabular-nums",
        className,
      )}
    >
      {n > 99 ? "99+" : n}
    </span>
  )
}

function TabBar({ pathname }: { pathname: string }) {
  const { unread } = useApp()
  const current = tabOf(pathname)
  return (
    <>
      {/* Alt kaydırma kenarı: içerik sekme çubuğunun altına girerken bulanıklaşır */}
      <div
        aria-hidden="true"
        className="scroll-edge-bottom pointer-events-none fixed inset-x-0 bottom-0 z-30 h-[calc(max(env(safe-area-inset-bottom)-12px,12px)+86px)] lg:hidden"
      />
      <nav
        aria-label="Sekmeler"
        className="pointer-events-none fixed inset-x-0 bottom-[max(calc(env(safe-area-inset-bottom)-12px),12px)] z-40 px-[max(16px,env(safe-area-inset-left))] [view-transition-name:tab-bar] lg:hidden"
      >
        <ul className="glass pointer-events-auto mx-auto flex h-[62px] max-w-[440px] items-stretch rounded-full p-1">
          {TABS.map((tab) => {
            const active = current === tab.href
            const Icon = tab.icon
            const badge = tab.href === "/account" ? unread : 0
            return (
              <li key={tab.href} className="flex flex-1">
                <Link
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "press-scale relative flex flex-1 flex-col items-center justify-center gap-px rounded-full outline-none focus-visible:outline-2 focus-visible:-outline-offset-2",
                    active ? "bg-fill-tertiary text-tint" : "text-label",
                  )}
                >
                  <span className="relative">
                    <Icon weight="fill" className="size-[26px]" />
                    {badge > 0 && <Badge n={badge} className="absolute -top-1 -right-2.5" />}
                  </span>
                  <span className="text-[10px] leading-3 font-semibold tracking-[0.1px]">{tab.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </>
  )
}

function SidebarLink({ item, pathname, badge }: { item: NavItem; pathname: string; badge?: number }) {
  const active = isActive(pathname, item.href) && !(item.href === "/account" && pathname !== "/account")
  const Icon = item.icon
  return (
    <li>
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex h-10 items-center gap-3 rounded-[12px] px-3 text-body outline-none transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2",
          active ? "bg-fill-tertiary font-semibold text-tint" : "text-label hover:bg-fill-quaternary active:bg-fill-tertiary",
        )}
      >
        <Icon weight={active ? "fill" : "regular"} className={cn("size-[22px] shrink-0", !active && "text-tint")} />
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        {!!badge && <Badge n={badge} />}
      </Link>
    </li>
  )
}

function Sidebar({ pathname }: { pathname: string }) {
  const { user, unread, isAdmin, currency, config } = useApp()
  const main = TABS.filter((t) => t.href !== "/account")
  return (
    <aside className="glass-thick fixed inset-y-2 left-2 z-30 hidden w-[304px] flex-col overflow-hidden rounded-[26px] [view-transition-name:sidebar] lg:flex">
      <div className="px-5 pt-6 pb-3">
        <Link href="/dashboard" className="flex items-center gap-3 text-title1 text-label outline-none">
          <AppIcon className="size-9 shadow-none" />
          {config?.general.site_name || "Erqan"}
        </Link>
      </div>
      <nav aria-label="Ana menü" className="flex-1 overflow-y-auto px-3 pb-3">
        <ul className="grid gap-0.5">
          {main.map((item) => (
            <SidebarLink key={item.href} item={item} pathname={pathname} />
          ))}
        </ul>
        <div className="mt-5 mb-1 px-3 text-footnote font-semibold text-label-secondary">Hesap</div>
        <ul className="grid gap-0.5">
          {MORE.map((item) => (
            <SidebarLink key={item.href} item={item} pathname={pathname} badge={item.href === "/notifications" ? unread : 0} />
          ))}
        </ul>
        {isAdmin && (
          <>
            <div className="mt-5 mb-1 px-3 text-footnote font-semibold text-label-secondary">Yönetim</div>
            <ul className="grid gap-0.5">
              {ADMIN.map((item) => (
                <SidebarLink key={item.href} item={item} pathname={pathname} />
              ))}
            </ul>
          </>
        )}
      </nav>
      <Link
        href="/account"
        className={cn(
          "mx-3 mb-3 flex items-center gap-3 rounded-[16px] p-2.5 outline-none transition-colors hover:bg-fill-quaternary active:bg-fill-tertiary focus-visible:outline-2",
          pathname === "/account" && "bg-fill-tertiary",
        )}
      >
        <Avatar name={user?.name || user?.email} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-subheadline font-semibold text-label">{user?.name || "Hesabım"}</span>
          <span className="block truncate text-footnote text-label-secondary tabular-nums">{money(user?.credit, currency)}</span>
        </span>
      </Link>
    </aside>
  )
}

const EASE_IOS = "cubic-bezier(0.32, 0.72, 0, 1)"
const NAV_MS = 450

/**
 * Geri gezinmede (popstate) eski sayfanın durağan bir kopyasını ekranda tutup sağa kaydırır.
 * React geri gezinmeyi eşzamanlı işlediği için görünüm geçişi (View Transition) oynamaz;
 * popstate anında DOM hâlâ eski sayfayı gösterdiğinden kopya o an alınır.
 */
function slideOutSnapshot() {
  const main = document.querySelector<HTMLElement>("main[data-slot=page]")
  if (!main) return
  const rect = main.getBoundingClientRect()
  const layer = document.createElement("div")
  layer.setAttribute("aria-hidden", "true")
  layer.inert = true
  Object.assign(layer.style, {
    position: "fixed",
    top: "0",
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    height: "100dvh",
    overflow: "hidden",
    zIndex: "35",
    pointerEvents: "none",
    background: "var(--grouped)",
    boxShadow: "-10px 0 30px rgb(0 0 0 / 0.14)",
  })
  const clone = main.cloneNode(true) as HTMLElement
  clone.removeAttribute("data-slot")
  clone.style.transform = `translateY(${rect.top}px)`
  // Yapışkan gezinme çubuğu kopyada kaydırılmaz; görünür konumuna taşınır.
  const bar = clone.querySelector<HTMLElement>("[data-slot=nav-bar]")
  if (bar) Object.assign(bar.style, { position: "relative", top: `${-rect.top}px` })
  layer.appendChild(clone)
  document.body.appendChild(layer)
  layer
    .animate([{ transform: "translateX(0)" }, { transform: "translateX(100%)" }], {
      duration: NAV_MS,
      easing: EASE_IOS,
      fill: "forwards",
    })
    .finished.catch(() => {})
    .finally(() => layer.remove())
}

/**
 * iOS gezinme yığını animasyonu (push / pop): alt sayfaya gidince yeni sayfa sağdan kayarak
 * gelir (View Transition, animasyonlar globals.css'te), geri dönünce eski sayfa sağa kayarken
 * önceki sayfa soldan gelir; sekmeler arası geçiş anlıktır. Safari'nin kendi kaydırarak geri
 * gitme animasyonu varsa (hasUAVisualTransition) ya da kenardan kaydırma hareketi zaten
 * oynattıysa tekrar oynatılmaz.
 */
function useNavDirection(pathname: string, mainRef: React.RefObject<HTMLElement | null>) {
  const pop = useRef<{ pop: boolean; animate: boolean }>({ pop: false, animate: false })
  const prev = useRef(pathname)

  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      const ua = !!(e as PopStateEvent & { hasUAVisualTransition?: boolean }).hasUAVisualTransition
      const animate = !ua && !skipNextNavAnimation.current && !matchMedia("(prefers-reduced-motion: reduce)").matches
      pop.current = { pop: true, animate }
      if (animate) slideOutSnapshot()
    }
    window.addEventListener("popstate", onPop)
    return () => window.removeEventListener("popstate", onPop)
  }, [])

  // Düzen efekti, React'in görünüm geçişi güncellemesi içinde (animasyon başlamadan önce) çalışır.
  useLayoutEffect(() => {
    if (prev.current === pathname) return
    const { pop: back, animate } = pop.current
    pop.current = { pop: false, animate: false }
    navStack.depth = back ? Math.max(0, navStack.depth - 1) : navStack.depth + 1
    const skip = skipNextNavAnimation.current
    skipNextNavAnimation.current = false
    document.documentElement.dataset.nav = skip || back ? "none" : isTabRoot(pathname) ? "none" : "forward"
    if (back && animate) {
      mainRef.current?.animate(
        [
          { transform: "translateX(-30%)", filter: "brightness(0.9)" },
          { transform: "none", filter: "none" },
        ],
        { duration: NAV_MS, easing: EASE_IOS },
      )
    }
    prev.current = pathname
  }, [pathname, mainRef])
}

/** Giriş gerektiren tüm sayfaların iskeleti. `admin` ise yalnızca yöneticiler görebilir. */
export function AppShell({ children, admin }: { children: React.ReactNode; admin?: boolean }) {
  const { ready, user, isAdmin, config } = useApp()
  const router = useRouter()
  const pathname = usePathname()
  const mainRef = useRef<HTMLElement>(null)
  useNavDirection(pathname, mainRef)

  useEffect(() => {
    if (!ready) return
    if (!user) router.replace(`/login?next=${encodeURIComponent(pathname)}`)
    else if (admin && !isAdmin) router.replace("/dashboard")
  }, [ready, user, admin, isAdmin, router, pathname])

  if (!ready || !user || (admin && !isAdmin)) return <Loading className="min-h-dvh" />

  if (config?.general.maintenance && !isAdmin) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6">
        <EmptyState
          icon={<Wrench weight="fill" />}
          title="Kısa bir bakım molası"
          description={config.general.maintenance_message}
        />
      </div>
    )
  }

  return (
    <div className="min-h-dvh px-safe lg:pl-[320px]">
      <Sidebar pathname={pathname} />
      {config?.general.maintenance && isAdmin && (
        <div className="bg-system-orange px-4 py-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] text-center text-footnote font-semibold text-white">
          Bakım modu açık: kullanıcılar şu anda paneli kullanamıyor.
        </div>
      )}
      <ViewTransition key={pathname} enter="page-enter" exit="page-exit" default="none">
        <main
          ref={mainRef}
          data-slot="page"
          className="mx-auto min-h-dvh max-w-5xl bg-grouped px-4 pb-[calc(max(env(safe-area-inset-bottom)-12px,12px)+96px)] sm:px-6 lg:px-8 lg:pb-16">
          {children}
        </main>
      </ViewTransition>
      <TabBar pathname={pathname} />
      <PullToRefresh />
      <EdgeSwipeBack />
    </div>
  )
}
