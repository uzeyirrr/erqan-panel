"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { ArrowFatLinesUp, Check, Hammer, Info, Key, X } from "@phosphor-icons/react"
import { toast } from "sonner"
import { api, errorMessage, pb } from "@/lib/pb"
import { date, money, monthLabel, num, relative } from "@/lib/format"
import type { Catalog } from "@/lib/catalog"
import type { Offer, Property, PropertyUpgrade, Rental, Transaction } from "@/lib/types"
import { cn } from "@/lib/utils"
import { useAction } from "@/hooks/use-data"
import { useApp } from "@/components/app-provider"
import { PropertyVisual } from "@/components/property-card"
import {
  Avatar,
  ConfirmDialog,
  FieldRow,
  IconTile,
  Money,
  NativeSelect,
  Notice,
  Row,
  RowItem,
  Section,
  Tag,
  inlineInput,
} from "@/components/kit"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader } from "@/components/ui/dialog"

const compact = new Intl.NumberFormat("tr-TR", { notation: "compact", maximumFractionDigits: 1 })

/** Sayfa üst çubuğundaki birincil eylem (Kaydet, Gönder). */
function SheetAction({ form, pending, children }: { form: string; pending: boolean; children: React.ReactNode }) {
  return (
    <Button type="submit" form={form} size="sm" className="h-11 px-4" disabled={pending}>
      {pending ? <Spinner className="size-4" /> : children}
    </Button>
  )
}

/** Gruplu bölüm içinde kenarsız çok satırlı metin alanı. */
const inlineTextarea = "min-h-28 rounded-none bg-transparent px-4 focus-visible:outline-none"

// ---------------------------------------------------------------- ziyaretçi

