"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader } from "@/components/ui/dialog"
import { inlineInput } from "@/components/kit"

/** Sayı alanı: boş bırakılırsa 0 kabul edilir. `inline` ise gruplu form satırında sağa yaslı. */
export function NumberInput({
  value,
  onChange,
  step = "any",
  min,
  className,
  id,
  inline,
  ...rest
}: {
  value: number
  onChange: (n: number) => void
  step?: string
  min?: number
  className?: string
  id?: string
  inline?: boolean
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
      className={cn("tabular-nums", inline && inlineInput, className)}
      {...rest}
    />
  )
}

/** Gruplu listede aç/kapa satırı (iOS Ayarlar). Bir `Section` içinde kullanılır. */
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
    <li
      data-slot="list-row"
      className="relative flex min-h-11 items-center gap-4 px-4 py-2 after:hairline after:absolute after:right-0 after:bottom-0 after:left-4 after:bg-separator last:after:hidden desk:min-h-9 desk:px-3 desk:py-1.5 desk:after:left-3"
    >
      <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer py-0.5">
        <span className="block text-body text-label">{label}</span>
        {hint && <span className="block text-footnote text-label-secondary">{hint}</span>}
      </label>
      <Switch id={id} checked={checked} onCheckedChange={(v) => onChange(!!v)} />
    </li>
  )
}

/**
 * Oluştur/düzenle sayfası (sheet): üst çubukta Kapat, başlık ve Kaydet.
 * İçerik gruplu bölümlerden (`Section` + `FieldRow` / `Field`) oluşur.
 */
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
  const formId = `form-${title.replace(/\W+/g, "-").toLowerCase()}`
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size={wide ? "lg" : "md"}>
        <DialogHeader
          title={title}
          action={
            <Button type="submit" form={formId} size="sm" className="h-11 px-4" disabled={pending}>
              {pending ? <Spinner className="size-4" /> : submitLabel}
            </Button>
          }
        />
        <DialogBody>
          {description && <DialogDescription>{description}</DialogDescription>}
          <form
            id={formId}
            className="grid gap-6"
            onSubmit={(e) => {
              e.preventDefault()
              onSubmit()
            }}
          >
            {children}
          </form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}

/** Tabloların kabı: gruplu bölüm görünümü, dar ekranda yatay kaydırma. */
export function TableWrap({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("min-w-0 overflow-hidden rounded-section bg-grouped-secondary", className)}>{children}</div>
}

export function ActiveDot({ active }: { active: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-footnote text-label-secondary">
      <span className={cn("size-2 rounded-full", active ? "bg-system-green" : "bg-system-gray3")} />
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
    <nav aria-label="Sayfalar" className="mt-4 flex items-center justify-center gap-3">
      <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        Önceki
      </Button>
      <span className="min-w-16 text-center text-subheadline text-label-secondary tabular-nums">
        {page} / {totalPages}
      </span>
      <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
        Sonraki
      </Button>
    </nav>
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
