"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Hammer, Lock, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import { api } from "@/lib/pb"
import { money, num } from "@/lib/format"
import { loadCatalog, loadStock, unitPrice } from "@/lib/catalog"
import type { PropertyType } from "@/lib/types"
import { useAction, useLoad } from "@/hooks/use-data"
import { useApp } from "@/components/app-provider"
import { ConfirmDialog, EmptyState, ErrorState, Loading, Money, PageHeader } from "@/components/kit"
import { Button } from "@/components/ui/button"

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button type="button" size="sm" variant={active ? "default" : "outline"} aria-pressed={active} onClick={onClick}>
      {children}
    </Button>
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
        <PageHeader title="Satın al" />
        <EmptyState title="Satın alma şu anda kapalı" description="Yönetim yeni satışları geçici olarak durdurdu." />
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Satın al"
        description="Önce şehri seçin; fiyat, şehrin çarpanına göre değişir. Stok her şehirde ayrı tutulur."
      />

      {data.error && <ErrorState message={data.error} onRetry={data.reload} />}
      {!cat && data.loading && <Loading />}

      {cat && (
        <div className="grid gap-6">
          <section aria-label="Konum" className="grid gap-4 rounded-xl border bg-card p-4">
            <div>
              <h2 className="mb-2 type-body-medium text-muted-foreground">Kıta</h2>
              <div className="flex flex-wrap gap-2">
                {cat.continents.map((c) => (
                  <Chip
                    key={c.id}
                    active={c.id === continent}
                    onClick={() => {
                      setContinentId(c.id)
                      setCountryId("")
                      setCityId("")
                    }}
                  >
                    {c.name}
                  </Chip>
                ))}
              </div>
            </div>
            {countries.length > 0 && (
              <div>
                <h2 className="mb-2 type-body-medium text-muted-foreground">Ülke</h2>
                <div className="flex flex-wrap gap-2">
                  {countries.map((c) => (
                    <Chip
                      key={c.id}
                      active={c.id === country}
                      onClick={() => {
                        setCountryId(c.id)
                        setCityId("")
                      }}
                    >
                      {c.flag} {c.name}
                    </Chip>
                  ))}
                </div>
              </div>
            )}
            {cities.length > 0 && (
              <div>
                <h2 className="mb-2 type-body-medium text-muted-foreground">Şehir</h2>
                <div className="flex flex-wrap gap-2">
                  {cities.map((c) => (
                    <Chip key={c.id} active={c.id === city?.id} onClick={() => setCityId(c.id)}>
                      {c.name} <span className="tabular-nums opacity-70">×{num(c.price_multiplier)}</span>
                    </Chip>
                  ))}
                </div>
              </div>
            )}
          </section>

          {!city ? (
            <EmptyState title="Bu bölgede satışa açık şehir yok" description="Başka bir kıta veya ülke seçin." />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {cat.types.map((t) => {
                const price = unitPrice(t, city)
                const stock = stockOf(t.id)
                const locked = (user?.rent_count || 0) < t.required_rent_count
                const affordable = (user?.credit || 0) >= price
                const target = t.build_target ? cat.typeById[t.build_target] : undefined
                return (
                  <article key={t.id} className="flex min-w-0 flex-col rounded-xl border bg-card">
                    <div className="flex flex-1 flex-col gap-3 p-4">
                      <div>
                        <h3 className="type-title-large">{t.name}</h3>
                        {t.description && <p className="mt-1 type-body-medium text-muted-foreground">{t.description}</p>}
                      </div>
                      <Money value={price} className="type-headline-small" />
                      <dl className="grid gap-1.5 type-body-medium">
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">{city.name} stoğu</dt>
                          <dd className={cn("tabular-nums font-medium", stock === 0 && "text-destructive")}>
                            {stock === 0 ? "Tükendi" : num(stock)}
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="flex items-center gap-1 text-muted-foreground">
                            <Users className="size-3.5" /> Kiracı kapasitesi
                          </dt>
                          <dd className="tabular-nums font-medium">{t.tenant_limit}</dd>
                        </div>
                        {t.required_rent_count > 0 && (
                          <div className="flex justify-between">
                            <dt className="text-muted-foreground">Kira şartı</dt>
                            <dd className={cn("tabular-nums font-medium", locked ? "text-muted-foreground" : "text-gain")}>
                              {user?.rent_count || 0}/{t.required_rent_count}
                            </dd>
                          </div>
                        )}
                      </dl>
                      {target && config?.features.build && (
                        <p className="flex gap-1.5 type-body-small text-muted-foreground">
                          <Hammer className="size-3.5 shrink-0" />
                          Sonradan {money(t.build_cost, currency)} ile {target.name} inşa edilebilir.
                        </p>
                      )}
                      <div className="mt-auto pt-1">
                        {locked ? (
                          <p className="flex items-center gap-1.5 rounded-lg bg-muted px-3 py-2 type-body-medium text-muted-foreground">
                            <Lock className="size-4 shrink-0" />
                            {t.required_rent_count - (user?.rent_count || 0)} kira ödemesi daha gerekiyor.
                          </p>
                        ) : (
                          <Button
                            size="lg"
                            className="w-full"
                            disabled={stock === 0 || !affordable}
                            onClick={() => setBuying(t)}
                          >
                            {stock === 0 ? "Stok yok" : affordable ? "Satın al" : "Bakiye yetersiz"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!buying}
        onOpenChange={(o) => !o && setBuying(null)}
        title={buying ? `${city?.name} ${buying.name} satın al` : ""}
        description={
          buying && city
            ? `${money(unitPrice(buying, city), currency)} bakiyenizden düşülecek. Mülk boş olarak portföyünüze eklenir; ardından kiraya verebilir veya satışa çıkarabilirsiniz.`
            : undefined
        }
        confirmLabel="Satın al"
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
