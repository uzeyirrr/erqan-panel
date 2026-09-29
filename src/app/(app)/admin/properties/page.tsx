"use client"

import { useState } from "react"
import { ArrowSquareOut, ArrowsLeftRight, Check, MagnifyingGlass, Trash } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { api, pb } from "@/lib/pb"
import { loadCatalog, PROPERTY_EXPAND } from "@/lib/catalog"
import { STATUS_LABEL, num } from "@/lib/format"
import type { Property, PropertyStatus, User } from "@/lib/types"
import { useAction, useLoad } from "@/hooks/use-data"
import {
  Avatar,
  Chips,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Loading,
  Money,
  NativeSelect,
  PageHeader,
  Row,
  SearchField,
  Section,
  StatusBadge,
} from "@/components/kit"
import { PropertyVisual } from "@/components/property-card"
import { Dialog, DialogBody, DialogContent, DialogHeader } from "@/components/ui/dialog"
import { FormDialog, Pager, useDebounced, usePageFor } from "../_components/admin-kit"

const PER_PAGE = 25

const ownerName = (p: Property) => p.expand?.owner?.name || p.expand?.owner?.email || "Bilinmiyor"
const placeName = (p: Property) => {
  const c = p.expand?.city
  return c ? [c.expand?.country?.flag, c.name].filter(Boolean).join(" ") : ""
}

