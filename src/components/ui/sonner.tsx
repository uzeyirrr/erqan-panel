"use client"

import { useSyncExternalStore } from "react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CheckCircle, Info, Warning, XCircle } from "@phosphor-icons/react"
import { Spinner } from "@/components/ui/spinner"

// iOS'ta "snackbar" yoktur; kısa geri bildirimler ekranın üstünde, Dynamic Island'ın altından
// inen Liquid Glass bir kapsülle gösterilir (AirPods bağlandı, Kopyalandı gibi).
// macOS'ta (masaüstü + fare) bildirimler ekranın sağ üstünden gelir.
const DESK = "(min-width: 1024px) and (pointer: fine)"
const subscribeDesk = (cb: () => void) => {
  const mq = window.matchMedia(DESK)
  mq.addEventListener("change", cb)
  return () => mq.removeEventListener("change", cb)
}

const Toaster = ({ ...props }: ToasterProps) => {
  const { resolvedTheme = "light" } = useTheme()
  const desk = useSyncExternalStore(subscribeDesk, () => window.matchMedia(DESK).matches, () => false)

  return (
    <Sonner
      theme={resolvedTheme as ToasterProps["theme"]}
      position={desk ? "top-right" : "top-center"}
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
            "glass-thick flex w-full items-center gap-3 rounded-[28px] py-3 pr-5 pl-3.5 text-label sm:w-[356px] desk:w-[344px] desk:rounded-[18px] desk:py-2.5",
          icon: "flex size-7 shrink-0 items-center justify-center",
          content: "min-w-0 flex-1",
          title: "text-subheadline font-semibold desk:text-[13px]",
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
