"use client"

import Link from "next/link"
import { useState } from "react"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Check, Hammer, ImageUp, Loader2, Pencil, X } from "lucide-react"
import { api, errorMessage, pb } from "@/lib/pb"
import { date, money, monthLabel, num, relative } from "@/lib/format"
import type { Catalog } from "@/lib/catalog"
import type { Offer, Property, PropertyUpgrade, Rental, Transaction } from "@/lib/types"
import { useAction } from "@/hooks/use-data"
import { useApp } from "@/components/app-provider"
import { ConfirmDialog, Field, Money, NativeSelect, Panel, Tag } from "@/components/kit"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"

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
      <Panel title="Bu mülkte kiracısınız">
        <p className="type-body-medium text-muted-foreground">
          Sonraki tahsilat {date(myRental.next_charge)}:{" "}
          <Money value={myRental.price} className="font-medium text-foreground" />.
        </p>
        {myRental.cancel_at_period_end && (
          <p className="mt-2 type-body-medium text-muted-foreground">Kiralama dönem sonunda bitecek.</p>
        )}
        <Link href="/my-properties?tab=rented" className="mt-3 inline-block type-body-medium text-primary hover:underline">
          Kiralamalarımı yönet
        </Link>
      </Panel>
    )
  }

  if (property.status === "rent") {
    return (
      <Panel title="Kirala">
        <Money value={property.rent_price} className="type-headline-medium" />
        <p className="mt-1 type-body-medium text-muted-foreground">
          Her {period} günde bir bakiyenizden otomatik tahsil edilir.
        </p>
        <Button size="lg" className="mt-4 w-full" disabled={!canRent || credit < property.rent_price} onClick={() => setDialog("rent")}>
          {full ? "Kapasite dolu" : credit < property.rent_price ? "Bakiye yetersiz" : "Kirala"}
        </Button>
        {!config?.features.rent && <p className="mt-2 type-body-small text-muted-foreground">Kiralama şu anda kapalı.</p>}
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
      </Panel>
    )
  }

  if (property.status === "sale") {
    return (
      <Panel title="Satın al">
        <Money value={property.sale_price} className="type-headline-medium" />
        <p className="mt-1 type-body-medium text-muted-foreground">Satış fiyatı. Aktif kiracılar yeni sahibe devredilir.</p>
        <div className="mt-4 grid gap-2">
          <Button size="lg" disabled={!canBuy || credit < property.sale_price} onClick={() => setDialog("buy")}>
            {credit < property.sale_price ? "Bakiye yetersiz" : "Bu fiyattan satın al"}
          </Button>
          {canOffer && (
            <Button
              size="lg"
              variant="outline"
              onClick={() => {
                setAmount(String(minOffer || ""))
                setDialog("offer")
              }}
            >
              Teklif ver
            </Button>
          )}
        </div>
        <ConfirmDialog
          open={dialog === "buy"}
          onOpenChange={(o) => !o && setDialog(null)}
          title={`${property.name} satın al`}
          description={`${money(property.sale_price, currency)} bakiyenizden düşülecek ve mülk size devredilecek.`}
          confirmLabel="Satın al"
          pending={pending === "buy"}
          onConfirm={async () => {
            const ok = await run("buy", () => api.buyListing(property.id), "Mülk artık sizin.")
            if (!ok) return false
            await onDone()
          }}
        />
        <Dialog open={dialog === "offer"} onOpenChange={(o) => !o && setDialog(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Teklif ver</DialogTitle>
              <DialogDescription>
                Teklif tutarı, satıcı yanıtlayana kadar bakiyenizde bloke edilir. Reddedilir veya süresi dolarsa (
                {config?.offers.expire_days} gün) iade edilir.
              </DialogDescription>
            </DialogHeader>
            <form
              id="offer-form"
              className="grid gap-3"
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
              <Field label={`Teklif (${currency})`} htmlFor="offer-amount" hint={`En az ${money(minOffer, currency)}.`}>
                <Input
                  id="offer-amount"
                  type="number"
                  inputMode="decimal"
                  min={minOffer}
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </Field>
              <Field label="Mesaj (isteğe bağlı)" htmlFor="offer-message">
                <Textarea id="offer-message" maxLength={500} value={message} onChange={(e) => setMessage(e.target.value)} />
              </Field>
            </form>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialog(null)}>
                Vazgeç
              </Button>
              <Button type="submit" form="offer-form" disabled={pending === "offer"}>
                {pending === "offer" && <Loader2 className="animate-spin" />}
                Teklifi gönder
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Panel>
    )
  }

  return (
    <Panel title="İlanda değil">
      <p className="type-body-medium text-muted-foreground">
        {property.status === "building"
          ? "Bu mülkte inşaat sürüyor."
          : property.status === "rented"
            ? "Bu mülkün kiracı kapasitesi dolu."
            : "Sahibi bu mülkü şu anda kiraya vermiyor veya satmıyor."}
      </p>
    </Panel>
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
      <Panel title="İlan">
        <p className="type-body-medium text-muted-foreground">İnşaat bitince mülkü kiraya verebilir veya satabilirsiniz.</p>
      </Panel>
    )
  }

  const maxRent = Math.round((config?.rent.max_price || 0) * (1 + property.rent_cap_bonus_pct / 100) * 100) / 100
  const hasTenants = property.tenant_count > 0

  return (
    <Panel title="İlan">
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
        <Field label="Durum" htmlFor="listing-status">
          <NativeSelect id="listing-status" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
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
        </Field>
        {hasTenants && (
          <p className="-mt-2 type-body-small text-muted-foreground">
            Aktif kiracısı olan mülk boşaltılamaz
            {!config?.sale.allow_with_tenants && " veya satışa çıkarılamaz"}.
          </p>
        )}
        {status === "rent" && (
          <Field
            label={`Kira fiyatı (${config?.rent.period_days || 30} gün)`}
            htmlFor="listing-rent"
            hint={`${money(config?.rent.min_price, currency)} ile ${money(maxRent, currency)} arası${
              property.rent_cap_bonus_pct ? ` (yükseltmelerle +%${num(property.rent_cap_bonus_pct)})` : ""
            }. Mevcut kiracılar eski fiyattan devam eder.`}
          >
            <Input
              id="listing-rent"
              type="number"
              inputMode="decimal"
              step="0.01"
              min={config?.rent.min_price}
              max={maxRent}
              required
              value={rent}
              onChange={(e) => setRent(e.target.value)}
            />
          </Field>
        )}
        {status === "sale" && (
          <Field
            label="Satış fiyatı"
            htmlFor="listing-sale"
            hint={`${money(config?.sale.min_price, currency)} ile ${money(config?.sale.max_price, currency)} arası.${
              config?.sale.commission_pct ? ` Satışta %${num(config.sale.commission_pct)} komisyon kesilir.` : ""
            }`}
          >
            <Input
              id="listing-sale"
              type="number"
              inputMode="decimal"
              step="0.01"
              min={config?.sale.min_price}
              max={config?.sale.max_price}
              required
              value={sale}
              onChange={(e) => setSale(e.target.value)}
            />
          </Field>
        )}
        {status === "rent" && !!config?.rent.commission_pct && (
          <p className="-mt-2 type-body-small text-muted-foreground">
            Her kira ödemesinden %{num(config.rent.commission_pct)} komisyon kesilir.
          </p>
        )}
        <Button type="submit" disabled={pending === "listing"}>
          {pending === "listing" && <Loader2 className="animate-spin" />}
          İlanı kaydet
        </Button>
      </form>
    </Panel>
  )
}

