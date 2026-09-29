"use client"

import { useState } from "react"
import { Key, XCircle } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { api, pb } from "@/lib/pb"
import { RENTAL_END_LABEL, date, dateTime, num, relative, toDate } from "@/lib/format"
import type { Rental } from "@/lib/types"
import { useAction, useLoad } from "@/hooks/use-data"
import { ConfirmDialog, EmptyState, ErrorState, Loading, Money, PageHeader, Row, Section, Tag } from "@/components/kit"
import { PropertyVisual } from "@/components/property-card"
import { Segmented } from "@/components/ui/tabs"
import { Dialog, DialogBody, DialogContent, DialogHeader } from "@/components/ui/dialog"
import { Pager, usePageFor } from "../_components/admin-kit"

const PER_PAGE = 25

const personName = (u?: { name?: string; email?: string }) => u?.name || u?.email || ""

/** Kira durum etiketleri: dönem sonunda bitecek, tolerans süresi. */
function RentalTags({ rental }: { rental: Rental }) {
  if (!rental.cancel_at_period_end && !rental.grace_until) return null
  return (
    <span className="mt-1 flex flex-wrap gap-1">
      {rental.cancel_at_period_end && <Tag>Dönem sonunda bitecek</Tag>}
      {rental.grace_until && <Tag tone="red">Tolerans: {date(rental.grace_until)}</Tag>}
    </span>
  )
}

export default function AdminRentalsPage() {
  const [showEnded, setShowEnded] = useState(false)
  const [page, setPage] = usePageFor(String(showEnded))
  const list = useLoad(async () => {
    const res = await pb.collection("rentals").getList<Rental>(page, PER_PAGE, {
      filter: showEnded ? "active = false" : "active = true",
      sort: showEnded ? "-ended" : "next_charge",
      expand: "property,tenant,owner",
    })
    // Gecikme kontrolü için "şimdi", yükleme anında sabitlenir.
    return { ...res, loadedAt: Date.now() }
  }, [page, showEnded])
  const { run, isPending } = useAction()
  const [selected, setSelected] = useState<Rental | null>(null)
  const [ending, setEnding] = useState<Rental | null>(null)

  const isOverdue = (r: Rental) => {
    const next = toDate(r.next_charge)
    return !showEnded && !!next && !!list.data && next.getTime() < list.data.loadedAt
  }

  return (
    <>
      <PageHeader
        title="Kiralar"
        description="Aktif kiralamalar ve bir sonraki tahsilat tarihleri. Tahsilat her saat başı otomatik yapılır."
      />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
        <Segmented
          aria-label="Kira durumu"
          value={showEnded ? "ended" : "active"}
          onValueChange={(v) => setShowEnded(v === "ended")}
          items={[
            { value: "active", label: "Aktif" },
            { value: "ended", label: "Sona Ermiş" },
          ]}
        />

        {list.error && <ErrorState message={list.error} onRetry={list.reload} />}
        {!list.data && list.loading && <Loading />}

        {list.data &&
          (list.data.items.length === 0 ? (
            <EmptyState
              icon={<Key weight="fill" />}
              title={showEnded ? "Sona ermiş kira yok" : "Aktif kira yok"}
            />
          ) : (
            <div className="min-w-0">
              <Section header={`${num(list.data.totalItems)} ${showEnded ? "sona ermiş" : "aktif"} kira`}>
                {list.data.items.map((r) => {
                  const p = r.expand?.property
                  return (
                    <Row
                      key={r.id}
                      onClick={() => setSelected(r)}
                      leading={
                        <span className="my-2 size-12 shrink-0 overflow-hidden rounded-[10px] bg-fill-tertiary">
                          {p ? (
                            <PropertyVisual property={p} className="size-full" />
                          ) : (
                            <span className="flex size-full items-center justify-center text-label-tertiary">
                              <Key weight="fill" className="size-6" />
                            </span>
                          )}
                        </span>
                      }
                      detail={
                        <span className="flex flex-col items-end">
                          <Money value={r.price} className="text-label" />
                          <span className="text-footnote tabular-nums">{num(r.periods_paid)} dönem</span>
                        </span>
                      }
                      accessory="chevron"
                    >
                      <span className={cn("block truncate text-body", p ? "text-label" : "text-label-secondary")}>
                        {p ? p.name : "Silinmiş mülk"}
                      </span>
                      <span className="block truncate text-subheadline text-label-secondary">
                        {personName(r.expand?.tenant)} → {personName(r.expand?.owner)}
                      </span>
                      <span className="block truncate text-footnote text-label-secondary">
                        {showEnded ? (
                          <>
                            Bitiş: {date(r.ended)}
                            {r.ended_reason && ` · ${RENTAL_END_LABEL[r.ended_reason]}`}
                          </>
                        ) : (
                          <>
                            Sonraki tahsilat:{" "}
                            <span title={dateTime(r.next_charge)} className={isOverdue(r) ? "text-loss" : undefined}>
                              {relative(r.next_charge)}
                            </span>
                          </>
                        )}
                      </span>
                      {!showEnded && <RentalTags rental={r} />}
                    </Row>
                  )
                })}
              </Section>
              <Pager page={page} totalPages={list.data.totalPages} onPage={setPage} />
            </div>
          ))}
      </div>

      <RentalSheet
        rental={selected}
        overdue={!!selected && isOverdue(selected)}
        onOpenChange={(o) => !o && setSelected(null)}
        onEnd={(r) => {
          setSelected(null)
          setEnding(r)
        }}
      />

      <ConfirmDialog
        open={!!ending}
        onOpenChange={(o) => !o && setEnding(null)}
        title="Kira hemen sonlandırılsın mı?"
        description={`${ending?.expand?.property?.name || "Mülk"} kiralaması şimdi biter. Ödenmiş dönem için iade yapılmaz; kiracı ve sahibe bildirim gider.`}
        confirmLabel="Kirayı Sonlandır"
        destructive
        pending={isPending("end")}
        onConfirm={async () => {
          if (!ending) return
          const res = await run("end", () => api.admin.endRental(ending.id), "Kira sonlandırıldı.")
          if (res === undefined) return false
          list.reload()
        }}
      />
    </>
  )
}

