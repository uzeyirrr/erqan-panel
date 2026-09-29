"use client"

import { useEffect } from "react"

/** Service worker'ı yalnızca production'da kaydeder (geliştirmede önbellek karışıklığı olmasın). */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return
    navigator.serviceWorker.register("/sw.js").catch(() => {})
  }, [])
  return null
}
