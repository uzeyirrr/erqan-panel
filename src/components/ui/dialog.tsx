"use client"

import * as React from "react"
import { Drawer } from "@base-ui/react/drawer"
import { AlertDialog as AlertPrimitive } from "@base-ui/react/alert-dialog"
import { X } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { AppIcon } from "@/components/brand"
import { Button } from "@/components/ui/button"

// ------------------------------------------------------------------ sayfa (sheet)
// iOS sayfası — https://developer.apple.com/design/human-interface-guidelines/sheets
// iPhone'da alttan açılır, tutamaçla (grabber) aşağı kaydırılarak kapanır; geniş ekranda
// ortalanmış form sayfası olur. Üst çubukta solda Kapat (Liquid Glass daire), ortada başlık,
// sağda birincil eylem bulunur. macOS'ta (desk) pencerenin üstünden inen sayfadır: başlık
// solda, düğmeler altta sağda (Vazgeç + birincil eylem).

function Dialog({ children, ...props }: Omit<Drawer.Root.Props, "children"> & { children?: React.ReactNode }) {
  return (
    <Drawer.Root data-slot="dialog" {...props}>
      <Drawer.VirtualKeyboardProvider>{children}</Drawer.VirtualKeyboardProvider>
    </Drawer.Root>
  )
}

const DialogTrigger = Drawer.Trigger
const DialogClose = Drawer.Close

function DialogContent({
  className,
  children,
  size = "md",
  ...props
}: Drawer.Popup.Props & { size?: "md" | "lg" }) {
  return (
    <Drawer.Portal>
      <Drawer.Backdrop
        data-slot="dialog-overlay"
        className="fixed inset-0 z-50 min-h-dvh bg-black opacity-[calc(0.3*(1-var(--drawer-swipe-progress)))] transition-opacity duration-500 ease-ios data-starting-style:opacity-0 data-ending-style:opacity-0 data-ending-style:duration-[calc(var(--drawer-swipe-strength)*400ms)] data-swiping:duration-0 dark:opacity-[calc(0.55*(1-var(--drawer-swipe-progress)))] supports-[-webkit-touch-callout:none]:absolute desk:opacity-[0.18] desk:data-starting-style:opacity-0 desk:data-ending-style:opacity-0"
      />
      <Drawer.Viewport className="fixed inset-0 z-50 flex items-end justify-center [--bleed:3rem] sm:items-center sm:p-6 sm:[--bleed:0px] desk:items-start desk:pt-16 desk:pl-[276px]">
        <Drawer.Popup
          data-slot="dialog-content"
          data-elevated=""
          className={cn(
            "relative flex w-full flex-col overflow-hidden bg-grouped text-label shadow-float outline-none",
            // iPhone: alttan, üst köşeler yuvarlak; ana ekran çubuğu için güvenli alan.
            "-mb-(--bleed) max-h-[calc(100dvh-env(safe-area-inset-top)-0.75rem+var(--bleed))] rounded-t-sheet pb-[calc(env(safe-area-inset-bottom)+var(--bleed))]",
            // Geniş ekran: ortalanmış form sayfası.
            "sm:max-h-[min(760px,90dvh)] sm:rounded-sheet sm:pb-0",
            size === "lg" ? "sm:max-w-2xl" : "sm:max-w-lg",
            "[transform:translateY(var(--drawer-swipe-movement-y))] transition-transform duration-500 ease-ios will-change-transform",
            "data-starting-style:[transform:translateY(calc(100%+2rem))] data-ending-style:[transform:translateY(calc(100%+2rem))] data-ending-style:duration-[calc(var(--drawer-swipe-strength)*400ms)] data-swiping:select-none",
            "sm:data-starting-style:[transform:translateY(2.5rem)_scale(0.97)] sm:data-starting-style:opacity-0 sm:data-ending-style:[transform:translateY(2.5rem)_scale(0.97)] sm:data-ending-style:opacity-0 sm:transition-[transform,opacity]",
            // macOS: üstten hafifçe inerek belirir.
            "desk:max-h-[calc(100dvh-8rem)] desk:shadow-[0_24px_64px_rgb(0_0_0/0.22),0_0_0_0.5px_rgb(0_0_0/0.12)] desk:duration-300",
            "desk:data-starting-style:[transform:translateY(-14px)] desk:data-ending-style:[transform:translateY(-14px)] desk:data-ending-style:duration-200",
            size === "lg" ? "desk:max-w-[680px]" : "desk:max-w-[520px]",
            className,
          )}
          {...props}
        >
          {children}
        </Drawer.Popup>
      </Drawer.Viewport>
    </Drawer.Portal>
  )
}

/**
 * Sayfanın üst çubuğu: tutamaç, Kapat düğmesi, başlık ve isteğe bağlı birincil eylem.
 * Başlık erişilebilir ad olarak kullanılır.
 */