/** Kiralama, ilan fiyatından satın alma ve teklif verme. */
export function VisitorActions({
  property,
  myRental,
  onDone,
}: {
  property: Property
  myRental: Rental | null
  onDone: () => Promise<void>
}) {
  const { config, currency, user } = useApp()
  const { run, pending } = useAction()
  const [dialog, setDialog] = useState<"rent" | "buy" | "offer" | null>(null)
  const [amount, setAmount] = useState("")
  const [message, setMessage] = useState("")

  const period = config?.rent.period_days || 30
  const full = property.tenant_count >= property.tenant_limit
  const canRent = property.status === "rent" && !full && !myRental && config?.features.rent
  const canBuy = property.status === "sale" && property.sale_price > 0 && config?.features.sale
  const canOffer = canBuy && config?.features.offers
  const minOffer = Math.round(property.sale_price * (config?.offers.min_pct_of_price || 0)) / 100
  const credit = user?.credit || 0

  if (myRental) {
    return (
      <Section
        header="Kiralamanız"
        footer={myRental.cancel_at_period_end ? "Kiralama dönem sonunda bitecek." : undefined}
      >
        <Row
          icon={Key}
          iconColor="green"
          title="Bu mülkte kiracısınız"
          subtitle={`Sonraki tahsilat ${date(myRental.next_charge)}`}
          detail={<Money value={myRental.price} className="text-label" />}
        />
        <Row href="/my-properties?tab=rented" title="Kiralamalarımı Yönet" />
      </Section>
    )
  }

  if (property.status === "rent") {
    return (
      <Section
        header="Kira"
        plain
        footer={
          <>
            Her {period} günde bir bakiyenizden otomatik tahsil edilir.
            {!config?.features.rent && <span className="mt-1 block">Kiralama şu anda kapalı.</span>}
          </>
        }
      >
        <div className="flex items-baseline gap-1.5">
          <Money value={property.rent_price} className="text-large-title text-label" />
          <span className="text-subheadline text-label-secondary">/ {period} gün</span>
        </div>
        <Button
          size="lg"
          className="mt-4 w-full"
          disabled={!canRent || credit < property.rent_price}
          onClick={() => setDialog("rent")}
        >
          {full ? "Kapasite Dolu" : credit < property.rent_price ? "Bakiye Yetersiz" : "Kirala"}
        </Button>
        <ConfirmDialog
          open={dialog === "rent"}
          onOpenChange={(o) => !o && setDialog(null)}
          title={`${property.name} kirala`}
          description={`İlk dönem için ${money(property.rent_price, currency)} şimdi tahsil edilir. Kiralama her ${period} günde bir, iptal edene kadar aynı fiyattan yenilenir.`}
          confirmLabel="Kirala"
          pending={pending === "rent"}
          onConfirm={async () => {
            const ok = await run("rent", () => api.rent(property.id), "Mülkü kiraladınız.")
            if (!ok) return false
            await onDone()
          }}
        />
      </Section>
    )
  }

  if (property.status === "sale") {
    return (
      <Section header="Satış Fiyatı" plain footer="Aktif kiracılar yeni sahibe devredilir.">
        <Money value={property.sale_price} className="block text-large-title text-label" />
        <div className="mt-4 grid gap-2.5">
          <Button size="lg" className="w-full" disabled={!canBuy || credit < property.sale_price} onClick={() => setDialog("buy")}>
            {credit < property.sale_price ? "Bakiye Yetersiz" : "Bu Fiyattan Satın Al"}
          </Button>
          {canOffer && (
            <Button
              size="lg"
              variant="secondary"
              className="w-full"
              onClick={() => {
                setAmount(String(minOffer || ""))
                setDialog("offer")
              }}
            >
              Teklif Ver
            </Button>
          )}
        </div>
        <ConfirmDialog
          open={dialog === "buy"}
          onOpenChange={(o) => !o && setDialog(null)}
          title={`${property.name} satın al`}
          description={`${money(property.sale_price, currency)} bakiyenizden düşülecek ve mülk size devredilecek.`}
          confirmLabel="Satın Al"
          pending={pending === "buy"}
          onConfirm={async () => {
            const ok = await run("buy", () => api.buyListing(property.id), "Mülk artık sizin.")
            if (!ok) return false
            await onDone()
          }}
        />
        <Dialog open={dialog === "offer"} onOpenChange={(o) => !o && setDialog(null)}>
          <DialogContent>
            <DialogHeader
              title="Teklif Ver"
              action={
                <SheetAction form="offer-form" pending={pending === "offer"}>
                  Gönder
                </SheetAction>
              }
            />
            <DialogBody>
              <DialogDescription>
                Teklif tutarı, satıcı yanıtlayana kadar bakiyenizde bloke edilir. Reddedilir veya süresi dolarsa (
                {config?.offers.expire_days} gün) iade edilir.
              </DialogDescription>
              <form
                id="offer-form"
                className="grid gap-6"
                onSubmit={async (e) => {
                  e.preventDefault()
                  const ok = await run("offer", () => api.offer(property.id, Number(amount), message), "Teklifiniz iletildi.")
                  if (ok) {
                    setDialog(null)
                    setMessage("")
                    await onDone()
                  }
                }}
              >
                <Section footer={`Satış fiyatı ${money(property.sale_price, currency)}. En az ${money(minOffer, currency)} teklif verebilirsiniz.`}>
                  <FieldRow label="Teklif" htmlFor="offer-amount">
                    <Input
                      id="offer-amount"
                      type="number"
                      inputMode="decimal"
                      min={minOffer}
                      step="0.01"
                      required
                      placeholder="0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className={cn(inlineInput, "tabular-nums")}
                    />
                    <span className="shrink-0 self-center pl-1.5 text-body text-label-secondary">{currency}</span>
                  </FieldRow>
                </Section>
                <Section header="Mesaj" footer="İsteğe bağlı; satıcı teklifinizle birlikte görür.">
                  <li>
                    <label htmlFor="offer-message" className="sr-only">
                      Mesaj (isteğe bağlı)
                    </label>
                    <Textarea
                      id="offer-message"
                      maxLength={500}
                      placeholder="Satıcıya bir not yazın"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className={inlineTextarea}
                    />
                  </li>
                </Section>
              </form>
            </DialogBody>
          </DialogContent>
        </Dialog>
      </Section>
    )
  }

  return (
    <Notice icon={Info}>
      <p className="text-headline">İlanda değil</p>
      <p className="mt-0.5 text-label-secondary">
        {property.status === "building"
          ? "Bu mülkte inşaat sürüyor."
          : property.status === "rented"
            ? "Bu mülkün kiracı kapasitesi dolu."
            : "Sahibi bu mülkü şu anda kiraya vermiyor veya satmıyor."}
      </p>
    </Notice>
  )
}

// ---------------------------------------------------------------- sahip: ilan

