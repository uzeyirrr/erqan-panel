import { HouseLine } from "@phosphor-icons/react/ssr"
import { cn } from "@/lib/utils"

/** Uygulama simgesi: vurgu renginde degrade üzerinde beyaz ev simgesi (iOS simge dili). */
export function AppIcon({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex items-center justify-center rounded-[22.5%] bg-tint text-white shadow-[0_8px_24px_rgb(0_0_0/0.14)]",
        className,
      )}
      style={{
        backgroundImage:
          "radial-gradient(120% 90% at 20% 0%, rgb(255 255 255 / 0.35), transparent 60%), linear-gradient(170deg, transparent 40%, rgb(0 0 0 / 0.2))",
      }}
    >
      <HouseLine weight="fill" className="size-[55%]" />
    </span>
  )
}
