"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { CaretLeft, CaretRight, CaretUpDown, MagnifyingGlass, WarningCircle, XCircle } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { STATUS_LABEL, money } from "@/lib/format"
import type { PropertyStatus } from "@/lib/types"
import { useApp } from "@/components/app-provider"
import { isTabRoot, navStack, parentOf } from "@/components/nav"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/dialog"

// Uygulama genelinde iOS kalıpları: büyük başlıklı gezinme çubuğu, gruplu (inset grouped)
// listeler, ayarlar tarzı simge kutucukları, durum kapsülleri, içerik yok görünümü ve uyarılar.
// https://developer.apple.com/design/human-interface-guidelines/lists-and-tables

type IconType = React.ComponentType<{ className?: string; weight?: "regular" | "bold" | "fill" }>

// ------------------------------------------------------------------ gezinme çubuğu

/**
 * iOS gezinme çubuğu + büyük başlık. Büyük başlık kaydırılıp çubuğun altına girince
 * çubukta küçük başlık belirir ve içerik "kaydırma kenarı" efektiyle bulanıklaşır.
 * Sekme kökü olmayan sayfalarda solda geri düğmesi (Liquid Glass daire) gösterilir.
 * `actions` sağ üstte Liquid Glass düğmeler olarak durur.
 */
export function PageHeader({
  title,
  description,
  actions,
  back,
  className,
  largeTitle = true,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  /** Geri düğmesi: varsayılan olarak sekme kökü değilse gösterilir; string ise gidilecek adres. */
  back?: boolean | string
  className?: string
  /** false: büyük başlık yerine yalnızca çubukta küçük başlık (detay sayfaları) */
  largeTitle?: boolean
}) {
  const pathname = usePathname()
  const router = useRouter()
  const sentinel = useRef<HTMLDivElement>(null)
  const [collapsed, setCollapsed] = useState(!largeTitle)
  const showBack = back === undefined ? !isTabRoot(pathname) : !!back

  useEffect(() => {
    const el = sentinel.current
    if (!el || !largeTitle) return
    const io = new IntersectionObserver(([entry]) => setCollapsed(!entry.isIntersecting), {
      rootMargin: "-52px 0px 0px 0px",
    })
    io.observe(el)
    return () => io.disconnect()
  }, [largeTitle])

  // Kaydırma kenarı efekti için ayrı dinleyici: sayfa en üstteyken çubuk tamamen şeffaftır.
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 2)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  function goBack() {
    if (typeof back === "string") return router.push(back)
    // Uygulama içinden gelindiyse geri git; doğrudan açıldıysa üst sayfaya.
    if (navStack.depth > 0) router.back()
    else router.push(parentOf(pathname))
  }

  return (
    <>
      <div
        data-slot="nav-bar"
        className="sticky top-0 z-30 -mx-4 pt-safe sm:-mx-6 lg:-mx-8"
      >
        <div
          aria-hidden="true"
          className={cn(
            "scroll-edge-top pointer-events-none absolute inset-x-0 top-0 -bottom-4 transition-opacity duration-300",
            scrolled ? "opacity-100" : "opacity-0",
          )}
        />
        <div className="relative flex h-[52px] items-center gap-2 px-4 sm:px-6 lg:px-8">
          {showBack && (
            <Button variant="glass" size="icon" aria-label="Geri" onClick={goBack}>
              <CaretLeft weight="bold" className="size-5" />
            </Button>
          )}
          {/* Küçük başlık: solda, Liquid Glass kapsül içinde; büyük başlık kaydırılınca belirir. */}
          <div
            className={cn(
              "glass flex h-11 min-w-0 items-center rounded-full px-4 transition-[opacity,scale] duration-200 ease-ios",
              collapsed ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0",
            )}
            aria-hidden={largeTitle}
          >
            <span className="truncate text-headline text-label">{title}</span>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2">{actions}</div>
        </div>
      </div>
      {largeTitle ? (
        <header className={cn("mb-5 pt-1", className)}>
          <div ref={sentinel} />
          <h1 className="px-1 text-large-title text-label break-words">{title}</h1>
          {description && <p className="mt-1 max-w-prose px-1 text-subheadline text-label-secondary">{description}</p>}
        </header>
      ) : (
        <h1 className="sr-only">{title}</h1>
      )}
    </>
  )
}

/** Gezinme çubuğundaki Liquid Glass düğme grubu (birden çok simge tek kapsülde). */
export function BarGroup({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("glass flex h-11 items-center rounded-full px-1", className)}>{children}</div>
}