// ---------------------------------------------------------------- sahip: bilgiler

export function EditDetails({
  property,
  catalog,
  onDone,
}: {
  property: Property
  catalog: Catalog
  onDone: () => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(property.name)
  const [description, setDescription] = useState(property.description)
  const [area, setArea] = useState(String(property.area_m2 || ""))
  const [rooms, setRooms] = useState(String(property.rooms || ""))
  const [features, setFeatures] = useState<string[]>(property.features || [])
  const [file, setFile] = useState<File | null>(null)
  const [pending, setPending] = useState(false)

  function reset() {
    setName(property.name)
    setDescription(property.description)
    setArea(String(property.area_m2 || ""))
    setRooms(String(property.rooms || ""))
    setFeatures(property.features || [])
    setFile(null)
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
      setOpen(false)
      await onDone()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={() => {
          reset()
          setOpen(true)
        }}
      >
        <Pencil />
        Bilgileri düzenle
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Mülk bilgileri</DialogTitle>
            <DialogDescription>Ad, açıklama ve özellikler ilan sayfasında görünür.</DialogDescription>
          </DialogHeader>
          <form id="details-form" onSubmit={save} className="grid gap-4">
            <Field label="Ad" htmlFor="d-name">
              <Input id="d-name" required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Açıklama" htmlFor="d-desc">
              <Textarea id="d-desc" maxLength={2000} rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Alan (m²)" htmlFor="d-area">
                <Input id="d-area" type="number" min={0} value={area} onChange={(e) => setArea(e.target.value)} />
              </Field>
              <Field label="Oda sayısı" htmlFor="d-rooms">
                <Input id="d-rooms" type="number" min={0} step={1} value={rooms} onChange={(e) => setRooms(e.target.value)} />
              </Field>
            </div>
            {catalog.features.length > 0 && (
              <fieldset className="grid gap-2">
                <legend className="mb-1 type-title-small">Özellikler</legend>
                <div className="grid grid-cols-2 gap-2">
                  {catalog.features.map((f) => {
                    const checked = features.includes(f.id)
                    return (
                      <div key={f.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`feat-${f.id}`}
                          checked={checked}
                          onCheckedChange={(v) =>
                            setFeatures((prev) => (v ? [...prev, f.id] : prev.filter((x) => x !== f.id)))
                          }
                        />
                        <Label htmlFor={`feat-${f.id}`} className="font-normal">
                          {f.name}
                        </Label>
                      </div>
                    )
                  })}
                </div>
              </fieldset>
            )}
            <Field label="Fotoğraf" htmlFor="d-image" hint="JPG, PNG veya WebP, en fazla 5 MB. Fotoğraf yoksa parsel çizimi gösterilir.">
              <label
                htmlFor="d-image"
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed px-3 py-2.5 type-body-medium hover:bg-muted"
              >
                <ImageUp className="size-4 text-muted-foreground" />
                <span className="truncate">{file ? file.name : property.image ? "Fotoğrafı değiştir" : "Fotoğraf seç"}</span>
              </label>
              <input
                id="d-image"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </Field>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Vazgeç
            </Button>
            <Button type="submit" form="details-form" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
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
    <Panel title="Yükseltmeler" bodyClassName="p-0">
      <ul className="divide-y">
        {(isOwner ? available : available.filter((u) => countOf(u.id) > 0)).map((u) => {
          const n = countOf(u.id)
          const maxed = u.max_per_property > 0 && n >= u.max_per_property
          const effects = [
            u.tenant_limit_bonus ? `+${u.tenant_limit_bonus} kiracı` : "",
            u.rent_cap_bonus_pct ? `kira tavanı +%${num(u.rent_cap_bonus_pct)}` : "",
          ].filter(Boolean)
          return (
            <li key={u.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{u.name}</span>
                  {n > 0 && (
                    <Tag className="bg-gain/10 text-gain">
                      {u.max_per_property > 0 ? `${n}/${u.max_per_property}` : `${n} kez`}
                    </Tag>
                  )}
                </div>
                {u.description && <p className="type-body-medium text-muted-foreground">{u.description}</p>}
                {effects.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {effects.map((e) => (
                      <Tag key={e}>{e}</Tag>
                    ))}
                  </div>
                )}
              </div>
              {isOwner && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!enabled || maxed || (user?.credit || 0) < u.cost}
                  onClick={() => setConfirm(u.id)}
                >
                  {maxed ? "Üst sınırda" : money(u.cost, currency)}
                </Button>
              )}
            </li>
          )
        })}
      </ul>
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
    </Panel>
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
      <Panel title="İnşaat">
        <p className="flex items-start gap-2 type-body-medium">
          <Hammer className="mt-0.5 size-4 shrink-0 text-primary" />
          <span>
            {to?.name || "Yeni yapı"} inşaatı sürüyor. Tahmini bitiş: {date(property.build_ready_at)} (
            {relative(property.build_ready_at)}).
          </span>
        </p>
      </Panel>
    )
  }

  if (!type || !target || !config?.features.build) return null
  const blocked = property.status !== "empty" || property.tenant_count > 0
  const days = config.build.build_days

  return (
    <Panel title="İnşaat">
      <p className="type-body-medium text-muted-foreground">
        Bu {type.name.toLocaleLowerCase("tr-TR")} üzerine {target.name.toLocaleLowerCase("tr-TR")} inşa ederek kiracı kapasitesini{" "}
        {target.tenant_limit} kişiye çıkarabilirsiniz.
        {days > 0 ? ` İnşaat ${days} gün sürer.` : " İnşaat anında tamamlanır."}
        {config.build.only_when_target_out_of_stock && ` Yalnızca bu şehirde satılık ${target.name} kalmadığında yapılabilir.`}
      </p>
      <Button
        className="mt-3 w-full"
        disabled={blocked || (user?.credit || 0) < type.build_cost}
        onClick={() => setOpen(true)}
      >
        <Hammer />
        {money(type.build_cost, currency)} ile inşa et
      </Button>
      {blocked && <p className="mt-2 type-body-small text-muted-foreground">İnşaat için mülk boş olmalı: kiracısız ve ilanda değil.</p>}
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`${target.name} inşa et`}
        description={`${money(type.build_cost, currency)} bakiyenizden düşülecek. Mülkün tipi ${target.name} olarak değişecek.`}
        confirmLabel="İnşaatı başlat"
        pending={pending === "build"}
        onConfirm={async () => {
          const ok = await run("build", () => api.build(property.id), days > 0 ? "İnşaat başladı." : "İnşaat tamamlandı.")
          if (!ok) return false
          await onDone()
        }}
      />
    </Panel>
  )
}

