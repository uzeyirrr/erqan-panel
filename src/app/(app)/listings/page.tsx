"use client"

import { Suspense, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Info, MagnifyingGlass, SlidersHorizontal } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { pb } from "@/lib/pb"
import { PROPERTY_EXPAND, loadCatalog } from "@/lib/catalog"
import type { Property } from "@/lib/types"
import { useLoad } from "@/hooks/use-data"
import { useApp } from "@/components/app-provider"
import {
  BarButton,
  EmptyState,
  ErrorState,
  FieldRow,
  Loading,
  NativeSelect,
  Notice,
  PageHeader,
  Section,
  inlineInput,
} from "@/components/kit"
import { PropertyCard } from "@/components/property-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Segmented } from "@/components/ui/tabs"
import { Dialog, DialogBody, DialogContent, DialogHeader } from "@/components/ui/dialog"

const PER_PAGE = 24

type Mode = "rent" | "sale"

/** Gruplu listede aç/kapa satırı (iOS Ayarlar). */
function ToggleRow({
  id,
  label,
  checked,
  onChange,
}: {
  id: string
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <li
      data-slot="list-row"
      className="relative flex min-h-11 items-center gap-4 px-4 py-1.5 after:hairline after:absolute after:right-0 after:bottom-0 after:left-4 after:bg-separator last:after:hidden desk:min-h-9 desk:px-3 desk:after:left-3"
    >
      <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer py-1 text-body text-label">
        {label}
      </label>
      <Switch id={id} checked={checked} onCheckedChange={(v) => onChange(!!v)} />
    </li>
  )
}