/** Gezinme çubuğu simge düğmesi (BarGroup içinde veya tek başına). */
export function BarButton({
  label,
  icon: Icon,
  href,
  onClick,
  badge,
  standalone,
}: {
  label: string
  icon: IconType
  href?: string
  onClick?: () => void
  badge?: number
  /** Grup dışında tek başına: kendi Liquid Glass dairesi olur. */
  standalone?: boolean
}) {
  const cls = cn(
    "relative flex size-9 items-center justify-center rounded-full text-label outline-none press-dim focus-visible:outline-2",
    standalone && "glass size-11",
  )
  const content = (
    <>
      <Icon className="size-[22px]" />
      {!!badge && (
        <span className="absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-system-red px-1 text-caption2 font-semibold text-white tabular-nums">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </>
  )
  const aria = badge ? `${label}, ${badge} yeni` : label
  if (href)
    return (
      <Link href={href} aria-label={aria} className={cls}>
        {content}
      </Link>
    )
  return (
    <button type="button" aria-label={aria} onClick={onClick} className={cls}>
      {content}
    </button>
  )
}

// ------------------------------------------------------------------ gruplu liste

/**
 * Gruplu (inset grouped) bölüm: başlık, beyaz kart ve açıklama notu.
 * Varsayılan olarak içindeki `Row`'lar bir liste oluşturur; `plain` ile serbest içerik alır.
 */
export function Section({
  header,
  footer,
  actions,
  children,
  plain,
  className,
  bodyClassName,
}: {
  header?: React.ReactNode
  footer?: React.ReactNode
  /** Başlık satırının sağında küçük bağlantı/düğme ("Tümü" gibi) */
  actions?: React.ReactNode
  children: React.ReactNode
  plain?: boolean
  className?: string
  bodyClassName?: string
}) {
  return (
    <section className={cn("min-w-0", className)}>
      {(header || actions) && (
        <div className="mb-1.5 flex min-h-6 items-end justify-between gap-3 px-4">
          {header && <h2 className="text-footnote font-semibold tracking-wide text-label-secondary uppercase">{header}</h2>}
          {actions && <div className="text-subheadline">{actions}</div>}
        </div>
      )}
      {plain ? (
        <div className={cn("overflow-hidden rounded-section bg-grouped-secondary p-4", bodyClassName)}>{children}</div>
      ) : (
        // Üst ve alttaki boşluk, ilk/son satırın içeriğini yuvarlak köşelerden uzak tutar.
        <ul className={cn("overflow-hidden rounded-section bg-grouped-secondary py-2.5", bodyClassName)}>{children}</ul>
      )}
      {footer && <div className="mt-1.5 px-4 text-footnote text-label-secondary">{footer}</div>}
    </section>
  )
}

/**
 * Liste satırı. `href` ya da `onClick` verilirse dokunulabilir olur (basınca gri vurgu, sağda
 * ok). Satır ayırıcısı metnin başladığı yerden başlar (iOS'taki gibi).
 */
export function Row({
  href,
  onClick,
  icon,
  iconColor,
  leading,
  title,
  subtitle,
  detail,
  accessory,
  destructive,
  disabled,
  className,
  children,
}: {
  href?: string
  onClick?: () => void
  icon?: IconType
  /** Ayarlar kutucuğu rengi: iOS sistem rengi adı ("blue", "green" ...) veya CSS rengi */
  iconColor?: string
  /** Simge yerine özel öncü öğe (küçük görsel, avatar) */
  leading?: React.ReactNode
  title?: React.ReactNode
  subtitle?: React.ReactNode
  /** Sağda ikincil değer */
  detail?: React.ReactNode
  /** Sağdaki öğe; varsayılan: dokunulabilir satırda ok */
  accessory?: React.ReactNode | "chevron" | "none"
  destructive?: boolean
  disabled?: boolean
  className?: string
  children?: React.ReactNode
}) {
  const interactive = !!(href || onClick) && !disabled
  const lead = leading ?? (icon ? <IconTile icon={icon} color={iconColor} /> : null)
  const acc =
    accessory === "none" ? null : accessory === "chevron" || (accessory === undefined && interactive && href) ? (
      <CaretRight weight="bold" className="size-3.5 shrink-0 text-label-tertiary" />
    ) : (
      accessory
    )

  const body = (
    <>
      {lead}
      <span className="relative flex min-w-0 flex-1 items-center gap-3 self-stretch py-[11px] after:hairline after:absolute after:bottom-0 after:left-0 after:-right-4 after:bg-separator group-last/row:after:hidden">
        <span className="min-w-0 flex-1">
          {title && (
            <span className={cn("block text-body", destructive ? "text-system-red" : interactive && !href && !acc ? "text-tint" : "text-label")}>
              {title}
            </span>
          )}
          {subtitle && <span className="mt-0.5 block text-subheadline text-label-secondary">{subtitle}</span>}
          {children}
        </span>
        {detail !== undefined && detail !== null && (
          <span className="max-w-[55%] shrink-0 truncate text-right text-body text-label-secondary">{detail}</span>
        )}
        {acc}
      </span>
    </>
  )

  const cls = cn(
    "flex w-full min-h-11 items-center gap-3 px-4 text-left outline-none focus-visible:bg-fill-quaternary",
    interactive && "press-row cursor-pointer",
    disabled && "opacity-50",
    className,
  )

  return (
    <li data-slot="list-row" className="group/row relative">
      {href && !disabled ? (
        <Link href={href} className={cls}>
          {body}
        </Link>
      ) : onClick && !disabled ? (
        <button type="button" onClick={onClick} className={cls}>
          {body}
        </button>
      ) : (
        <div className={cls}>{body}</div>
      )}
    </li>
  )
}

/** Bölüm içinde serbest içerikli satır (ayırıcılarla birlikte). */
export function RowItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <li
      data-slot="list-row"
      className={cn("relative px-4 py-3 after:hairline after:absolute after:right-0 after:bottom-0 after:left-4 after:bg-separator last:after:hidden", className)}
    >
      {children}
    </li>
  )
}

