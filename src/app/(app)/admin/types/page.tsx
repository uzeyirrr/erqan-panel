"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Check, Image as ImageIcon, Plus, PlusCircle, Shapes } from "@phosphor-icons/react"
import { fileUrl, pb } from "@/lib/pb"
import { invalidateCatalog } from "@/lib/catalog"
import { num } from "@/lib/format"
import type { PropertyType } from "@/lib/types"
import { cn } from "@/lib/utils"
import { useAction, useLoad } from "@/hooks/use-data"
import {
  BarButton,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  FieldRow,
  IconTile,
  Loading,
  Money,
  NativeSelect,
  PageHeader,
  Row,
  RowItem,
  Section,
  inlineInput,
} from "@/components/kit"
import { Parcel, typeColor, typeIcon } from "@/components/parcel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ActiveDot, FormDialog, NumberInput, SwitchRow } from "../_components/admin-kit"

type Form = {
  key: string
  name: string
  description: string
  price: number
  tenant_limit: number
  required_rent_count: number
  build_target: string
  build_cost: number
  color: string
  sort: number
  active: boolean
}

const EMPTY: Form = {
  key: "",
  name: "",
  description: "",
  price: 0,
  tenant_limit: 1,
  required_rent_count: 0,
  build_target: "",
  build_cost: 0,
  color: "blue",
  sort: 0,
  active: true,
}

type IconType = React.ComponentType<{ className?: string; weight?: "regular" | "bold" | "fill" }>

const COLORS = [
  ["emerald", "Yeşil (arsa)"],
  ["blue", "Mavi (ev)"],
  ["violet", "Mor (premium)"],
  ["amber", "Amber (villa)"],
] as const

/** Satırın başındaki küçük görsel: tipin görseli, yoksa tip renginde simge kutucuğu. */
function TypeThumb({ type }: { type: PropertyType }) {
  const img = fileUrl(type, type.image, "100x100")
  if (img)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={img} alt="" className="size-11 shrink-0 rounded-[12px] object-cover" />
  return <IconTile icon={typeIcon(type.key) as IconType} color={typeColor(type.color)} size="lg" />
}

/** Hazır renk dairesi (Anımsatıcılar liste rengi seçicisi gibi). */
function ColorDot({
  color,
  label,
  selected,
  onSelect,
  custom,
}: {
  color: string
  label: string
  selected: boolean
  onSelect: () => void
  custom?: boolean
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={selected}
      title={label}
      onClick={onSelect}
      className="press-scale flex size-11 shrink-0 items-center justify-center rounded-full outline-none focus-visible:outline-2"
    >
      <span
        className="flex size-9 items-center justify-center rounded-full text-white"
        style={{
          background:
            custom && !selected
              ? "conic-gradient(#ff3b30, #ffcc00, #34c759, #00c7be, #007aff, #af52de, #ff2d55, #ff3b30)"
              : color,
          boxShadow: selected ? `0 0 0 2.5px var(--grouped-secondary), 0 0 0 5px ${color}` : undefined,
        }}
      >
        {selected && <Check weight="bold" className="size-[18px]" />}
      </span>
    </button>
  )
}

