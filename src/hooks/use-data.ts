"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { errorMessage } from "@/lib/pb"

type LoadState<T> = { key: string | null; data: T | null; error: string | null }

/** Aşağı çekerek yenileme: ekrandaki tüm `useLoad` verileri bu olayla yeniden yüklenir. */
const REFRESH_EVENT = "erqan:refresh"

/** Ekrandaki tüm verileri yeniden yükler; hepsi bitince çözülür. */
export async function refreshAll(): Promise<void> {
  const pending: Promise<void>[] = []
  window.dispatchEvent(new CustomEvent<Promise<void>[]>(REFRESH_EVENT, { detail: pending }))
  await Promise.all(pending)
}

/**
 * Veri yükleme: `deps` değişince yeniden çalışır, `reload()` ile elle yenilenir
 * (dönen promise yükleme bitince çözülür). `enabled` false ise çalışmaz.
 * `loading`, yüklenen anahtar ile istenen anahtar farklıyken true'dur.
 */
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[], enabled = true) {
  const key = JSON.stringify(deps)
  const [state, setState] = useState<LoadState<T>>({ key: null, data: null, error: null })
  const [tick, setTick] = useState(0)
  const [reloading, setReloading] = useState(false)
  const fnRef = useRef(fn)
  const seq = useRef(0)
  const waiters = useRef<(() => void)[]>([])

  useLayoutEffect(() => {
    fnRef.current = fn
  })

  useEffect(() => {
    if (!enabled) return
    const id = ++seq.current
    const settle = (next: (prev: LoadState<T>) => LoadState<T>) => {
      if (id !== seq.current) return
      setState(next)
      setReloading(false)
      waiters.current.splice(0).forEach((resolve) => resolve())
    }
    fnRef.current().then(
      (data) => settle(() => ({ key, data, error: null })),
      (err) => settle((prev) => ({ key, data: prev.data, error: errorMessage(err) })),
    )
  }, [enabled, key, tick])

  const reload = useCallback(
    () =>
      new Promise<void>((resolve) => {
        waiters.current.push(resolve)
        setReloading(true)
        setTick((t) => t + 1)
      }),
    [],
  )

  useEffect(() => {
    if (!enabled) return
    const onRefresh = (e: Event) => (e as CustomEvent<Promise<void>[]>).detail.push(reload())
    window.addEventListener(REFRESH_EVENT, onRefresh)
    return () => window.removeEventListener(REFRESH_EVENT, onRefresh)
  }, [enabled, reload])

  const setData = useCallback((value: T | null | ((prev: T | null) => T | null)) => {
    setState((prev) => ({
      ...prev,
      data: typeof value === "function" ? (value as (p: T | null) => T | null)(prev.data) : value,
    }))
  }, [])

  return {
    data: state.data,
    error: state.error,
    loading: enabled && (state.key !== key || reloading),
    reload,
    setData,
  }
}

/**
 * Kullanıcı işlemi: çalışırken `pending`, hata olursa snackbar, başarıda isteğe bağlı mesaj.
 * Başarılıysa sonucu, hata varsa undefined döner.
 */
export function useAction() {
  const [pending, setPending] = useState<string | null>(null)

  const run = useCallback(async <T,>(key: string, fn: () => Promise<T>, success?: string): Promise<T | undefined> => {
    setPending(key)
    try {
      const res = await fn()
      if (success) toast.success(success)
      return res
    } catch (err) {
      toast.error(errorMessage(err))
      return undefined
    } finally {
      setPending(null)
    }
  }, [])

  return { pending, run, isPending: (key: string) => pending === key }
}
