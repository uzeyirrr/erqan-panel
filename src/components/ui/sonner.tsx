"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CheckCircle, Info, Warning, XCircle } from "@phosphor-icons/react"
import { Spinner } from "@/components/ui/spinner"

// iOS'ta "snackbar" yoktur; kısa geri bildirimler ekranın üstünde, Dynamic Island'ın altından
// inen Liquid Glass bir kapsülle gösterilir (AirPods bağlandı, Kopyalandı gibi).
const Toaster = ({ ...props }: ToasterProps) => {
  const { resolvedTheme = "light" } = useTheme()

  return (
    <Sonner
      theme={resolvedTheme as ToasterProps["theme"]}
      position="top-center"
      offset={{ top: "calc(env(safe-area-inset-top) + 10px)" }}
      mobileOffset={{ top: "calc(env(safe-area-inset-top) + 8px)", left: "12px", right: "12px" }}
      gap={8}
      className="toaster group"
      icons={{
        success: <CheckCircle weight="fill" className="size-6 text-system-green" />,
        info: <Info weight="fill" className="size-6 text-tint" />,
        warning: <Warning weight="fill" className="size-6 text-system-orange" />,
        error: <XCircle weight="fill" className="size-6 text-system-red" />,
        loading: <Spinner className="size-5 text-label-secondary" />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "glass-thick flex w-full items-center gap-3 rounded-[28px] py-3 pr-5 pl-3.5 text-label sm:w-[356px]",
          icon: "flex size-7 shrink-0 items-center justify-center",
          content: "min-w-0 flex-1",
          title: "text-subheadline font-semibold",
          description: "text-footnote text-label-secondary",
          actionButton: "press-dim text-subheadline font-semibold text-tint",
          cancelButton: "press-dim text-subheadline text-label-secondary",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
