import { cn } from "@/lib/utils"

// iOS etkinlik göstergesi (UIActivityIndicatorView): sekiz çubuk, adım adım döner.
// `progress` verilirse (0–1) dönmez; çubuklar çekme miktarıyla tek tek belirir (UIRefreshControl).
// https://developer.apple.com/design/human-interface-guidelines/progress-indicators
const BARS = Array.from({ length: 8 }, (_, i) => i)

export function Spinner({
  className,
  label = "Yükleniyor",
  progress,
}: {
  className?: string
  label?: string
  progress?: number
}) {
  const visible = progress === undefined ? 8 : Math.ceil(Math.min(1, Math.max(0, progress)) * 8)
  return (
    <svg
      viewBox="0 0 24 24"
      role="status"
      aria-label={label}
      className={cn("size-5 shrink-0", progress === undefined && "animate-[spin_0.8s_steps(8)_infinite]", className)}
    >
      {BARS.map((i) => (
        <rect
          key={i}
          x="11"
          y="2"
          width="2.2"
          height="6"
          rx="1.1"
          fill="currentColor"
          opacity={i < visible ? (progress === undefined ? 1 - i * 0.11 : 0.85) : 0}
          transform={`rotate(${progress === undefined ? -i * 45 : i * 45} 12 12)`}
        />
      ))}
    </svg>
  )
}
