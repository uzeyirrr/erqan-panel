import { Building2, Castle, House, HousePlus, LandPlot } from "lucide-react"
import { cn } from "@/lib/utils"

// Mülk tipi renkleri Material 3 "custom color" rolleridir (src/lib/m3-theme.ts, ana renkle harmonize).
type Role = "land" | "home" | "premium" | "villa"

const ROLE_BY_COLOR: Record<string, Role> = {
  emerald: "land",
  green: "land",
  blue: "home",
  violet: "premium",
  purple: "premium",
  amber: "villa",
  orange: "villa",
}

function roleOf(color: string | undefined): Role | null {
  return color ? ROLE_BY_COLOR[color] || null : null
}

/** Tipin vurgu rengi (nokta, ikon). Admin özel hex verdiyse o kullanılır. */
export function typeColor(color: string | undefined): string {
  const role = roleOf(color)
  if (role) return `var(--md-custom-${role})`
  if (color && /^#|^rgb|^hsl|^oklch/.test(color)) return color
  return "var(--md-sys-color-on-surface-variant)"
}

/** Tipin tonal konteyner renkleri (zemin + üzerindeki içerik). */
export function typeContainer(color: string | undefined): { background: string; color: string } {
  const role = roleOf(color)
  if (role) return { background: `var(--md-custom-${role}-container)`, color: `var(--md-custom-on-${role}-container)` }
  if (color && /^#/.test(color)) return { background: `color-mix(in srgb, ${color} 18%, var(--md-sys-color-surface))`, color }
  return {
    background: "var(--md-sys-color-surface-container-highest)",
    color: "var(--md-sys-color-on-surface-variant)",
  }
}

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  land: LandPlot,
  home: House,
  home_premium: HousePlus,
  villa: Castle,
}

/**
 * Görseli olmayan mülk için Material 3 yer tutucusu: tipin tonal konteyneri üzerinde tip ikonu.
 * (Eski parsel çiziminin API'si korunur; `id` ve `grid` artık kullanılmaz.)
 */
export function Parcel({
  typeKey,
  color,
  className,
}: {
  id?: string
  typeKey?: string
  color?: string
  className?: string
  grid?: boolean
}) {
  const Icon = (typeKey && ICONS[typeKey]) || Building2
  return (
    <div
      role="img"
      aria-hidden="true"
      className={cn("flex items-center justify-center", className)}
      style={typeContainer(color)}
    >
      <Icon className="size-1/4 max-h-16 max-w-16 min-h-6 min-w-6 opacity-90" />
    </div>
  )
}