const TILE: Record<string, string> = {
  red: "var(--system-red)",
  orange: "var(--system-orange)",
  yellow: "var(--system-yellow)",
  green: "var(--system-green)",
  mint: "var(--system-mint)",
  teal: "var(--system-teal)",
  cyan: "var(--system-cyan)",
  blue: "var(--system-blue)",
  indigo: "var(--system-indigo)",
  purple: "var(--system-purple)",
  pink: "var(--system-pink)",
  brown: "var(--system-brown)",
  gray: "var(--system-gray)",
  tint: "var(--tint)",
}

/** Ayarlar uygulamasındaki renkli, yuvarlatılmış kare simge kutucuğu. */
export function IconTile({
  icon: Icon,
  color = "tint",
  size = "md",
  className,
}: {
  icon: IconType
  color?: string
  size?: "md" | "lg"
  className?: string
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center text-white",
        size === "lg" ? "size-11 rounded-[12px]" : "size-[30px] rounded-[8px]",
        className,
      )}
      style={{ background: TILE[color] || color }}
    >
      <Icon weight="fill" className={size === "lg" ? "size-6" : "size-[18px]"} />
    </span>
  )
}

/** Baş harflerle gri degrade avatar (Kişiler uygulaması). */
export function Avatar({ name, className }: { name?: string; className?: string }) {
  const initials =
    (name || "?")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toLocaleUpperCase("tr-TR"))
      .join("") || "?"
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full bg-linear-to-b from-[#a5abb8] to-[#858994] text-callout font-semibold text-white",
        className,
      )}
    >
      {initials}
    </span>
  )
}

// ------------------------------------------------------------------ değerler ve rozetler

/** Para tutarı; para birimi ayarlardan gelir. */
export function Money({ value, className, signed }: { value: number; className?: string; signed?: boolean }) {
  const { currency } = useApp()
  const text = money(Math.abs(value), currency)
  return (
    <span
      className={cn(
        "whitespace-nowrap tabular-nums",
        signed && value > 0 && "text-gain",
        signed && value < 0 && "text-loss",
        className,
      )}
    >
      {signed && value > 0 ? "+" : signed && value < 0 ? "−" : ""}
      {text}
    </span>
  )
}

type Tone = "gray" | "tint" | "green" | "red" | "orange" | "indigo" | "yellow"

const TONE: Record<Tone, string> = {
  gray: "bg-fill-tertiary text-label-secondary",
  tint: "bg-tint/15 text-tint",
  green: "bg-system-green/15 text-gain",
  red: "bg-system-red/15 text-system-red",
  orange: "bg-system-orange/15 text-[color-mix(in_oklab,var(--system-orange),black_22%)] dark:text-system-orange",
  indigo: "bg-system-indigo/15 text-system-indigo",
  yellow: "bg-system-yellow/20 text-[color-mix(in_oklab,var(--system-yellow),black_45%)] dark:text-system-yellow",
}

const STATUS_TONE: Record<PropertyStatus, Tone> = {
  empty: "gray",
  rent: "tint",
  rented: "green",
  sale: "orange",
  building: "indigo",
}

