"use client"

import { cn } from "@/lib/utils"

// iOS giriş formu: etiketsiz, yer tutuculu alanlar tek bir gruplu bölümde alt alta durur
// (Apple Hesabı ile giriş ekranı). Etiketler ekran okuyucular için gizli tutulur.

export function FieldGroup({ children, className }: { children: React.ReactNode; className?: string }) {
  return <ul className={cn("overflow-hidden rounded-section bg-grouped-secondary", className)}>{children}</ul>
}

export function StackedField({
  id,
  label,
  className,
  ...props
}: React.ComponentProps<"input"> & { id: string; label: string }) {
  return (
    <li className="relative after:hairline after:absolute after:right-0 after:bottom-0 after:left-4 after:bg-separator last:after:hidden">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        placeholder={label}
        className={cn(
          "h-[52px] w-full bg-transparent px-4 text-body text-label caret-tint outline-none placeholder:text-label-tertiary",
          className,
        )}
        {...props}
      />
    </li>
  )
}