// ---------------------------------------------------------------- sahip: kiracılar, teklifler, gelir

export function TenantsPanel({ rentals }: { rentals: Rental[] }) {
  const { config } = useApp()
  return (
    <Panel title="Kiracılar" bodyClassName="p-0">
      {rentals.length === 0 ? (
        <p className="p-4 type-body-medium text-muted-foreground">Şu anda kiracınız yok.</p>
      ) : (
        <ul className="divide-y">
          {rentals.map((r) => {
            const tenant = r.expand?.tenant
            return (
              <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 type-body-medium">
                <span className="min-w-0 flex-1 font-medium">
                  {config?.features.public_profiles && tenant ? (
                    <Link href={`/users/${tenant.id}`} className="hover:underline">
                      {tenant.name || "Kullanıcı"}
                    </Link>
                  ) : (
                    tenant?.name || "Kullanıcı"
                  )}
                </span>
                <Money value={r.price} />
                <span className="text-muted-foreground">
                  {r.periods_paid}. dönem, sonraki {date(r.next_charge)}
                </span>
                {r.cancel_at_period_end && <Tag>Dönem sonunda ayrılıyor</Tag>}
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}

export function OffersPanel({ offers, onDone }: { offers: Offer[]; onDone: () => Promise<void> }) {
  const { currency } = useApp()
  const { run, pending } = useAction()
  const [accepting, setAccepting] = useState<Offer | null>(null)
  if (offers.length === 0) return null
  return (
    <Panel title="Bekleyen teklifler" bodyClassName="p-0">
      <ul className="divide-y">
        {offers.map((o) => (
          <li key={o.id} className="grid gap-2 px-4 py-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <Money value={o.amount} className="type-title-large" />
              <span className="type-body-small text-muted-foreground">
                {o.expand?.buyer?.name || "Kullanıcı"}, {relative(o.created)}
              </span>
            </div>
            {o.message && <p className="type-body-medium text-muted-foreground">“{o.message}”</p>}
            <div className="flex gap-2">
              <Button size="sm" onClick={() => setAccepting(o)} disabled={!!pending}>
                <Check />
                Kabul et
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!!pending}
                onClick={async () => {
                  const ok = await run(`reject-${o.id}`, () => api.respondOffer(o.id, "reject"), "Teklif reddedildi.")
                  if (ok) await onDone()
                }}
              >
                {pending === `reject-${o.id}` ? <Loader2 className="animate-spin" /> : <X />}
                Reddet
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <ConfirmDialog
        open={!!accepting}
        onOpenChange={(o) => !o && setAccepting(null)}
        title="Teklifi kabul et"
        description={
          accepting
            ? `Mülk ${money(accepting.amount, currency)} karşılığında ${accepting.expand?.buyer?.name || "alıcıya"} devredilecek. Diğer teklifler iade edilir.`
            : undefined
        }
        confirmLabel="Kabul et ve sat"
        pending={pending === "accept"}
        onConfirm={async () => {
          if (!accepting) return false
          const ok = await run("accept", () => api.respondOffer(accepting.id, "accept"), "Mülk satıldı.")
          if (!ok) return false
          await onDone()
        }}
      />
    </Panel>
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
    <Panel
      title="Bu mülkten gelir"
      actions={<Money value={total} className="type-title-small text-gain" />}
      bodyClassName="h-52 p-2 sm:p-4"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={months}>
          <CartesianGrid vertical={false} stroke="var(--md-sys-color-outline-variant)" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} stroke="var(--md-sys-color-on-surface-variant)" />
          <YAxis tickLine={false} axisLine={false} fontSize={11} width={40} stroke="var(--md-sys-color-on-surface-variant)" />
          <Tooltip
            cursor={{ fill: "var(--md-sys-color-surface-container-highest)" }}
            contentStyle={{
              background: "var(--md-sys-color-inverse-surface)",
              border: "none",
              borderRadius: 4,
              color: "var(--md-sys-color-inverse-on-surface)",
            }}
            formatter={(v) => [money(Number(v), currency), "Gelir"]}
          />
          <Bar dataKey="income" fill="var(--md-custom-gain)" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Panel>
  )
}

/** Kısa bilgi satırları (alan, oda, kiracı vb.). */
export function Facts({ items }: { items: [string, React.ReactNode][] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
      {items.map(([k, v]) => (
        <div key={k} className="min-w-0">
          <dt className="type-body-small text-muted-foreground">{k}</dt>
          <dd className="tabular-nums truncate type-title-medium">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