export function ListingForm({ property, onDone }: { property: Property; onDone: () => Promise<void> }) {
  const { config, currency } = useApp()
  const { run, pending } = useAction()
  const [status, setStatus] = useState<"empty" | "rent" | "sale">(
    property.status === "sale" ? "sale" : property.status === "rent" || property.status === "rented" ? "rent" : "empty",
  )
  const [rent, setRent] = useState(String(property.rent_price || ""))
  const [sale, setSale] = useState(String(property.sale_price || ""))

  if (property.status === "building") {
    return (
      <Notice icon={Hammer} tone="tint">
        <p className="text-headline">İlan</p>
        <p className="mt-0.5 text-label-secondary">İnşaat bitince mülkü kiraya verebilir veya satabilirsiniz.</p>
      </Notice>
    )
  }

  const maxRent = Math.round((config?.rent.max_price || 0) * (1 + property.rent_cap_bonus_pct / 100) * 100) / 100
  const hasTenants = property.tenant_count > 0
  const period = config?.rent.period_days || 30

  // Bölüm altı notları: kiracı kısıtı, fiyat aralığı ve komisyon.
  const notes = [
    hasTenants
      ? `Aktif kiracısı olan mülk boşaltılamaz${!config?.sale.allow_with_tenants ? " veya satışa çıkarılamaz" : ""}.`
      : "",
    status === "rent"
      ? `${money(config?.rent.min_price, currency)} ile ${money(maxRent, currency)} arası${
          property.rent_cap_bonus_pct ? ` (yükseltmelerle +%${num(property.rent_cap_bonus_pct)})` : ""
        }. Mevcut kiracılar eski fiyattan devam eder.`
      : "",
    status === "rent" && config?.rent.commission_pct
      ? `Her kira ödemesinden %${num(config.rent.commission_pct)} komisyon kesilir.`
      : "",
    status === "sale"
      ? `${money(config?.sale.min_price, currency)} ile ${money(config?.sale.max_price, currency)} arası.${
          config?.sale.commission_pct ? ` Satışta %${num(config.sale.commission_pct)} komisyon kesilir.` : ""
        }`
      : "",
  ].filter(Boolean)

  return (
    <form
      className="grid gap-4"
      onSubmit={async (e) => {
        e.preventDefault()
        const ok = await run(
          "listing",
          () =>
            api.listing(property.id, status, {
              rent_price: rent === "" ? undefined : Number(rent),
              sale_price: sale === "" ? undefined : Number(sale),
            }),
          "İlan güncellendi.",
        )
        if (ok) await onDone()
      }}
    >
      <Section
        header="İlan"
        footer={
          notes.length > 0 && (
            <span className="grid gap-1">
              {notes.map((n) => (
                <span key={n}>{n}</span>
              ))}
            </span>
          )
        }
      >
        <FieldRow label="Durum" htmlFor="listing-status">
          <NativeSelect inline id="listing-status" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
            <option value="empty" disabled={hasTenants}>
              Boş (ilanda değil)
            </option>
            <option value="rent" disabled={!config?.features.rent}>
              Kiralık
            </option>
            <option value="sale" disabled={!config?.features.sale || (hasTenants && !config?.sale.allow_with_tenants)}>
              Satılık
            </option>
          </NativeSelect>
        </FieldRow>
        {status === "rent" && (
          <FieldRow label={`Kira (${period} gün)`} htmlFor="listing-rent">
            <Input
              id="listing-rent"
              type="number"
              inputMode="decimal"
              step="0.01"
              min={config?.rent.min_price}
              max={maxRent}
              required
              placeholder="0"
              value={rent}
              onChange={(e) => setRent(e.target.value)}
              className={cn(inlineInput, "tabular-nums")}
            />
            <span className="shrink-0 self-center pl-1.5 text-body text-label-secondary">{currency}</span>
          </FieldRow>
        )}
        {status === "sale" && (
          <FieldRow label="Satış fiyatı" htmlFor="listing-sale">
            <Input
              id="listing-sale"
              type="number"
              inputMode="decimal"
              step="0.01"
              min={config?.sale.min_price}
              max={config?.sale.max_price}
              required
              placeholder="0"
              value={sale}
              onChange={(e) => setSale(e.target.value)}
              className={cn(inlineInput, "tabular-nums")}
            />
            <span className="shrink-0 self-center pl-1.5 text-body text-label-secondary">{currency}</span>
          </FieldRow>
        )}
      </Section>
      <Button type="submit" size="lg" className="w-full" disabled={pending === "listing"}>
        {pending === "listing" && <Spinner className="size-4" />}
        İlanı Kaydet
      </Button>
    </form>
  )
}

