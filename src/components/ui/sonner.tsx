"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          // Material 3 snackbar: inverse surface, köşe 4px, e3
          "--normal-bg": "var(--md-sys-color-inverse-surface)",
          "--normal-text": "var(--md-sys-color-inverse-on-surface)",
          "--normal-border": "transparent",
          "--border-radius": "4px",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast shadow-e3! type-body-medium",
          icon: "text-inverse-primary",
          actionButton: "bg-transparent! text-inverse-primary! type-label-large",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
