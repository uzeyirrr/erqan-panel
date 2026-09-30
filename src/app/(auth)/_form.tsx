"use client"

import { useState } from "react"
import { Eye, EyeSlash, type Icon as IconType } from "@phosphor-icons/react"
import { AppIcon } from "@/components/brand"
import { cn } from "@/lib/utils"

// iOS giriş formu: etiketsiz, yer tutuculu alanlar tek bir gruplu bölümde alt alta durur
// (Apple Hesabı ile giriş ekranı). Etiketler ekran okuyucular için gizli tutulur.

export function AuthHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-7 flex flex-col items-center text-center lg:items-start lg:text-left">
      <AppIcon className="size-[68px] lg:hidden" />
      <h1 className="mt-5 text-title1 font-bold text-label lg:mt-0">{title}</h1>
      <p className="mt-1.5 text-subheadline text-label-secondary">{subtitle}</p>
    </div>
  )
}

export function FieldGroup({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <ul
      className={cn(
        "overflow-hidden rounded-[20px] bg-grouped-secondary/90 py-1 shadow-[0_0_0_0.5px_rgb(0_0_0/0.06),0_1px_2px_rgb(0_0_0/0.04)] dark:bg-grouped-tertiary/80 dark:shadow-[0_0_0_0.5px_rgb(255_255_255/0.08)] desk:rounded-[10px] desk:py-0 desk:shadow-[0_0_0_0.5px_rgb(0_0_0/0.14),0_1px_2px_rgb(0_0_0/0.06)] dark:desk:shadow-[0_0_0_0.5px_rgb(255_255_255/0.12)]",
        className,
      )}
    >
      {children}
    </ul>
  )
}

type FieldProps = React.ComponentProps<"input"> & { id: string; label: string; icon?: IconType; trailing?: React.ReactNode }

export function StackedField({ id, label, icon: Icon, trailing, className, ...props }: FieldProps) {
  return (
    <li className="relative flex items-center after:hairline after:absolute after:right-0 after:bottom-0 after:left-12 after:bg-separator last:after:hidden desk:after:left-10">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      {Icon && (
        <Icon
          aria-hidden="true"
          weight="fill"
          className="pointer-events-none absolute left-4 size-5 text-label-tertiary desk:left-3 desk:size-4"
        />
      )}
      <input
        id={id}
        placeholder={label}
        className={cn(
          "h-[52px] w-full min-w-0 bg-transparent px-4 text-body text-label caret-tint outline-none placeholder:text-label-tertiary desk:h-10 desk:px-3",
          Icon && "pl-12 desk:pl-10",
          trailing && "pr-1",
          className,
        )}
        {...props}
      />
      {trailing}
    </li>
  )
}

/** Şifre alanı: sağdaki göz düğmesiyle yazılanı gösterir / gizler. */
export function PasswordField(props: Omit<FieldProps, "type" | "trailing">) {
  const [visible, setVisible] = useState(false)
  const Toggle = visible ? EyeSlash : Eye
  return (
    <StackedField
      {...props}
      type={visible ? "text" : "password"}
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Şifreyi gizle" : "Şifreyi göster"}
          aria-pressed={visible}
          className="mr-1 flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-label-tertiary press-dim desk:size-8"
        >
          <Toggle className="size-5 desk:size-4" />
        </button>
      }
    />
  )
}

export function OrDivider() {
  return (
    <div className="my-6 flex items-center gap-3 text-footnote text-label-tertiary" role="separator">
      <span className="h-px flex-1 bg-separator" />
      veya
      <span className="h-px flex-1 bg-separator" />
    </div>
  )
}
