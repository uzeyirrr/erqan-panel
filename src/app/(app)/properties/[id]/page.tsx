"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { MapPin } from "lucide-react"
import { pb } from "@/lib/pb"
import { date, num } from "@/lib/format"
import { PROPERTY_EXPAND, loadCatalog } from "@/lib/catalog"
import type { Offer, Property, PropertyUpgrade, Rental, Transaction } from "@/lib/types"
import { useLoad } from "@/hooks/use-data"
import { useApp } from "@/components/app-provider"
import { PropertyVisual } from "@/components/property-card"
import { EmptyState, ErrorState, Loading, Money, StatusBadge, Tag } from "@/components/kit"
import { buttonVariants } from "@/components/ui/button"
import {
  BuildPanel,
  EditDetails,
  Facts,
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
    return detail.error.includes("wasn't found") || detail.error.includes("bulunamadı") ? (
      <EmptyState
        title="Mülk bulunamadı"
        description="Bu mülk silinmiş veya bağlantı hatalı olabilir."
        action={
          <Link href="/listings" className={buttonVariants({ variant: "outline" })}>
            İlanlara dön
          </Link>
        }
      />
    ) : (
      <ErrorState message={detail.error} onRetry={detail.reload} />
    )
  }
  if (!detail.data || !catalog.data) return <Loading />

  const { property: p, applied, myRental, tenants, offers, income } = detail.data
  const cat = catalog.data
  const type = p.expand?.type
  const city = p.expand?.city
  const country = city?.expand?.country
  const owner = p.expand?.owner
  const isOwner = p.owner === user?.id
  const features = p.expand?.features || []
  // Ziyaretçi için sol sütunda yalnızca uygulanmış yükseltmeler olabilir.
  const hasMain = isOwner || applied.length > 0

  return (
    <div className="grid gap-6">
      <header className="grid gap-5 overflow-hidden rounded-xl border bg-card md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="aspect-[4/3] border-b bg-background md:aspect-auto md:min-h-72 md:border-r md:border-b-0">
          <PropertyVisual property={p} className="size-full" />
        </div>
        <div className="flex min-w-0 flex-col gap-4 p-5 md:pl-0">
          <div className="flex flex-wrap items-center gap-2 type-body-medium text-muted-foreground">
            <span>{type?.name}</span>
            <StatusBadge status={p.status} />
            {isOwner && <Tag className="bg-primary/10 text-primary">Sizin mülkünüz</Tag>}
          </div>
          <h1 className="type-headline-medium break-words sm:text-4xl">{p.name}</h1>
          {city && (
            <p className="flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="size-4" />
              {country?.flag} {city.name}
              {country ? `, ${country.name}` : ""}
            </p>
          )}
          {p.description && <p className="max-w-prose type-body-medium whitespace-pre-line">{p.description}</p>}
          <Facts
            items={[
              ["Kiracı", `${p.tenant_count}/${p.tenant_limit}`],
              ...(p.area_m2 ? ([["Alan", `${num(p.area_m2)} m²`]] as [string, string][]) : []),
              ...(p.rooms ? ([["Oda", String(p.rooms)]] as [string, string][]) : []),
              ...(isOwner ? ([["Toplam yatırım", <Money key="inv" value={p.invested} />]] as [string, React.ReactNode][]) : []),
              ["Sahibi", owner ? (
                config?.features.public_profiles && !isOwner ? (
                  <Link key="owner" href={`/users/${owner.id}`} className="text-primary hover:underline">
                    {owner.name || "Kullanıcı"}
                  </Link>
                ) : (
                  owner.name || "Kullanıcı"
                )
              ) : "Bilinmiyor"],
              ["Kayıt tarihi", date(p.created)],
            ]}
          />
          {features.length > 0 && (
            <ul className="flex flex-wrap gap-1.5" aria-label="Özellikler">
              {features.map((f) => (
                <li key={f.id}>
                  <Tag>{f.name}</Tag>
                </li>
              ))}
            </ul>
          )}
          {isOwner && (
            <div className="mt-auto pt-1">
              <EditDetails property={p} catalog={cat} onDone={refresh} />
            </div>
          )}
        </div>
      </header>

      <div className={hasMain ? "grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]" : "grid gap-6 md:max-w-md"}>
        <div className={hasMain ? "grid min-w-0 content-start gap-6" : "hidden"}>
          {isOwner && <OffersPanel offers={offers} onDone={refresh} />}
          {isOwner && (p.tenant_limit > 0 || tenants.length > 0) && <TenantsPanel rentals={tenants} />}
          {isOwner && <IncomePanel transactions={income} />}
          <UpgradesPanel property={p} catalog={cat} applied={applied} isOwner={isOwner} onDone={refresh} />
        </div>
        <aside className="order-first grid min-w-0 content-start gap-6 lg:sticky lg:top-6 lg:order-none lg:self-start">
          {isOwner ? (
            <>
              <ListingForm key={`${p.status}-${p.rent_price}-${p.sale_price}`} property={p} onDone={refresh} />
              <BuildPanel property={p} catalog={cat} onDone={refresh} />
            </>
          ) : (
            <VisitorActions property={p} myRental={myRental} onDone={refresh} />
          )}
        </aside>
      </div>
    </div>
  )
}
