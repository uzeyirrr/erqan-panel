import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "@/lib/utils"

// iOS metin alanı — https://developer.apple.com/design/human-interface-guidelines/text-fields
// Dolgulu, köşeleri yuvarlatılmış alan; gruplu liste satırı içinde `bg-transparent` ile kenarsız kullanılır.
// Yazı 17 pt: iOS Safari 16 pt altındaki alanlarda sayfayı yakınlaştırır.
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-field bg-fill-tertiary px-4 text-body text-label caret-tint outline-none placeholder:text-label-tertiary",
        "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-tint/60",
        "desk:h-7 desk:px-2.5 desk:focus-visible:outline-3 desk:focus-visible:outline-offset-0 desk:focus-visible:outline-tint/45",
        "disabled:pointer-events-none disabled:text-label-tertiary aria-invalid:outline-2 aria-invalid:-outline-offset-2 aria-invalid:outline-system-red",
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-subheadline file:font-semibold file:text-tint",
        "[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [appearance:textfield]",
        className,
      )}
      {...props}
    />
  )
}

export { Input }
