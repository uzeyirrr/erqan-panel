"use client"

import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox"
import { cn } from "@/lib/utils"

// iOS'ta kare onay kutusu yoktur; çoklu seçimde daire içinde onay işareti kullanılır
// (Anımsatıcılar, liste düzenleme). İşaretliyken vurgu renginde dolu daire.
// macOS'ta (desk) yuvarlatılmış kare onay kutusu.
function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer relative flex size-[22px] shrink-0 cursor-pointer items-center justify-center rounded-full border-[1.5px] border-label-tertiary transition-colors duration-200 outline-none",
        "focus-visible:outline-2 focus-visible:outline-offset-2",
        "data-checked:border-tint data-checked:bg-tint data-checked:text-tint-foreground",
        "desk:size-4 desk:rounded-[4px] desk:border desk:bg-background desk:shadow-[0_0.5px_1px_rgb(0_0_0/0.1)] desk:data-checked:bg-tint",
        "disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-system-red",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator data-slot="checkbox-indicator" className="grid place-content-center">
        <svg viewBox="0 0 12 12" className="size-3" fill="none" aria-hidden="true">
          <path d="M2.5 6.2 5 8.6l4.6-5.1" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
