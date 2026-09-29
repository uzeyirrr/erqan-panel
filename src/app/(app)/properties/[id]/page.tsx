"use client"

import Link from "next/link"
import { useState } from "react"
import { useParams } from "next/navigation"
import { Buildings } from "@phosphor-icons/react"
import { pb } from "@/lib/pb"
import { date, num } from "@/lib/format"
import { PROPERTY_EXPAND, loadCatalog } from "@/lib/catalog"
import type { Offer, Property, PropertyUpgrade, Rental, Transaction } from "@/lib/types"
import { useLoad } from "@/hooks/use-data"
import { useApp } from "@/components/app-provider"
import { PropertyVisual } from "@/components/property-card"
import { typeColor } from "@/components/parcel"
import { EmptyState, ErrorState, Loading, Money, PageHeader, Row, Section, StatusBadge, Tag } from "@/components/kit"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  BuildPanel,
  EditDetails,
  IncomePanel,
  ListingForm,
  OffersPanel,
  TenantsPanel,
  UpgradesPanel,
  VisitorActions,
} from "./_parts"

type Detail = {
  property: Property
  applied: PropertyUpgrade[]
  myRental: Rental | null
  tenants: Rental[]
  offers: Offer[]
  income: Transaction[]
}

export default function PropertyPage() {
  const { id } = useParams<{ id: string }>()
  const { user, config, refreshUser } = useApp()
  const [editing, setEditing] = useState(false)
  const catalog = useLoad(() => loadCatalog(), [])

  const detail = useLoad<Detail>(
    async () => {
      const property = await pb
        .collection("properties")
        .getOne<Property>(id, { expand: `${PROPERTY_EXPAND},features,building_to` })
      const isOwner = property.owner === user!.id
      const since = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() - 11, 1))
        .toISOString()
        .replace("T", " ")
      const [applied, mine, tenants, offers, income] = await Promise.all([
        pb.collection("property_upgrades").getFullList<PropertyUpgrade>({
          filter: pb.filter("property = {:p}", { p: id }),
          expand: "upgrade",
        }),
        pb.collection("rentals").getList<Rental>(1, 1, {
          filter: pb.filter("property = {:p} && tenant = {:u} && active = true", { p: id, u: user!.id }),
        }),
        isOwner
          ? pb.collection("rentals").getFullList<Rental>({
              filter: pb.filter("property = {:p} && active = true", { p: id }),
              expand: "tenant",
              sort: "started",
            })
          : Promise.resolve([] as Rental[]),
        isOwner
          ? pb.collection("offers").getFullList<Offer>({
              filter: pb.filter("property = {:p} && seller = {:u} && status = 'pending'", { p: id, u: user!.id }),
              expand: "buyer",
              sort: "-amount",
            })
          : Promise.resolve([] as Offer[]),
        isOwner
          ? pb.collection("transactions").getFullList<Transaction>({
              filter: pb.filter(
                "property = {:p} && user = {:u} && (kind = 'rent_income' || kind = 'sale_income') && created >= {:since}",
                { p: id, u: user!.id, since },
              ),
              fields: "id,amount,created,kind",
            })
          : Promise.resolve([] as Transaction[]),
      ])
      return { property, applied, myRental: mine.items[0] || null, tenants, offers, income }
    },
    [id, user?.id],
    !!user,
  )

  async function refresh() {
    await Promise.all([detail.reload(), refreshUser()])
  }

  if (detail.error) {
    return (
      <>
        <PageHeader title="Mülk" largeTitle={false} />
        {detail.error.includes("wasn't found") || detail.error.includes("bulunamadı") ? (
          <EmptyState
            icon={<Buildings weight="fill" />}
            title="Mülk bulunamadı"
            description="Bu mülk silinmiş veya bağlantı hatalı olabilir."
            action={
              <Link href="/listings" className={buttonVariants({ variant: "secondary" })}>
                İlanlara Dön
              </Link>
            }
          />
        ) : (
          <ErrorState message={detail.error} onRetry={detail.reload} />
        )}
      </>
    )
  }
  if (!detail.data || !catalog.data) {
    return (
      <>
        <PageHeader title="" largeTitle={false} />
        <Loading />
      </>
    )
  }

  const { property: p, applied, myRental, tenants, offers, income } = detail.data
  const cat = catalog.data
  const type = p.expand?.type
  const city = p.expand?.city
  const country = city?.expand?.country
  const owner = p.expand?.owner
  const isOwner = p.owner === user?.id
  const features = p.expand?.features || []
  const ownerName = owner ? owner.name || "Kullanıcı" : "Bilinmiyor"

  return (
    <>
      <PageHeader
        title={p.name}
        largeTitle={false}
        actions={
          isOwner && (
            <Button variant="glass" size="sm" className="h-11 px-4" onClick={() => setEditing(true)}>
              Düzenle
            </Button>
          )
        }
      />

      {/* Geniş ekranda iki sütun: solda mülk ve ayrıntılar, sağda sabit eylem sütunu. Telefonda eylemler başlığın hemen altında. */}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:grid-rows-[auto_1fr] lg:items-start">
        <section aria-label="Mülk" className="grid min-w-0 gap-4 lg:col-start-1 lg:row-start-1">
          <div className="aspect-[4/3] overflow-hidden rounded-card bg-fill-tertiary lg:aspect-[16/10]">
            <PropertyVisual property={p} className="size-full" />
          </div>
          <div className="grid gap-1.5 px-1">
            <div className="text-title1 break-words text-label">{p.name}</div>
            <p className="flex min-w-0 items-center gap-1.5 text-subheadline text-label-secondary">
              <span className="size-2 shrink-0 rounded-full" style={{ background: typeColor(type?.color) }} aria-hidden="true" />
              <span className="min-w-0">
                {type?.name}
                {city && ` · ${country?.flag ? country.flag + " " : ""}${city.name}${country ? `, ${country.name}` : ""}`}
              </span>
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1.5">
              <StatusBadge status={p.status} />
              {isOwner && <Tag tone="tint">Sizin mülkünüz</Tag>}
            </div>
          </div>
          {p.description && (
            <p className="max-w-prose px-1 text-body whitespace-pre-line text-label">{p.description}</p>
          )}
        </section>

        <aside className="grid min-w-0 content-start gap-8 lg:sticky lg:top-16 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          {isOwner ? (
            <>
              <ListingForm key={`${p.status}-${p.rent_price}-${p.sale_price}`} property={p} onDone={refresh} />
              <BuildPanel property={p} catalog={cat} onDone={refresh} />
            </>
          ) : (
            <VisitorActions property={p} myRental={myRental} onDone={refresh} />
          )}
        </aside>

        <div className="grid min-w-0 content-start gap-8 lg:col-start-1 lg:row-start-2">
          {isOwner && <OffersPanel offers={offers} onDone={refresh} />}
          <Section header="Bilgiler">
            <Row title="Kiracı" detail={<span className="tabular-nums">{p.tenant_count}/{p.tenant_limit}</span>} />
            {!!p.area_m2 && <Row title="Alan" detail={<span className="tabular-nums">{num(p.area_m2)} m²</span>} />}
            {!!p.rooms && <Row title="Oda" detail={<span className="tabular-nums">{p.rooms}</span>} />}
            {isOwner && <Row title="Toplam yatırım" detail={<Money value={p.invested} />} />}
            {owner && config?.features.public_profiles && !isOwner ? (
              <Row href={`/users/${owner.id}`} title="Sahibi" detail={ownerName} />
            ) : (
              <Row title="Sahibi" detail={ownerName} />
            )}
            <Row title="Kayıt tarihi" detail={date(p.created)} />
          </Section>

          {features.length > 0 && (
            <Section header="Özellikler" plain>
              <ul className="flex flex-wrap gap-2" aria-label="Özellikler">
                {features.map((f) => (
                  <li key={f.id}>
                    <Tag className="h-7 px-3 text-footnote">{f.name}</Tag>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {isOwner && (p.tenant_limit > 0 || tenants.length > 0) && <TenantsPanel rentals={tenants} />}
          {isOwner && <IncomePanel transactions={income} />}
          <UpgradesPanel property={p} catalog={cat} applied={applied} isOwner={isOwner} onDone={refresh} />
        </div>
      </div>

      {isOwner && (
        <EditDetails property={p} catalog={cat} open={editing} onOpenChange={setEditing} onDone={refresh} />
      )}
    </>
  )
}
