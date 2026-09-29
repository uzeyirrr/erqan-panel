"use client"

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"
import { cn } from "@/lib/utils"

// iOS bölümlü kontrol (segmented control) — https://developer.apple.com/design/human-interface-guidelines/segmented-controls
// Gri kapsül ray; seçili bölüm, kayan beyaz (koyu görünümde açık gri) bir kapsülle gösterilir.

function Tabs({ className, ...props }: TabsPrimitive.Root.Props) {
  return <TabsPrimitive.Root data-slot="tabs" className={cn("flex flex-col gap-4", className)} {...props} />
}

function TabsList({ className, children, ...props }: TabsPrimitive.List.Props) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn("relative isolate flex h-9 w-full items-stretch rounded-full bg-fill-tertiary p-0.5 sm:w-fit", className)}
      {...props}
    >
      <TabsPrimitive.Indicator
        data-slot="tabs-indicator"
        className="absolute top-(--active-tab-top) left-(--active-tab-left) -z-10 h-(--active-tab-height) w-(--active-tab-width) rounded-full bg-white shadow-[0_3px_8px_rgb(0_0_0/0.12),0_3px_1px_rgb(0_0_0/0.04)] transition-all duration-300 ease-ios dark:bg-system-gray2"
      />
      {children}
    </TabsPrimitive.List>
  )
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex min-w-0 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full px-4 text-subheadline font-medium whitespace-nowrap text-label outline-none transition-opacity select-none",
        "focus-visible:outline-2 focus-visible:-outline-offset-2 data-active:font-semibold active:opacity-60 data-active:active:opacity-100",
        "disabled:pointer-events-none disabled:text-label-tertiary [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return <TabsPrimitive.Panel data-slot="tabs-content" className={cn("flex-1 outline-none", className)} {...props} />
}

/**
 * Bağımsız bölümlü kontrol (Tabs paneli olmadan filtre/görünüm seçimi için).
 * Base UI Tabs ile aynı görünüm ve klavye davranışı.
 */
function Segmented<T extends string>({
  value,
  onValueChange,
  items,
  className,
  "aria-label": ariaLabel,
}: {
  value: T
  onValueChange: (value: T) => void
  items: { value: T; label: React.ReactNode }[]
  className?: string
  "aria-label"?: string
}) {
  return (
    <Tabs value={value} onValueChange={(v) => onValueChange(v as T)} className={className}>
      <TabsList aria-label={ariaLabel}>
        {items.map((item) => (
          <TabsTrigger key={item.value} value={item.value}>
            {item.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, Segmented }
