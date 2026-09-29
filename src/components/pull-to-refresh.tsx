"use client"

import { useEffect, useRef, useState } from "react"
import { refreshAll } from "@/hooks/use-data"
import { useApp } from "@/components/app-provider"
import { Spinner } from "@/components/ui/spinner"

// Aşağı çekerek yenileme (UIRefreshControl). Yalnızca ana ekrana eklenmiş uygulamada (standalone)
// çalışır; tarayıcıların kendi yenileme hareketiyle çakışmaz. Ekrandaki tüm `useLoad` verileri ve
// kullanıcı bakiyesi yeniden yüklenir.

const THRESHOLD = 76

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export function PullToRefresh() {
  const { refreshUser } = useApp()
  const [pull, setPull] = useState(0)
  const [busy, setBusy] = useState(false)
  const start = useRef<number | null>(null)
  const pullRef = useRef(0)
  const busyRef = useRef(false)
  const refreshUserRef = useRef(refreshUser)

  useEffect(() => {
    refreshUserRef.current = refreshUser
  }, [refreshUser])

  useEffect(() => {
    if (!isStandalone()) return
    const set = (v: number) => {
      pullRef.current = v
      setPull(v)
    }
    const onStart = (e: TouchEvent) => {
      if (busyRef.current || window.scrollY > 0 || e.touches.length !== 1) return
      // Açık bir sayfa (sheet) veya uyarı varken çalışmaz.
      if (document.querySelector("[data-slot=dialog-content],[data-slot=alert-content]")) return
      start.current = e.touches[0].clientY
    }
    const onMove = (e: TouchEvent) => {
      if (start.current === null) return
      const dy = e.touches[0].clientY - start.current
      if (dy <= 0 && window.scrollY > 0) {
        start.current = null
        set(0)
        return
      }
      // iOS lastik bant etkisinde scrollY negatife iner; parmak mesafesiyle büyük olanı kullanılır.
      set(Math.max(0, Math.max(dy * 0.5, -window.scrollY) / THRESHOLD))
    }
    const onEnd = async () => {
      if (start.current === null) return
      start.current = null
      const armed = pullRef.current >= 1
      set(0)
      if (!armed) return
      busyRef.current = true
      setBusy(true)
      try {
        await Promise.all([refreshAll(), refreshUserRef.current(), new Promise((r) => setTimeout(r, 600))])
      } finally {
        busyRef.current = false
        setBusy(false)
      }
    }
    window.addEventListener("touchstart", onStart, { passive: true })
    window.addEventListener("touchmove", onMove, { passive: true })
    window.addEventListener("touchend", onEnd)
    window.addEventListener("touchcancel", onEnd)
    return () => {
      window.removeEventListener("touchstart", onStart)
      window.removeEventListener("touchmove", onMove)
      window.removeEventListener("touchend", onEnd)
      window.removeEventListener("touchcancel", onEnd)
    }
  }, [])

  if (!busy && pull <= 0) return null
  const p = busy ? 1 : Math.min(pull, 1)
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed top-[calc(env(safe-area-inset-top)+58px)] left-1/2 z-40 -translate-x-1/2 lg:hidden"
      style={{ opacity: p, transform: `translateX(-50%) scale(${0.6 + p * 0.4})` }}
    >
      <div className="glass flex size-10 items-center justify-center rounded-full text-label-secondary">
        <Spinner className="size-5" progress={busy ? undefined : pull} label={busy ? "Yenileniyor" : "Yenilemek için çekin"} />
      </div>
    </div>
  )
}
