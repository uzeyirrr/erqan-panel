"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { Buildings, Star, Tag as TagIcon, UserCircleMinus, Users } from "@phosphor-icons/react"
import { api, fileUrl } from "@/lib/pb"
import { loadCatalog } from "@/lib/catalog"
import { date, num } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useLoad } from "@/hooks/use-data"
import { useApp } from "@/components/app-provider"
import { PropertyVisual } from "@/components/property-card"
import type { Property } from "@/lib/types"
import { Avatar, EmptyState, ErrorState, Loading, Money, PageHeader, Row, Section, StatusBadge } from "@/components/kit"
import { buttonVariants } from "@/components/ui/button"

export default function PublicProfilePage() {
  const { id } = useParams<{ id: string }>()
  const { config, user } = useApp()
  const enabled = config?.features.public_profiles !== false
  const profile = useLoad(() => api.publicProfile(id), [id], enabled && !!id)
  const catalog = useLoad(() => loadCatalog(), [])

  if (!enabled) {
    return (
      <>
        <PageHeader title="Profil" largeTitle={false} />
        <EmptyState
          icon={<UserCircleMinus weight="fill" />}
          title="Profiller şu anda kapalı"
          description="Kullanıcı profilleri yönetici tarafından geçici olarak kapatıldı."
        />
      </>
    )
  }
  if (profile.error) {
    return (
      <>
        <PageHeader title="Profil" largeTitle={false} />
        <ErrorState message={profile.error} onRetry={profile.reload} />
      </>
    )
  }
  if (!profile.data) {
    return (
      <>
        <PageHeader title="" largeTitle={false} />
        <Loading />
      </>
    )
  }

  const { user: u, stats, properties } = profile.data
  const name = u.name || "İsimsiz kullanıcı"
  const avatar = fileUrl({ id: u.id, collectionId: u.collectionId }, u.avatar, "100x100")
  const typeByName = Object.fromEntries((catalog.data?.types || []).map((t) => [t.name, t]))
  const isMe = user?.id === u.id

  return (
    <>
      <PageHeader
        title={name}
        largeTitle={false}
        actions={
          isMe && (
            <Link href="/account" className={buttonVariants({ variant: "glass", size: "sm", className: "h-11 px-4" })}>
              Düzenle
            </Link>
          )
        }
      />

      {/* Kişiler uygulaması tarzı başlık: ortada büyük avatar, ad ve üyelik tarihi. */}
      <header className="flex flex-col items-center px-4 pt-2 pb-8 text-center">
        <ProfileAvatar name={name} src={avatar} className="size-24 text-large-title" />
        <div className="mt-3 max-w-full text-title1 break-words text-label">{name}</div>
        <p className="mt-1 text-subheadline text-label-secondary">{date(u.created)} tarihinden beri üye</p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[340px_minmax(0,1fr)] lg:items-start">
        <Section header="Özet">
          <Row icon={Star} iconColor="yellow" title="İtibar" detail={<span className="tabular-nums">{num(u.reputation)} puan</span>} />
          <Row icon={Buildings} iconColor="indigo" title="Mülk" detail={<span className="tabular-nums">{num(stats.properties)}</span>} />
          <Row
            icon={TagIcon}
            iconColor="orange"
            title="Kiralık / satılık"
            detail={
              <span className="tabular-nums">
                {num(stats.for_rent)} / {num(stats.for_sale)}
              </span>
            }
          />
          <Row icon={Users} iconColor="green" title="Kiracı" detail={<span className="tabular-nums">{num(stats.tenants)}</span>} />
        </Section>

        <Section header="Mülkleri">
          {properties.length === 0 ? (
            <li>
              <EmptyState icon={<Buildings weight="fill" />} title="Henüz mülkü yok" className="py-10" />
            </li>
          ) : (
            properties.map((p) => {
              const type = typeByName[p.type]
              const price =
                p.status === "sale"
                  ? { label: "Satış fiyatı", value: p.sale_price }
                  : p.status === "rent" || p.status === "rented"
                    ? { label: "Kira", value: p.rent_price }
                    : null
              return (
                <Row
                  key={p.id}
                  href={`/properties/${p.id}`}
                  leading={
                    <PropertyVisual
                      property={{ id: p.id, collectionName: "properties", image: p.image, expand: { type } } as unknown as Property}
                      className="size-14 shrink-0 overflow-hidden rounded-[12px]"
                    />
                  }
                  className="py-1"
                >
                  <span className="block truncate text-headline text-label">{p.name}</span>
                  <span className="block truncate text-subheadline text-label-secondary">
                    {p.type} · {p.city}
                  </span>
                  <span className="mt-1 flex items-center gap-2">
                    <StatusBadge status={p.status} />
                    {price && price.value > 0 && (
                      <span className="min-w-0 truncate text-subheadline text-label-secondary">
                        <span className="sr-only">{price.label}: </span>
                        <Money value={price.value} className="font-semibold text-label" />
                      </span>
                    )}
                  </span>
                </Row>
              )
            })
          )}
        </Section>
      </div>
    </>
  )
}

/** Profil fotoğrafı; yoksa baş harfli gri avatar. */
function ProfileAvatar({ name, src, className }: { name: string; src?: string; className?: string }) {
  if (!src) return <Avatar name={name} className={className} />
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className={cn("shrink-0 rounded-full bg-fill-tertiary object-cover", className)} />
  )
}