/** Kira ayrıntısı: taraflar, tutar, tarihler ve zorla sonlandırma. */
function RentalSheet({
  rental,
  overdue,
  onOpenChange,
  onEnd,
}: {
  rental: Rental | null
  overdue: boolean
  onOpenChange: (open: boolean) => void
  onEnd: (r: Rental) => void
}) {
  // Kapanış animasyonu sırasında içerik boşalmasın diye son kayıt tutulur.
  const [last, setLast] = useState<Rental | null>(rental)
  if (rental && rental !== last) setLast(rental)
  const r = rental || last
  const p = r?.expand?.property

  return (
    <Dialog open={!!rental} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader title={p?.name || "Kira"} />
        {r && (
          <DialogBody>
            <Section>
              {p ? (
                <Row href={`/properties/${p.id}`} title="Mülk" detail={p.name} />
              ) : (
                <Row title="Mülk" detail="Silinmiş mülk" />
              )}
              <Row href={`/users/${r.tenant}`} title="Kiracı" detail={personName(r.expand?.tenant)} />
              <Row href={`/users/${r.owner}`} title="Sahibi" detail={personName(r.expand?.owner)} />
            </Section>

            <Section>
              <Row title="Dönemlik" detail={<Money value={r.price} />} />
              <Row title="Ödenen dönem" detail={<span className="tabular-nums">{num(r.periods_paid)}</span>} />
              <Row title="Başlangıç" detail={date(r.started)} />
              {r.active ? (
                <Row
                  title="Sonraki tahsilat"
                  subtitle={dateTime(r.next_charge)}
                  detail={<span className={overdue ? "text-loss" : undefined}>{relative(r.next_charge)}</span>}
                />
              ) : (
                <>
                  <Row title="Bitiş" detail={date(r.ended)} />
                  {r.ended_reason && <Row title="Neden" detail={RENTAL_END_LABEL[r.ended_reason]} />}
                </>
              )}
            </Section>

            {r.active && (r.cancel_at_period_end || r.grace_until) && (
              <Section plain bodyClassName="flex flex-wrap gap-1.5 px-4 py-3">
                {r.cancel_at_period_end && <Tag>Dönem sonunda bitecek</Tag>}
                {r.grace_until && <Tag tone="red">Tolerans: {date(r.grace_until)}</Tag>}
              </Section>
            )}

            {r.active && (
              <Section footer="Kira hemen biter; ödenmiş dönem için iade yapılmaz.">
                <Row onClick={() => onEnd(r)} icon={XCircle} iconColor="red" title="Kirayı Sonlandır" destructive />
              </Section>
            )}
          </DialogBody>
        )}
      </DialogContent>
    </Dialog>
  )
}
