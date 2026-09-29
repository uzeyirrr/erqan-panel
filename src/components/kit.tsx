"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { STATUS_LABEL, money } from "@/lib/format"
import type { PropertyStatus } from "@/lib/types"
import { useApp } from "@/components/app-provider"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        <h1 className="type-headline-medium text-on-surface">{title}</h1>
        {description && <p className="mt-1 max-w-prose type-body-medium text-on-surface-variant">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

/** Para tutarı; para birimi ayarlardan gelir. */
export function Money({ value, className, signed }: { value: number; className?: string; signed?: boolean }) {
  const { currency } = useApp()
  const text = money(Math.abs(value), currency)
  return (
    <span
      className={cn(
        "figure whitespace-nowrap",
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

const STATUS_STYLE: Record<PropertyStatus, string> = {
  empty: "border-outline-variant bg-surface text-on-surface-variant",
  rent: "border-transparent bg-secondary-container text-on-secondary-container",
  rented: "border-transparent bg-gain-container text-on-gain-container",
  sale: "border-transparent bg-tertiary-container text-on-tertiary-container",
  building: "border-transparent bg-premium-container text-on-premium-container",
}

export function StatusBadge({ status, className }: { status: PropertyStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-sm border px-2 type-label-medium whitespace-nowrap",
        STATUS_STYLE[status],
        className,
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  )
}

export function Tag({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex h-6 items-center rounded-sm border border-outline-variant px-2 type-label-medium text-on-surface-variant", className)}>
      {children}
    </span>
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
      <div className="type-label-large text-on-surface-variant">{label}</div>
      <div className="figure mt-1 truncate type-headline-small text-on-surface">{value}</div>
      {hint && <div className="mt-0.5 type-body-small text-on-surface-variant">{hint}</div>}
    </div>
  )
}

export function Panel({
  title,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: React.ReactNode
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <section className={cn("min-w-0 rounded-xl border border-outline-variant bg-card text-card-foreground", className)}>
      {(title || actions) && (
        <header className="flex min-h-14 items-center justify-between gap-2 px-4 pt-3">
          {title && <h2 className="type-title-medium text-on-surface">{title}</h2>}
          {actions}
        </header>
      )}
      <div className={cn("p-4", bodyClassName)}>{children}</div>
    </section>
  )
}

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
    <div className={cn("flex flex-col items-center rounded-xl border border-dashed border-outline-variant px-6 py-12 text-center", className)}>
      {icon && <div className="mb-3 text-on-surface-variant">{icon}</div>}
      <h3 className="type-title-medium text-on-surface">{title}</h3>
      {description && <p className="mt-1 max-w-sm type-body-medium text-on-surface-variant">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Loading({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center py-16 text-primary", className)}>
      <Loader2 className="size-8 animate-spin" aria-label="Yükleniyor" />
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-xl bg-error-container p-4 type-body-medium text-on-error-container">
      <p>{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>
          Tekrar dene
        </Button>
      )}
    </div>
  )
}

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
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="px-4 type-body-small text-on-surface-variant">{hint}</p>}
    </div>
  )
}

/** Yerel <select>: mobilde sistem seçicisini açar, klavyeyle tam erişilebilir. */
export function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "h-12 w-full rounded-xs border border-outline bg-transparent px-4 type-body-large text-on-surface outline-none hover:border-on-surface focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary disabled:border-on-surface/12 disabled:text-on-surface/38 [&>option]:bg-surface-container",
        className,
      )}
      {...props}
    />
  )
}

/** Onay penceresi; onConfirm false dönerse pencere açık kalır. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
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
  destructive?: boolean
  pending?: boolean
  onConfirm: () => Promise<boolean | void> | boolean | void
  children?: React.ReactNode
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Vazgeç
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            disabled={pending}
            onClick={async () => {
              const res = await onConfirm()
              if (res !== false) onOpenChange(false)
            }}
          >
            {pending && <Loader2 className="animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Tek seferlik onay akışı için küçük yardımcı. */
export function useConfirm() {
  const [open, setOpen] = useState(false)
  return { open, setOpen, show: () => setOpen(true) }
}