export default function AdminPropertiesPage() {
  const catalog = useLoad(() => loadCatalog(true), [])
  const [q, setQ] = useState("")
  const query = useDebounced(q.trim())
  const [status, setStatus] = useState("")
  const [type, setType] = useState("")
  const [city, setCity] = useState("")
  const filters: string[] = []
  const params: Record<string, string> = {}
  if (query) {
    filters.push("name ~ {:q}")
    params.q = query
  }
  if (status) {
    filters.push("status = {:s}")
    params.s = status
  }
  if (type) {
    filters.push("type = {:t}")
    params.t = type
  }
  if (city) {
    filters.push("city = {:c}")
    params.c = city
  }
  const filter = filters.length ? pb.filter(filters.join(" && "), params) : ""
  const [page, setPage] = usePageFor(filter)

  const list = useLoad(
    () => pb.collection("properties").getList<Property>(page, PER_PAGE, { sort: "-created", filter, expand: PROPERTY_EXPAND }),
    [page, filter],
  )

  const { run, isPending } = useAction()
  const [selected, setSelected] = useState<Property | null>(null)
  const [transfer, setTransfer] = useState<{ property: Property; email: string; candidates: User[]; owner: string } | null>(null)
  const [deleting, setDeleting] = useState<Property | null>(null)

  async function searchOwner(email: string) {
    if (!transfer) return
    setTransfer({ ...transfer, email })
    if (email.trim().length < 2) return
    try {
      const res = await pb.collection("users").getList<User>(1, 8, {
        filter: pb.filter("email ~ {:q} || name ~ {:q}", { q: email.trim() }),
      })
      setTransfer((t) => (t ? { ...t, candidates: res.items } : t))
    } catch {
      /* arama hatası sessiz geçilir */
    }
  }

  const cat = catalog.data
  const candidates = transfer ? transfer.candidates.filter((u) => u.id !== transfer.property.owner) : []

  return (
    <>
      <PageHeader title="Mülkler" description="Sistemdeki tüm mülkler. Sahiplik devri ve silme buradan yapılır." />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
        <div className="grid min-w-0 gap-3">
          <SearchField value={q} onChange={setQ} placeholder="Mülk adıyla ara" aria-label="Mülk ara" className="lg:max-w-sm" />
          <Chips
            aria-label="Durum"
            value={status}
            onChange={setStatus}
            items={[
              { value: "", label: "Tümü" },
              ...(Object.keys(STATUS_LABEL) as PropertyStatus[]).map((s) => ({ value: s, label: STATUS_LABEL[s] })),
            ]}
          />
          <div className="grid grid-cols-2 gap-2 lg:max-w-md">
            <NativeSelect value={type} onChange={(e) => setType(e.target.value)} aria-label="Tip">
              <option value="">Tüm tipler</option>
              {cat?.types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </NativeSelect>
            <NativeSelect value={city} onChange={(e) => setCity(e.target.value)} aria-label="Şehir">
              <option value="">Tüm şehirler</option>
              {cat?.countries.map((co) => (
                <optgroup key={co.id} label={`${co.flag} ${co.name}`}>
                  {cat.cities
                    .filter((c) => c.country === co.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </optgroup>
              ))}
            </NativeSelect>
          </div>
        </div>

        {list.error && <ErrorState message={list.error} onRetry={list.reload} />}
        {!list.data && list.loading && <Loading />}

        {list.data &&
          (list.data.items.length === 0 ? (
            <EmptyState icon={<MagnifyingGlass weight="bold" />} title="Sonuç yok" description="Filtrelerle eşleşen mülk yok." />
          ) : (
            <div className="min-w-0">
              <Section header={`${num(list.data.totalItems)} mülk`}>
                {list.data.items.map((p) => (
                  <Row
                    key={p.id}
                    onClick={() => setSelected(p)}
                    leading={
                      <span className="my-2 size-12 shrink-0 overflow-hidden rounded-[10px] bg-fill-tertiary">
                        <PropertyVisual property={p} className="size-full" />
                      </span>
                    }
                    accessory="chevron"
                  >
                    <span className="block truncate text-body text-label">{p.name}</span>
                    <span className="block truncate text-subheadline text-label-secondary">
                      {[ownerName(p), placeName(p), p.expand?.type?.name].filter(Boolean).join(" · ")}
                    </span>
                    <span className="mt-1 flex min-w-0 items-center gap-2 text-footnote text-label-secondary">
                      <StatusBadge status={p.status} />
                      <span className="truncate tabular-nums">
                        {p.tenant_count}/{p.tenant_limit} kiracı · <Money value={p.invested} /> yatırım
                      </span>
                    </span>
                  </Row>
                ))}
              </Section>
              <Pager page={page} totalPages={list.data.totalPages} onPage={setPage} />
            </div>
          ))}
      </div>

      <PropertySheet
        property={selected}
        onOpenChange={(o) => !o && setSelected(null)}
        onTransfer={(p) => {
          setSelected(null)
          setTransfer({ property: p, email: "", candidates: [], owner: "" })
        }}
        onDelete={(p) => {
          setSelected(null)
          setDeleting(p)
        }}
      />

      {transfer && (
        <FormDialog
          open
          onOpenChange={(o) => !o && setTransfer(null)}
          title="Sahipliği Devret"
          description={`${transfer.property.name}: Mülk ücretsiz olarak yeni sahibe geçer. Aktif kiralar yeni sahiple devam eder, bekleyen teklifler iade edilir.`}
          pending={isPending("transfer")}
          submitLabel="Devret"
          onSubmit={async () => {
            if (!transfer.owner) return
            const res = await run("transfer", () => api.admin.transfer(transfer.property.id, transfer.owner), "Mülk devredildi.")
            if (res) {
              setTransfer(null)
              list.reload()
            }
          }}
        >
          <section className="grid gap-1.5">
            <SearchField
              id="tr-q"
              value={transfer.email}
              onChange={searchOwner}
              placeholder="E-posta veya ad"
              aria-label="Yeni sahip"
              autoComplete="off"
              autoFocus
            />
            <p className="px-4 text-footnote text-label-secondary">Yeni sahibi e-posta veya adla arayın, listeden seçin.</p>
          </section>
          {candidates.length > 0 && (
            <section className="min-w-0">
              <h2 className="mb-1.5 px-4 text-footnote font-semibold tracking-wide text-label-secondary uppercase">Yeni sahip</h2>
              <ul role="listbox" aria-label="Kullanıcılar" className="overflow-hidden rounded-section bg-grouped-secondary py-1.5">
                {candidates.map((u) => {
                  const on = transfer.owner === u.id
                  return (
                    <li key={u.id} role="none" className="group/row relative">
                      <button
                        type="button"
                        role="option"
                        aria-selected={on}
                        onClick={() => setTransfer({ ...transfer, owner: u.id })}
                        className="press-row flex min-h-11 w-full items-center gap-3 px-4 text-left outline-none focus-visible:bg-fill-quaternary"
                      >
                        <Avatar name={u.name || u.email} className="size-9 text-subheadline" />
                        <span className="relative flex min-w-0 flex-1 items-center gap-3 self-stretch py-2.5 after:hairline after:absolute after:bottom-0 after:left-0 after:-right-4 after:bg-separator group-last/row:after:hidden">
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-body text-label">{u.name || "İsimsiz"}</span>
                            <span className="block truncate text-subheadline text-label-secondary">{u.email}</span>
                          </span>
                          <Check weight="bold" className={cn("size-5 shrink-0 text-tint", !on && "invisible")} />
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}
        </FormDialog>
      )}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`${deleting?.name} silinsin mi?`}
        description="Mülk kalıcı olarak silinir; kiralama kayıtları, teklifler ve yükseltmeleri de silinir. Bekleyen teklif blokeleri iade edilmez, bu yüzden önce mülkü satıştan kaldırın. Bu işlem geri alınamaz."
        confirmLabel="Kalıcı Olarak Sil"
        destructive
        pending={isPending("delete")}
        onConfirm={async () => {
          if (!deleting) return
          const res = await run("delete", () => pb.collection("properties").delete(deleting.id), "Mülk silindi.")
          if (res === undefined) return false
          list.reload()
        }}
      />
    </>
  )
}

/** Mülk ayrıntısı: özet bilgiler, bağlantılar ve yönetici eylemleri. */
function PropertySheet({
  property,
  onOpenChange,
  onTransfer,
  onDelete,
}: {
  property: Property | null
  onOpenChange: (open: boolean) => void
  onTransfer: (p: Property) => void
  onDelete: (p: Property) => void
}) {
  // Kapanış animasyonu sırasında içerik boşalmasın diye son mülk tutulur.
  const [last, setLast] = useState<Property | null>(property)
  if (property && property !== last) setLast(property)
  const p = property || last

  return (
    <Dialog open={!!property} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader title={p?.name || ""} />
        {p && (
          <DialogBody>
            <div>
              <div className="relative aspect-[16/10] overflow-hidden rounded-card bg-fill-tertiary">
                <PropertyVisual property={p} className="size-full" />
                <StatusBadge status={p.status} className="glass-thick absolute top-3 left-3 shadow-none" />
              </div>
            </div>

            <Section>
              <Row title="Sahibi" detail={ownerName(p)} href={`/users/${p.owner}`} />
              <Row title="Konum" detail={placeName(p) || "—"} />
              <Row title="Tip" detail={p.expand?.type?.name || "—"} />
              <Row
                title="Kiracı"
                detail={
                  <span className="tabular-nums">
                    {p.tenant_count}/{p.tenant_limit}
                  </span>
                }
              />
              <Row title="Yatırım" detail={<Money value={p.invested} />} />
            </Section>

            <Section>
              <Row href={`/properties/${p.id}`} icon={ArrowSquareOut} iconColor="blue" title="Mülk Sayfası" />
            </Section>

            <Section>
              <Row onClick={() => onTransfer(p)} icon={ArrowsLeftRight} iconColor="orange" title="Sahipliği Devret" accessory="chevron" />
              <Row onClick={() => onDelete(p)} icon={Trash} iconColor="red" title="Mülkü Sil" destructive />
            </Section>
          </DialogBody>
        )}
      </DialogContent>
    </Dialog>
  )
}
