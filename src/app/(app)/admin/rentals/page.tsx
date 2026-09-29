"use client"

import Link from "next/link"
import { useState } from "react"
import { api, pb } from "@/lib/pb"
import { RENTAL_END_LABEL, date, dateTime, num, relative, toDate } from "@/lib/format"
import type { Rental } from "@/lib/types"
import { useAction, useLoad } from "@/hooks/use-data"
import { ConfirmDialog, ErrorState, Loading, Money, PageHeader, Tag } from "@/components/kit"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Pager, SwitchRow, TableWrap, usePageFor } from "../_components/admin-kit"

const PER_PAGE = 25

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
  const [ending, setEnding] = useState<Rental | null>(null)

  return (
    <>
      <PageHeader
        title="Kiralar"
        description="Aktif kiralamalar ve bir sonraki tahsilat tarihleri. Tahsilat her saat başı otomatik yapılır."
      />
      <div className="mb-3 max-w-xs">
        <SwitchRow id="ended" label="Sona ermiş kiraları göster" checked={showEnded} onChange={setShowEnded} />
      </div>

      {list.error && <ErrorState message={list.error} onRetry={list.reload} />}
      {!list.data && list.loading && <Loading />}

      {list.data && (
        <>
          <p className="mb-2 type-body-medium text-muted-foreground">
            {num(list.data.totalItems)} {showEnded ? "sona ermiş" : "aktif"} kira
          </p>
          <TableWrap>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Mülk</TableHead>
                  <TableHead>Kiracı</TableHead>
                  <TableHead>Sahibi</TableHead>
                  <TableHead className="text-right">Dönemlik</TableHead>
                  <TableHead className="text-right">Dönem</TableHead>
                  <TableHead>{showEnded ? "Bitiş" : "Sonraki tahsilat"}</TableHead>
                  {!showEnded && (
                    <TableHead className="pr-4 text-right">
                      <span className="sr-only">İşlemler</span>
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.data.items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      {showEnded ? "Sona ermiş kira yok." : "Aktif kira yok."}
                    </TableCell>
                  </TableRow>
                )}
                {list.data.items.map((r) => {
                  const p = r.expand?.property
                  const next = toDate(r.next_charge)
                  const overdue = !showEnded && next && next.getTime() < list.data!.loadedAt
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="pl-4">
                        {p ? (
                          <Link href={`/properties/${p.id}`} className="font-medium hover:underline">
                            {p.name}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">Silinmiş mülk</span>
                        )}
                        <div className="type-body-small text-muted-foreground">Başlangıç: {date(r.started)}</div>
                      </TableCell>
                      <TableCell className="type-body-medium">
                        <Link href={`/users/${r.tenant}`} className="hover:underline">
                          {r.expand?.tenant?.name || r.expand?.tenant?.email}
                        </Link>
                      </TableCell>
                      <TableCell className="type-body-medium">
                        <Link href={`/users/${r.owner}`} className="hover:underline">
                          {r.expand?.owner?.name || r.expand?.owner?.email}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right">
                        <Money value={r.price} />
                      </TableCell>
                      <TableCell className="figure text-right">{r.periods_paid}</TableCell>
                      <TableCell className="type-body-medium">
                        {showEnded ? (
                          <>
                            <div>{date(r.ended)}</div>
                            {r.ended_reason && (
                              <div className="type-body-small text-muted-foreground">{RENTAL_END_LABEL[r.ended_reason]}</div>
                            )}
                          </>
                        ) : (
                          <>
                            <div title={dateTime(r.next_charge)} className={overdue ? "text-loss" : undefined}>
                              {relative(r.next_charge)}
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {r.cancel_at_period_end && <Tag>Dönem sonunda bitecek</Tag>}
                              {r.grace_until && <Tag className="bg-loss/10 text-loss">Tolerans: {date(r.grace_until)}</Tag>}
                            </div>
                          </>
                        )}
                      </TableCell>
                      {!showEnded && (
                        <TableCell className="pr-4 text-right">
                          <Button variant="outline" size="sm" onClick={() => setEnding(r)}>
                            Sonlandır
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableWrap>
          <Pager page={page} totalPages={list.data.totalPages} onPage={setPage} />
        </>
      )}

      <ConfirmDialog
        open={!!ending}
        onOpenChange={(o) => !o && setEnding(null)}
        title="Kira hemen sonlandırılsın mı?"
        description={`${ending?.expand?.property?.name || "Mülk"} kiralaması şimdi biter. Ödenmiş dönem için iade yapılmaz; kiracı ve sahibe bildirim gider.`}
        confirmLabel="Kirayı sonlandır"
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
