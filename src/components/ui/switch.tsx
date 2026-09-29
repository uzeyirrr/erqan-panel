"use client"

import { Switch as SwitchPrimitive } from "@base-ui/react/switch"
import { cn } from "@/lib/utils"

// Material 3 anahtar — https://m3.material.io/components/switch/specs
// Ray 52×32; kapalıyken 16px outline başparmak, açıkken 24px on-primary başparmak.
function Switch({
  className,
  size = "default",
  ...props
}: SwitchPrimitive.Root.Props & {
  size?: "sm" | "default"
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer group/switch relative inline-flex h-8 w-[52px] shrink-0 cursor-pointer items-center rounded-full border-2 transition-colors outline-none",
        "data-unchecked:border-outline data-unchecked:bg-surface-container-highest data-checked:border-primary data-checked:bg-primary",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "data-disabled:cursor-not-allowed data-disabled:opacity-38",
        "data-[size=sm]:h-6 data-[size=sm]:w-10",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block rounded-full shadow-none transition-all duration-200",
          "data-unchecked:ml-[6px] data-unchecked:size-4 data-unchecked:bg-outline",
          "data-checked:ml-[22px] data-checked:size-6 data-checked:bg-on-primary",
          "group-data-[size=sm]/switch:data-unchecked:ml-1 group-data-[size=sm]/switch:data-unchecked:size-3",
          "group-data-[size=sm]/switch:data-checked:ml-[18px] group-data-[size=sm]/switch:data-checked:size-4",
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
