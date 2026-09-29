"use client"

import { useState } from "react"
import { ArrowCircleUp, PlusCircle, Sparkle } from "@phosphor-icons/react"
import { pb } from "@/lib/pb"
import { invalidateCatalog } from "@/lib/catalog"
import type { Feature, PropertyType, Upgrade } from "@/lib/types"
import { cn } from "@/lib/utils"
import { useAction, useLoad } from "@/hooks/use-data"
import {
  ConfirmDialog,
  ErrorState,
  FieldRow,
  IconTile,
  Loading,
  Money,
  PageHeader,
  Row,
  RowItem,
  Section,
  Tag,
  inlineInput,
} from "@/components/kit"
import { typeColor, typeIcon } from "@/components/parcel"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Segmented } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { ActiveDot, FormDialog, NumberInput, SwitchRow } from "../_components/admin-kit"

type IconType = React.ComponentType<{ className?: string; weight?: "regular" | "bold" | "fill" }>

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

/** Listenin sonundaki "Yeni … Ekle" satırı (vurgu renginde artı). */
function AddRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Row
      onClick={onClick}
      leading={
        <span className="flex size-[30px] shrink-0 items-center justify-center text-tint">
          <PlusCircle weight="fill" className="size-7" />
        </span>
      }
      title={label}
    />
  )
}

/** Çoklu seçim satırı: sağda daire içinde onay işareti (iOS düzenleme listesi). */
function CheckRow({
  checked,
  onChange,
  leading,
  children,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  leading?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <li data-slot="list-row" className="group/row relative">
      <label className="press-row flex min-h-11 w-full cursor-pointer items-center gap-3 px-4">
        {leading}
        <span className="relative flex min-w-0 flex-1 items-center gap-3 self-stretch py-[11px] after:hairline after:absolute after:bottom-0 after:left-0 after:-right-4 after:bg-separator group-last/row:after:hidden">
          <span className="min-w-0 flex-1 text-body text-label">{children}</span>
          <Checkbox checked={checked} onCheckedChange={(v) => onChange(!!v)} />
        </span>
      </label>
    </li>
  )
}

const DESC_CLASS = "min-h-16 resize-none rounded-none bg-transparent p-0 focus-visible:outline-none"

