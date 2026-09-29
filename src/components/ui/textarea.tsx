import * as React from "react"
import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-24 py-3 w-full min-w-0 rounded-xs border border-outline bg-transparent px-4 type-body-large text-on-surface transition-colors outline-none placeholder:text-on-surface-variant hover:border-on-surface focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary disabled:pointer-events-none disabled:border-on-surface/12 disabled:text-on-surface/38 aria-invalid:border-error aria-invalid:ring-1 aria-invalid:ring-inset aria-invalid:ring-error",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
