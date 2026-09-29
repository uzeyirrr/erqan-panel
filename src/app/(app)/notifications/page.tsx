"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Bell, Trash } from "@phosphor-icons/react"
import { api, errorMessage, pb } from "@/lib/pb"
import { dateTime, relative } from "@/lib/format"
import type { Notification } from "@/lib/types"
import { cn } from "@/lib/utils"
import { useAction } from "@/hooks/use-data"
import { useApp } from "@/components/app-provider"
import { EmptyState, ErrorState, Loading, PageHeader, Section } from "@/components/kit"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
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
  // Sola kaydırılıp "Sil" düğmesi açık duran satır (aynı anda tek satır, iOS gibi)
  const [swiped, setSwiped] = useState<string | null>(null)
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

  // Açık kaydırma: satırın dışına dokununca kapanır.
  useEffect(() => {
    if (!swiped) return
    const inRow = (t: EventTarget | null, sel: string) => !!(t as Element | null)?.closest?.(sel)
    const close = (e: PointerEvent) => {
      if (inRow(e.target, `[data-swipe-row="${swiped}"]`)) return
      setSwiped(null)
      // iOS: açık satırı kapatan dokunuş başka bir satırı açmaz.
      const block = (ev: MouseEvent) => {
        if (!inRow(ev.target, "[data-swipe-row]")) return
        ev.preventDefault()
        ev.stopPropagation()
      }
      document.addEventListener("click", block, { capture: true, once: true })
      setTimeout(() => document.removeEventListener("click", block, { capture: true }), 700)
    }
    document.addEventListener("pointerdown", close)
    return () => document.removeEventListener("pointerdown", close)
  }, [swiped])

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
  const fresh = items.filter((n) => !n.read)
  const earlier = items.filter((n) => n.read)
  const groups = [
    { key: "new", header: "Yeni", items: fresh },
    { key: "earlier", header: fresh.length > 0 ? "Daha Önce" : undefined, items: earlier },
  ].filter((g) => g.items.length > 0)

  return (
    <>
      <PageHeader
        title="Bildirimler"
        description="Kira tahsilatları, yeni kiracılar, teklifler ve satışlar."
        actions={
          hasUnread && (
            <Button variant="glass" size="sm" className="h-11 px-4" onClick={markAll} disabled={pending === "all"}>
              {pending === "all" ? <Spinner className="size-4" /> : "Tümünü Oku"}
            </Button>
          )
        }
      />

      {error && <ErrorState message={error} onRetry={() => loadPage(1)} />}
      {loading && items.length === 0 && <Loading />}
      {!loading && !error && items.length === 0 && (
        <EmptyState
          icon={<Bell weight="fill" />}
          title="Bildiriminiz yok"
          description="Kiracınız olduğunda, kiranız tahsil edildiğinde veya teklif aldığınızda burada görürsünüz."
        />
      )}

      {items.length > 0 && (
        <div className="grid gap-8">
          {groups.map((g) => (
            <Section key={g.key} header={g.header}>
              {g.items.map((n) => (
                <NotificationRow
                  key={n.id}
                  n={n}
                  revealed={swiped === n.id}
                  onReveal={(v) => setSwiped(v ? n.id : null)}
                  onOpen={() => open(n)}
                  onDelete={() => remove(n)}
                />
              ))}
            </Section>
          ))}
        </div>
      )}

      {page < totalPages && items.length > 0 && (
        <div className="mt-6 flex justify-center">
          <Button variant="secondary" onClick={() => loadPage(page + 1)} disabled={loading}>
            {loading && <Spinner className="size-4" />}
            Daha Eski Bildirimler
          </Button>
        </div>
      )}
    </>
  )
}

/** "Sil" düğmesinin genişliği (sola kaydırınca açılan alan). */
const REVEAL = 84

/**
 * Bildirim satırı (Mail / Bildirim Merkezi). Sola kaydırınca kırmızı "Sil" düğmesi açılır,
 * sonuna kadar kaydırmak doğrudan siler. Fareli cihazlarda üzerine gelince çöp kutusu görünür.
 */
