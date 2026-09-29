"use client"

import { Suspense, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { SearchX, SlidersHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"
import { pb } from "@/lib/pb"
import { PROPERTY_EXPAND, loadCatalog } from "@/lib/catalog"
import type { Property } from "@/lib/types"
import { useLoad } from "@/hooks/use-data"
import { useApp } from "@/components/app-provider"
import { EmptyState, ErrorState, Field, Loading, NativeSelect, PageHeader } from "@/components/kit"
import { PropertyCard } from "@/components/property-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

const PER_PAGE = 24

type Mode = "rent" | "sale"

/** Fiyat alanları: yazarken istek atmaz, alan terk edilince veya Enter ile uygulanır. */
function PriceFilters({
  mode,
  min,
  max,
  onApply,
}: {
  mode: Mode
  min: string
  max: string
  onApply: (min: string, max: string) => void
}) {
  const [minDraft, setMinDraft] = useState(min)
  const [maxDraft, setMaxDraft] = useState(max)
  const apply = () => (minDraft !== min || maxDraft !== max) && onApply(minDraft, maxDraft)
  return (
    <form
      className="contents"
      onSubmit={(e) => {
        e.preventDefault()
        apply()
      }}
    >
      <Field label={mode === "rent" ? "En az kira" : "En az fiyat"} htmlFor="f-min">
        <Input
          id="f-min"
          type="number"
          inputMode="decimal"
          min={0}
          value={minDraft}
          onChange={(e) => setMinDraft(e.target.value)}
          onBlur={apply}
        />
      </Field>
      <Field label={mode === "rent" ? "En çok kira" : "En çok fiyat"} htmlFor="f-max">
        <Input
          id="f-max"
          type="number"
          inputMode="decimal"
          min={0}
          value={maxDraft}
          onChange={(e) => setMaxDraft(e.target.value)}
          onBlur={apply}
        />
      </Field>
      <button type="submit" hidden />
    </form>
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
      <PageHeader title="İlanlar" description="Diğer yatırımcıların kiraya verdiği ve satışa çıkardığı mülkler." />

      <Tabs
        value={mode}
        onValueChange={(m) => update({ mode: m === "sale" ? "sale" : null, free: null, sort: null, min: null, max: null })}
        className="mb-4"
      >
        <TabsList aria-label="İlan türü">
          <TabsTrigger value="rent" className="px-4">
            Kiralık
          </TabsTrigger>
          <TabsTrigger value="sale" className="px-4">
            Satılık
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Dar ekranda filtreler bir düğmeyle açılır; ilanlar ilk ekranda görünür kalır */}
      <Button
        variant="secondary"
        className="mb-4 lg:hidden"
        aria-expanded={filtersOpen}
        aria-controls="listing-filters"
        onClick={() => setFiltersOpen((v) => !v)}
      >
        <SlidersHorizontal />
        {activeFilters ? `Filtreler (${activeFilters})` : "Filtreler"}
      </Button>
      <section
        id="listing-filters"
        aria-label="Filtreler"
        className={cn(
          "mb-6 gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 lg:grid lg:grid-cols-6",
          filtersOpen ? "grid" : "hidden",
        )}
      >
        <Field label="Tip" htmlFor="f-type">
          <NativeSelect id="f-type" value={type} onChange={(e) => update({ type: e.target.value || null })}>
            <option value="">Tümü</option>
            {catalog?.types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Ülke" htmlFor="f-country">
          <NativeSelect
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
        </Field>
        <Field label="Şehir" htmlFor="f-city">
          <NativeSelect id="f-city" value={city} onChange={(e) => update({ city: e.target.value || null })}>
            <option value="">Tümü</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <PriceFilters
          key={`${mode}-${min}-${max}`}
          mode={mode}
          min={min}
          max={max}
          onApply={(nextMin, nextMax) => update({ min: nextMin || null, max: nextMax || null })}
        />
        <Field label="Sıralama" htmlFor="f-sort">
          <NativeSelect id="f-sort" value={sort} onChange={(e) => update({ sort: e.target.value === "new" ? null : e.target.value })}>
            <option value="new">En yeni</option>
            <option value="asc">Fiyat: düşükten yükseğe</option>
            <option value="desc">Fiyat: yüksekten düşüğe</option>
          </NativeSelect>
        </Field>
        {mode === "rent" && (
          <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-6">
            <Checkbox id="f-free" checked={free} onCheckedChange={(v) => update({ free: v ? "1" : null })} />
            <Label htmlFor="f-free" className="font-normal">
              Yalnızca boş yeri olanlar
            </Label>
          </div>
        )}
      </section>

      {disabled && (
        <p className="mb-4 rounded-lg bg-muted px-3 py-2 type-body-medium text-muted-foreground">
          {mode === "rent" ? "Kiralama" : "Satış"} şu anda kapalı; ilanları görebilirsiniz ama işlem yapılamaz.
        </p>
      )}

      {list.error && <ErrorState message={list.error} onRetry={list.reload} />}
      {!list.data && list.loading && <Loading />}

      {list.data && list.data.items.length === 0 && (
        <EmptyState
          icon={<SearchX className="size-8" />}
          title="Bu filtrelere uyan ilan yok"
          description="Filtreleri genişletin veya daha sonra tekrar bakın."
          action={
            <Button variant="outline" onClick={() => router.replace(mode === "sale" ? `${pathname}?mode=sale` : pathname)}>
              Filtreleri temizle
            </Button>
          }
        />
      )}

      {list.data && list.data.items.length > 0 && (
        <>
          <p className="mb-3 type-body-medium text-muted-foreground">
            <span className="tabular-nums">{list.data.totalItems}</span> ilan
          </p>
          <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4", list.loading && "opacity-60")}>
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
            <nav aria-label="Sayfalar" className="mt-6 flex items-center justify-center gap-3">
              <Button variant="outline" disabled={page <= 1} onClick={() => update({ page: String(page - 1) }, false)}>
                Önceki
              </Button>
              <span className="tabular-nums type-body-medium text-muted-foreground">
                {page} / {list.data.totalPages}
              </span>
              <Button
                variant="outline"
                disabled={page >= list.data.totalPages}
                onClick={() => update({ page: String(page + 1) }, false)}
              >
                Sonraki
              </Button>
            </nav>
          )}
        </>
      )}
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
