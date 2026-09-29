"use client"

import { useMemo, useState } from "react"
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { pb } from "@/lib/pb"
import { invalidateCatalog } from "@/lib/catalog"
import type { City, CityStock, Continent, Country, PropertyType } from "@/lib/types"
import { useAction, useLoad } from "@/hooks/use-data"
import { ConfirmDialog, EmptyState, ErrorState, Field, Loading, PageHeader, Panel } from "@/components/kit"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ActiveDot, FormDialog, NumberInput, SwitchRow, TableWrap } from "../_components/admin-kit"

type Kind = "continents" | "countries" | "cities"
type Draft = {
  kind: Kind
  id?: string
  name: string
  sort: number
  active: boolean
  code: string
  flag: string
  price_multiplier: number
}

const KIND_LABEL: Record<Kind, string> = { continents: "kıta", countries: "ülke", cities: "şehir" }

async function loadAll() {
  const [continents, countries, cities, types, stock] = await Promise.all([
    pb.collection("continents").getFullList<Continent>({ sort: "sort,name" }),
    pb.collection("countries").getFullList<Country>({ sort: "sort,name" }),
    pb.collection("cities").getFullList<City>({ sort: "sort,name" }),
    pb.collection("property_types").getFullList<PropertyType>({ sort: "sort,name" }),
    pb.collection("city_stock").getFullList<CityStock>(),
  ])
  return { continents, countries, cities, types, stock }
}

const stockKey = (city: string, type: string) => `${city}:${type}`

