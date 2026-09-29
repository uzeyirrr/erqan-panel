"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Hammer, LockSimple, Package, Prohibit, Users, Receipt } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { api, fileUrl } from "@/lib/pb"
import { money, num } from "@/lib/format"
import { loadCatalog, loadStock, unitPrice } from "@/lib/catalog"
import type { City, PropertyType } from "@/lib/types"
import { useAction, useLoad } from "@/hooks/use-data"
import { useApp } from "@/components/app-provider"
import { Chips, ConfirmDialog, EmptyState, ErrorState, Loading, Money, Notice, PageHeader } from "@/components/kit"
import { Parcel, typeColor } from "@/components/parcel"
import { Button } from "@/components/ui/button"

type IconType = React.ComponentType<{ className?: string; weight?: "regular" | "bold" | "fill" }>

/** Konum seçici satırı: küçük başlık + yatay kaydırılan kapsüller. */
function PickerGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid min-w-0 gap-2">
      <h2 className="px-1 text-footnote font-semibold tracking-wide text-label-secondary uppercase">{label}</h2>
      {children}
    </div>
  )
}

/** Kart içindeki bilgi satırı (simge, etiket, sağda değer). */
function Fact({
  icon: Icon,
  label,
  children,
  className,
}: {
  icon: IconType
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "relative flex min-h-10 items-center gap-2.5 py-2 after:hairline after:absolute after:inset-x-0 after:bottom-0 after:bg-separator last:after:hidden",
        className,
      )}
    >
      <Icon weight="fill" className="size-[18px] shrink-0 text-label-tertiary" />
      <span className="min-w-0 flex-1 truncate text-subheadline text-label-secondary">{label}</span>
      <span className="shrink-0 text-subheadline font-semibold text-label tabular-nums">{children}</span>
    </div>
  )
}

function TypeCard({
  type: t,
  city,
  stock,
  rentCount,
  credit,
  target,
  canBuild,
  onBuy,
}: {
  type: PropertyType
  city: City
  stock: number
  rentCount: number
  credit: number
  target?: PropertyType
  canBuild: boolean
  onBuy: () => void
}) {
  const { currency } = useApp()
  const price = unitPrice(t, city)
  const locked = rentCount < t.required_rent_count
  const affordable = credit >= price
  const img = fileUrl(t, t.image, "400x300")
  const progress = t.required_rent_count > 0 ? Math.min(1, rentCount / t.required_rent_count) : 1

  return (
    <article className="flex min-w-0 flex-col overflow-hidden rounded-card bg-grouped-secondary shadow-card">
      <div className="relative m-1.5 mb-0 h-28 overflow-hidden rounded-[14px] bg-fill-tertiary">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt="" className="size-full object-cover" />
        ) : (
          <Parcel typeKey={t.key} color={t.color} className="size-full" />
        )}
      </div>

      <div className="flex flex-1 flex-col px-4 pt-3 pb-4">
        <div className="flex items-center gap-1.5 text-footnote text-label-secondary">
          <span className="size-2 shrink-0 rounded-full" style={{ background: typeColor(t.color) }} aria-hidden="true" />
          <span className="truncate">
            {city.name} · ×{num(city.price_multiplier)}
          </span>
        </div>
        <h3 className="mt-0.5 text-title3 text-label">{t.name}</h3>
        {t.description && <p className="mt-1 text-subheadline text-label-secondary">{t.description}</p>}
        <Money value={price} className="mt-3 block text-title2 text-label" />

        <div className="mt-2">
          <Fact icon={Package} label={`${city.name} stoğu`}>
            {stock === 0 ? <span className="text-system-red">Tükendi</span> : num(stock)}
          </Fact>
          <Fact icon={Users} label="Kiracı kapasitesi">
            {t.tenant_limit}
          </Fact>
          {t.required_rent_count > 0 && (
            <div className="relative py-2">
              <div className="flex min-h-6 items-center gap-2.5">
                <Receipt weight="fill" className="size-[18px] shrink-0 text-label-tertiary" />
                <span className="min-w-0 flex-1 truncate text-subheadline text-label-secondary">Kira şartı</span>
                <span className={cn("shrink-0 text-subheadline font-semibold tabular-nums", locked ? "text-label" : "text-gain")}>
                  {rentCount}/{t.required_rent_count}
                </span>
              </div>
              <div
                role="progressbar"
                aria-label="Kira şartı ilerlemesi"
                aria-valuemin={0}
                aria-valuemax={t.required_rent_count}
                aria-valuenow={Math.min(rentCount, t.required_rent_count)}
                className="mt-2 ml-[28px] h-1 overflow-hidden rounded-full bg-fill"
              >
                <div
                  className={cn("h-full rounded-full transition-[width] duration-500 ease-ios", locked ? "bg-tint" : "bg-system-green")}
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {target && canBuild && (
          <p className="mt-2 flex gap-2 text-footnote text-label-secondary">
            <Hammer weight="fill" className="mt-px size-4 shrink-0 text-label-tertiary" />
            <span>
              Sonradan {money(t.build_cost, currency)} ile {target.name} inşa edilebilir.
            </span>
          </p>
        )}

        <div className="mt-auto pt-4">
          {locked ? (
            <Notice icon={LockSimple} className="bg-fill-tertiary text-label-secondary">
              {t.required_rent_count - rentCount} kira ödemesi daha gerekiyor.
            </Notice>
          ) : (
            <Button size="lg" className="w-full" disabled={stock === 0 || !affordable} onClick={onBuy}>
              {stock === 0 ? "Stok Yok" : affordable ? "Satın Al" : "Bakiye Yetersiz"}
            </Button>
          )}
        </div>
      </div>
    </article>
  )
}

