"use client"

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

// Material 3 sekmeler — https://m3.material.io/components/tabs/specs
// default = primary tabs (altta 3px gösterge), line = secondary tabs (2px, tam genişlik gösterge).

function Tabs({ className, orientation = "horizontal", ...props }: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn("group/tabs flex gap-4 data-horizontal:flex-col", className)}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  "group/tabs-list relative flex w-full items-stretch overflow-x-auto border-b border-outline-variant [scrollbar-width:none] group-data-vertical/tabs:w-fit group-data-vertical/tabs:flex-col group-data-vertical/tabs:border-r group-data-vertical/tabs:border-b-0",
  {
    variants: {
      variant: {
        default: "",
        line: "",
      },
    },
    defaultVariants: { variant: "default" },
  },
)

function TabsList({ className, variant = "default", ...props }: TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "state-layer relative inline-flex h-12 min-w-fit flex-1 cursor-pointer items-center justify-center gap-2 px-4 type-title-small whitespace-nowrap text-on-surface-variant outline-none",
        "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:pointer-events-none disabled:text-on-surface/38 aria-disabled:pointer-events-none aria-disabled:text-on-surface/38",
        "data-active:text-primary [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
        // Aktif gösterge
        "after:absolute after:bottom-0 after:left-1/2 after:h-[3px] after:w-[calc(100%-2rem)] after:max-w-full after:min-w-6 after:-translate-x-1/2 after:rounded-t-full after:bg-primary after:opacity-0 data-active:after:opacity-100",
        "group-data-[variant=line]/tabs-list:after:h-0.5 group-data-[variant=line]/tabs-list:after:w-full group-data-[variant=line]/tabs-list:after:rounded-none group-data-[variant=line]/tabs-list:data-active:text-on-surface",
        "group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start group-data-vertical/tabs:after:hidden group-data-vertical/tabs:data-active:bg-secondary-container group-data-vertical/tabs:data-active:text-on-secondary-container",
        className,
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return <TabsPrimitive.Panel data-slot="tabs-content" className={cn("flex-1 outline-none", className)} {...props} />
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