function Listings() {
  const { user, config } = useApp()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  const mode: Mode = params.get("mode") === "sale" ? "sale" : "rent"
  const type = params.get("type") || ""
  const country = params.get("country") || ""
  const city = params.get("city") || ""
  const min = params.get("min") || ""
  const max = params.get("max") || ""
  const sort = params.get("sort") || "new"
  const free = params.get("free") === "1"
  const page = Math.max(1, Number(params.get("page")) || 1)

  function update(patch: Record<string, string | null>, resetPage = true) {
    const next = new URLSearchParams(params.toString())
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v)
      else next.delete(k)
    }
    if (resetPage) next.delete("page")
    router.replace(`${pathname}?${next.toString()}`, { scroll: false })
  }

  function clearFilters() {
    router.replace(mode === "sale" ? `${pathname}?mode=sale` : pathname)
  }

  const cat = useLoad(() => loadCatalog(), [])
  const priceField = mode === "rent" ? "rent_price" : "sale_price"

  const list = useLoad(
    () => {
      const parts = ["status = {:status}", "owner != {:me}"]
      const vars: Record<string, unknown> = { status: mode, me: user!.id }
      if (type) {
        parts.push("type = {:type}")
        vars.type = type
      }
      if (city) {
        parts.push("city = {:city}")
        vars.city = city
      } else if (country) {
        parts.push("city.country = {:country}")
        vars.country = country
      }
      if (min && !isNaN(Number(min))) {
        parts.push(`${priceField} >= {:min}`)
        vars.min = Number(min)
      }
      if (max && !isNaN(Number(max))) {
        parts.push(`${priceField} <= {:max}`)
        vars.max = Number(max)
      }
      if (mode === "rent" && free) parts.push("tenant_count < tenant_limit")
      const sortExpr = sort === "asc" ? `+${priceField}` : sort === "desc" ? `-${priceField}` : "-updated"
      return pb.collection("properties").getList<Property>(page, PER_PAGE, {
        filter: pb.filter(parts.join(" && "), vars),
        sort: sortExpr,
        expand: PROPERTY_EXPAND,
      })
    },
    [mode, type, country, city, min, max, sort, free, page, user?.id],
    !!user,
  )

  const catalog = cat.data
  const cities = catalog ? catalog.cities.filter((c) => !country || c.country === country) : []
  const disabled = config && ((mode === "rent" && !config.features.rent) || (mode === "sale" && !config.features.sale))
  const activeFilters = [type, country, city, min, max, sort !== "new" && sort, free].filter(Boolean).length

  return (
    <>
      <PageHeader
        title="İlanlar"
        description="Diğer yatırımcıların kiraya verdiği ve satışa çıkardığı mülkler."
        actions={
          <BarButton
            standalone
            label="Filtreler"
            icon={SlidersHorizontal}
            badge={activeFilters}
            onClick={() => setFiltersOpen(true)}
          />
        }
      />

      <div className="grid gap-5">
        <Segmented
          aria-label="İlan türü"
          value={mode}
          onValueChange={(m) => update({ mode: m === "sale" ? "sale" : null, free: null, sort: null, min: null, max: null })}
          items={[
            { value: "rent", label: "Kiralık" },
            { value: "sale", label: "Satılık" },
          ]}
        />

        {disabled && (
          <Notice tone="orange" icon={Info}>
            {mode === "rent" ? "Kiralama" : "Satış"} şu anda kapalı; ilanları görebilirsiniz ama işlem yapılamaz.
          </Notice>
        )}

        {list.error && <ErrorState message={list.error} onRetry={list.reload} />}
        {!list.data && list.loading && <Loading />}

        {list.data && list.data.items.length === 0 && (
          <EmptyState
            icon={<MagnifyingGlass weight="bold" />}
            title="Bu filtrelere uyan ilan yok"
            description="Filtreleri genişletin veya daha sonra tekrar bakın."
            action={
              <Button variant="secondary" onClick={clearFilters}>
                Filtreleri Temizle
              </Button>
            }
          />
        )}

        {list.data && list.data.items.length > 0 && (
          <div className="grid gap-3">
            <div className="flex min-h-6 items-center justify-between gap-3 px-1 text-footnote text-label-secondary">
              <p>
                <span className="tabular-nums">{list.data.totalItems}</span> ilan
                {activeFilters > 0 && (
                  <>
                    {" · "}
                    <span className="tabular-nums">{activeFilters}</span> filtre
                  </>
                )}
              </p>
              {activeFilters > 0 && (
                <button type="button" onClick={clearFilters} className="press-dim -my-2 py-2 text-tint">
                  Temizle
                </button>
              )}
            </div>
            <div
              className={cn(
                "grid gap-4 transition-opacity sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
                list.loading && "opacity-60",
              )}
            >
              {list.data.items.map((p) => (
                <PropertyCard
                  key={p.id}
                  property={p}
                  price={
                    mode === "rent"
                      ? { label: `Kira (${config?.rent.period_days || 30} gün)`, value: p.rent_price }
                      : { label: "Satış fiyatı", value: p.sale_price }
                  }
                />
              ))}
            </div>
            {list.data.totalPages > 1 && (
              <nav aria-label="Sayfalar" className="mt-3 flex items-center justify-center gap-3">
                <Button variant="secondary" disabled={page <= 1} onClick={() => update({ page: String(page - 1) }, false)}>
                  Önceki
                </Button>
                <span className="min-w-16 text-center text-subheadline text-label-secondary tabular-nums">
                  {page} / {list.data.totalPages}
                </span>
                <Button
                  variant="secondary"
                  disabled={page >= list.data.totalPages}
                  onClick={() => update({ page: String(page + 1) }, false)}
                >
                  Sonraki
                </Button>
              </nav>
            )}
          </div>
        )}
      </div>

      {/* Filtre sayfası: seçimler anında uygulanır; fiyat aralığı "Uygula" ile */}
      <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
        <DialogContent>
          <DialogHeader
            title="Filtreler"
            action={
              <Button type="submit" form="listing-filters" size="sm" className="h-11 px-4">
                Uygula
              </Button>
            }
          />
          <DialogBody>
            <form
              id="listing-filters"
              className="grid gap-6"
              onSubmit={(e) => {
                e.preventDefault()
                const fd = new FormData(e.currentTarget)
                const nextMin = String(fd.get("min") ?? "")
                const nextMax = String(fd.get("max") ?? "")
                if (nextMin !== min || nextMax !== max) update({ min: nextMin || null, max: nextMax || null })
                setFiltersOpen(false)
              }}
            >
              <Section header="Mülk">
                <FieldRow label="Tip" htmlFor="f-type">
                  <NativeSelect inline id="f-type" value={type} onChange={(e) => update({ type: e.target.value || null })}>
                    <option value="">Tümü</option>
                    {catalog?.types.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </NativeSelect>
                </FieldRow>
                <FieldRow label="Ülke" htmlFor="f-country">
                  <NativeSelect
                    inline
                    id="f-country"
                    value={country}
                    onChange={(e) => update({ country: e.target.value || null, city: null })}
                  >
                    <option value="">Tümü</option>
                    {catalog?.countries.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.flag} {c.name}
                      </option>
                    ))}
                  </NativeSelect>
                </FieldRow>
                <FieldRow label="Şehir" htmlFor="f-city">
                  <NativeSelect inline id="f-city" value={city} onChange={(e) => update({ city: e.target.value || null })}>
                    <option value="">Tümü</option>
                    {cities.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </NativeSelect>
                </FieldRow>
                {mode === "rent" && (
                  <ToggleRow
                    id="f-free"
                    label="Yalnızca boş yeri olanlar"
                    checked={free}
                    onChange={(v) => update({ free: v ? "1" : null })}
                  />
                )}
              </Section>

              <Section
                header={mode === "rent" ? "Kira Aralığı" : "Fiyat Aralığı"}
                footer="Fiyat aralığı Uygula'ya dokunduğunuzda uygulanır."
              >
                <FieldRow label={mode === "rent" ? "En az kira" : "En az fiyat"} htmlFor="f-min">
                  <Input
                    key={`min-${mode}-${min}`}
                    id="f-min"
                    name="min"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    defaultValue={min}
                    placeholder="Yok"
                    className={cn(inlineInput, "tabular-nums")}
                  />
                </FieldRow>
                <FieldRow label={mode === "rent" ? "En çok kira" : "En çok fiyat"} htmlFor="f-max">
                  <Input
                    key={`max-${mode}-${max}`}
                    id="f-max"
                    name="max"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    defaultValue={max}
                    placeholder="Yok"
                    className={cn(inlineInput, "tabular-nums")}
                  />
                </FieldRow>
              </Section>

              <Section header="Sıralama">
                <FieldRow label="Sırala" htmlFor="f-sort">
                  <NativeSelect
                    inline
                    id="f-sort"
                    value={sort}
                    onChange={(e) => update({ sort: e.target.value === "new" ? null : e.target.value })}
                  >
                    <option value="new">En yeni</option>
                    <option value="asc">Fiyat: düşükten yükseğe</option>
                    <option value="desc">Fiyat: yüksekten düşüğe</option>
                  </NativeSelect>
                </FieldRow>
              </Section>

              <Button
                type="button"
                variant="destructive-secondary"
                size="lg"
                className="w-full"
                disabled={activeFilters === 0}
                onClick={() => {
                  clearFilters()
                  setFiltersOpen(false)
                }}
              >
                Filtreleri Temizle
              </Button>
            </form>
          </DialogBody>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default function ListingsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Listings />
    </Suspense>
  )
}
