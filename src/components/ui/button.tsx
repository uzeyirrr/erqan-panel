import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

// Apple HIG butonları — https://developer.apple.com/design/human-interface-guidelines/buttons
// default = borderedProminent (vurgu renginde kapsül; bir görünümde en fazla bir-iki tane),
// secondary = bordered (gri dolgu, vurgu renginde yazı), ghost = borderless (yalnızca yazı),
// glass = Liquid Glass (üst çubuk ve yüzen kontroller), destructive = yıkıcı rol (sistem kırmızısı),
// destructive-secondary = gri dolgu üzerinde kırmızı yazı, link = satır içi bağlantı.
// Boyutlar iOS kontrol boyutlarına denk gelir: xs 28, sm 34, default 44, lg 52 (tam genişlik eylem);
// masaüstünde (desk) macOS ölçüleri: xs 24, sm 28, default 32, lg 36, gri düğmelerde etiket rengi.
const buttonVariants = cva(
  "group/button inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full font-semibold whitespace-nowrap outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none aria-disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "press-scale bg-tint text-tint-foreground disabled:bg-fill-tertiary disabled:text-label-tertiary",
        secondary:
          "press-scale bg-fill-tertiary text-tint disabled:text-label-tertiary desk:bg-fill-secondary desk:text-label desk:shadow-[0_0.5px_1px_rgb(0_0_0/0.12)]",
        outline:
          "press-scale bg-fill-tertiary text-tint disabled:text-label-tertiary desk:bg-fill-secondary desk:text-label desk:shadow-[0_0.5px_1px_rgb(0_0_0/0.12)]",
        ghost: "press-dim text-tint disabled:text-label-tertiary",
        glass: "glass press-scale text-label disabled:text-label-tertiary",
        destructive: "press-scale bg-system-red text-white disabled:bg-fill-tertiary disabled:text-label-tertiary",
        "destructive-secondary":
          "press-scale bg-fill-tertiary text-system-red disabled:text-label-tertiary desk:bg-fill-secondary desk:shadow-[0_0.5px_1px_rgb(0_0_0/0.12)]",
        link: "press-dim h-auto! rounded-sm px-0! font-normal text-tint",
      },
      size: {
        default:
          "h-11 gap-2 px-5 text-body font-semibold [&_svg:not([class*='size-'])]:size-5 desk:h-8 desk:gap-1.5 desk:px-4 desk:[&_svg:not([class*='size-'])]:size-4",
        xs: "h-7 gap-1 px-3 text-footnote font-semibold [&_svg:not([class*='size-'])]:size-3.5 desk:h-6 desk:px-2.5 desk:text-[11px]",
        sm: "h-[34px] gap-1.5 px-4 text-subheadline font-semibold [&_svg:not([class*='size-'])]:size-4 desk:h-7 desk:px-3 desk:text-[13px] desk:[&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-[52px] gap-2 px-6 text-body font-semibold [&_svg:not([class*='size-'])]:size-5 desk:h-9 desk:px-5 desk:[&_svg:not([class*='size-'])]:size-4",
        icon: "size-11 text-body [&_svg:not([class*='size-'])]:size-[22px] desk:size-8 desk:[&_svg:not([class*='size-'])]:size-4",
        "icon-xs": "size-7 [&_svg:not([class*='size-'])]:size-4 desk:size-6 desk:[&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-[34px] [&_svg:not([class*='size-'])]:size-[18px] desk:size-7 desk:[&_svg:not([class*='size-'])]:size-3.5",
        "icon-lg": "size-[52px] [&_svg:not([class*='size-'])]:size-6 desk:size-9 desk:[&_svg:not([class*='size-'])]:size-[18px]",
      },
    },
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
