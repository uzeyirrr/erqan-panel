"use client"

import { Switch as SwitchPrimitive } from "@base-ui/react/switch"
import { cn } from "@/lib/utils"

// iOS anahtarı (toggle) — https://developer.apple.com/design/human-interface-guidelines/toggles
// 51×31 ray, açıkken sistem yeşili; 27 pt beyaz topuz basılı tutulunca uzar.
function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer group/switch relative inline-flex h-[31px] w-[51px] shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors duration-300 ease-ios outline-none",
        "data-unchecked:bg-fill data-checked:bg-system-green",
        "focus-visible:outline-2 focus-visible:outline-offset-2",
        "data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block h-[27px] w-[27px] rounded-full bg-white shadow-knob transition-all duration-300 ease-ios",
          "data-checked:translate-x-5 group-active/switch:w-[33px] group-active/switch:data-checked:translate-x-[14px]",
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