/** Küçük kapsül etiket. */
export function Tag({ children, tone = "gray", className }: { children: React.ReactNode; tone?: Tone; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-caption1 font-semibold whitespace-nowrap",
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

export function StatusBadge({ status, className }: { status: PropertyStatus; className?: string }) {
  return (
    <Tag tone={STATUS_TONE[status]} className={className}>
      {STATUS_LABEL[status]}
    </Tag>
  )
}

export function Stat({
  label,
  value,
  hint,
  className,
}: {
  label: string
  value: React.ReactNode
  hint?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <div className="text-footnote text-label-secondary">{label}</div>
      <div className="mt-0.5 truncate text-title2 text-label tabular-nums">{value}</div>
      {hint && <div className="mt-0.5 text-caption1 text-label-secondary">{hint}</div>}
    </div>
  )
}

// ------------------------------------------------------------------ durum görünümleri

/** İçerik yok görünümü (ContentUnavailableView). */
export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: string
  description?: string
  action?: React.ReactNode
  icon?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-col items-center px-8 py-14 text-center", className)}>
      {icon && <div className="mb-3 text-label-secondary [&_svg]:size-14">{icon}</div>}
      <h3 className="text-title3 text-label">{title}</h3>
      {description && <p className="mt-1.5 max-w-xs text-subheadline text-label-secondary">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function Loading({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center py-16 text-label-secondary", className)}>
      <Spinner className="size-7" />
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="mb-5 flex items-start gap-3 rounded-section bg-grouped-secondary p-4">
      <WarningCircle weight="fill" className="mt-0.5 size-6 shrink-0 text-system-red" />
      <div className="min-w-0 flex-1">
        <p className="text-subheadline text-label">{message}</p>
        {onRetry && (
          <Button variant="link" className="mt-1 text-subheadline" onClick={onRetry}>
            Tekrar dene
          </Button>
        )}
      </div>
    </div>
  )
}

/** Bilgi / uyarı notu (bölüm biçiminde). */
export function Notice({
  children,
  tone = "gray",
  icon: Icon,
  className,
}: {
  children: React.ReactNode
  tone?: "gray" | "red" | "orange" | "tint"
  icon?: IconType
  className?: string
}) {
  const color = { gray: "text-label-secondary", red: "text-system-red", orange: "text-system-orange", tint: "text-tint" }[tone]
  return (
    <div className={cn("flex items-start gap-3 rounded-section bg-grouped-secondary px-4 py-3.5 text-subheadline text-label", className)}>
      {Icon && <Icon weight="fill" className={cn("mt-px size-5 shrink-0", color)} />}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

// ------------------------------------------------------------------ form

/** Üstte etiket, altta kontrol ve not (uzun metin alanları ve çok satırlı formlar için). */
export function Field({
  label,
  htmlFor,
  hint,
  children,
  className,
}: {
  label: string
  htmlFor?: string
  hint?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={htmlFor} className="px-1">
        {label}
      </Label>
      {children}
      {hint && <p className="px-1 text-footnote text-label-secondary">{hint}</p>}
    </div>
  )
}

/**
 * Gruplu form satırı: solda etiket, sağda kenarsız kontrol (iOS Ayarlar / Kişiler).
 * İçine `inline` giriş alanı veya `NativeSelect inline` konur.
 */
export function FieldRow({
  label,
  htmlFor,
  children,
  className,
}: {
  label: React.ReactNode
  htmlFor?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <li
      data-slot="list-row"
      className={cn(
        "relative flex min-h-11 items-center gap-4 px-4 after:hairline after:absolute after:right-0 after:bottom-0 after:left-4 after:bg-separator last:after:hidden",
        className,
      )}
    >
      <label htmlFor={htmlFor} className="shrink-0 py-[11px] text-body text-label">
        {label}
      </label>
      <div className="flex min-w-0 flex-1 justify-end">{children}</div>
    </li>
  )
}

/** Satır içi (kenarsız, sağa yaslı) giriş alanı sınıfı. */
export const inlineInput =
  "h-11 rounded-none bg-transparent px-0 text-right focus-visible:outline-none placeholder:text-label-tertiary"

/**
 * Yerel <select>: iOS'ta sistem seçicisini açar. Varsayılan dolgulu açılır düğme;
 * `inline` ise liste satırında sağa yaslı değer + ⌃⌄ işareti.
 */
export function NativeSelect({
  className,
  inline,
  ...props
}: React.ComponentProps<"select"> & { inline?: boolean }) {
  return (
    <span className={cn("relative inline-flex min-w-0 items-center", inline ? "max-w-full" : "w-full", className)}>
      <select
        className={cn(
          "w-full min-w-0 cursor-pointer appearance-none truncate text-body outline-none disabled:cursor-not-allowed disabled:text-label-tertiary [&>option]:bg-grouped-secondary [&>option]:text-label",
          inline
            ? "h-11 bg-transparent pr-6 text-right text-label-secondary [text-align-last:right] focus-visible:text-tint"
            : "h-11 rounded-field bg-fill-tertiary pr-10 pl-4 text-label focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-tint/60",
        )}
        {...props}
      />
      <CaretUpDown
        weight="bold"
        aria-hidden="true"
        className={cn("pointer-events-none absolute size-4 text-label-tertiary", inline ? "right-0" : "right-3.5")}
      />
    </span>
  )
}

/** iOS arama alanı (dolgulu, büyüteç simgeli, temizleme düğmeli). */
export function SearchField({
  value,
  onChange,
  placeholder = "Ara",
  className,
  ...props
}: Omit<React.ComponentProps<"input">, "onChange" | "value"> & {
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className={cn("relative flex h-9 items-center rounded-[10px] bg-fill-tertiary text-label-secondary", className)}>
      <MagnifyingGlass weight="bold" className="pointer-events-none absolute left-2.5 size-[17px]" />
      <input
        type="search"
        enterKeyHint="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-full w-full min-w-0 bg-transparent pr-8 pl-8 text-body text-label caret-tint outline-none placeholder:text-label-secondary [&::-webkit-search-cancel-button]:hidden"
        {...props}
      />
      {value && (
        <button
          type="button"
          aria-label="Temizle"
          onClick={() => onChange("")}
          className="absolute right-1.5 flex size-6 items-center justify-center rounded-full text-label-tertiary press-dim"
        >
          <XCircle weight="fill" className="size-[18px]" />
        </button>
      )}
    </div>
  )
}

/** Yatay kaydırılan kapsül filtreler (Haritalar / App Store tarzı). */
export function Chips<T extends string>({
  value,
  onChange,
  items,
  className,
  "aria-label": ariaLabel,
}: {
  value: T
  onChange: (v: T) => void
  items: { value: T; label: React.ReactNode; count?: number }[]
  className?: string
  "aria-label"?: string
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn("no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-0.5 sm:-mx-6 sm:px-6 lg:mx-0 lg:flex-wrap lg:px-0", className)}
    >
      {items.map((item) => {
        const active = item.value === value
        return (
          <button
            key={item.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(item.value)}
            className={cn(
              "press-scale flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-subheadline font-medium whitespace-nowrap outline-none focus-visible:outline-2",
              active ? "bg-tint text-tint-foreground" : "bg-grouped-secondary text-label shadow-card",
            )}
          >
            {item.label}
            {item.count !== undefined && (
              <span className={cn("tabular-nums", active ? "opacity-80" : "text-label-secondary")}>{item.count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ------------------------------------------------------------------ uyarı (onay)

/**
 * Onay uyarısı (iOS 26): sola hizalı başlık ve mesaj, kapsül düğmeler.
 * onConfirm false dönerse uyarı açık kalır.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = "Vazgeç",
  destructive,
  pending,
  onConfirm,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: React.ReactNode
  confirmLabel: string
  cancelLabel?: string
  destructive?: boolean
  pending?: boolean
  onConfirm: () => Promise<boolean | void> | boolean | void
  children?: React.ReactNode
}) {
  // Kısa etiketler yan yana, uzunlar alt alta (iOS uyarı düzeni).
  const stacked = confirmLabel.length + cancelLabel.length > 22
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        {children}
        <div className={cn("mt-1 flex gap-2.5", stacked ? "flex-col" : "flex-row-reverse")}>
          <Button
            size="lg"
            variant={destructive ? "destructive" : "default"}
            className={cn("h-12", stacked ? "w-full" : "flex-1")}
            disabled={pending}
            onClick={async () => {
              const res = await onConfirm()
              if (res !== false) onOpenChange(false)
            }}
          >
            {pending && <Spinner className="size-4" />}
            {confirmLabel}
          </Button>
          <AlertDialogClose
            disabled={pending}
            render={<Button size="lg" variant="secondary" className={cn("h-12 text-label", stacked ? "w-full" : "flex-1")} />}
          >
            {cancelLabel}
          </AlertDialogClose>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/** Tek seferlik onay akışı için küçük yardımcı. */
export function useConfirm() {
  const [open, setOpen] = useState(false)
  return { open, setOpen, show: () => setOpen(true) }
}
