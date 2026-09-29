"use client"

import Link from "next/link"
import { Suspense, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Buildings, Key, Warning } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { api, pb } from "@/lib/pb"
import { RENTAL_END_LABEL, STATUS_LABEL, date, money, num, relative } from "@/lib/format"
import { PROPERTY_EXPAND } from "@/lib/catalog"
import type { Property, PropertyStatus, Rental } from "@/lib/types"
import { useAction, useLoad } from "@/hooks/use-data"
import { useApp } from "@/components/app-provider"
import {
  Chips,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Loading,
  Money,
  Notice,
  PageHeader,
  Row,
  Section,
  Tag,
} from "@/components/kit"
import { PropertyCard, PropertyVisual } from "@/components/property-card"
import { Parcel } from "@/components/parcel"
import { buttonVariants } from "@/components/ui/button"
import { Segmented } from "@/components/ui/tabs"
import { Spinner } from "@/components/ui/spinner"

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
        icon={<Buildings weight="fill" />}
        title="Henüz mülkünüz yok"
        description="Bir şehir seçip ilk arsanızı veya evinizi satın alın; sonra kiraya verip gelir elde edin."
        action={
          <Link href="/market" className={buttonVariants()}>
            Mülk Satın Al
          </Link>
        }
      />
    )
  }

  const counts = Object.fromEntries(STATUSES.map((s) => [s, list.data!.filter((p) => p.status === s).length]))
  const shown = filter === "all" ? list.data : list.data.filter((p) => p.status === filter)
  const period = config?.rent.period_days || 30

  return (
    <div className="grid gap-4">
      <Chips
        aria-label="Duruma göre filtrele"
        value={filter}
        onChange={setFilter}
        items={(["all", ...STATUSES] as const)
          .filter((s) => s === "all" || counts[s] > 0)
          .map((s) => ({
            value: s,
            label: s === "all" ? "Tümü" : STATUS_LABEL[s],
            count: s === "all" ? list.data!.length : counts[s],
          }))}
      />
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
    </div>
  )
}

