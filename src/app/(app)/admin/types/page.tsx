"use client"

import { useState } from "react"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { fileUrl, pb } from "@/lib/pb"
import { invalidateCatalog } from "@/lib/catalog"
import { num } from "@/lib/format"
import type { PropertyType } from "@/lib/types"
import { useAction, useLoad } from "@/hooks/use-data"
import { ConfirmDialog, EmptyState, ErrorState, Field, Loading, Money, NativeSelect, PageHeader } from "@/components/kit"
import { typeColor } from "@/components/parcel"
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

const COLORS = [
  ["emerald", "Yeşil (arsa)"],
  ["blue", "Mavi (ev)"],
  ["violet", "Mor (premium)"],
  ["amber", "Amber (villa)"],
] as const

export default function AdminTypesPage() {
  const list = useLoad(() => pb.collection("property_types").getFullList<PropertyType>({ sort: "sort,name" }), [])
  const { run, isPending } = useAction()
  const [editing, setEditing] = useState<PropertyType | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Form>(EMPTY)
  const [image, setImage] = useState<File | null>(null)
  const [removeImage, setRemoveImage] = useState(false)
  const [deleting, setDeleting] = useState<PropertyType | null>(null)

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

  return (
    <>
      <PageHeader
        title="Mülk tipleri"
        description="Satışa sunulan mülk türleri, taban fiyatları ve kurallar. Şehirdeki satış fiyatı, taban fiyat ile şehir çarpanının çarpımıdır."
        actions={
          <Button onClick={() => openForm(null)}>
            <Plus />
            Yeni tip ekle
          </Button>
        }
      />

      {list.error && <ErrorState message={list.error} onRetry={list.reload} />}
      {!list.data && list.loading && <Loading />}
      {list.data && types.length === 0 && (
        <EmptyState title="Henüz mülk tipi yok" description="Kullanıcıların satın alabilmesi için en az bir tip ekleyin." />
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {types.map((t) => {
          const target = types.find((x) => x.id === t.build_target)
          const img = fileUrl(t, t.image, "400x300")
          return (
            <article key={t.id} className="flex min-w-0 flex-col rounded-xl border bg-card">
              <div className="flex gap-3 border-b p-4">
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img} alt="" className="size-16 shrink-0 rounded-lg object-cover" />
                ) : (
                  <span
                    className="size-16 shrink-0 rounded-lg border"
                    style={{ background: typeColor(t.color) }}
                    aria-hidden="true"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="truncate type-title-large">{t.name}</h2>
                    <ActiveDot active={t.active} />
                  </div>
                  <code className="type-body-small text-muted-foreground">{t.key}</code>
                  <p className="mt-1 line-clamp-2 type-body-medium text-muted-foreground">{t.description}</p>
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 p-4 type-body-medium">
                <dt className="text-muted-foreground">Taban fiyat</dt>
                <dd className="text-right">
                  <Money value={t.price} className="font-medium" />
                </dd>
                <dt className="text-muted-foreground">Kiracı kapasitesi</dt>
                <dd className="figure text-right">{t.tenant_limit}</dd>
                <dt className="text-muted-foreground">Gereken kira sayısı</dt>
                <dd className="figure text-right">{t.required_rent_count || "Yok"}</dd>
                <dt className="text-muted-foreground">İnşaat</dt>
                <dd className="text-right">
                  {target ? (
                    <>
                      {target.name}, <Money value={t.build_cost} />
                    </>
                  ) : (
                    "Yok"
                  )}
                </dd>
                <dt className="text-muted-foreground">Sıra</dt>
                <dd className="figure text-right">{num(t.sort)}</dd>
              </dl>
              <div className="mt-auto flex justify-end gap-2 border-t p-3">
                <Button variant="ghost" size="sm" onClick={() => setDeleting(t)}>
                  <Trash2 />
                  Sil
                </Button>
                <Button variant="outline" size="sm" onClick={() => openForm(t)}>
                  <Pencil />
                  Düzenle
                </Button>
              </div>
            </article>
          )
        })}
      </div>

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? `${editing.name} tipini düzenle` : "Yeni mülk tipi"}
        pending={isPending("save")}
        onSubmit={save}
        wide
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ad" htmlFor="t-name">
            <Input id="t-name" required value={form.name} onChange={(e) => up("name", e.target.value)} />
          </Field>
          <Field label="Anahtar" htmlFor="t-key" hint="Küçük harf, rakam ve alt çizgi. Parsel çizimini belirler (land, villa...).">
            <Input
              id="t-key"
              required
              pattern="^[a-z0-9_]+$"
              value={form.key}
              onChange={(e) => up("key", e.target.value.toLowerCase())}
            />
          </Field>
          <Field label="Açıklama" htmlFor="t-desc" className="sm:col-span-2">
            <Textarea id="t-desc" rows={2} value={form.description} onChange={(e) => up("description", e.target.value)} />
          </Field>
          <Field label="Taban fiyat" htmlFor="t-price">
            <NumberInput id="t-price" min={0} value={form.price} onChange={(v) => up("price", v)} />
          </Field>
          <Field label="Kiracı kapasitesi" htmlFor="t-limit" hint="0 ise kiraya verilemez.">
            <NumberInput id="t-limit" min={0} step="1" value={form.tenant_limit} onChange={(v) => up("tenant_limit", v)} />
          </Field>
          <Field label="Gereken kira sayısı" htmlFor="t-req" hint="Satın almak için önce kaç kez kira ödenmiş olmalı.">
            <NumberInput
              id="t-req"
              min={0}
              step="1"
              value={form.required_rent_count}
              onChange={(v) => up("required_rent_count", v)}
            />
          </Field>
          <Field label="Sıra" htmlFor="t-sort">
            <NumberInput id="t-sort" step="1" value={form.sort} onChange={(v) => up("sort", v)} />
          </Field>
          <Field label="İnşaat hedefi" htmlFor="t-target" hint="Bu tip hangi tipe dönüştürülebilir.">
            <NativeSelect id="t-target" value={form.build_target} onChange={(e) => up("build_target", e.target.value)}>
              <option value="">İnşaat yapılamaz</option>
              {types
                .filter((x) => x.id !== editing?.id)
                .map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
            </NativeSelect>
          </Field>
          <Field label="İnşaat maliyeti" htmlFor="t-cost">
            <NumberInput
              id="t-cost"
              min={0}
              value={form.build_cost}
              onChange={(v) => up("build_cost", v)}
              disabled={!form.build_target}
            />
          </Field>
          <Field label="Harita rengi" htmlFor="t-color" hint="Hazır renklerden biri veya #1f5eff gibi bir kod.">
            <div className="flex gap-2">
              <NativeSelect
                id="t-color"
                value={COLORS.some(([c]) => c === form.color) ? form.color : "custom"}
                onChange={(e) => up("color", e.target.value === "custom" ? "#1f5eff" : e.target.value)}
              >
                {COLORS.map(([c, label]) => (
                  <option key={c} value={c}>
                    {label}
                  </option>
                ))}
                <option value="custom">Özel renk</option>
              </NativeSelect>
              {!COLORS.some(([c]) => c === form.color) && (
                <Input aria-label="Renk kodu" value={form.color} onChange={(e) => up("color", e.target.value)} className="w-28" />
              )}
            </div>
          </Field>
          <div className="flex items-center gap-3">
            <span className="size-10 shrink-0 rounded-lg border" style={{ background: typeColor(form.color) }} aria-hidden="true" />
            <span className="type-body-small text-muted-foreground">Listelerde ve haritada bu tipi temsil eden renk.</span>
          </div>
          <Field label="Görsel" htmlFor="t-image" className="sm:col-span-2">
            <Input id="t-image" type="file" accept="image/*" onChange={(e) => setImage(e.target.files?.[0] || null)} />
            {editing?.image && !image && (
              <label className="flex items-center gap-2 type-body-small text-muted-foreground">
                <input type="checkbox" checked={removeImage} onChange={(e) => setRemoveImage(e.target.checked)} />
                Mevcut görseli kaldır
              </label>
            )}
          </Field>
          <div className="sm:col-span-2">
            <SwitchRow
              id="t-active"
              label="Satışta"
              hint="Pasif tipler satın alma ekranında görünmez; mevcut mülkler etkilenmez."
              checked={form.active}
              onChange={(v) => up("active", v)}
            />
          </div>
        </div>
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
          invalidateCatalog()
          list.reload()
        }}
      />
    </>
  )
}
