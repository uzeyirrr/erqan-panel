"use client"

import { useMemo, useState } from "react"
import { Globe, MapPin, Plus } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { pb } from "@/lib/pb"
import { invalidateCatalog } from "@/lib/catalog"
import { num } from "@/lib/format"
import type { City, CityStock, Continent, Country, PropertyType } from "@/lib/types"
import { useAction, useLoad } from "@/hooks/use-data"
import {
  BarButton,
  Chips,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  FieldRow,
  Loading,
  NativeSelect,
  PageHeader,
  Row,
  Section,
  inlineInput,
} from "@/components/kit"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Segmented } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ActiveDot, FormDialog, NumberInput, SwitchRow } from "../_components/admin-kit"

type Kind = "continents" | "countries" | "cities"
type View = Kind | "stock"
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
const KIND_TITLE: Record<Kind, string> = { continents: "Kıta", countries: "Ülke", cities: "Şehir" }

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

/** Satır başında bayrak kutucuğu (Ayarlar simge kutucuğu boyutunda). */
function FlagTile({ flag }: { flag?: string }) {
  return (
    <span aria-hidden="true" className="flex size-[30px] shrink-0 items-center justify-center rounded-[8px] bg-fill-tertiary text-[20px] leading-none">
      {flag || "🏳️"}
    </span>
  )
}

/** Stok tablosundaki küçük dolgulu sayı alanı. */
const stockInput = "ml-auto h-9 w-20 rounded-[10px] bg-fill-tertiary px-2.5 text-right tabular-nums"

