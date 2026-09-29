import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

// Material 3 butonları — https://m3.material.io/components/buttons/specs
// default = filled, secondary = tonal (filled tonal), outline = outlined, ghost = text,
// elevated = elevated, destructive = error tonal, link = metin bağlantısı.
const buttonVariants = cva(
  "state-layer group/button inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full type-label-large whitespace-nowrap outline-none select-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none aria-invalid:ring-2 aria-invalid:ring-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[18px]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:shadow-e1 disabled:bg-on-surface/12 disabled:text-on-surface/38 disabled:shadow-none",
        secondary:
          "bg-secondary-container text-on-secondary-container hover:shadow-e1 disabled:bg-on-surface/12 disabled:text-on-surface/38 disabled:shadow-none",
        outline:
          "border border-outline text-primary aria-expanded:bg-primary/10 disabled:border-on-surface/12 disabled:text-on-surface/38",
        ghost: "text-primary aria-expanded:bg-primary/10 disabled:text-on-surface/38",
        elevated:
          "bg-surface-container-low text-primary shadow-e1 hover:shadow-e2 disabled:bg-on-surface/12 disabled:text-on-surface/38 disabled:shadow-none",
        destructive:
          "bg-error-container text-on-error-container hover:shadow-e1 disabled:bg-on-surface/12 disabled:text-on-surface/38 disabled:shadow-none",
        link: "rounded-sm text-primary underline-offset-4 hover:underline before:hidden",
      },
      size: {
        default: "h-10 gap-2 px-6 has-[>svg]:pl-4 has-[>svg:last-child]:pr-4",
        xs: "h-7 gap-1 px-3 type-label-medium [&_svg:not([class*='size-'])]:size-3.5",
        sm: "h-8 gap-1.5 px-4 has-[>svg]:pl-3 [&_svg:not([class*='size-'])]:size-4",
        lg: "h-12 gap-2 px-6 type-title-small has-[>svg]:pl-5",
        icon: "size-10 text-on-surface-variant",
        "icon-xs": "size-7 text-on-surface-variant [&_svg:not([class*='size-'])]:size-4",
        "icon-sm": "size-8 text-on-surface-variant [&_svg:not([class*='size-'])]:size-[18px]",
        "icon-lg": "size-12 text-on-surface-variant [&_svg:not([class*='size-'])]:size-6",
      },
    },
    compoundVariants: [
      // İkon butonlarında filled/tonal/outlined renkleri korunur, standart (ghost) nötrdür.
      { variant: "default", size: ["icon", "icon-xs", "icon-sm", "icon-lg"], className: "text-primary-foreground" },
      { variant: "secondary", size: ["icon", "icon-xs", "icon-sm", "icon-lg"], className: "text-on-secondary-container" },
      { variant: "destructive", size: ["icon", "icon-xs", "icon-sm", "icon-lg"], className: "text-on-error-container" },
      { variant: "ghost", size: ["icon", "icon-xs", "icon-sm", "icon-lg"], className: "text-on-surface-variant" },
    ],
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />
  )
}

export { Button, buttonVariants }