/** Aktif kiralama satırı: dokunulabilir mülk özeti + altında eylem satırı. */
function RentalRow({
  rental: r,
  short,
  pending,
  onEnd,
  onResume,
}: {
  rental: Rental
  short: boolean
  pending: boolean
  onEnd: () => void
  onResume: () => void
}) {
  const p = r.expand?.property
  const country = p?.expand?.city?.expand?.country

  const summary = (
    <>
      {p ? (
        <PropertyVisual property={p} className="size-14 shrink-0 rounded-[12px]" />
      ) : (
        <Parcel className="size-14 shrink-0 rounded-[12px]" />
      )}
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-3">
          <span className="min-w-0 flex-1 truncate text-headline text-label">{p?.name || "Silinmiş mülk"}</span>
          <Money value={r.price} className="shrink-0 text-body text-label" />
        </span>
        <span className="flex items-baseline gap-3 text-subheadline text-label-secondary">
          <span className="min-w-0 flex-1 truncate">
            {p && (
              <>
                {country?.flag && `${country.flag} `}
                {p.expand?.city?.name}
                {p.expand?.type?.name && ` · ${p.expand.type.name}`}
              </>
            )}
          </span>
          <span className="shrink-0 text-footnote">dönem ücreti</span>
        </span>
        <span className="mt-1 block text-footnote text-label-secondary" title={date(r.next_charge)}>
          {r.cancel_at_period_end ? "Bitiş" : "Sonraki tahsilat"}:{" "}
          <span className="text-label">{relative(r.next_charge)}</span>
        </span>
        <span className="mt-2 flex flex-wrap gap-1.5">
          <Tag className="tabular-nums">{r.periods_paid}. dönem</Tag>
          {r.cancel_at_period_end && <Tag tone="orange">İptal edildi</Tag>}
          {r.grace_until && <Tag tone="red">Ödeme bekleniyor</Tag>}
          {short && !r.grace_until && <Tag tone="red">Bakiye yetersiz</Tag>}
        </span>
      </span>
    </>
  )

  const summaryCls = "flex w-full items-start gap-3 px-4 py-3 text-left outline-none focus-visible:bg-fill-quaternary"

  return (
    <li
      data-slot="list-row"
      className="relative after:hairline after:absolute after:right-0 after:bottom-0 after:left-4 after:bg-separator last:after:hidden"
    >
      {p ? (
        <Link href={`/properties/${p.id}`} className={cn(summaryCls, "press-row")}>
          {summary}
        </Link>
      ) : (
        <div className={summaryCls}>{summary}</div>
      )}
      {/* Eylem satırı: metnin başından başlayan ayırıcıyla (iOS "Aboneliği İptal Et" satırı gibi) */}
      <div className="relative before:hairline before:absolute before:top-0 before:right-0 before:left-[84px] before:bg-separator">
        <button
          type="button"
          disabled={pending}
          onClick={r.cancel_at_period_end ? onResume : onEnd}
          className={cn(
            "press-row flex min-h-11 w-full items-center gap-2 pr-4 pl-[84px] text-left text-body outline-none focus-visible:bg-fill-quaternary disabled:opacity-50",
            r.cancel_at_period_end ? "text-tint" : "text-system-red",
          )}
        >
          {r.cancel_at_period_end ? "İptali Geri Al" : "Kirayı Bitir"}
          {pending && <Spinner className="size-4 text-label-secondary" />}
        </button>
      </div>
    </li>
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
        icon={<Key weight="fill" />}
        title="Henüz bir mülk kiralamadınız"
        description="Kiraladığınız her dönem, ev satın alma şartı için sayılır."
        action={
          <Link href="/listings" className={buttonVariants()}>
            Kiralık İlanlara Bak
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
    <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
      {active.length > 0 && (
        <div className="grid min-w-0 gap-4">
          {totalDue > credit && (
            <Notice tone="red" icon={Warning}>
              Bakiyeniz ({money(credit, currency)}) yaklaşan kira tahsilatlarının toplamına ({money(totalDue, currency)})
              yetmiyor. Yetersiz kalan kiralamalar sona erer.
            </Notice>
          )}
          <Section header="Aktif Kiralamalar">
            {active.map((r) => (
              <RentalRow
                key={r.id}
                rental={r}
                short={!r.cancel_at_period_end && credit < r.price}
                pending={pending === r.id}
                onEnd={() => setCancelling(r)}
                onResume={async () => {
                  const ok = await run(r.id, () => api.cancelRent(r.id, true), "Kiralama devam edecek.")
                  if (ok) await list.reload()
                }}
              />
            ))}
          </Section>
        </div>
      )}

      {ended.length > 0 && (
        <Section header="Geçmiş Kiralamalar">
          {ended.map((r) => {
            const p = r.expand?.property
            return (
              <Row
                key={r.id}
                href={p ? `/properties/${r.property}` : undefined}
                leading={
                  p ? (
                    <PropertyVisual property={p} className="size-10 shrink-0 rounded-[10px]" />
                  ) : (
                    <Parcel className="size-10 shrink-0 rounded-[10px]" />
                  )
                }
                title={<span className="block truncate">{p ? p.name : "Silinmiş mülk"}</span>}
                subtitle={
                  <>
                    {date(r.ended)}
                    {r.ended_reason && (
                      <span className="block text-footnote">{RENTAL_END_LABEL[r.ended_reason]}</span>
                    )}
                  </>
                }
                detail={
                  <>
                    <Money value={r.price} className="block text-label" />
                    <span className="block text-footnote tabular-nums">{num(r.periods_paid)} dönem</span>
                  </>
                }
              />
            )
          })}
        </Section>
      )}

      <ConfirmDialog
        open={!!cancelling}
        onOpenChange={(o) => !o && setCancelling(null)}
        title="Kirayı Bitir"
        description={
          cancelling
            ? `Kiralama ${date(cancelling.next_charge)} tarihinde sona erecek ve yeniden ücret alınmayacak. O tarihe kadar fikrinizi değiştirebilirsiniz.`
            : undefined
        }
        confirmLabel="Dönem Sonunda Bitir"
        destructive
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
      <div className="grid gap-5">
        <Segmented
          aria-label="Mülk listesi"
          value={tab}
          onValueChange={(t) => router.replace(t === "rented" ? `${pathname}?tab=rented` : pathname, { scroll: false })}
          items={[
            { value: "owned", label: "Sahip Olduklarım" },
            { value: "rented", label: "Kiraladıklarım" },
          ]}
        />
        {tab === "owned" ? <Owned /> : <Rented />}
      </div>
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
