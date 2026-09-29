import { cn } from "@/lib/utils"

// Erqan marka öğeleri. EQ monogramı erqan.com logosundan ölçülerek vektörel çizildi
// (322 birimlik kare; PNG simgeler scripts/pwa-assets.py ile aynı ölçülerden üretilir).

/** EQ monogramı; rengi `currentColor`. */
export function ErqanMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 322 322" fill="currentColor" aria-hidden="true" className={className}>
      {/* Halka: ortadaki dikey boşlukla sol (E) ve sağ (Q) yarılar */}
      <path d="M150.5 0.31A160.5 160.5 0 0 0 150.5 320.69V281.09A121 121 0 0 1 150.5 39.91Z" />
      <path d="M170.5 0.31A160.5 160.5 0 0 1 170.5 320.69V281.09A121 121 0 0 0 170.5 39.91Z" />
      {/* E'nin orta çubuğu ve Q'nun kuyruğu */}
      <rect x="30" y="143" width="97.5" height="37" />
      <path d="M220.5 221.5L321 322H269L194.5 247.5Z" />
    </svg>
  )
}

/**
 * Uygulama simgesi: marka renginde (tint) yumuşak degrade üzerinde beyaz monogram.
 * Admin marka rengini değiştirirse simge de o renge uyar.
 */
export function AppIcon({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-[22.5%] bg-tint text-white shadow-[0_8px_24px_rgb(0_0_0/0.14)]",
        className,
      )}
      style={{
        backgroundImage:
          "radial-gradient(120% 90% at 20% 0%, rgb(255 255 255 / 0.28), transparent 60%), linear-gradient(170deg, transparent 40%, rgb(0 0 0 / 0.18))",
      }}
    >
      <ErqanMark className="size-[56%] drop-shadow-[0_2px_4px_rgb(0_30_60/0.25)]" />
    </span>
  )
}