function NotificationRow({
  n,
  revealed,
  onReveal,
  onOpen,
  onDelete,
}: {
  n: Notification
  revealed: boolean
  onReveal: (open: boolean) => void
  onOpen: () => void
  onDelete: () => Promise<void>
}) {
  const [drag, setDrag] = useState<number | null>(null)
  const dragRef = useRef<number | null>(null)
  const gesture = useRef<{ x: number; y: number; base: number; axis: "x" | "y" | null } | null>(null)
  const moved = useRef(false)
  const base = revealed ? -REVEAL : 0
  const x = drag ?? base
  const unread = !n.read

  function setOffset(v: number | null) {
    dragRef.current = v
    setDrag(v)
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType === "mouse" && e.button !== 0) return
    gesture.current = { x: e.clientX, y: e.clientY, base, axis: null }
    moved.current = false
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const g = gesture.current
    if (!g) return
    const dx = e.clientX - g.x
    const dy = e.clientY - g.y
    if (!g.axis) {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return
      g.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y"
      if (g.axis === "x") e.currentTarget.setPointerCapture(e.pointerId)
    }
    if (g.axis !== "x") return
    moved.current = true
    const next = g.base + dx
    setOffset(next > 0 ? next / 5 : next) // sağa doğru lastik etkisi
  }

  async function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const g = gesture.current
    gesture.current = null
    const d = dragRef.current
    if (!g || g.axis !== "x" || d === null) return setOffset(null)
    const width = e.currentTarget.offsetWidth
    if (d < -width * 0.55) {
      // Sonuna kadar kaydırma: satır kayıp gider ve silinir.
      setOffset(-width)
      onReveal(false)
      await onDelete()
      setOffset(null)
      return
    }
    setOffset(null)
    onReveal(d < -REVEAL / 2)
  }

  return (
    <li data-slot="list-row" data-swipe-row={n.id} className="group/row relative overflow-hidden">
      <button
        type="button"
        aria-label="Bildirimi sil"
        onClick={() => onDelete()}
        onFocus={() => onReveal(true)}
        onBlur={(e) => {
          if (!e.currentTarget.parentElement?.contains(e.relatedTarget as Node | null)) onReveal(false)
        }}
        className={cn(
          "absolute inset-y-0 right-0 flex flex-col items-center justify-center gap-0.5 bg-system-red text-footnote font-semibold text-white outline-none",
          x === 0 && "opacity-0",
        )}
        style={{ width: Math.max(REVEAL, -x) }}
      >
        <Trash weight="fill" className="size-5" />
        Sil
      </button>

      <div
        className="relative touch-pan-y bg-grouped-secondary select-none"
        style={{
          transform: x ? `translateX(${x}px)` : undefined,
          transition: drag !== null ? "none" : "transform 0.45s var(--ease-ios)",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          gesture.current = null
          setOffset(null)
        }}
        onClickCapture={(e) => {
          // Kaydırma hareketi veya açık satıra dokunma bir "açma" sayılmaz.
          if (moved.current) {
            e.preventDefault()
            e.stopPropagation()
            moved.current = false
          } else if (revealed) {
            e.preventDefault()
            e.stopPropagation()
            onReveal(false)
          }
        }}
      >
        <button
          type="button"
          onClick={onOpen}
          className={cn(
            "press-row flex min-h-11 w-full items-center gap-3 pl-3 pr-4 text-left outline-none focus-visible:bg-fill-quaternary",
            drag !== null && "bg-transparent!",
          )}
        >
          <span
            aria-hidden="true"
            className={cn("mt-[17px] size-2.5 shrink-0 self-start rounded-full", unread ? "bg-tint" : "bg-transparent")}
          />
          <span className="relative min-w-0 flex-1 self-stretch py-[11px] after:hairline after:absolute after:bottom-0 after:left-0 after:-right-4 after:bg-separator group-last/row:after:hidden">
            <span className="flex items-baseline gap-2">
              <span className={cn("min-w-0 flex-1 truncate text-label", unread ? "text-headline" : "text-body")}>
                {unread && <span className="sr-only">Okunmadı: </span>}
                {n.title}
              </span>
              <time
                dateTime={n.created}
                title={dateTime(n.created)}
                className={cn(
                  "shrink-0 text-footnote text-label-secondary transition-opacity",
                  x === 0 && "pointer-fine:group-hover/row:opacity-0",
                )}
              >
                {relative(n.created)}
              </time>
            </span>
            {n.body && <span className="mt-0.5 line-clamp-2 text-subheadline text-label-secondary">{n.body}</span>}
          </span>
        </button>

        {/* Fareli cihazlarda üzerine gelince silme düğmesi (dokunmatikte kaydırma kullanılır) */}
        {x === 0 && (
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            onClick={() => onDelete()}
            className="press-dim pointer-events-none absolute top-2 right-2 hidden size-8 items-center justify-center rounded-full bg-fill-tertiary text-label-secondary opacity-0 transition-opacity pointer-fine:flex pointer-fine:group-hover/row:pointer-events-auto pointer-fine:group-hover/row:opacity-100 hover:text-system-red"
          >
            <Trash className="size-4" />
          </button>
        )}
      </div>
    </li>
  )
}
