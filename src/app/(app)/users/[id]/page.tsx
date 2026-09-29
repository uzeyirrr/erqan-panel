"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { Building2, UserX } from "lucide-react"
import { api, fileUrl } from "@/lib/pb"
import { loadCatalog } from "@/lib/catalog"
import { date, num } from "@/lib/format"
import { useLoad } from "@/hooks/use-data"
import { useApp } from "@/components/app-provider"
import { PropertyVisual } from "@/components/property-card"
import type { Property } from "@/lib/types"
import { EmptyState, ErrorState, Loading, Money, Stat, StatusBadge } from "@/components/kit"

export default function PublicProfilePage() {
  const { id } = useParams<{ id: string }>()
  const { config, user } = useApp()
  const enabled = config?.features.public_profiles !== false
  const profile = useLoad(() => api.publicProfile(id), [id], enabled && !!id)
  const catalog = useLoad(() => loadCatalog(), [])

  if (!enabled) {
    return (
      <EmptyState
        icon={<UserX className="size-6" />}
        title="Profiller şu anda kapalı"
        description="Kullanıcı profilleri yönetici tarafından geçici olarak kapatıldı."
      />
    )
  }
  if (profile.error) return <ErrorState message={profile.error} onRetry={profile.reload} />
  if (!profile.data) return <Loading />

  const { user: u, stats, properties } = profile.data
  const avatar = fileUrl({ id: u.id, collectionId: u.collectionId }, u.avatar, "100x100")
  const typeByName = Object.fromEntries((catalog.data?.types || []).map((t) => [t.name, t]))
  const isMe = user?.id === u.id

  return (
    <>
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <span className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary type-headline-small text-primary-foreground">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="" className="size-full object-cover" />
          ) : (
            initials(u.name)
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate type-headline-small">{u.name || "İsimsiz kullanıcı"}</h1>
          <p className="mt-1 type-body-medium text-muted-foreground">{date(u.created)} tarihinden beri üye</p>
        </div>
        {isMe && (
          <Link href="/account" className="type-title-small text-primary hover:underline">
            Profilimi düzenle
          </Link>
        )}
      </header>

      <section className="mb-6 grid grid-cols-2 gap-5 rounded-xl border bg-card p-5 sm:grid-cols-4">
        <Stat label="İtibar" value={num(u.reputation)} hint="puan" />
        <Stat label="Mülk" value={num(stats.properties)} />
        <Stat label="Kiralık / satılık" value={`${num(stats.for_rent)} / ${num(stats.for_sale)}`} />
        <Stat label="Kiracı" value={num(stats.tenants)} />
      </section>

      <h2 className="mb-3 type-title-large">Mülkleri</h2>
      {properties.length === 0 ? (
        <EmptyState icon={<Building2 className="size-6" />} title="Henüz mülkü yok" />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((p) => {
            const type = typeByName[p.type]
            const price =
              p.status === "sale" ? { label: "Satış fiyatı", value: p.sale_price } : p.status === "rent" || p.status === "rented" ? { label: "Kira", value: p.rent_price } : null
            return (
              <li key={p.id}>
                <Link
                  href={`/properties/${p.id}`}
                  className="flex items-center gap-3 rounded-xl border bg-card p-3 outline-none hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <PropertyVisual
                    property={{ id: p.id, collectionName: "properties", image: p.image, expand: { type } } as unknown as Property}
                    className="size-16 shrink-0 overflow-hidden rounded-lg border bg-background"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate type-body-small text-muted-foreground">
                      {p.type}, {p.city}
                    </div>
                    <div className="truncate font-medium">{p.name}</div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <StatusBadge status={p.status} />
                      {price && price.value > 0 && <Money value={price.value} className="type-title-small" />}
                    </div>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}

function initials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toLocaleUpperCase("tr-TR"))
      .join("") || "?"
  )
}