export default function AdminTypesPage() {
  const list = useLoad(() => pb.collection("property_types").getFullList<PropertyType>({ sort: "sort,name" }), [])
  const { run, isPending } = useAction()
  const [editing, setEditing] = useState<PropertyType | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Form>(EMPTY)
  const [image, setImage] = useState<File | null>(null)
  const [removeImage, setRemoveImage] = useState(false)
  const [deleting, setDeleting] = useState<PropertyType | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Seçilen yeni görselin önizlemesi.
  const preview = useMemo(() => (image ? URL.createObjectURL(image) : undefined), [image])
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview)
    },
    [preview],
  )

  const types = list.data || []

  function openForm(t: PropertyType | null) {
    setEditing(t)
    setImage(null)
    setRemoveImage(false)
    setForm(
      t
        ? {
            key: t.key,
            name: t.name,
            description: t.description,
            price: t.price,
            tenant_limit: t.tenant_limit,
            required_rent_count: t.required_rent_count,
            build_target: t.build_target,
            build_cost: t.build_cost,
            color: t.color,
            sort: t.sort,
            active: t.active,
          }
        : { ...EMPTY, sort: (types.at(-1)?.sort || 0) + 1 },
    )
    setOpen(true)
  }

  const up = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }))

  async function save() {
    const data = new FormData()
    for (const [k, v] of Object.entries(form)) data.append(k, String(v))
    if (image) data.append("image", image)
    else if (removeImage) data.append("image", "")
    const res = await run(
      "save",
      () =>
        editing
          ? pb.collection("property_types").update(editing.id, data)
          : pb.collection("property_types").create(data),
      editing ? "Mülk tipi güncellendi." : "Mülk tipi eklendi.",
    )
    if (res) {
      invalidateCatalog()
      setOpen(false)
      list.reload()
    }
  }

  const preset = COLORS.find(([c]) => c === form.color)
  const currentImg = editing && !removeImage ? fileUrl(editing, editing.image, "400x300") : undefined
  const heroImg = preview || currentImg

  return (
    <>
      <PageHeader
        title="Mülk Tipleri"
        description="Satışa sunulan mülk türleri, taban fiyatları ve kurallar. Şehirdeki satış fiyatı, taban fiyat ile şehir çarpanının çarpımıdır."
        actions={<BarButton standalone label="Yeni tip ekle" icon={Plus} onClick={() => openForm(null)} />}
      />

      {list.error && <ErrorState message={list.error} onRetry={list.reload} />}
      {!list.data && list.loading && <Loading />}
      {list.data && types.length === 0 && (
        <EmptyState
          icon={<Shapes weight="fill" />}
          title="Henüz mülk tipi yok"
          description="Kullanıcıların satın alabilmesi için en az bir tip ekleyin."
          action={<Button onClick={() => openForm(null)}>Yeni Tip Ekle</Button>}
        />
      )}

      {types.length > 0 && (
        <Section>
          {types.map((t) => {
            const target = types.find((x) => x.id === t.build_target)
            return (
              <Row
                key={t.id}
                onClick={() => openForm(t)}
                leading={<TypeThumb type={t} />}
                detail={<ActiveDot active={t.active} />}
                accessory="chevron"
              >
                <span className="flex min-w-0 items-baseline gap-2">
                  <span className="truncate text-body text-label">{t.name}</span>
                  <code className="shrink-0 text-footnote text-label-tertiary">{t.key}</code>
                </span>
                <span className="mt-0.5 block text-subheadline text-label-secondary">
                  <Money value={t.price} /> · <span className="tabular-nums">{t.tenant_limit}</span> kiracı
                </span>
                {(t.required_rent_count > 0 || target) && (
                  <span className="block text-footnote text-label-secondary">
                    {t.required_rent_count > 0 && (
                      <>
                        <span className="tabular-nums">{num(t.required_rent_count)}</span> kira şartı
                      </>
                    )}
                    {t.required_rent_count > 0 && target && " · "}
                    {target && (
                      <>
                        İnşaat: {target.name}, <Money value={t.build_cost} />
                      </>
                    )}
                  </span>
                )}
              </Row>
            )
          })}
          <Row
            onClick={() => openForm(null)}
            leading={
              <span className="flex size-11 shrink-0 items-center justify-center text-tint">
                <PlusCircle weight="fill" className="size-7" />
              </span>
            }
            title="Yeni Tip Ekle"
          />
        </Section>
      )}

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? editing.name || "Mülk Tipi" : "Yeni Mülk Tipi"}
        pending={isPending("save")}
        onSubmit={save}
      >
        {/* Canlı önizleme: görsel ya da tip renginde simge */}
        <div className="flex justify-center pt-1">
          {heroImg ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={heroImg} alt="" className="size-20 rounded-[22px] object-cover shadow-card" />
          ) : (
            <Parcel typeKey={form.key} color={form.color} className="size-20 rounded-[22px] shadow-card" />
          )}
        </div>

        <Section footer="Anahtar küçük harf, rakam ve alt çizgiden oluşur; parsel çizimini belirler (land, villa...).">
          <FieldRow label="Ad" htmlFor="t-name">
            <Input
              id="t-name"
              required
              placeholder="Gerekli"
              value={form.name}
              onChange={(e) => up("name", e.target.value)}
              className={inlineInput}
            />
          </FieldRow>
          <FieldRow label="Anahtar" htmlFor="t-key">
            <Input
              id="t-key"
              required
              pattern="^[a-z0-9_]+$"
              placeholder="ornek_tip"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={form.key}
              onChange={(e) => up("key", e.target.value.toLowerCase())}
              className={cn(inlineInput, "font-mono")}
            />
          </FieldRow>
        </Section>

        <Section header="Açıklama">
          <RowItem>
            <Textarea
              id="t-desc"
              aria-label="Açıklama"
              rows={2}
              placeholder="Kısa açıklama"
              value={form.description}
              onChange={(e) => up("description", e.target.value)}
              className="min-h-16 resize-none rounded-none bg-transparent p-0 focus-visible:outline-none"
            />
          </RowItem>
        </Section>

        <Section
          header="Fiyat ve Kurallar"
          footer="Kiracı kapasitesi 0 ise tip kiraya verilemez. Gereken kira sayısı: satın almak için önce kaç kez kira ödenmiş olmalı."
        >
          <FieldRow label="Taban fiyat" htmlFor="t-price">
            <NumberInput id="t-price" inline min={0} placeholder="0" value={form.price} onChange={(v) => up("price", v)} />
          </FieldRow>
          <FieldRow label="Kiracı kapasitesi" htmlFor="t-limit">
            <NumberInput
              id="t-limit"
              inline
              min={0}
              step="1"
              placeholder="0"
              value={form.tenant_limit}
              onChange={(v) => up("tenant_limit", v)}
            />
          </FieldRow>
          <FieldRow label="Gereken kira sayısı" htmlFor="t-req">
            <NumberInput
              id="t-req"
              inline
              min={0}
              step="1"
              placeholder="0"
              value={form.required_rent_count}
              onChange={(v) => up("required_rent_count", v)}
            />
          </FieldRow>
          <FieldRow label="Sıra" htmlFor="t-sort">
            <NumberInput id="t-sort" inline step="1" placeholder="0" value={form.sort} onChange={(v) => up("sort", v)} />
          </FieldRow>
        </Section>

        <Section header="İnşaat" footer="Bu tip hangi tipe dönüştürülebilir.">
          <FieldRow label="Hedef" htmlFor="t-target">
            <NativeSelect id="t-target" inline value={form.build_target} onChange={(e) => up("build_target", e.target.value)}>
              <option value="">İnşaat yapılamaz</option>
              {types
                .filter((x) => x.id !== editing?.id)
                .map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
            </NativeSelect>
          </FieldRow>
          <FieldRow label="Maliyet" htmlFor="t-cost">
            <NumberInput
              id="t-cost"
              inline
              min={0}
              placeholder="0"
              value={form.build_cost}
              onChange={(v) => up("build_cost", v)}
              disabled={!form.build_target}
            />
          </FieldRow>
        </Section>

        <Section
          header="Harita Rengi"
          footer="Listelerde ve haritada bu tipi temsil eden renk. Hazır renklerden biri veya #1f5eff gibi bir kod."
        >
          <RowItem className="py-2">
            <div role="group" aria-label="Harita rengi" className="flex flex-wrap items-center justify-between gap-1">
              {COLORS.map(([c, label]) => (
                <ColorDot key={c} color={typeColor(c)} label={label} selected={form.color === c} onSelect={() => up("color", c)} />
              ))}
              <ColorDot
                custom
                color={typeColor(form.color)}
                label="Özel renk"
                selected={!preset}
                onSelect={() => {
                  if (preset) up("color", "#1f5eff")
                }}
              />
            </div>
          </RowItem>
          {preset ? (
            <Row title="Renk" detail={preset[1]} />
          ) : (
            <FieldRow label="Renk kodu" htmlFor="t-color">
              <Input
                id="t-color"
                value={form.color}
                spellCheck={false}
                autoCapitalize="none"
                onChange={(e) => up("color", e.target.value)}
                className={cn(inlineInput, "font-mono")}
              />
            </FieldRow>
          )}
        </Section>

        <Section header="Görsel">
          <Row
            onClick={() => fileRef.current?.click()}
            leading={
              heroImg ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={heroImg} alt="" className="size-[30px] shrink-0 rounded-[8px] object-cover" />
              ) : (
                <IconTile icon={ImageIcon} color="gray" />
              )
            }
            title={image ? "Başka Görsel Seç" : editing?.image && !removeImage ? "Görseli Değiştir" : "Görsel Seç"}
            subtitle={image?.name}
            accessory="chevron"
          />
          {image && <Row onClick={() => setImage(null)} title="Seçilen Görseli Kaldır" destructive />}
          {editing?.image && !image && (
            <SwitchRow id="t-remove-image" label="Mevcut görseli kaldır" checked={removeImage} onChange={setRemoveImage} />
          )}
        </Section>
        <input
          ref={fileRef}
          id="t-image"
          type="file"
          accept="image/*"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            setImage(e.target.files?.[0] || null)
            e.target.value = ""
          }}
        />

        <Section footer="Pasif tipler satın alma ekranında görünmez; mevcut mülkler etkilenmez.">
          <SwitchRow id="t-active" label="Satışta" checked={form.active} onChange={(v) => up("active", v)} />
        </Section>

        {editing && (
          <Section>
            <Row onClick={() => setDeleting(editing)} title="Tipi Sil" destructive />
          </Section>
        )}
      </FormDialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`${deleting?.name} silinsin mi?`}
        description="Bu tipe ait şehir stokları da silinir. Bu tipte mülk varsa silme işlemi reddedilir; bunun yerine tipi pasif yapın."
        confirmLabel="Sil"
        destructive
        pending={isPending("delete")}
        onConfirm={async () => {
          if (!deleting) return
          const res = await run("delete", () => pb.collection("property_types").delete(deleting.id), "Mülk tipi silindi.")
          if (res === undefined) return false
          // Düzenleme sayfasından silindiyse sayfayı da kapat.
          if (editing?.id === deleting.id) setOpen(false)
          invalidateCatalog()
          list.reload()
        }}
      />
    </>
  )
}