// ---------------------------------------------------------------- sahip: bilgiler

/** Çoklu seçim listesi satırı: dokununca seçilir, seçiliyse sağda vurgu renginde onay işareti. */
function CheckRow({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: () => void }) {
  return (
    <li data-slot="list-row" className="group/row relative">
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        onClick={onToggle}
        className="press-row flex min-h-11 w-full cursor-pointer items-center gap-3 px-4 text-left outline-none focus-visible:bg-fill-quaternary desk:min-h-9 desk:px-3"
      >
        <span className="relative flex min-w-0 flex-1 items-center gap-3 self-stretch py-[11px] after:hairline after:absolute after:bottom-0 after:left-0 after:-right-4 after:bg-separator group-last/row:after:hidden">
          <span className="min-w-0 flex-1 text-body text-label">{label}</span>
          <Check weight="bold" aria-hidden="true" className={cn("size-5 shrink-0 text-tint", !checked && "invisible")} />
        </span>
      </button>
    </li>
  )
}

/** Mülk bilgilerini düzenleme sayfası (sheet). Açılış durumu sayfadan yönetilir. */
export function EditDetails({
  property,
  catalog,
  open,
  onOpenChange,
  onDone,
}: {
  property: Property
  catalog: Catalog
  open: boolean
  onOpenChange: (open: boolean) => void
  onDone: () => Promise<void>
}) {
  const [name, setName] = useState(property.name)
  const [description, setDescription] = useState(property.description)
  const [area, setArea] = useState(String(property.area_m2 || ""))
  const [rooms, setRooms] = useState(String(property.rooms || ""))
  const [features, setFeatures] = useState<string[]>(property.features || [])
  const [file, setFile] = useState<File | null>(null)
  const [pending, setPending] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : undefined), [file])
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview)
    },
    [preview],
  )

  // Her açılışta alanları mülkün güncel değerlerine döndür.
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setName(property.name)
      setDescription(property.description)
      setArea(String(property.area_m2 || ""))
      setRooms(String(property.rooms || ""))
      setFeatures(property.features || [])
      setFile(null)
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    try {
      await pb.collection("properties").update(property.id, {
        name: name.trim(),
        description: description.trim(),
        area_m2: area === "" ? 0 : Number(area),
        rooms: rooms === "" ? 0 : Number(rooms),
        features,
      })
      if (file) {
        const fd = new FormData()
        fd.append("image", file)
        await pb.collection("properties").update(property.id, fd)
      }
      toast.success("Bilgiler kaydedildi.")
      onOpenChange(false)
      await onDone()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader
          title="Mülk Bilgileri"
          action={
            <SheetAction form="details-form" pending={pending}>
              Kaydet
            </SheetAction>
          }
        />
        <DialogBody>
          <DialogDescription>Ad, açıklama ve özellikler ilan sayfasında görünür.</DialogDescription>
          <form id="details-form" onSubmit={save} className="grid gap-6">
            <Section>
              <FieldRow label="Ad" htmlFor="d-name">
                <Input
                  id="d-name"
                  required
                  maxLength={120}
                  placeholder="Gerekli"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inlineInput}
                />
              </FieldRow>
              <FieldRow label="Alan (m²)" htmlFor="d-area">
                <Input
                  id="d-area"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  placeholder="0"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className={cn(inlineInput, "tabular-nums")}
                />
              </FieldRow>
              <FieldRow label="Oda sayısı" htmlFor="d-rooms">
                <Input
                  id="d-rooms"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  placeholder="0"
                  value={rooms}
                  onChange={(e) => setRooms(e.target.value)}
                  className={cn(inlineInput, "tabular-nums")}
                />
              </FieldRow>
            </Section>

            <Section header="Açıklama">
              <li>
                <label htmlFor="d-desc" className="sr-only">
                  Açıklama
                </label>
                <Textarea
                  id="d-desc"
                  maxLength={2000}
                  rows={4}
                  placeholder="Mülkünüzü kısaca anlatın"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={inlineTextarea}
                />
              </li>
            </Section>

            {catalog.features.length > 0 && (
              <Section header="Özellikler" footer={features.length > 0 ? `${features.length} özellik seçili.` : undefined}>
                {catalog.features.map((f) => (
                  <CheckRow
                    key={f.id}
                    label={f.name}
                    checked={features.includes(f.id)}
                    onToggle={() =>
                      setFeatures((prev) => (prev.includes(f.id) ? prev.filter((x) => x !== f.id) : [...prev, f.id]))
                    }
                  />
                ))}
              </Section>
            )}

            <Section header="Fotoğraf" footer="JPG, PNG veya WebP, en fazla 5 MB. Fotoğraf yoksa parsel çizimi gösterilir.">
              <Row
                onClick={() => fileRef.current?.click()}
                leading={
                  <span className="my-2 size-10 shrink-0 overflow-hidden rounded-[10px] bg-fill-tertiary">
                    {preview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={preview} alt="" className="size-full object-cover" />
                    ) : (
                      <PropertyVisual property={property} className="size-full" />
                    )}
                  </span>
                }
                title={file || property.image ? "Fotoğrafı Değiştir" : "Fotoğraf Seç"}
                detail={file ? <span className="text-subheadline">{file.name}</span> : undefined}
              />
            </Section>
            <input
              ref={fileRef}
              id="d-image"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------- sahip: yükseltme ve inşaat

