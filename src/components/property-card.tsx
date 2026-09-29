"use client"

import Link from "next/link"
import { Users } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { fileUrl } from "@/lib/pb"
import { STATUS_LABEL } from "@/lib/format"
import type { Property, PropertyStatus } from "@/lib/types"
import { Parcel, typeColor } from "@/components/parcel"
import { Money } from "@/components/kit"

/** Görsel üzerindeki durum kapsülünün noktası (StatusBadge ile aynı renkler). */
const STATUS_DOT: Record<PropertyStatus, string> = {
  empty: "var(--system-gray)",
  rent: "var(--tint)",
  rented: "var(--system-green)",
  sale: "var(--system-orange)",
  building: "var(--system-indigo)",
}

/** Mülk görseli: yüklenmiş fotoğraf yoksa tip renginde yer tutucu. */
export function PropertyVisual({ property, className }: { property: Property; className?: string }) {
  const img = fileUrl(property, property.image, "400x300")
  const type = property.expand?.type
  if (img) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={img} alt="" className={cn("object-cover", className)} />
  }
  return <Parcel id={property.id} typeKey={type?.key} color={type?.color} className={className} />
}

/** İlan ve portföy listelerinde kullanılan mülk kartı (App Store / Haritalar kart dili). */
export function PropertyCard({
  property,
  price,
  footer,
  className,
}: {
  property: Property
  /** Kartta vurgulanacak fiyat (kira veya satış) */
  price?: { label: string; value: number }
  footer?: React.ReactNode
  className?: string
}) {
  const type = property.expand?.type
  const city = property.expand?.city
  const country = city?.expand?.country
  return (
    <article className={cn("flex flex-col overflow-hidden rounded-card bg-grouped-secondary shadow-card", className)}>
      <Link
        href={`/properties/${property.id}`}
        className="press-scale block rounded-card outline-none focus-visible:outline-2 focus-visible:-outline-offset-2"
      >
        <div className="relative m-1.5 mb-0 aspect-[16/10] overflow-hidden rounded-[14px] bg-fill-tertiary">
          <PropertyVisual property={property} className="size-full" />
          <span className="glass-thick absolute top-2.5 left-2.5 inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-caption1 font-semibold text-label">
            <span className="size-2 rounded-full" style={{ background: STATUS_DOT[property.status] }} aria-hidden="true" />
            {STATUS_LABEL[property.status]}
          </span>
        </div>
        <div className="grid gap-0.5 px-4 pt-3 pb-4">
          <div className="flex items-center gap-1.5 text-footnote text-label-secondary">
            <span className="size-2 shrink-0 rounded-full" style={{ background: typeColor(type?.color) }} aria-hidden="true" />
            <span className="truncate">
              {type?.name}
              {city && ` · ${country?.flag ? country.flag + " " : ""}${city.name}`}
            </span>
          </div>
          <h3 className="truncate text-headline text-label">{property.name}</h3>
          <div className="mt-1.5 flex items-end justify-between gap-2">
            {price ? (
              <div className="min-w-0">
                <div className="text-caption1 text-label-secondary">{price.label}</div>
                <Money value={price.value} className="text-title3 text-label" />
              </div>
            ) : (
              <span />
            )}
            <span className="flex items-center gap-1 text-footnote text-label-secondary" title="Kiracı / kapasite">
              <Users weight="fill" className="size-3.5" />
              <span className="tabular-nums">
                {property.tenant_count}/{property.tenant_limit}
              </span>
            </span>
          </div>
        </div>
      </Link>
      {footer && <div className="mt-auto border-t border-separator p-3">{footer}</div>}
    </article>
  )
}
