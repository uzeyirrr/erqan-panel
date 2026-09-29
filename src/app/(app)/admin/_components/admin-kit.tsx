"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

/** Sayı alanı: boş bırakılırsa 0 kabul edilir. */
export function NumberInput({
  value,
  onChange,
  step = "any",
  min,
  className,
  id,
  ...rest
}: {
  value: number
  onChange: (n: number) => void
  step?: string
  min?: number
  className?: string
  id?: string
} & Omit<React.ComponentProps<"input">, "value" | "onChange" | "type">) {
  return (
    <Input
      id={id}
      type="number"
      inputMode="decimal"
      step={step}
      min={min}
      value={Number.isFinite(value) ? value : 0}
      onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
      className={cn("figure", className)}
      {...rest}
    />
  )
}

/** Etiketli aç/kapa satırı. */
export function SwitchRow({
  label,
  hint,
  checked,
  onChange,
  id,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (v: boolean) => void
  id: string
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <label htmlFor={id} className="min-w-0 cursor-pointer">
        <span className="block type-title-small">{label}</span>
        {hint && <span className="block type-body-small text-muted-foreground">{hint}</span>}
      </label>
      <Switch id={id} checked={checked} onCheckedChange={(v) => onChange(!!v)} className="mt-0.5" />
    </div>
  )
}

/** Oluştur/düzenle formu için pencere. */
export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  pending,
  submitLabel = "Kaydet",
  onSubmit,
  children,
  wide,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: React.ReactNode
  pending?: boolean
  submitLabel?: string
  onSubmit: () => void | Promise<void>
  children: React.ReactNode
  wide?: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-h-[90vh] overflow-y-auto", wide ? "sm:max-w-2xl" : "sm:max-w-lg")}>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            onSubmit()
          }}
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          {children}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Vazgeç
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** Tabloların yatay kaydırılabilir kabı (mobilde taşmayı önler). */
export function TableWrap({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("min-w-0 overflow-x-auto rounded-xl border bg-card", className)}>{children}</div>
}

export function ActiveDot({ active }: { active: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 type-body-small">
      <span className={cn("size-2 rounded-full", active ? "bg-gain" : "bg-muted-foreground/40")} />
      {active ? "Aktif" : "Pasif"}
    </span>
  )
}

export function Pager({
  page,
  totalPages,
  onPage,
}: {
  page: number
  totalPages: number
  onPage: (p: number) => void
}) {
  if (totalPages <= 1) return null
  return (
    <div className="mt-3 flex items-center justify-end gap-2 type-body-medium">
      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        Önceki
      </Button>
      <span className="figure text-muted-foreground">
        {page} / {totalPages}
      </span>
      <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
        Sonraki
      </Button>
    </div>
  )
}

/** Arama kutuları için gecikmeli değer. */
export function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

/** Filtreye bağlı sayfa numarası: filtre (key) değişince kendiliğinden 1'e döner. */
export function usePageFor(key: string): [number, (page: number) => void] {
  const [state, setState] = useState({ key, page: 1 })
  const page = state.key === key ? state.page : 1
  return [page, (p: number) => setState({ key, page: p })]
}
