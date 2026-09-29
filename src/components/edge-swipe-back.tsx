"use client"

import { usePathname, useRouter } from "next/navigation"
import { useEffect, useRef } from "react"
import { isTabRoot, navStack, parentOf } from "@/components/nav"

// Ekranın sol kenarından sağa kaydırarak geri gitme (UINavigationController etkileşimli pop).
// Safari ve Chrome sekmesinde tarayıcının kendi hareketi vardır; bu yüzden yalnızca ana ekrana
// eklenmiş uygulamada (standalone) ve sekme kökü olmayan sayfalarda çalışır.

const EDGE = 24

/** Sonraki sayfa geçişinde kaydırma animasyonunu atla (hareket zaten oynattı). */
export const skipNextNavAnimation = { current: false }

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export function EdgeSwipeBack() {
  const pathname = usePathname()
  const router = useRouter()
  const pathRef = useRef(pathname)

  useEffect(() => {
    pathRef.current = pathname
  }, [pathname])

  useEffect(() => {
    if (!isStandalone()) return
    let state: { x: number; y: number; t: number; dragging: boolean; main: HTMLElement } | null = null

    const reset = (main: HTMLElement) => {
      main.style.transition = ""
      main.style.transform = ""
      main.style.boxShadow = ""
      main.style.willChange = ""
    }

    const onStart = (e: TouchEvent) => {
      const t = e.touches[0]
      if (e.touches.length !== 1 || t.clientX > EDGE || isTabRoot(pathRef.current)) return
      if (document.querySelector("[data-slot=dialog-content],[data-slot=alert-content]")) return
      const main = document.querySelector<HTMLElement>("main")
      if (!main) return
      state = { x: t.clientX, y: t.clientY, t: e.timeStamp, dragging: false, main }
    }

    const onMove = (e: TouchEvent) => {
      if (!state) return
      const t = e.touches[0]
      const dx = t.clientX - state.x
      const dy = t.clientY - state.y
      if (!state.dragging) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
        // Yatay değilse bırak: normal dikey kaydırma.
        if (dx <= 0 || Math.abs(dy) > Math.abs(dx)) {
          state = null
          return
        }
        state.dragging = true
        state.main.style.transition = "none"
        state.main.style.willChange = "transform"
        state.main.style.boxShadow = "-10px 0 30px rgb(0 0 0 / 0.14)"
      }
      state.main.style.transform = `translate3d(${Math.max(0, dx)}px, 0, 0)`
    }

    const onEnd = (e: TouchEvent) => {
      if (!state) return
      const s = state
      state = null
      if (!s.dragging) return
      const dx = (e.changedTouches[0]?.clientX ?? s.x) - s.x
      const velocity = dx / Math.max(1, e.timeStamp - s.t)
      const width = window.innerWidth
      const commit = dx > width * 0.35 || (velocity > 0.45 && dx > 40)
      s.main.style.transition = "transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)"
      s.main.style.transform = commit ? `translate3d(${width}px, 0, 0)` : "translate3d(0, 0, 0)"
      window.setTimeout(() => {
        if (!commit) return reset(s.main)
        skipNextNavAnimation.current = true
        if (navStack.depth > 0) router.back()
        else router.push(parentOf(pathRef.current))
        // Sayfa değişmediyse (ör. yalnızca sorgu değişti) içeriği geri getir.
        window.setTimeout(() => {
          skipNextNavAnimation.current = false
          if (s.main.isConnected) reset(s.main)
        }, 1200)
      }, 300)
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
  }, [router])

  return null
}