export default function AdminLocationsPage() {
  const data = useLoad(loadAll, [])
  const { run, isPending } = useAction()
  const [view, setView] = useState<View>("countries")
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

  function selectContinent(id: string) {
    setContinentId(id)
    setCountryId("")
  }

  function selectCountry(id: string) {
    const c = d?.countries.find((x) => x.id === id)
    if (c) setContinentId(c.continent)
    setCountryId(id)
    setEdits({})
  }

  const selectedContinent = d.continents.find((c) => c.id === continent)
  const selectedCountry = d.countries.find((c) => c.id === country)
  const countryCount = (id: string) => d.countries.filter((c) => c.continent === id).length
  const cityCount = (id: string) => d.cities.filter((c) => c.country === id).length
  const cityStock = (cityId: string) => types.reduce((a, t) => a + (stockMap[stockKey(cityId, t.id)]?.stock ?? 0), 0)
  const draftName = draft?.id ? [...d.continents, ...d.countries, ...d.cities].find((r) => r.id === draft.id)?.name : ""

  // Üst çubuktaki "+" görünüme göre kıta, ülke veya şehir ekler.
  const addKind: Kind = view === "stock" ? "cities" : view
  const canAdd = addKind === "continents" || (addKind === "countries" ? !!continent : !!selectedCountry)

  const countryPicker = (
    <Section footer={view === "stock" ? "Stoklar seçili ülkenin şehirleri için gösterilir." : undefined}>
      <FieldRow label="Ülke" htmlFor="loc-country">
        <NativeSelect inline id="loc-country" value={country} onChange={(e) => selectCountry(e.target.value)} disabled={!d.countries.length}>
          {!d.countries.length && <option value="">Ülke yok</option>}
          {d.continents.map((ct) => {
            const list = d.countries.filter((c) => c.continent === ct.id)
            if (!list.length) return null
            return (
              <optgroup key={ct.id} label={ct.name}>
                {list.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.flag} {c.name}
                  </option>
                ))}
              </optgroup>
            )
          })}
        </NativeSelect>
      </FieldRow>
    </Section>
  )

  const noCountry = (
    <EmptyState
      icon={<Globe weight="fill" />}
      title="Ülke yok"
      description="Şehirleri ve stokları görmek için önce bir ülke ekleyin."
      action={
        <Button variant="secondary" onClick={() => setView("countries")}>
          Ülkelere Git
        </Button>
      }
    />
  )

  return (
    <>
      <PageHeader
        title="Konumlar ve Stok"
        description="Kıta, ülke ve şehirler ile her şehirde satışa sunulan mülk adetleri. Şehir çarpanı, o şehirdeki satış fiyatını belirler."
        actions={
          view === "stock" && dirtyCount > 0 ? (
            <Button size="sm" className="h-11 px-4" onClick={saveStock} disabled={isPending("stock")}>
              {isPending("stock") ? <Spinner className="size-4" /> : "Kaydet"}
            </Button>
          ) : canAdd ? (
            <BarButton standalone label={`${KIND_TITLE[addKind]} ekle`} icon={Plus} onClick={() => openDraft(addKind)} />
          ) : undefined
        }
      />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
        <Segmented
          aria-label="Görünüm"
          value={view}
          onValueChange={setView}
          items={[
            { value: "continents", label: "Kıtalar" },
            { value: "countries", label: "Ülkeler" },
            { value: "cities", label: "Şehirler" },
            { value: "stock", label: "Stok" },
          ]}
        />

        {view === "continents" && (
          <Section
            header={`${num(d.continents.length)} kıta`}
            footer="Pasif kıtalardaki konumlarda yeni mülk satın alınamaz."
          >
            {d.continents.map((c) => (
              <Row
                key={c.id}
                onClick={() => openDraft("continents", c)}
                icon={Globe}
                iconColor={c.active ? "blue" : "gray"}
                title={c.name}
                subtitle={`${num(countryCount(c.id))} ülke`}
                detail={<ActiveDot active={c.active} />}
                accessory="chevron"
              />
            ))}
            <AddRow label="Kıta Ekle" onClick={() => openDraft("continents")} />
          </Section>
        )}

        {view === "countries" && (
          <>
            {d.continents.length > 0 ? (
              <Chips
                aria-label="Kıta"
                value={continent}
                onChange={selectContinent}
                items={d.continents.map((c) => ({ value: c.id, label: c.name, count: countryCount(c.id) }))}
              />
            ) : (
              <EmptyState
                icon={<Globe weight="fill" />}
                title="Kıta yok"
                description="Ülke eklemek için önce bir kıta ekleyin."
                action={<Button onClick={() => openDraft("continents")}>Kıta Ekle</Button>}
              />
            )}
            {selectedContinent && (
              <Section header={`${selectedContinent.name} · ${num(countries.length)} ülke`}>
                {countries.length === 0 && <Row title={<span className="text-label-secondary">Bu kıtada ülke yok.</span>} />}
                {countries.map((c) => (
                  <Row
                    key={c.id}
                    onClick={() => openDraft("countries", c)}
                    leading={<FlagTile flag={c.flag} />}
                    title={c.name}
                    subtitle={[c.code, `${num(cityCount(c.id))} şehir`].filter(Boolean).join(" · ")}
                    detail={<ActiveDot active={c.active} />}
                    accessory="chevron"
                  />
                ))}
                <AddRow label="Ülke Ekle" onClick={() => openDraft("countries")} />
              </Section>
            )}
          </>
        )}

        {view === "cities" &&
          (!selectedCountry ? (
            noCountry
          ) : (
            <>
              {countryPicker}
              <Section
                header={`${selectedCountry.name} · ${num(cities.length)} şehir`}
                footer="Çarpan, şehirdeki satış fiyatını belirler: 1 = taban fiyat."
              >
                {cities.length === 0 && (
                  <Row title={<span className="text-label-secondary">Bu ülkede şehir yok. Satış yapılabilmesi için en az bir şehir ekleyin.</span>} />
                )}
                {cities.map((c) => (
                  <Row
                    key={c.id}
                    onClick={() => openDraft("cities", c)}
                    icon={MapPin}
                    iconColor={c.active ? "red" : "gray"}
                    title={c.name}
                    subtitle={
                      <span className="flex flex-wrap items-center gap-x-1.5">
                        <ActiveDot active={c.active} />
                        <span className="text-footnote">· {num(cityStock(c.id))} stok</span>
                      </span>
                    }
                    detail={<span className="tabular-nums">×{c.price_multiplier}</span>}
                    accessory="chevron"
                  />
                ))}
                <AddRow label="Şehir Ekle" onClick={() => openDraft("cities")} />
              </Section>
            </>
          ))}

        {view === "stock" &&
          (!selectedCountry ? (
            noCountry
          ) : (
            <>
              {countryPicker}
              {cities.length === 0 ? (
                <EmptyState
                  icon={<MapPin weight="fill" />}
                  title="Bu ülkede şehir yok"
                  description="Satış yapılabilmesi için en az bir şehir ekleyin."
                  action={<Button onClick={() => openDraft("cities")}>Şehir Ekle</Button>}
                />
              ) : (
                <>
                  <Section header="Toplu Ayar" footer="Tüm şehir ve tiplerin stoğu bu değere ayarlanır; kaydedene kadar uygulanmaz.">
                    <FieldRow label="Tüm stoklar" htmlFor="loc-bulk">
                      <div className="flex items-center gap-2">
                        <NumberInput id="loc-bulk" step="1" min={0} value={bulk} onChange={setBulk} className={stockInput} />
                        <Button variant="secondary" size="sm" onClick={() => setAll(bulk)}>
                          Uygula
                        </Button>
                      </div>
                    </FieldRow>
                  </Section>

                  <Section
                    header={`${selectedCountry.flag} ${selectedCountry.name} stokları`}
                    plain
                    bodyClassName="p-0"
                    footer={
                      dirtyCount > 0 ? (
                        <span className="flex flex-wrap items-center gap-x-2">
                          <span>{num(dirtyCount)} stok değişikliği kaydedilmedi.</span>
                          <Button variant="link" className="text-footnote" onClick={() => setEdits({})} disabled={isPending("stock")}>
                            Geri Al
                          </Button>
                        </span>
                      ) : (
                        "Değiştirdiğiniz hücreler vurgulanır."
                      )
                    }
                  >
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="sticky left-0 z-10 bg-grouped-secondary pl-4">Şehir</TableHead>
                          {types.map((t) => (
                            <TableHead key={t.id} className="text-right">
                              {t.name}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cities.map((c) => (
                          <TableRow key={c.id} className="hover:bg-transparent">
                            <TableCell className="sticky left-0 z-10 bg-grouped-secondary py-2 pl-4">
                              <button
                                type="button"
                                onClick={() => openDraft("cities", c)}
                                className="block max-w-36 truncate text-left text-body text-label outline-none press-dim focus-visible:underline"
                                aria-label={`${c.name} şehrini düzenle`}
                              >
                                {c.name}
                              </button>
                              <span className="flex items-center gap-1.5 text-footnote text-label-secondary">
                                <span className={cn("size-1.5 rounded-full", c.active ? "bg-system-green" : "bg-system-gray3")} />
                                <span className="tabular-nums">×{c.price_multiplier}</span>
                              </span>
                            </TableCell>
                            {types.map((t) => {
                              const k = stockKey(c.id, t.id)
                              return (
                                <TableCell key={t.id} className="py-2 text-right">
                                  <NumberInput
                                    aria-label={`${c.name} ${t.name} stoğu`}
                                    step="1"
                                    min={0}
                                    value={stockValue(c.id, t.id)}
                                    onChange={(v) => setEdits((e) => ({ ...e, [k]: v }))}
                                    className={cn(stockInput, k in edits && "bg-tint/15 font-semibold text-tint")}
                                  />
                                </TableCell>
                              )
                            })}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Section>

                  {dirtyCount > 0 && (
                    <Button size="lg" className="w-full sm:w-auto sm:justify-self-end" onClick={saveStock} disabled={isPending("stock")}>
                      {isPending("stock") && <Spinner className="size-4" />}
                      Stokları Kaydet
                    </Button>
                  )}
                </>
              )}
            </>
          ))}
      </div>

      {draft && (
        <FormDialog
          open
          onOpenChange={(o) => !o && setDraft(null)}
          title={draft.id ? draftName || KIND_TITLE[draft.kind] : `Yeni ${KIND_TITLE[draft.kind]}`}
          description={
            draft.kind === "cities" && selectedCountry
              ? `${selectedCountry.flag} ${selectedCountry.name} içinde`
              : draft.kind === "countries"
                ? selectedContinent?.name
                : undefined
          }
          pending={isPending("draft")}
          onSubmit={saveDraft}
        >
          <Section
            footer={
              draft.kind === "countries"
                ? "Ülke kodu iki veya üç harftir (TR, DE...). Bayrak alanına bayrak emojisi girin."
                : draft.kind === "cities"
                  ? "Fiyat çarpanı: 1 = taban fiyat, 1.5 = yüzde 50 daha pahalı."
                  : undefined
            }
          >
            <FieldRow label="Ad" htmlFor="loc-name">
              <Input
                id="loc-name"
                required
                placeholder="Gerekli"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className={inlineInput}
              />
            </FieldRow>
            {draft.kind === "countries" && (
              <>
                <FieldRow label="Ülke kodu" htmlFor="loc-code">
                  <Input
                    id="loc-code"
                    maxLength={3}
                    placeholder="TR"
                    autoCapitalize="characters"
                    value={draft.code}
                    onChange={(e) => setDraft({ ...draft, code: e.target.value })}
                    className={inlineInput}
                  />
                </FieldRow>
                <FieldRow label="Bayrak" htmlFor="loc-flag">
                  <Input
                    id="loc-flag"
                    maxLength={16}
                    placeholder="🇹🇷"
                    value={draft.flag}
                    onChange={(e) => setDraft({ ...draft, flag: e.target.value })}
                    className={inlineInput}
                  />
                </FieldRow>
              </>
            )}
            {draft.kind === "cities" && (
              <FieldRow label="Fiyat çarpanı" htmlFor="loc-mult">
                <NumberInput
                  inline
                  id="loc-mult"
                  min={0.01}
                  step="0.01"
                  value={draft.price_multiplier}
                  onChange={(v) => setDraft({ ...draft, price_multiplier: v })}
                />
              </FieldRow>
            )}
            <FieldRow label="Sıra" htmlFor="loc-sort">
              <NumberInput inline id="loc-sort" step="1" value={draft.sort} onChange={(v) => setDraft({ ...draft, sort: v })} />
            </FieldRow>
          </Section>

          <Section footer="Pasif konumlarda yeni mülk satın alınamaz; mevcut mülkler etkilenmez.">
            <SwitchRow id="loc-active" label="Satışa açık" checked={draft.active} onChange={(v) => setDraft({ ...draft, active: v })} />
          </Section>

          {draft.id && (
            <Section>
              <Row
                destructive
                title={`Bu ${KIND_LABEL[draft.kind]} kaydını sil`}
                onClick={() => {
                  setDeleting({ kind: draft.kind, id: draft.id!, name: draftName || draft.name })
                  setDraft(null)
                }}
              />
            </Section>
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

/** Listenin sonundaki mavi "ekle" satırı (iOS: "Dil Ekle…"). */
function AddRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Row
      onClick={onClick}
      leading={
        <span aria-hidden="true" className="flex size-[30px] shrink-0 items-center justify-center text-tint">
          <Plus weight="bold" className="size-5" />
        </span>
      }
      title={label}
    />
  )
}