export default function AdminLocationsPage() {
  const data = useLoad(loadAll, [])
  const { run, isPending } = useAction()
  const [continentId, setContinentId] = useState("")
  const [countryId, setCountryId] = useState("")
  const [draft, setDraft] = useState<Draft | null>(null)
  const [deleting, setDeleting] = useState<{ kind: Kind; id: string; name: string } | null>(null)
  const [edits, setEdits] = useState<Record<string, number>>({})
  const [bulk, setBulk] = useState(100)

  const d = data.data
  const continent = continentId || d?.continents[0]?.id || ""
  const countries = useMemo(() => (d ? d.countries.filter((c) => c.continent === continent) : []), [d, continent])
  const country = countries.some((c) => c.id === countryId) ? countryId : countries[0]?.id || ""
  const cities = useMemo(() => (d ? d.cities.filter((c) => c.country === country) : []), [d, country])
  const types = useMemo(() => (d ? d.types.filter((t) => t.active) : []), [d])
  const stockMap = useMemo(() => {
    const m: Record<string, CityStock> = {}
    d?.stock.forEach((s) => (m[stockKey(s.city, s.type)] = s))
    return m
  }, [d])

  if (data.error) return <ErrorState message={data.error} onRetry={data.reload} />
  if (!d) return <Loading />

  const dirtyCount = Object.keys(edits).length
  const stockValue = (city: string, type: string) => edits[stockKey(city, type)] ?? stockMap[stockKey(city, type)]?.stock ?? 0

  function openDraft(kind: Kind, rec?: Continent | Country | City) {
    const r = rec as Partial<Continent & Country & City> | undefined
    setDraft({
      kind,
      id: r?.id,
      name: r?.name || "",
      sort: r?.sort ?? 0,
      active: r?.active ?? true,
      code: r?.code || "",
      flag: r?.flag || "",
      price_multiplier: r?.price_multiplier ?? 1,
    })
  }

  async function saveDraft() {
    if (!draft) return
    const body: Record<string, unknown> = { name: draft.name.trim(), sort: draft.sort, active: draft.active }
    if (draft.kind === "countries") Object.assign(body, { code: draft.code.toUpperCase(), flag: draft.flag, continent })
    if (draft.kind === "cities") Object.assign(body, { price_multiplier: draft.price_multiplier, country })
    const res = await run(
      "draft",
      () => (draft.id ? pb.collection(draft.kind).update(draft.id, body) : pb.collection(draft.kind).create(body)),
      draft.id ? "Kaydedildi." : `Yeni ${KIND_LABEL[draft.kind]} eklendi.`,
    )
    if (res) {
      invalidateCatalog()
      setDraft(null)
      data.reload()
    }
  }

  async function saveStock() {
    const entries = Object.entries(edits)
    const res = await run(
      "stock",
      () =>
        Promise.all(
          entries.map(([key, value]) => {
            const [city, type] = key.split(":")
            const existing = stockMap[key]
            const stock = Math.max(0, Math.floor(value))
            return existing
              ? pb.collection("city_stock").update(existing.id, { stock })
              : pb.collection("city_stock").create({ city, type, stock })
          }),
        ),
      "Stoklar kaydedildi.",
    )
    if (res) {
      setEdits({})
      data.reload()
    }
  }

  function setAll(n: number) {
    const next: Record<string, number> = { ...edits }
    cities.forEach((c) => types.forEach((t) => (next[stockKey(c.id, t.id)] = n)))
    setEdits(next)
  }

  const selectedCountry = d.countries.find((c) => c.id === country)

  return (
    <>
      <PageHeader
        title="Konumlar ve stok"
        description="Kıta, ülke ve şehirler ile her şehirde satışa sunulan mülk adetleri. Şehir çarpanı, o şehirdeki satış fiyatını belirler."
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {d.continents.map((c) => (
          <div key={c.id} className="flex items-center">
            <button
              type="button"
              onClick={() => {
                setContinentId(c.id)
                setCountryId("")
              }}
              aria-pressed={c.id === continent}
              className={cn(
                "rounded-l-full border py-1.5 pr-2 pl-3 type-body-medium",
                c.id === continent ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted",
                !c.active && "opacity-60",
              )}
            >
              {c.name}
            </button>
            <button
              type="button"
              onClick={() => openDraft("continents", c)}
              className={cn(
                "rounded-r-full border border-l-0 py-1.5 pr-2.5 pl-1.5",
                c.id === continent ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted",
              )}
              aria-label={`${c.name} kıtasını düzenle`}
            >
              <Pencil className="size-3.5" />
            </button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => openDraft("continents")}>
          <Plus />
          Kıta ekle
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <Panel
          title="Ülkeler"
          actions={
            <Button variant="ghost" size="sm" onClick={() => openDraft("countries")} disabled={!continent}>
              <Plus />
              Ekle
            </Button>
          }
          bodyClassName="p-2"
        >
          {countries.length === 0 ? (
            <p className="p-2 type-body-medium text-muted-foreground">Bu kıtada ülke yok.</p>
          ) : (
            <ul className="grid gap-0.5">
              {countries.map((c) => (
                <li key={c.id} className="flex items-center">
                  <button
                    type="button"
                    onClick={() => {
                      setCountryId(c.id)
                      setEdits({})
                    }}
                    aria-current={c.id === country ? "true" : undefined}
                    className={cn(
                      "flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left type-body-medium",
                      c.id === country ? "bg-muted font-medium" : "hover:bg-muted/60",
                      !c.active && "text-muted-foreground",
                    )}
                  >
                    <span>{c.flag}</span>
                    <span className="truncate">{c.name}</span>
                    {!c.active && <span className="type-body-small">(pasif)</span>}
                  </button>
                  <Button variant="ghost" size="icon-sm" onClick={() => openDraft("countries", c)} aria-label={`${c.name} ülkesini düzenle`}>
                    <Pencil />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="min-w-0">
          {!selectedCountry ? (
            <EmptyState title="Ülke seçin" description="Şehirleri ve stokları görmek için soldan bir ülke seçin ya da yeni ülke ekleyin." />
          ) : (
            <>
              <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                <h2 className="type-title-large">
                  {selectedCountry.flag} {selectedCountry.name} şehirleri
                </h2>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <NumberInput aria-label="Toplu stok" step="1" min={0} value={bulk} onChange={setBulk} className="h-8 w-20" />
                    <Button variant="outline" size="sm" onClick={() => setAll(bulk)} disabled={!cities.length}>
                      Tüm stokları bu değere ayarla
                    </Button>
                  </div>
                  <Button size="sm" onClick={() => openDraft("cities")}>
                    <Plus />
                    Şehir ekle
                  </Button>
                </div>
              </div>

              {cities.length === 0 ? (
                <EmptyState title="Bu ülkede şehir yok" description="Satış yapılabilmesi için en az bir şehir ekleyin." />
              ) : (
                <TableWrap>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="pl-4">Şehir</TableHead>
                        <TableHead className="text-right">Çarpan</TableHead>
                        {types.map((t) => (
                          <TableHead key={t.id} className="text-right">
                            {t.name} stoğu
                          </TableHead>
                        ))}
                        <TableHead className="pr-4 text-right">
                          <span className="sr-only">İşlemler</span>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cities.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="pl-4">
                            <div className="font-medium">{c.name}</div>
                            <ActiveDot active={c.active} />
                          </TableCell>
                          <TableCell className="figure text-right">×{c.price_multiplier}</TableCell>
                          {types.map((t) => {
                            const k = stockKey(c.id, t.id)
                            return (
                              <TableCell key={t.id} className="text-right">
                                <NumberInput
                                  aria-label={`${c.name} ${t.name} stoğu`}
                                  step="1"
                                  min={0}
                                  value={stockValue(c.id, t.id)}
                                  onChange={(v) => setEdits((e) => ({ ...e, [k]: v }))}
                                  className={cn("ml-auto h-8 w-20 text-right", k in edits && "border-primary")}
                                />
                              </TableCell>
                            )
                          })}
                          <TableCell className="pr-4 text-right whitespace-nowrap">
                            <Button variant="ghost" size="icon-sm" onClick={() => openDraft("cities", c)} aria-label={`${c.name} şehrini düzenle`}>
                              <Pencil />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => setDeleting({ kind: "cities", id: c.id, name: c.name })}
                              aria-label={`${c.name} şehrini sil`}
                            >
                              <Trash2 />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableWrap>
              )}

              {dirtyCount > 0 && (
                <div className="mt-3 flex items-center justify-end gap-2">
                  <span className="type-body-medium text-muted-foreground">{dirtyCount} stok değişikliği kaydedilmedi.</span>
                  <Button variant="outline" onClick={() => setEdits({})} disabled={isPending("stock")}>
                    Geri al
                  </Button>
                  <Button onClick={saveStock} disabled={isPending("stock")}>
                    {isPending("stock") && <Loader2 className="animate-spin" />}
                    Stokları kaydet
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {draft && (
        <FormDialog
          open
          onOpenChange={(o) => !o && setDraft(null)}
          title={draft.id ? `${draft.name} düzenle` : `Yeni ${KIND_LABEL[draft.kind]}`}
          description={
            draft.kind === "cities" && selectedCountry
              ? `${selectedCountry.name} içinde`
              : draft.kind === "countries"
                ? d.continents.find((c) => c.id === continent)?.name
                : undefined
          }
          pending={isPending("draft")}
          onSubmit={saveDraft}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Ad" htmlFor="loc-name" className="sm:col-span-2">
              <Input id="loc-name" required value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </Field>
            {draft.kind === "countries" && (
              <>
                <Field label="Ülke kodu" htmlFor="loc-code" hint="İki veya üç harf (TR, DE...).">
                  <Input id="loc-code" maxLength={3} value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} />
                </Field>
                <Field label="Bayrak" htmlFor="loc-flag" hint="Bayrak emojisi.">
                  <Input id="loc-flag" maxLength={16} value={draft.flag} onChange={(e) => setDraft({ ...draft, flag: e.target.value })} />
                </Field>
              </>
            )}
            {draft.kind === "cities" && (
              <Field label="Fiyat çarpanı" htmlFor="loc-mult" hint="1 = taban fiyat, 1.5 = yüzde 50 daha pahalı.">
                <NumberInput
                  id="loc-mult"
                  min={0.01}
                  step="0.01"
                  value={draft.price_multiplier}
                  onChange={(v) => setDraft({ ...draft, price_multiplier: v })}
                />
              </Field>
            )}
            <Field label="Sıra" htmlFor="loc-sort">
              <NumberInput id="loc-sort" step="1" value={draft.sort} onChange={(v) => setDraft({ ...draft, sort: v })} />
            </Field>
            <div className="sm:col-span-2">
              <SwitchRow
                id="loc-active"
                label="Satışa açık"
                hint="Pasif konumlarda yeni mülk satın alınamaz; mevcut mülkler etkilenmez."
                checked={draft.active}
                onChange={(v) => setDraft({ ...draft, active: v })}
              />
            </div>
          </div>
          {draft.id && draft.kind !== "cities" && (
            <Button
              type="button"
              variant="ghost"
              className="justify-self-start text-destructive"
              onClick={() => {
                setDeleting({ kind: draft.kind, id: draft.id!, name: draft.name })
                setDraft(null)
              }}
            >
              <Trash2 />
              Bu {KIND_LABEL[draft.kind]} kaydını sil
            </Button>
          )}
        </FormDialog>
      )}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`${deleting?.name} silinsin mi?`}
        description={
          deleting?.kind === "cities"
            ? "Şehrin stok kayıtları da silinir. Bu şehirde mülk varsa silme reddedilir; bunun yerine şehri pasif yapın."
            : "Altındaki tüm ülke, şehir ve stok kayıtları da silinir. Bu konumlarda mülk varsa silme reddedilir."
        }
        confirmLabel="Sil"
        destructive
        pending={isPending("delete")}
        onConfirm={async () => {
          if (!deleting) return
          const res = await run("delete", () => pb.collection(deleting.kind).delete(deleting.id), "Silindi.")
          if (res === undefined) return false
          invalidateCatalog()
          data.reload()
        }}
      />
    </>
  )
}