export default function MarketPage() {
  const { user, config, currency, refreshUser } = useApp()
  const router = useRouter()
  const data = useLoad(async () => {
    const [cat, stock] = await Promise.all([loadCatalog(), loadStock()])
    return { cat, stock }
  }, [])
  const { run, pending } = useAction()

  const [continentId, setContinentId] = useState<string>("")
  const [countryId, setCountryId] = useState<string>("")
  const [cityId, setCityId] = useState<string>("")
  const [buying, setBuying] = useState<PropertyType | null>(null)

  const cat = data.data?.cat
  const continent = continentId || cat?.continents[0]?.id || ""
  const countries = useMemo(() => cat?.countries.filter((c) => c.continent === continent) || [], [cat, continent])
  const country = countries.find((c) => c.id === countryId)?.id || countries[0]?.id || ""
  const cities = useMemo(() => cat?.cities.filter((c) => c.country === country) || [], [cat, country])
  const city = cities.find((c) => c.id === cityId) || cities[0]

  const stockOf = (typeId: string) =>
    data.data?.stock.find((s) => s.city === city?.id && s.type === typeId)?.stock ?? 0

  if (config && !config.features.buy) {
    return (
      <>
        <PageHeader title="Satın Al" />
        <EmptyState
          icon={<Prohibit weight="fill" />}
          title="Satın alma şu anda kapalı"
          description="Yönetim yeni satışları geçici olarak durdurdu."
        />
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Satın Al"
        description="Önce şehri seçin; fiyat, şehrin çarpanına göre değişir. Stok her şehirde ayrı tutulur."
      />

      {data.error && <ErrorState message={data.error} onRetry={data.reload} />}
      {!cat && data.loading && <Loading />}

      {cat && (
        <div className="grid gap-8">
          <section aria-label="Konum" className="grid gap-5">
            <PickerGroup label="Kıta">
              <Chips
                aria-label="Kıta"
                value={continent}
                onChange={(id) => {
                  setContinentId(id)
                  setCountryId("")
                  setCityId("")
                }}
                items={cat.continents.map((c) => ({ value: c.id, label: c.name }))}
              />
            </PickerGroup>
            {countries.length > 0 && (
              <PickerGroup label="Ülke">
                <Chips
                  aria-label="Ülke"
                  value={country}
                  onChange={(id) => {
                    setCountryId(id)
                    setCityId("")
                  }}
                  items={countries.map((c) => ({
                    value: c.id,
                    label: (
                      <>
                        {c.flag && <span aria-hidden="true">{c.flag}</span>}
                        {c.name}
                      </>
                    ),
                  }))}
                />
              </PickerGroup>
            )}
            {cities.length > 0 && (
              <PickerGroup label="Şehir">
                <Chips
                  aria-label="Şehir"
                  value={city?.id || ""}
                  onChange={setCityId}
                  items={cities.map((c) => ({
                    value: c.id,
                    label: (
                      <>
                        {c.name}
                        <span className={cn("tabular-nums", c.id === city?.id ? "opacity-80" : "text-label-secondary")}>
                          ×{num(c.price_multiplier)}
                        </span>
                      </>
                    ),
                  }))}
                />
              </PickerGroup>
            )}
          </section>

          {!city ? (
            <EmptyState
              icon={<Package weight="fill" />}
              title="Bu bölgede satışa açık şehir yok"
              description="Başka bir kıta veya ülke seçin."
            />
          ) : (
            <section aria-label="Mülk tipleri" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {cat.types.map((t) => (
                <TypeCard
                  key={t.id}
                  type={t}
                  city={city}
                  stock={stockOf(t.id)}
                  rentCount={user?.rent_count || 0}
                  credit={user?.credit || 0}
                  target={t.build_target ? cat.typeById[t.build_target] : undefined}
                  canBuild={!!config?.features.build}
                  onBuy={() => setBuying(t)}
                />
              ))}
            </section>
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!buying}
        onOpenChange={(o) => !o && setBuying(null)}
        title={buying ? `${city?.name} ${buying.name} Satın Al` : ""}
        description={
          buying && city
            ? `${money(unitPrice(buying, city), currency)} bakiyenizden düşülecek. Mülk boş olarak portföyünüze eklenir; ardından kiraya verebilir veya satışa çıkarabilirsiniz.`
            : undefined
        }
        confirmLabel="Satın Al"
        pending={pending === "buy"}
        onConfirm={async () => {
          if (!buying || !city) return false
          const res = await run("buy", () => api.buy(buying.id, city.id), "Mülk satın alındı.")
          if (!res) return false
          await refreshUser()
          router.push(`/properties/${res.property}`)
        }}
      />
    </>
  )
}