export function UpgradesPanel({
  property,
  catalog,
  applied,
  isOwner,
  onDone,
}: {
  property: Property
  catalog: Catalog
  applied: PropertyUpgrade[]
  isOwner: boolean
  onDone: () => Promise<void>
}) {
  const { config, currency, user } = useApp()
  const { run, pending } = useAction()
  const [confirm, setConfirm] = useState<string | null>(null)

  const available = catalog.upgrades.filter((u) => u.types.length === 0 || u.types.includes(property.type))
  const countOf = (id: string) => applied.filter((a) => a.upgrade === id).length
  const enabled = config?.features.upgrades && property.status !== "building"
  const selected = available.find((u) => u.id === confirm)

  if (!isOwner && applied.length === 0) return null
  if (isOwner && available.length === 0 && applied.length === 0) return null

  return (
    <Section header="Yükseltmeler">
      {(isOwner ? available : available.filter((u) => countOf(u.id) > 0)).map((u) => {
        const n = countOf(u.id)
        const maxed = u.max_per_property > 0 && n >= u.max_per_property
        const effects = [
          u.tenant_limit_bonus ? `+${u.tenant_limit_bonus} kiracı` : "",
          u.rent_cap_bonus_pct ? `kira tavanı +%${num(u.rent_cap_bonus_pct)}` : "",
        ].filter(Boolean)
        return (
          <Row
            key={u.id}
            className="items-start [&>span:first-child]:mt-3"
            leading={<IconTile icon={ArrowFatLinesUp} color="purple" />}
            title={
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-headline">{u.name}</span>
                {n > 0 && (
                  <Tag tone="green" className="tabular-nums">
                    {u.max_per_property > 0 ? `${n}/${u.max_per_property}` : `${n} kez`}
                  </Tag>
                )}
              </span>
            }
            subtitle={u.description || undefined}
            accessory={
              isOwner ? (
                <Button
                  variant="secondary"
                  size="sm"
                  className="tabular-nums"
                  disabled={!enabled || maxed || (user?.credit || 0) < u.cost}
                  onClick={() => setConfirm(u.id)}
                >
                  {maxed ? "Üst sınırda" : money(u.cost, currency)}
                </Button>
              ) : undefined
            }
          >
            {effects.length > 0 && (
              <span className="mt-1.5 flex flex-wrap gap-1.5">
                {effects.map((e) => (
                  <Tag key={e}>{e}</Tag>
                ))}
              </span>
            )}
          </Row>
        )
      })}
      <ConfirmDialog
        open={!!selected}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={selected ? `${selected.name} uygula` : ""}
        description={selected ? `${money(selected.cost, currency)} bakiyenizden düşülecek. Yükseltmeler geri alınamaz.` : undefined}
        confirmLabel="Uygula"
        pending={pending === "upgrade"}
        onConfirm={async () => {
          if (!selected) return false
          const ok = await run("upgrade", () => api.upgrade(property.id, selected.id), "Yükseltme uygulandı.")
          if (!ok) return false
          await onDone()
        }}
      />
    </Section>
  )
}

