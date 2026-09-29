"use client"

import { useEffect } from "react"
import { captureInstallPrompt } from "@/components/install-app"

/**
 * Tarayıcının "uygulamayı yükle" olayını yakalar ve service worker'ı yalnızca production'da
 * kaydeder (geliştirmede önbellek karışıklığı olmasın).
 */
export function PwaRegister() {
  useEffect(() => {
    captureInstallPrompt()
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return
    navigator.serviceWorker.register("/sw.js").catch(() => {})
  }, [])
  return null
}
