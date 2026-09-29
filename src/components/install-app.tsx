"use client"

import { useState, useSyncExternalStore } from "react"
import { DeviceMobile, Export, PlusSquare, X } from "@phosphor-icons/react"
import { AppIcon } from "@/components/brand"
import { Row, Section } from "@/components/kit"
import { Button } from "@/components/ui/button"
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader } from "@/components/ui/dialog"

// "Ana ekrana ekle" akışı. Android / Chrome / Edge'de tarayıcının yükleme penceresi
// (beforeinstallprompt) açılır; iPhone ve iPad'de bu olay olmadığı için Paylaş menüsünden
// eklemeyi anlatan bir sayfa gösterilir. Uygulama zaten ana ekrandan açıldıysa hiçbir şey görünmez.

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

let deferred: InstallPromptEvent | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

/** Kök düzende bir kez çağrılır: tarayıcının yükleme olayını sonraya saklar. */
export function captureInstallPrompt() {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault()
    deferred = e as InstallPromptEvent
    emit()
  })
  window.addEventListener("appinstalled", () => {
    deferred = null
    emit()
  })
}

type Env = { standalone: boolean; ios: boolean; mobile: boolean }
let env: Env | null = null
function getEnv(): Env {
  if (!env) {
    const ua = navigator.userAgent
    const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    env = {
      standalone:
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true,
      ios,
      mobile: ios || /Android|Mobi/i.test(ua),
    }
  }
  return env
}
const SERVER_ENV: Env = { standalone: true, ios: false, mobile: false }

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function usePwaInstall() {
  const prompt = useSyncExternalStore(subscribe, () => deferred, () => null)
  const { standalone, ios, mobile } = useSyncExternalStore(subscribe, getEnv, () => SERVER_ENV)
  const canInstall = !standalone && (!!prompt || ios)

  /** Android'de sistem penceresini açar; iOS'ta false döner (talimat sayfası gösterilmeli). */
  async function install(): Promise<boolean> {
    if (!prompt) return false
    await prompt.prompt()
    await prompt.userChoice.catch(() => null)
    deferred = null
    emit()
    return true
  }

  return { canInstall, ios, mobile, install }
}

/** iPhone / iPad için "Ana Ekrana Ekle" talimatları. */
export function InstallSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader title="Ana Ekrana Ekle" />
        <DialogBody>
          <div className="flex flex-col items-center gap-3 pt-2 text-center">
            <AppIcon className="size-20" />
            <div>
              <div className="text-title3 text-label">Erqan</div>
              <DialogDescription className="px-0">
                Erqan ana ekranınızda bir uygulama gibi, tam ekran açılır.
              </DialogDescription>
            </div>
          </div>
          <Section footer="Ana ekrandan açtığınızda kenardan kaydırarak geri gidebilir, aşağı çekerek yenileyebilirsiniz.">
            <Row
              leading={<Step n={1} />}
              title={
                <span className="flex flex-wrap items-center gap-1.5">
                  <Export className="size-5 text-tint" /> Paylaş düğmesine dokunun
                </span>
              }
              subtitle="Safari'de alttaki (veya adres çubuğundaki) paylaş simgesi."
            />
            <Row
              leading={<Step n={2} />}
              title={
                <span className="flex flex-wrap items-center gap-1.5">
                  <PlusSquare className="size-5 text-label" /> “Ana Ekrana Ekle”yi seçin
                </span>
              }
              subtitle="Görmüyorsanız listeyi yukarı kaydırın."
            />
            <Row leading={<Step n={3} />} title="Sağ üstteki “Ekle”ye dokunun" />
          </Section>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}

function Step({ n }: { n: number }) {
  return (
    <span className="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-tint text-subheadline font-semibold text-tint-foreground tabular-nums">
      {n}
    </span>
  )
}

/** Hesap sayfası satırı: yüklenebiliyorsa "Uygulamayı Yükle". */
export function InstallRow() {
  const { canInstall, install } = usePwaInstall()
  const [sheet, setSheet] = useState(false)
  if (!canInstall) return null
  return (
    <>
      <Row
        onClick={async () => {
          if (!(await install())) setSheet(true)
        }}
        icon={DeviceMobile}
        iconColor="tint"
        title="Uygulamayı Ana Ekrana Ekle"
      />
      <InstallSheet open={sheet} onOpenChange={setSheet} />
    </>
  )
}

const DISMISS_KEY = "erqan:install-dismissed"

/** Özet sayfasında, telefonda bir kez gösterilen ve kapatılabilen yükleme kartı. */
export function InstallBanner() {
  const { canInstall, mobile, install } = usePwaInstall()
  const [sheet, setSheet] = useState(false)
  const [dismissed, setDismissed] = useState(() => {
    try {
      return typeof window === "undefined" || localStorage.getItem(DISMISS_KEY) === "1"
    } catch {
      return false
    }
  })
  if (!canInstall || !mobile || dismissed) return null

  function dismiss() {
    setDismissed(true)
    try {
      localStorage.setItem(DISMISS_KEY, "1")
    } catch {
      /* gizli sekmede depolama olmayabilir */
    }
  }

  return (
    <section aria-label="Uygulamayı yükle" className="relative flex items-center gap-3.5 rounded-card bg-grouped-secondary p-4 pr-3">
      <AppIcon className="size-14" />
      <div className="min-w-0 flex-1">
        <div className="text-headline text-label">Erqan’ı ana ekrana ekleyin</div>
        <div className="text-subheadline text-label-secondary">Tam ekran, uygulama gibi açılır.</div>
        <Button
          size="sm"
          className="mt-2.5"
          onClick={async () => {
            if (!(await install())) setSheet(true)
          }}
        >
          Ekle
        </Button>
      </div>
      <button
        type="button"
        aria-label="Kapat"
        onClick={dismiss}
        className="press-dim absolute top-2.5 right-2.5 flex size-7 items-center justify-center rounded-full bg-fill-tertiary text-label-secondary"
      >
        <X weight="bold" className="size-3.5" />
      </button>
      <InstallSheet open={sheet} onOpenChange={setSheet} />
    </section>
  )
}