export function BuildPanel({
  property,
  catalog,
  onDone,
}: {
  property: Property
  catalog: Catalog
  onDone: () => Promise<void>
}) {
  const { config, currency, user } = useApp()
  const { run, pending } = useAction()
  const [open, setOpen] = useState(false)
  const type = catalog.typeById[property.type] || property.expand?.type
  const target = type?.build_target ? catalog.typeById[type.build_target] : undefined

  if (property.status === "building") {
    const to = property.expand?.building_to || (property.building_to ? catalog.typeById[property.building_to] : undefined)
    return (
      <Notice icon={Hammer} tone="tint">
        <p className="text-headline">İnşaat sürüyor</p>
        <p className="mt-0.5 text-label-secondary">
          {to?.name || "Yeni yapı"} inşaatı sürüyor. Tahmini bitiş: {date(property.build_ready_at)} (
          {relative(property.build_ready_at)}).
        </p>
      </Notice>
    )
  }

  if (!type || !target || !config?.features.build) return null
  const blocked = property.status !== "empty" || property.tenant_count > 0
  const days = config.build.build_days

  return (
    <Section
      header="İnşaat"
      plain
      footer={blocked ? "İnşaat için mülk boş olmalı: kiracısız ve ilanda değil." : undefined}
    >
      <div className="flex items-start gap-3">
        <IconTile icon={Hammer} color="orange" />
        <p className="min-w-0 flex-1 text-subheadline text-label">
          Bu {type.name.toLocaleLowerCase("tr-TR")} üzerine {target.name.toLocaleLowerCase("tr-TR")} inşa ederek kiracı
          kapasitesini {target.tenant_limit} kişiye çıkarabilirsiniz.
          {days > 0 ? ` İnşaat ${days} gün sürer.` : " İnşaat anında tamamlanır."}
          {config.build.only_when_target_out_of_stock && ` Yalnızca bu şehirde satılık ${target.name} kalmadığında yapılabilir.`}
        </p>
      </div>
      <Button
        size="lg"
        variant="secondary"
        className="mt-4 w-full"
        disabled={blocked || (user?.credit || 0) < type.build_cost}
        onClick={() => setOpen(true)}
      >
        <Hammer weight="fill" />
        <span className="tabular-nums">{money(type.build_cost, currency)} ile İnşa Et</span>
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`${target.name} inşa et`}
        description={`${money(type.build_cost, currency)} bakiyenizden düşülecek. Mülkün tipi ${target.name} olarak değişecek.`}
        confirmLabel="İnşaatı Başlat"
        pending={pending === "build"}
        onConfirm={async () => {
          const ok = await run("build", () => api.build(property.id), days > 0 ? "İnşaat başladı." : "İnşaat tamamlandı.")
          if (!ok) return false
          await onDone()
        }}
      />
    </Section>
  )
}

// ---------------------------------------------------------------- sahip: kiracılar, teklifler, gelir

export function TenantsPanel({ rentals }: { rentals: Rental[] }) {
  const { config } = useApp()
  return (
    <Section header="Kiracılar">
      {rentals.length === 0 ? (
        <RowItem className="text-subheadline text-label-secondary">Şu anda kiracınız yok.</RowItem>
      ) : (
        rentals.map((r) => {
          const tenant = r.expand?.tenant
          const name = tenant?.name || "Kullanıcı"
          return (
            <Row
              key={r.id}
              href={config?.features.public_profiles && tenant ? `/users/${tenant.id}` : undefined}
              leading={<Avatar name={name} />}
              title={name}
              subtitle={`${r.periods_paid}. dönem · sonraki ${date(r.next_charge)}`}
              detail={<Money value={r.price} />}
            >
              {r.cancel_at_period_end && (
                <span className="mt-1.5 flex">
                  <Tag tone="orange">Dönem sonunda ayrılıyor</Tag>
                </span>
              )}
            </Row>
          )
        })
      )}
    </Section>
  )
}

