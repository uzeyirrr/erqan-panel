"use client"

import { useState } from "react"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { pb } from "@/lib/pb"
import { invalidateCatalog } from "@/lib/catalog"
import type { Feature, PropertyType, Upgrade } from "@/lib/types"
import { useAction, useLoad } from "@/hooks/use-data"
import { ConfirmDialog, ErrorState, Field, Loading, Money, PageHeader, Panel, Tag } from "@/components/kit"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ActiveDot, FormDialog, NumberInput, SwitchRow } from "../_components/admin-kit"

type FeatureForm = { id?: string; name: string; icon: string; sort: number; active: boolean }
type UpgradeForm = {
  id?: string
  name: string
  description: string
  cost: number
  tenant_limit_bonus: number
  rent_cap_bonus_pct: number
  types: string[]
  max_per_property: number
  sort: number
  active: boolean
}

async function loadAll() {
  const [features, upgrades, types] = await Promise.all([
    pb.collection("features").getFullList<Feature>({ sort: "sort,name" }),
    pb.collection("upgrades").getFullList<Upgrade>({ sort: "sort,name" }),
    pb.collection("property_types").getFullList<PropertyType>({ sort: "sort,name" }),
  ])
  return { features, upgrades, types }
}

export default function AdminCatalogPage() {
  const data = useLoad(loadAll, [])
  const { run, isPending } = useAction()
  const [feature, setFeature] = useState<FeatureForm | null>(null)
  const [upgrade, setUpgrade] = useState<UpgradeForm | null>(null)
  const [deleting, setDeleting] = useState<{ col: "features" | "upgrades"; id: string; name: string } | null>(null)

  if (data.error) return <ErrorState message={data.error} onRetry={data.reload} />
  if (!data.data) return <Loading />
  const { features, upgrades, types } = data.data
  const typeName = (id: string) => types.find((t) => t.id === id)?.name || "?"

  async function save(col: "features" | "upgrades", form: FeatureForm | UpgradeForm, done: () => void) {
    const { id, ...body } = form
    const res = await run(
      "save",
      () => (id ? pb.collection(col).update(id, body) : pb.collection(col).create(body)),
      id ? "Kaydedildi." : "Eklendi.",
    )
    if (res) {
      invalidateCatalog()
      done()
      data.reload()
    }
  }

  return (
    <>
      <PageHeader
        title="Özellikler ve yükseltmeler"
        description="Mülk sahiplerinin seçebileceği özellikler ile satın alabileceği yükseltmeler."
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Panel
          title="Mülk özellikleri"
          actions={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFeature({ name: "", icon: "", sort: (features.at(-1)?.sort || 0) + 1, active: true })}
            >
              <Plus />
              Ekle
            </Button>
          }
          bodyClassName="p-0"
        >
          <p className="border-b px-4 py-3 type-body-medium text-muted-foreground">
            Havuz, bahçe gibi etiketler. Sahipler mülk sayfasından seçer; kiracılar filtrelerken görür.
          </p>
          <ul className="divide-y">
            {features.map((f) => (
              <li key={f.id} className="flex items-center gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="truncate type-title-small">{f.name}</div>
                  <div className="type-body-small text-muted-foreground">{f.icon ? `İkon: ${f.icon}` : "İkon yok"}</div>
                </div>
                <ActiveDot active={f.active} />
                <Button variant="ghost" size="icon-sm" onClick={() => setFeature({ ...f })} aria-label={`${f.name} düzenle`}>
                  <Pencil />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setDeleting({ col: "features", id: f.id, name: f.name })}
                  aria-label={`${f.name} sil`}
                >
                  <Trash2 />
                </Button>
              </li>
            ))}
            {features.length === 0 && <li className="px-4 py-6 type-body-medium text-muted-foreground">Henüz özellik yok.</li>}
          </ul>
        </Panel>

        <Panel
          title="Yükseltmeler"
          actions={
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setUpgrade({
                  name: "",
                  description: "",
                  cost: 0,
                  tenant_limit_bonus: 0,
                  rent_cap_bonus_pct: 0,
                  types: [],
                  max_per_property: 1,
                  sort: (upgrades.at(-1)?.sort || 0) + 1,
                  active: true,
                })
              }
            >
              <Plus />
              Ekle
            </Button>
          }
          bodyClassName="p-0"
        >
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Yükseltme</TableHead>
                  <TableHead className="text-right">Maliyet</TableHead>
                  <TableHead>Etkisi</TableHead>
                  <TableHead>Tipler</TableHead>
                  <TableHead className="pr-4">
                    <span className="sr-only">İşlemler</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {upgrades.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="pl-4">
                      <div className="font-medium">{u.name}</div>
                      <ActiveDot active={u.active} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Money value={u.cost} />
                    </TableCell>
                    <TableCell className="type-body-medium">
                      {[
                        u.tenant_limit_bonus ? `+${u.tenant_limit_bonus} kiracı` : "",
                        u.rent_cap_bonus_pct ? `Kira tavanı +%${u.rent_cap_bonus_pct}` : "",
                      ]
                        .filter(Boolean)
                        .join(", ") || "Yok"}
                      <div className="type-body-small text-muted-foreground">
                        {u.max_per_property ? `Mülk başına en fazla ${u.max_per_property}` : "Sınırsız"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {u.types.length === 0 ? <Tag>Tümü</Tag> : u.types.map((t) => <Tag key={t}>{typeName(t)}</Tag>)}
                      </div>
                    </TableCell>
                    <TableCell className="pr-4 text-right whitespace-nowrap">
                      <Button variant="ghost" size="icon-sm" onClick={() => setUpgrade({ ...u })} aria-label={`${u.name} düzenle`}>
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setDeleting({ col: "upgrades", id: u.id, name: u.name })}
                        aria-label={`${u.name} sil`}
                      >
                        <Trash2 />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Panel>
      </div>

      {feature && (
        <FormDialog
          open
          onOpenChange={(o) => !o && setFeature(null)}
          title={feature.id ? `${feature.name} düzenle` : "Yeni özellik"}
          pending={isPending("save")}
          onSubmit={() => save("features", feature, () => setFeature(null))}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Ad" htmlFor="f-name" className="sm:col-span-2">
              <Input id="f-name" required value={feature.name} onChange={(e) => setFeature({ ...feature, name: e.target.value })} />
            </Field>
            <Field label="İkon" htmlFor="f-icon" hint="lucide.dev ikon adı (waves, car, trees...).">
              <Input id="f-icon" value={feature.icon} onChange={(e) => setFeature({ ...feature, icon: e.target.value })} />
            </Field>
            <Field label="Sıra" htmlFor="f-sort">
              <NumberInput id="f-sort" step="1" value={feature.sort} onChange={(v) => setFeature({ ...feature, sort: v })} />
            </Field>
            <div className="sm:col-span-2">
              <SwitchRow id="f-active" label="Seçilebilir" checked={feature.active} onChange={(v) => setFeature({ ...feature, active: v })} />
            </div>
          </div>
        </FormDialog>
      )}

      {upgrade && (
        <FormDialog
          open
          onOpenChange={(o) => !o && setUpgrade(null)}
          title={upgrade.id ? `${upgrade.name} düzenle` : "Yeni yükseltme"}
          pending={isPending("save")}
          onSubmit={() => save("upgrades", upgrade, () => setUpgrade(null))}
          wide
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Ad" htmlFor="u-name" className="sm:col-span-2">
              <Input id="u-name" required value={upgrade.name} onChange={(e) => setUpgrade({ ...upgrade, name: e.target.value })} />
            </Field>
            <Field label="Açıklama" htmlFor="u-desc" className="sm:col-span-2">
              <Textarea
                id="u-desc"
                rows={2}
                value={upgrade.description}
                onChange={(e) => setUpgrade({ ...upgrade, description: e.target.value })}
              />
            </Field>
            <Field label="Maliyet" htmlFor="u-cost">
              <NumberInput id="u-cost" min={0} value={upgrade.cost} onChange={(v) => setUpgrade({ ...upgrade, cost: v })} />
            </Field>
            <Field label="Mülk başına en fazla" htmlFor="u-max" hint="0 = sınırsız.">
              <NumberInput
                id="u-max"
                min={0}
                step="1"
                value={upgrade.max_per_property}
                onChange={(v) => setUpgrade({ ...upgrade, max_per_property: v })}
              />
            </Field>
            <Field label="Kiracı kapasitesi artışı" htmlFor="u-tenant">
              <NumberInput
                id="u-tenant"
                min={0}
                step="1"
                value={upgrade.tenant_limit_bonus}
                onChange={(v) => setUpgrade({ ...upgrade, tenant_limit_bonus: v })}
              />
            </Field>
            <Field label="Kira tavanı artışı (%)" htmlFor="u-cap" hint="En yüksek kira ayarını bu oranda artırır.">
              <NumberInput
                id="u-cap"
                min={0}
                value={upgrade.rent_cap_bonus_pct}
                onChange={(v) => setUpgrade({ ...upgrade, rent_cap_bonus_pct: v })}
              />
            </Field>
            <fieldset className="grid gap-2 sm:col-span-2">
              <legend className="mb-1 type-title-small">Uygulanabilen tipler</legend>
              <p className="-mt-1 type-body-small text-muted-foreground">Hiçbiri seçilmezse tüm tiplere uygulanabilir.</p>
              <div className="flex flex-wrap gap-x-5 gap-y-2">
                {types.map((t) => {
                  const checked = upgrade.types.includes(t.id)
                  return (
                    <label key={t.id} className="flex items-center gap-2 type-body-medium">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) =>
                          setUpgrade({
                            ...upgrade,
                            types: v ? [...upgrade.types, t.id] : upgrade.types.filter((x) => x !== t.id),
                          })
                        }
                      />
                      {t.name}
                    </label>
                  )
                })}
              </div>
            </fieldset>
            <Field label="Sıra" htmlFor="u-sort">
              <NumberInput id="u-sort" step="1" value={upgrade.sort} onChange={(v) => setUpgrade({ ...upgrade, sort: v })} />
            </Field>
            <div className="self-end">
              <SwitchRow id="u-active" label="Satışta" checked={upgrade.active} onChange={(v) => setUpgrade({ ...upgrade, active: v })} />
            </div>
          </div>
        </FormDialog>
      )}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`${deleting?.name} silinsin mi?`}
        description={
          deleting?.col === "upgrades"
            ? "Bu yükseltmeyi almış mülkler varsa silme reddedilir; bunun yerine pasif yapın."
            : "Bu özellik mülklerden de kaldırılır."
        }
        confirmLabel="Sil"
        destructive
        pending={isPending("delete")}
        onConfirm={async () => {
          if (!deleting) return
          const res = await run("delete", () => pb.collection(deleting.col).delete(deleting.id), "Silindi.")
          if (res === undefined) return false
          invalidateCatalog()
          data.reload()
        }}
      />
    </>
  )
}
