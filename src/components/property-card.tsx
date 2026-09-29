"use client"

import Link from "next/link"
import { Users } from "lucide-react"
import { cn } from "@/lib/utils"
import { fileUrl } from "@/lib/pb"
import type { Property } from "@/lib/types"
import { Parcel, typeColor } from "@/components/parcel"
import { Money, StatusBadge } from "@/components/kit"

/** Mülk görseli: yüklenmiş fotoğraf yoksa parsel çizimi. */
export function PropertyVisual({ property, className }: { property: Property; className?: string }) {
  const img = fileUrl(property, property.image, "400x300")
  const type = property.expand?.type
  if (img) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={img} alt="" className={cn("object-cover", className)} />
  }
  return <Parcel id={property.id} typeKey={type?.key} color={type?.color} className={className} />
}

/** İlan ve portföy listelerinde kullanılan mülk kartı. */
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
    <article className={cn("group flex flex-col overflow-hidden rounded-xl border border-outline-variant bg-card", className)}>
      <Link href={`/properties/${property.id}`} className="block outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
        <div className="relative aspect-[4/3] bg-background">
          <PropertyVisual property={property} className="size-full" />
          <StatusBadge status={property.status} className="absolute top-3 left-3 shadow-e1" />
        </div>
        <div className="grid gap-1 border-t p-3">
          <div className="flex items-center gap-2 type-body-small text-muted-foreground">
            <span className="size-2 rounded-full" style={{ background: typeColor(type?.color) }} aria-hidden="true" />
            <span>{type?.name}</span>
            {city && (
              <span className="truncate">
                {country?.flag} {city.name}
              </span>
            )}
          </div>
          <h3 className="truncate type-title-medium group-hover:underline">{property.name}</h3>
          <div className="flex items-end justify-between gap-2">
            {price ? (
              <div>
                <div className="type-body-small text-muted-foreground">{price.label}</div>
                <Money value={price.value} className="type-title-large" />
              </div>
            ) : (
              <span />
            )}
            <span className="flex items-center gap-1 type-body-small text-muted-foreground" title="Kiracı / kapasite">
              <Users className="size-3.5" />
              <span className="figure">
                {property.tenant_count}/{property.tenant_limit}
              </span>
            </span>
          </div>
        </div>
      </Link>
      {footer && <div className="mt-auto border-t p-3">{footer}</div>}
    </article>
  )
}
