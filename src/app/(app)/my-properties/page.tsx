"use client"

import Link from "next/link"
import { Suspense, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { AlertTriangle, Building2, KeyRound } from "lucide-react"
import { api, pb } from "@/lib/pb"
import { RENTAL_END_LABEL, STATUS_LABEL, date, money, relative } from "@/lib/format"
import { PROPERTY_EXPAND } from "@/lib/catalog"
import type { Property, PropertyStatus, Rental } from "@/lib/types"
import { useAction, useLoad } from "@/hooks/use-data"
import { useApp } from "@/components/app-provider"
import { ConfirmDialog, EmptyState, ErrorState, Loading, Money, PageHeader, Tag } from "@/components/kit"
import { PropertyCard, PropertyVisual } from "@/components/property-card"
import { Button, buttonVariants } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

const STATUSES: PropertyStatus[] = ["rent", "rented", "sale", "empty", "building"]

function Owned() {
  const { user, config } = useApp()
  const [filter, setFilter] = useState<PropertyStatus | "all">("all")
  const list = useLoad(
    () =>
      pb.collection("properties").getFullList<Property>({
        filter: pb.filter("owner = {:u}", { u: user!.id }),
        expand: PROPERTY_EXPAND,
        sort: "-created",
      }),
    [user?.id],
    !!user,
  )

  if (list.error) return <ErrorState message={list.error} onRetry={list.reload} />
  if (!list.data) return <Loading />
  if (list.data.length === 0) {
    return (
      <EmptyState
        icon={<Building2 className="size-8" />}
        title="Henüz mülkünüz yok"
        description="Bir şehir seçip ilk arsanızı veya evinizi satın alın; sonra kiraya verip gelir elde edin."
        action={
          <Link href="/market" className={buttonVariants()}>
            Mülk satın al
          </Link>
        }
      />
    )
  }

  const counts = Object.fromEntries(STATUSES.map((s) => [s, list.data!.filter((p) => p.status === s).length]))
  const shown = filter === "all" ? list.data : list.data.filter((p) => p.status === filter)
  const period = config?.rent.period_days || 30

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Duruma göre filtrele">
        {(["all", ...STATUSES] as const)
          .filter((s) => s === "all" || counts[s] > 0)
          .map((s) => (
            <Button
              key={s}
              type="button"
              size="sm"
              variant={filter === s ? "default" : "outline"}
              aria-pressed={filter === s}
              onClick={() => setFilter(s)}
            >
              {s === "all" ? "Tümü" : STATUS_LABEL[s]}
              <span className="tabular-nums opacity-70">{s === "all" ? list.data!.length : counts[s]}</span>
            </Button>
          ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {shown.map((p) => (
          <PropertyCard
            key={p.id}
            property={p}
            price={
              p.status === "sale"
                ? { label: "Satış fiyatı", value: p.sale_price }
                : p.status === "rent" || p.status === "rented"
                  ? { label: `Kira (${period} gün)`, value: p.rent_price }
                  : undefined
            }
          />
        ))}
      </div>
    </>
  )
}

function Rented() {
  const { user, currency, refreshUser } = useApp()
  const { run, pending } = useAction()
  const [cancelling, setCancelling] = useState<Rental | null>(null)
  const list = useLoad(
    () =>
      pb.collection("rentals").getFullList<Rental>({
        filter: pb.filter("tenant = {:u}", { u: user!.id }),
        expand: "property,property.type,property.city,property.city.country",
        sort: "-active,-started",
      }),
    [user?.id],
    !!user,
  )

  if (list.error) return <ErrorState message={list.error} onRetry={list.reload} />
  if (!list.data) return <Loading />
  if (list.data.length === 0) {
    return (
      <EmptyState
        icon={<KeyRound className="size-8" />}
        title="Henüz bir mülk kiralamadınız"
        description="Kiraladığınız her dönem, ev satın alma şartı için sayılır."
        action={
          <Link href="/listings" className={buttonVariants()}>
            Kiralık ilanlara bak
          </Link>
        }
      />
    )
  }

  const credit = user?.credit || 0
  const active = list.data.filter((r) => r.active)
  const ended = list.data.filter((r) => !r.active)
  const totalDue = active.filter((r) => !r.cancel_at_period_end).reduce((a, r) => a + r.price, 0)

  return (
    <div className="grid gap-6">
      {active.length > 0 && totalDue > credit && (
        <p className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 type-body-medium text-destructive">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          Bakiyeniz ({money(credit, currency)}) yaklaşan kira tahsilatlarının toplamına ({money(totalDue, currency)}) yetmiyor.
          Yetersiz kalan kiralamalar sona erer.
        </p>
      )}

      {active.length > 0 && (
        <section>
          <h2 className="mb-3 type-title-large">Aktif kiralamalar</h2>
          <ul className="grid gap-3">
            {active.map((r) => {
              const p = r.expand?.property
              const short = !r.cancel_at_period_end && credit < r.price
              return (
                <li key={r.id} className="flex flex-col gap-3 rounded-xl border bg-card p-3 sm:flex-row sm:items-center">
                  {p && (
                    <Link href={`/properties/${p.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                      <PropertyVisual property={p} className="size-16 shrink-0 rounded-lg border" />
                      <span className="min-w-0">
                        <span className="block truncate font-medium hover:underline">{p.name}</span>
                        <span className="block truncate type-body-medium text-muted-foreground">
                          {p.expand?.city?.expand?.country?.flag} {p.expand?.city?.name}, {p.expand?.type?.name}
                        </span>
                      </span>
                    </Link>
                  )}
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 type-body-medium sm:flex sm:items-center sm:gap-6">
                    <div>
                      <div className="type-body-small text-muted-foreground">Dönem ücreti</div>
                      <Money value={r.price} className="font-medium" />
                    </div>
                    <div>
                      <div className="type-body-small text-muted-foreground">
                        {r.cancel_at_period_end ? "Bitiş" : "Sonraki tahsilat"}
                      </div>
                      <div className="font-medium" title={date(r.next_charge)}>
                        {relative(r.next_charge)}
                      </div>
                    </div>
                    <div className="col-span-2 flex flex-wrap items-center gap-2 sm:col-span-1">
                      <Tag>{r.periods_paid}. dönem</Tag>
                      {r.cancel_at_period_end && <Tag>İptal edildi</Tag>}
                      {r.grace_until && <Tag className="bg-loss/10 text-loss">Ödeme bekleniyor</Tag>}
                      {short && !r.grace_until && <Tag className="bg-loss/10 text-loss">Bakiye yetersiz</Tag>}
                    </div>
                  </div>
                  <div className="sm:ml-auto">
                    {r.cancel_at_period_end ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full sm:w-auto"
                        disabled={pending === r.id}
                        onClick={async () => {
                          const ok = await run(r.id, () => api.cancelRent(r.id, true), "Kiralama devam edecek.")
                          if (ok) await list.reload()
                        }}
                      >
                        İptali geri al
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => setCancelling(r)}>
                        Kirayı bitir
                      </Button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {ended.length > 0 && (
        <section>
          <h2 className="mb-3 type-title-large">Geçmiş kiralamalar</h2>
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full min-w-[520px] type-body-medium">
              <thead className="text-left type-body-small text-muted-foreground">
                <tr className="border-b">
                  <th className="px-4 py-2 font-normal">Mülk</th>
                  <th className="px-4 py-2 font-normal">Ücret</th>
                  <th className="px-4 py-2 font-normal">Dönem</th>
                  <th className="px-4 py-2 font-normal">Bitiş</th>
                  <th className="px-4 py-2 font-normal">Neden</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {ended.map((r) => (
                  <tr key={r.id}>
                    <td className="max-w-56 truncate px-4 py-2">
                      {r.expand?.property ? (
                        <Link href={`/properties/${r.property}`} className="hover:underline">
                          {r.expand.property.name}
                        </Link>
                      ) : (
                        "Silinmiş mülk"
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <Money value={r.price} />
                    </td>
                    <td className="tabular-nums px-4 py-2">{r.periods_paid}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{date(r.ended)}</td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {r.ended_reason ? RENTAL_END_LABEL[r.ended_reason] : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <ConfirmDialog
        open={!!cancelling}
        onOpenChange={(o) => !o && setCancelling(null)}
        title="Kirayı bitir"
        description={
          cancelling
            ? `Kiralama ${date(cancelling.next_charge)} tarihinde sona erecek ve yeniden ücret alınmayacak. O tarihe kadar fikrinizi değiştirebilirsiniz.`
            : undefined
        }
        confirmLabel="Dönem sonunda bitir"
        pending={pending === "cancel"}
        onConfirm={async () => {
          if (!cancelling) return false
          const ok = await run("cancel", () => api.cancelRent(cancelling.id), "Kiralama dönem sonunda bitecek.")
          if (!ok) return false
          await Promise.all([list.reload(), refreshUser()])
        }}
      />
    </div>
  )
}

function MyProperties() {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const tab = params.get("tab") === "rented" ? "rented" : "owned"

  return (
    <>
      <PageHeader title="Mülklerim" description="Sahip olduğunuz ve kiraladığınız mülkler." />
      <Tabs
        value={tab}
        onValueChange={(t) => router.replace(t === "rented" ? `${pathname}?tab=rented` : pathname, { scroll: false })}
        className="mb-5"
      >
        <TabsList aria-label="Mülk listesi">
          <TabsTrigger value="owned" className="px-4">
            Sahip olduklarım
          </TabsTrigger>
          <TabsTrigger value="rented" className="px-4">
            Kiraladıklarım
          </TabsTrigger>
        </TabsList>
      </Tabs>
      {tab === "owned" ? <Owned /> : <Rented />}
    </>
  )
}

export default function MyPropertiesPage() {
  return (
    <Suspense fallback={<Loading />}>
      <MyProperties />
    </Suspense>
  )
}