export default function AdminCatalogPage() {
  const data = useLoad(loadAll, [])
  const { run, isPending } = useAction()
  const [feature, setFeature] = useState<FeatureForm | null>(null)
  const [upgrade, setUpgrade] = useState<UpgradeForm | null>(null)
  const [deleting, setDeleting] = useState<{ col: "features" | "upgrades"; id: string; name: string } | null>(null)
  // iPhone'da iki liste bölümlü kontrolle değiştirilir; geniş ekranda yan yana durur.
  const [tab, setTab] = useState<"features" | "upgrades">("features")

  const header = (
    <PageHeader
      title="Özellikler ve Yükseltmeler"
      description="Mülk sahiplerinin seçebileceği özellikler ile satın alabileceği yükseltmeler."
    />
  )

  if (data.error)
    return (
      <>
        {header}
        <ErrorState message={data.error} onRetry={data.reload} />
      </>
    )
  if (!data.data)
    return (
      <>
        {header}
        <Loading />
      </>
    )
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

  const newFeature = () => setFeature({ name: "", icon: "", sort: (features.at(-1)?.sort || 0) + 1, active: true })
  const newUpgrade = () =>
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

  return (
    <>
      {header}

      <Segmented
        aria-label="Liste"
        value={tab}
        onValueChange={setTab}
        className="mb-6 lg:hidden [&_[data-slot=tabs-list]]:w-full"
        items={[
          { value: "features", label: "Özellikler" },
          { value: "upgrades", label: "Yükseltmeler" },
        ]}
      />

      <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
        <Section
          header="Mülk Özellikleri"
          footer="Havuz, bahçe gibi etiketler. Sahipler mülk sayfasından seçer; kiracılar filtrelerken görür."
          className={cn(tab !== "features" && "max-lg:hidden")}
        >
          {features.map((f) => (
            <Row
              key={f.id}
              onClick={() => setFeature({ ...f })}
              icon={Sparkle}
              iconColor="teal"
              title={f.name}
              subtitle={f.icon ? `İkon: ${f.icon}` : "İkon yok"}
              detail={<ActiveDot active={f.active} />}
              accessory="chevron"
            />
          ))}
          {features.length === 0 && <RowItem className="text-subheadline text-label-secondary">Henüz özellik yok.</RowItem>}
          <AddRow label="Yeni Özellik Ekle" onClick={newFeature} />
        </Section>

        <Section header="Yükseltmeler" className={cn(tab !== "upgrades" && "max-lg:hidden")}>
          {upgrades.map((u) => {
            const effects = [
              u.tenant_limit_bonus ? `+${u.tenant_limit_bonus} kiracı` : "",
              u.rent_cap_bonus_pct ? `Kira tavanı +%${u.rent_cap_bonus_pct}` : "",
            ]
              .filter(Boolean)
              .join(", ")
            return (
              <Row
                key={u.id}
                onClick={() => setUpgrade({ ...u })}
                icon={ArrowCircleUp}
                iconColor="orange"
                detail={<ActiveDot active={u.active} />}
                accessory="chevron"
              >
                <span className="block truncate text-body text-label">{u.name}</span>
                <span className="mt-0.5 block text-subheadline text-label-secondary">
                  <Money value={u.cost} /> · {effects || "Etkisi yok"}
                </span>
                <span className="block text-footnote text-label-secondary">
                  {u.max_per_property ? `Mülk başına en fazla ${u.max_per_property}` : "Sınırsız"}
                </span>
                <span className="mt-1.5 mb-0.5 flex flex-wrap gap-1">
                  {u.types.length === 0 ? <Tag>Tümü</Tag> : u.types.map((t) => <Tag key={t}>{typeName(t)}</Tag>)}
                </span>
              </Row>
            )
          })}
          {upgrades.length === 0 && <RowItem className="text-subheadline text-label-secondary">Henüz yükseltme yok.</RowItem>}
          <AddRow label="Yeni Yükseltme Ekle" onClick={newUpgrade} />
        </Section>
      </div>

      {feature && (
        <FormDialog
          open
          onOpenChange={(o) => !o && setFeature(null)}
          title={feature.id ? "Özelliği Düzenle" : "Yeni Özellik"}
          pending={isPending("save")}
          onSubmit={() => save("features", feature, () => setFeature(null))}
        >
          <Section footer="İkon: phosphoricons.com ikon adı (waves, car, tree...).">
            <FieldRow label="Ad" htmlFor="f-name">
              <Input
                id="f-name"
                required
                placeholder="Gerekli"
                value={feature.name}
                onChange={(e) => setFeature({ ...feature, name: e.target.value })}
                className={inlineInput}
              />
            </FieldRow>
            <FieldRow label="İkon" htmlFor="f-icon">
              <Input
                id="f-icon"
                placeholder="waves"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={feature.icon}
                onChange={(e) => setFeature({ ...feature, icon: e.target.value })}
                className={cn(inlineInput, "font-mono")}
              />
            </FieldRow>
            <FieldRow label="Sıra" htmlFor="f-sort">
              <NumberInput
                id="f-sort"
                inline
                step="1"
                placeholder="0"
                value={feature.sort}
                onChange={(v) => setFeature({ ...feature, sort: v })}
              />
            </FieldRow>
          </Section>

          <Section>
            <SwitchRow id="f-active" label="Seçilebilir" checked={feature.active} onChange={(v) => setFeature({ ...feature, active: v })} />
          </Section>

          {feature.id && (
            <Section>
              <Row
                onClick={() => setDeleting({ col: "features", id: feature.id!, name: feature.name })}
                title="Özelliği Sil"
                destructive
              />
            </Section>
          )}
        </FormDialog>
      )}

      {upgrade && (
        <FormDialog
          open
          onOpenChange={(o) => !o && setUpgrade(null)}
          title={upgrade.id ? "Yükseltmeyi Düzenle" : "Yeni Yükseltme"}
          pending={isPending("save")}
          onSubmit={() => save("upgrades", upgrade, () => setUpgrade(null))}
        >
          <Section>
            <FieldRow label="Ad" htmlFor="u-name">
              <Input
                id="u-name"
                required
                placeholder="Gerekli"
                value={upgrade.name}
                onChange={(e) => setUpgrade({ ...upgrade, name: e.target.value })}
                className={inlineInput}
              />
            </FieldRow>
          </Section>

          <Section header="Açıklama">
            <RowItem>
              <Textarea
                id="u-desc"
                aria-label="Açıklama"
                rows={2}
                placeholder="Kısa açıklama"
                value={upgrade.description}
                onChange={(e) => setUpgrade({ ...upgrade, description: e.target.value })}
                className={DESC_CLASS}
              />
            </RowItem>
          </Section>

          <Section header="Fiyat" footer="Mülk başına en fazla: 0 = sınırsız.">
            <FieldRow label="Maliyet" htmlFor="u-cost">
              <NumberInput
                id="u-cost"
                inline
                min={0}
                placeholder="0"
                value={upgrade.cost}
                onChange={(v) => setUpgrade({ ...upgrade, cost: v })}
              />
            </FieldRow>
            <FieldRow label="Mülk başına en fazla" htmlFor="u-max">
              <NumberInput
                id="u-max"
                inline
                min={0}
                step="1"
                placeholder="0"
                value={upgrade.max_per_property}
                onChange={(v) => setUpgrade({ ...upgrade, max_per_property: v })}
              />
            </FieldRow>
          </Section>

          <Section header="Etkisi" footer="Kira tavanı artışı, en yüksek kira ayarını bu oranda artırır.">
            <FieldRow label="Kiracı kapasitesi artışı" htmlFor="u-tenant">
              <NumberInput
                id="u-tenant"
                inline
                min={0}
                step="1"
                placeholder="0"
                value={upgrade.tenant_limit_bonus}
                onChange={(v) => setUpgrade({ ...upgrade, tenant_limit_bonus: v })}
              />
            </FieldRow>
            <FieldRow label="Kira tavanı artışı (%)" htmlFor="u-cap">
              <NumberInput
                id="u-cap"
                inline
                min={0}
                placeholder="0"
                value={upgrade.rent_cap_bonus_pct}
                onChange={(v) => setUpgrade({ ...upgrade, rent_cap_bonus_pct: v })}
              />
            </FieldRow>
          </Section>

          <Section header="Uygulanabilen Tipler" footer="Hiçbiri seçilmezse tüm tiplere uygulanabilir.">
            {types.map((t) => (
              <CheckRow
                key={t.id}
                checked={upgrade.types.includes(t.id)}
                onChange={(v) =>
                  setUpgrade({
                    ...upgrade,
                    types: v ? [...upgrade.types, t.id] : upgrade.types.filter((x) => x !== t.id),
                  })
                }
                leading={<IconTile icon={typeIcon(t.key) as IconType} color={typeColor(t.color)} />}
              >
                {t.name}
              </CheckRow>
            ))}
          </Section>

          <Section>
            <FieldRow label="Sıra" htmlFor="u-sort">
              <NumberInput
                id="u-sort"
                inline
                step="1"
                placeholder="0"
                value={upgrade.sort}
                onChange={(v) => setUpgrade({ ...upgrade, sort: v })}
              />
            </FieldRow>
            <SwitchRow id="u-active" label="Satışta" checked={upgrade.active} onChange={(v) => setUpgrade({ ...upgrade, active: v })} />
          </Section>

          {upgrade.id && (
            <Section>
              <Row
                onClick={() => setDeleting({ col: "upgrades", id: upgrade.id!, name: upgrade.name })}
                title="Yükseltmeyi Sil"
                destructive
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
          // Düzenleme sayfasından silindiyse sayfayı da kapat.
          if (deleting.col === "features" && feature?.id === deleting.id) setFeature(null)
          if (deleting.col === "upgrades" && upgrade?.id === deleting.id) setUpgrade(null)
          invalidateCatalog()
          data.reload()
        }}
      />
    </>
  )
}
