"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { DEFAULT_SEED, m3Css } from "@/lib/m3-theme"
import { ThemeProvider } from "next-themes"
import { api, pb } from "@/lib/pb"
import type { Settings, User } from "@/lib/types"
import { Toaster } from "@/components/ui/sonner"

type AppState = {
  /** Oturum ve ayarlar yüklendi mi */
  ready: boolean
  user: User | null
  config: Settings | null
  unread: number
  isAdmin: boolean
  currency: string
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
  reloadConfig: () => Promise<void>
  setUnread: (n: number) => void
}

const Ctx = createContext<AppState | null>(null)

export function useApp(): AppState {
  const v = useContext(Ctx)
  if (!v) throw new Error("useApp must be used within AppProvider")
  return v
}

async function countUnread(userId: string): Promise<number> {
  const res = await pb.collection("notifications").getList(1, 1, {
    filter: pb.filter("user = {:u} && read = false", { u: userId }),
    fields: "id",
  })
  return res.totalItems
}

function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [config, setConfig] = useState<Settings | null>(null)
  const [unread, setUnread] = useState(0)
  const [ready, setReady] = useState(false)

  const reloadConfig = useCallback(async () => {
    try {
      setConfig(await api.config())
    } catch {
      /* ayarlar alınamazsa varsayılan görünüm */
    }
  }, [])

  // Geçersiz/eksik oturumda authRefresh hata verir ve oturum temizlenir.
  const refreshUser = useCallback(async () => {
    try {
      await pb.collection("users").authRefresh()
      setUser(pb.authStore.record as unknown as User)
    } catch {
      pb.authStore.clear()
      setUser(null)
    }
  }, [])

  // İlk yükleme: kayıtlı oturumu doğrula, ayarları getir.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      // Kayıtlı oturum varsa doğrula (geçersizse temizlenir), ayarları paralel getir.
      const [cfg] = await Promise.all([
        api.config().catch(() => null),
        pb.authStore.isValid
          ? pb.collection("users").authRefresh().catch(() => pb.authStore.clear())
          : null,
      ])
      if (cancelled) return
      if (cfg) setConfig(cfg)
      setUser(pb.authStore.isValid ? (pb.authStore.record as unknown as User) : null)
      setReady(true)
    })()
    const unsubscribe = pb.authStore.onChange(() => {
      setUser(pb.authStore.isValid ? (pb.authStore.record as unknown as User) : null)
    })
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  // Kendi kaydım (kredi) ve bildirimlerim için canlı güncelleme.
  const userId = user?.id
  useEffect(() => {
    if (!userId) return
    let active = true
    countUnread(userId).then((n) => active && setUnread(n)).catch(() => {})

    const unsubs: Promise<() => Promise<void>>[] = [
      pb.collection("users").subscribe(userId, (e) => {
        if (e.action === "update") setUser((prev) => (prev ? { ...prev, ...(e.record as unknown as User) } : prev))
      }),
      pb.collection("notifications").subscribe("*", () => {
        countUnread(userId).then((n) => active && setUnread(n)).catch(() => {})
      }),
    ]
    return () => {
      active = false
      unsubs.forEach((p) => p.then((fn) => fn()).catch(() => {}))
    }
  }, [userId])

  const login = useCallback(async (email: string, password: string) => {
    await pb.collection("users").authWithPassword(email, password)
    setUser(pb.authStore.record as unknown as User)
  }, [])

  const logout = useCallback(() => {
    pb.authStore.clear()
    setUser(null)
    setUnread(0)
  }, [])

  const value = useMemo<AppState>(
    () => ({
      ready,
      user,
      config,
      unread,
      isAdmin: user?.role === "admin",
      currency: config?.general.currency || "USD",
      login,
      logout,
      refreshUser,
      reloadConfig,
      setUnread,
    }),
    [ready, user, config, unread, login, logout, refreshUser, reloadConfig],
  )

  return (
    <Ctx.Provider value={value}>
      <BrandTheme seed={config?.general.brand_color} />
      {children}
    </Ctx.Provider>
  )
}

/** Admin tema rengini değiştirdiyse M3 renk rollerini o renkten yeniden üretir. */
function BrandTheme({ seed }: { seed?: string }) {
  const css = useMemo(() => {
    if (!seed || !/^#[0-9a-f]{6}$/i.test(seed) || seed.toLowerCase() === DEFAULT_SEED.toLowerCase()) return null
    return m3Css(seed)
  }, [seed])
  if (!css) return null
  return <style id="m3-brand-theme">{css}</style>
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <AppStateProvider>
        {children}
        <Toaster position="bottom-center" mobileOffset={{ bottom: 96 }} />
      </AppStateProvider>
    </ThemeProvider>
  )
}
