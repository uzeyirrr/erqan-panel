import { Buildings, House, HouseLine, TreeEvergreen, TreePalm } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

// Mülk tipi renkleri iOS sistem renkleridir; açık/koyu görünüme kendiliğinden uyar.
// Admin hazır bir renk anahtarı seçer (emerald, blue, violet, amber ...) veya #hex verir.
const SYSTEM_BY_KEY: Record<string, string> = {
  emerald: "green",
  green: "green",
  mint: "mint",
  teal: "teal",
  cyan: "cyan",
  blue: "blue",
  indigo: "indigo",
  violet: "indigo",
  purple: "purple",
  pink: "pink",
  red: "red",
  amber: "orange",
  orange: "orange",
  yellow: "yellow",
  brown: "brown",
  gray: "gray",
}

/** Tipin vurgu rengi (nokta, ikon, kutucuk). */
export function typeColor(color: string | undefined): string {
  const system = color ? SYSTEM_BY_KEY[color] : undefined
  if (system) return `var(--system-${system})`
  if (color && /^#|^rgb|^hsl|^oklch/.test(color)) return color
  return "var(--system-gray)"
}

const ICONS: Record<string, React.ComponentType<{ className?: string; weight?: "fill" | "regular" }>> = {
  land: TreeEvergreen,
  home: House,
  home_premium: HouseLine,
  villa: TreePalm,
}

export function typeIcon(typeKey: string | undefined) {
  return (typeKey && ICONS[typeKey]) || Buildings
}

/**
 * Görseli olmayan mülk için yer tutucu: tip renginde yumuşak bir degrade üzerinde beyaz,
 * dolu tip simgesi (iOS uygulama simgesi / Ayarlar kutucuğu dili).
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
  const Icon = (typeKey && ICONS[typeKey]) || Buildings
  const c = typeColor(color)
  return (
    <div
      role="img"
      aria-hidden="true"
      className={cn("flex items-center justify-center text-white", className)}
      style={{
        background: `linear-gradient(160deg, color-mix(in oklab, ${c}, white 28%) 0%, ${c} 55%, color-mix(in oklab, ${c}, black 18%) 100%)`,
      }}
    >
      <Icon weight="fill" className="size-1/3 max-h-20 max-w-20 min-h-6 min-w-6 drop-shadow-[0_2px_6px_rgb(0_0_0/0.18)]" />
    </div>
  )
}