function DialogHeader({
  title,
  action,
  closeLabel = "Kapat",
  className,
}: {
  title: React.ReactNode
  action?: React.ReactNode
  closeLabel?: string
  className?: string
}) {
  return (
    <>
      <div
        data-slot="dialog-header"
        className={cn("relative shrink-0 touch-none px-4 pt-4 pb-2 select-none desk:px-5 desk:pt-5 desk:pb-0", className)}
      >
        <div aria-hidden="true" className="absolute top-1.5 left-1/2 h-[5px] w-9 -translate-x-1/2 rounded-full bg-fill sm:hidden" />
        <div className="grid min-h-11 grid-cols-[minmax(max-content,1fr)_minmax(0,auto)_minmax(max-content,1fr)] items-center gap-2 desk:block desk:min-h-0">
          <Drawer.Close
            aria-label={closeLabel}
            render={<Button variant="glass" size="icon" className="justify-self-start desk:hidden" />}
          >
            <X weight="bold" className="size-[18px]" />
          </Drawer.Close>
          <Drawer.Title className="min-w-0 truncate text-center text-headline text-label desk:text-left desk:text-title3">
            {title}
          </Drawer.Title>
          <div className="justify-self-end desk:hidden">{action}</div>
        </div>
      </div>
      {/* macOS: düğmeler sayfanın altında, sağda */}
      <div data-slot="dialog-actions" className="order-last hidden shrink-0 items-center justify-end gap-2 px-5 pt-2 pb-5 desk:flex">
        {action ? (
          <>
            <Drawer.Close render={<Button variant="secondary" size="sm" />}>Vazgeç</Drawer.Close>
            {action}
          </>
        ) : (
          <Drawer.Close render={<Button size="sm" className="min-w-20" />}>Bitti</Drawer.Close>
        )}
      </div>
    </>
  )
}

/** Sayfa içeriği: kaydırılabilir, gruplu arka plan üzerinde. */
function DialogBody({ className, ...props }: Drawer.Content.Props) {
  return (
    <Drawer.Content
      data-slot="dialog-body"
      className={cn(
        "grid min-h-0 flex-1 content-start gap-6 overflow-y-auto overscroll-contain px-4 pt-2 pb-6 touch-auto desk:gap-5 desk:px-5 desk:pt-4 desk:pb-3",
        className,
      )}
      {...props}
    />
  )
}

/** Sayfanın altına sabitlenen eylem alanı (tam genişlik birincil düğme için). */
function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="dialog-footer" className={cn("grid shrink-0 gap-2 px-4 pt-2 pb-4", className)} {...props} />
}

function DialogDescription({ className, ...props }: Drawer.Description.Props) {
  return (
    <Drawer.Description
      data-slot="dialog-description"
      className={cn("px-1 text-subheadline text-label-secondary", className)}
      {...props}
    />
  )
}

// ------------------------------------------------------------------ uyarı (alert)
// iOS 26 uyarısı — https://developer.apple.com/design/human-interface-guidelines/alerts
// Ortada, Liquid Glass zeminli; başlık ve mesaj sola hizalı, eylemler kapsül düğmeler.
// macOS'ta (desk) dar, ortalı; üstte uygulama simgesi, düğmeler yan yana.

const AlertDialog = AlertPrimitive.Root

function AlertDialogContent({ className, children, ...props }: AlertPrimitive.Popup.Props) {
  return (
    <AlertPrimitive.Portal>
      <AlertPrimitive.Backdrop
        data-slot="alert-overlay"
        className="fixed inset-0 z-50 bg-(--scrim) transition-opacity duration-300 ease-ios data-starting-style:opacity-0 data-ending-style:opacity-0"
      />
      <AlertPrimitive.Popup
        data-slot="alert-content"
        data-elevated=""
        className={cn(
          "glass-thick fixed top-1/2 left-1/2 z-50 grid max-h-[calc(100dvh-4rem)] w-[min(calc(100vw-3.5rem),320px)] -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto rounded-alert p-5 pt-6 text-label outline-none",
          "desk:w-[272px] desk:gap-3 desk:p-4 desk:pt-5 desk:text-center",
          "transition-[scale,opacity] duration-300 ease-spring data-starting-style:scale-110 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0 data-ending-style:duration-200 data-ending-style:ease-in",
          className,
        )}
        {...props}
      >
        <AppIcon className="mx-auto hidden size-14 shadow-none desk:flex" />
        {children}
      </AlertPrimitive.Popup>
    </AlertPrimitive.Portal>
  )
}

function AlertDialogTitle({ className, ...props }: AlertPrimitive.Title.Props) {
  return <AlertPrimitive.Title className={cn("px-1 text-headline text-label desk:px-0", className)} {...props} />
}

function AlertDialogDescription({ className, ...props }: AlertPrimitive.Description.Props) {
  return (
    <AlertPrimitive.Description
      className={cn("-mt-2.5 px-1 text-subheadline text-label desk:-mt-1.5 desk:px-0", className)}
      {...props}
    />
  )
}

const AlertDialogClose = AlertPrimitive.Close

export {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTrigger,
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
}
