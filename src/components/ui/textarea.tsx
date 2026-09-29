import * as React from "react"
import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-24 w-full min-w-0 rounded-field bg-fill-tertiary px-4 py-3 text-body text-label caret-tint outline-none placeholder:text-label-tertiary",
        "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-tint/60",
        "disabled:pointer-events-none disabled:text-label-tertiary aria-invalid:outline-2 aria-invalid:-outline-offset-2 aria-invalid:outline-system-red",
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