export function OffersPanel({ offers, onDone }: { offers: Offer[]; onDone: () => Promise<void> }) {
  const { currency } = useApp()
  const { run, pending } = useAction()
  const [accepting, setAccepting] = useState<Offer | null>(null)
  if (offers.length === 0) return null
  return (
    <Section header="Bekleyen Teklifler">
      {offers.map((o) => {
        const buyer = o.expand?.buyer?.name || "Kullanıcı"
        return (
          <RowItem key={o.id} className="flex gap-3 py-3.5">
            <Avatar name={buyer} />
            <div className="grid min-w-0 flex-1 gap-2">
              <div>
                <Money value={o.amount} className="block text-title3 text-label" />
                <p className="mt-0.5 truncate text-subheadline text-label-secondary">
                  {buyer} · {relative(o.created)}
                </p>
              </div>
              {o.message && (
                <p className="rounded-[14px] bg-fill-quaternary px-3 py-2 text-subheadline text-label break-words">
                  “{o.message}”
                </p>
              )}
              <div className="flex flex-wrap gap-2 pt-0.5">
                <Button size="sm" onClick={() => setAccepting(o)} disabled={!!pending}>
                  <Check weight="bold" />
                  Kabul Et
                </Button>
                <Button
                  size="sm"
                  variant="destructive-secondary"
                  disabled={!!pending}
                  onClick={async () => {
                    const ok = await run(`reject-${o.id}`, () => api.respondOffer(o.id, "reject"), "Teklif reddedildi.")
                    if (ok) await onDone()
                  }}
                >
                  {pending === `reject-${o.id}` ? <Spinner className="size-4" /> : <X weight="bold" />}
                  Reddet
                </Button>
              </div>
            </div>
          </RowItem>
        )
      })}
      <ConfirmDialog
        open={!!accepting}
        onOpenChange={(o) => !o && setAccepting(null)}
        title="Teklifi kabul et"
        description={
          accepting
            ? `Mülk ${money(accepting.amount, currency)} karşılığında ${accepting.expand?.buyer?.name || "alıcıya"} devredilecek. Diğer teklifler iade edilir.`
            : undefined
        }
        confirmLabel="Kabul Et ve Sat"
        pending={pending === "accept"}
        onConfirm={async () => {
          if (!accepting) return false
          const ok = await run("accept", () => api.respondOffer(accepting.id, "accept"), "Mülk satıldı.")
          if (!ok) return false
          await onDone()
        }}
      />
    </Section>
  )
}

export function IncomePanel({ transactions }: { transactions: Transaction[] }) {
  const { currency } = useApp()
  const months: { month: string; label: string; income: number }[] = []
  const now = new Date()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
    const key = d.toISOString().slice(0, 7)
    months.push({ month: key, label: monthLabel(key), income: 0 })
  }
  let total = 0
  for (const t of transactions) {
    total += t.amount
    const m = months.find((x) => x.month === t.created.slice(0, 7))
    if (m) m.income = Math.round((m.income + t.amount) * 100) / 100
  }
  return (
    <Section header="Bu Mülkten Gelir" plain bodyClassName="px-2 pt-4 pb-2">
      <div className="px-2">
        <div className="flex items-center gap-1.5 text-caption1 text-label-secondary">
          <span className="size-2 rounded-full bg-system-green" aria-hidden="true" />
          Son 12 ay
        </div>
        <Money value={total} className="mt-0.5 block text-title2 text-label" />
      </div>
      <div className="mt-2 h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={months}>
            <CartesianGrid vertical={false} stroke="var(--separator)" strokeDasharray="2 3" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} stroke="var(--label-secondary)" />
            <YAxis
              tickLine={false}
              axisLine={false}
              fontSize={11}
              width={40}
              stroke="var(--label-secondary)"
              orientation="right"
              tickFormatter={(v: number) => compact.format(v)}
            />
            <Tooltip
              cursor={{ fill: "var(--fill-quaternary)" }}
              contentStyle={{
                background: "var(--glass-bg-thick)",
                backdropFilter: "var(--glass-blur)",
                border: "none",
                borderRadius: 14,
                boxShadow: "var(--glass-shadow)",
                color: "var(--label)",
                fontSize: 13,
              }}
              labelStyle={{ color: "var(--label-secondary)", fontSize: 12 }}
              formatter={(v) => [money(Number(v), currency), "Gelir"]}
            />
            <Bar dataKey="income" fill="var(--system-green)" radius={[4, 4, 4, 4]} maxBarSize={18} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Section>
  )
}
