"use client"

import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox"
import { cn } from "@/lib/utils"
import { CheckIcon } from "lucide-react"

// Material 3 onay kutusu — https://m3.material.io/components/checkbox/specs
// 18px kutu, 2px kenarlık, köşe 2px; işaretliyken primary dolgu.
function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer relative flex size-[18px] shrink-0 cursor-pointer items-center justify-center rounded-[2px] border-2 border-on-surface-variant transition-colors outline-none",
        "after:absolute after:-inset-[11px] after:rounded-full after:bg-current after:opacity-0 hover:after:opacity-8 focus-visible:after:opacity-10",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "data-checked:border-primary data-checked:bg-primary data-checked:text-on-primary",
        "disabled:cursor-not-allowed disabled:opacity-38 aria-invalid:border-error",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none [&>svg]:size-3.5 [&>svg]:stroke-[3]"
      >
        <CheckIcon />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
