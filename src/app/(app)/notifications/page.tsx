"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Bell, CheckCheck, Loader2, Trash2 } from "lucide-react"
import { api, errorMessage, pb } from "@/lib/pb"
import { dateTime, relative } from "@/lib/format"
import type { Notification } from "@/lib/types"
import { cn } from "@/lib/utils"
import { useAction } from "@/hooks/use-data"
import { useApp } from "@/components/app-provider"
import { EmptyState, ErrorState, Loading, PageHeader } from "@/components/kit"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

const PER_PAGE = 30

export default function NotificationsPage() {
  const { user, unread, setUnread } = useApp()
  const router = useRouter()
  const { run, pending } = useAction()
  const [items, setItems] = useState<Notification[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)
  const uid = user?.id

  function loadPage(next: number) {
    setLoading(true)
    setError(null)
    if (next === page) setNonce((n) => n + 1)
    else setPage(next)
  }

  // Sayfa sayfa yükleme; 1. sayfa listeyi sıfırlar, sonrakiler sona ekler.
  useEffect(() => {
    if (!uid) return
    let active = true
    pb.collection("notifications")
      .getList<Notification>(page, PER_PAGE, { filter: pb.filter("user = {:u}", { u: uid }), sort: "-created" })
      .then((res) => {
        if (!active) return
        setItems((prev) => {
          if (page === 1) return res.items
          const seen = new Set(prev.map((n) => n.id))
          return [...prev, ...res.items.filter((n) => !seen.has(n.id))]
        })
        setTotalPages(res.totalPages)
        setError(null)
      })
      .catch((err) => active && setError(errorMessage(err)))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [uid, page, nonce])

  // Canlı: yeni bildirimleri başa ekle, değişenleri güncelle.
  useEffect(() => {
    if (!uid) return
    const unsub = pb.collection("notifications").subscribe<Notification>("*", (e) => {
      setItems((prev) => {
        if (e.action === "create") return prev.some((n) => n.id === e.record.id) ? prev : [e.record, ...prev]
        if (e.action === "update") return prev.map((n) => (n.id === e.record.id ? e.record : n))
        if (e.action === "delete") return prev.filter((n) => n.id !== e.record.id)
        return prev
      })
    })
    return () => {
      unsub.then((fn) => fn()).catch(() => {})
    }
  }, [uid])

  async function open(n: Notification) {
    if (!n.read) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)))
      setUnread(Math.max(0, unread - 1))
      api.readNotifications(n.id).catch(() => {})
    }
    if (n.link) router.push(n.link)
  }

  async function markAll() {
    const res = await run("all", () => api.readNotifications(), "Tüm bildirimler okundu olarak işaretlendi.")
    if (res) {
      setItems((prev) => prev.map((n) => ({ ...n, read: true })))
      setUnread(0)
    }
  }

  async function remove(n: Notification) {
    try {
      await pb.collection("notifications").delete(n.id)
      setItems((prev) => prev.filter((x) => x.id !== n.id))
      if (!n.read) setUnread(Math.max(0, unread - 1))
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  const hasUnread = items.some((n) => !n.read) || unread > 0

  return (
    <>
      <PageHeader
        title="Bildirimler"
        description="Kira tahsilatları, yeni kiracılar, teklifler ve satışlar."
        actions={
          <Button variant="outline" onClick={markAll} disabled={!hasUnread || pending === "all"}>
            {pending === "all" ? <Loader2 className="animate-spin" /> : <CheckCheck />}
            Tümünü okundu işaretle
          </Button>
        }
      />

      {error && <ErrorState message={error} onRetry={() => loadPage(1)} />}
      {loading && items.length === 0 && <Loading />}
      {!loading && !error && items.length === 0 && (
        <EmptyState
          icon={<Bell className="size-6" />}
          title="Bildiriminiz yok"
          description="Kiracınız olduğunda, kiranız tahsil edildiğinde veya teklif aldığınızda burada görürsünüz."
        />
      )}

      {items.length > 0 && (
        <ul className="divide-y overflow-hidden rounded-xl border bg-card">
          {items.map((n) => (
            <li key={n.id} className={cn("group flex items-start gap-1", !n.read && "bg-primary/5")}>
              <button
                type="button"
                onClick={() => open(n)}
                className="flex min-w-0 flex-1 gap-3 px-4 py-3 text-left outline-none hover:bg-muted/50 focus-visible:bg-muted/60"
              >
                <span
                  className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-primary")}
                  aria-label={n.read ? undefined : "Okunmadı"}
                />
                <span className="min-w-0 flex-1">
                  <span className={cn("block type-body-medium", !n.read && "font-medium")}>{n.title}</span>
                  {n.body && <span className="mt-0.5 block type-body-medium text-muted-foreground">{n.body}</span>}
                  <time className="mt-1 block type-body-small text-muted-foreground" dateTime={n.created} title={dateTime(n.created)}>
                    {relative(n.created)}
                  </time>
                </span>
              </button>
              <button
                type="button"
                onClick={() => remove(n)}
                className="m-2 rounded-md p-2 text-muted-foreground opacity-60 hover:bg-muted hover:text-destructive hover:opacity-100 focus-visible:opacity-100"
                aria-label="Bildirimi sil"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {page < totalPages && items.length > 0 && (
        <div className="mt-4 flex justify-center">
          <Button variant="outline" onClick={() => loadPage(page + 1)} disabled={loading}>
            {loading && <Loader2 className="animate-spin" />}
            Daha eski bildirimler
          </Button>
        </div>
      )}
    </>
  )
}
