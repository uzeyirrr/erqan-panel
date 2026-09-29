"use client"

import { useState } from "react"
import { Loader2, Play } from "lucide-react"
import { api } from "@/lib/pb"
import { STATUS_LABEL, num } from "@/lib/format"
import type { PropertyStatus } from "@/lib/types"
import { useAction, useLoad } from "@/hooks/use-data"
import { ErrorState, Loading, Money, PageHeader, Panel, Stat } from "@/components/kit"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const JOB_LABEL: Record<string, string> = {
  charges: "Kira tahsilatı",
  warnings: "Bakiye uyarısı",
  offers: "Süresi dolan teklif",
  builds: "Tamamlanan inşaat",
}

export default function AdminOverviewPage() {
  const stats = useLoad(() => api.admin.stats(), [])
  const { run, isPending } = useAction()
  const [result, setResult] = useState<Record<string, { done: number; failed: number }> | null>(null)

  const s = stats.data

  return (
    <>
      <PageHeader
        title="Genel bakış"
        description="Sistemdeki kullanıcılar, kredi dolaşımı, mülkler ve kiralar."
        actions={
          <Button
            variant="outline"
            disabled={isPending("maint")}
            onClick={async () => {
              const res = await run("maint", () => api.admin.runMaintenance(), "Bakım işi çalıştı.")
              if (res) {
                setResult(res)
                stats.reload()
              }
            }}
          >
            {isPending("maint") ? <Loader2 className="animate-spin" /> : <Play />}
            Bakım işini şimdi çalıştır
          </Button>
        }
      />

      {result && (
        <Panel title="Bakım işi sonucu" className="mb-4">
          <p className="mb-3 type-body-medium text-muted-foreground">
            Bu iş normalde her saat başı kendiliğinden çalışır: dönemi gelen kiraları tahsil eder, bakiye uyarılarını
            gönderir, süresi dolan teklifleri iade eder, biten inşaatları tamamlar.
          </p>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Object.entries(result).map(([k, v]) => (
              <div key={k} className="rounded-lg border px-3 py-2">
                <dt className="type-body-small text-muted-foreground">{JOB_LABEL[k] || k}</dt>
                <dd className="figure type-title-large">
                  {v.done}
                  {v.failed > 0 && <span className="ml-2 type-body-medium text-loss">{v.failed} hata</span>}
                </dd>
              </div>
            ))}
          </dl>
        </Panel>
      )}

      {stats.error && <ErrorState message={stats.error} onRetry={stats.reload} />}
      {!s && stats.loading && <Loading />}

      {s && (
        <div className="grid gap-4 lg:grid-cols-3">
          <section className="min-w-0 rounded-xl border bg-card p-5 lg:col-span-3">
            <div className="grid grid-cols-2 gap-5 lg:grid-cols-5">
              <Stat label="Kullanıcı" value={num(s.users)} hint={s.banned_users ? `${s.banned_users} engelli` : "Engelli yok"} />
              <Stat label="Dolaşımdaki kredi" value={<Money value={s.credit_in_circulation} />} />
              <Stat label="Tekliflerde bloke" value={<Money value={s.held_in_offers} />} hint={`${s.pending_offers} bekleyen teklif`} />
              <Stat label="Komisyon geliri" value={<Money value={s.commission_revenue} className="text-gain" />} />
              <Stat label="Davetle gelen" value={num(s.referred_users)} hint="kullanıcı" />
              <Stat label="Mülk" value={num(s.properties)} />
              <Stat label="Aktif kira" value={num(s.active_rentals)} />
              <Stat label="Dönemlik kira hacmi" value={<Money value={s.monthly_rent_volume} />} />
            </div>
          </section>

          <Panel title="Mülk tipleri" className="lg:col-span-2" bodyClassName="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Tip</TableHead>
                    <TableHead className="text-right">Satılan</TableHead>
                    <TableHead className="text-right">Kalan stok</TableHead>
                    <TableHead className="pr-4 text-right">Satış oranı</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {s.by_type.map((t) => {
                    const total = t.sold + t.stock
                    const pct = total ? Math.round((t.sold / total) * 100) : 0
                    return (
                      <TableRow key={t.type}>
                        <TableCell className="pl-4 font-medium">{t.type}</TableCell>
                        <TableCell className="figure text-right">{num(t.sold)}</TableCell>
                        <TableCell className="figure text-right">{num(t.stock)}</TableCell>
                        <TableCell className="pr-4">
                          <div className="flex items-center justify-end gap-2">
                            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                              <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="figure w-9 text-right type-body-small">{t.sold > 0 && pct === 0 ? "%<1" : `%${pct}`}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </Panel>

          <Panel title="Mülk durumları">
            <dl className="grid gap-2 type-body-medium">
              {(Object.keys(STATUS_LABEL) as PropertyStatus[]).map((st) => (
                <div key={st} className="flex justify-between">
                  <dt className="text-muted-foreground">{STATUS_LABEL[st]}</dt>
                  <dd className="figure font-medium">{num(s.by_status[st] || 0)}</dd>
                </div>
              ))}
            </dl>
          </Panel>

          <Panel title="Ülkelere göre mülkler" className="lg:col-span-3">
            {s.by_country.length === 0 ? (
              <p className="type-body-medium text-muted-foreground">Henüz satılmış mülk yok.</p>
            ) : (
              <ul className="grid gap-x-8 gap-y-2 type-body-medium sm:grid-cols-2 lg:grid-cols-3">
                {s.by_country.map((c) => (
                  <li key={c.country} className="flex justify-between gap-2">
                    <span>
                      {c.flag} {c.country}
                    </span>
                    <span className="figure font-medium">{num(c.count)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      )}
    </>
  )
}
