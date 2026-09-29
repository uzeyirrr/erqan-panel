import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-12 w-full min-w-0 rounded-xs border border-outline bg-transparent px-4 type-body-large text-on-surface transition-colors outline-none placeholder:text-on-surface-variant hover:border-on-surface focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary disabled:pointer-events-none disabled:border-on-surface/12 disabled:text-on-surface/38 aria-invalid:border-error aria-invalid:ring-1 aria-invalid:ring-inset aria-invalid:ring-error file:inline-flex file:h-6 file:border-0 file:bg-transparent file:type-label-large file:text-primary",
        className
      )}
      {...props}
    />
  )
}

export { Input }
