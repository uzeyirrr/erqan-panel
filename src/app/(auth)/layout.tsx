import { Buildings, ChartLineUp, Key } from "@phosphor-icons/react/ssr"
import { AppIcon } from "@/components/brand"

// iOS "Yenilikler" (What's New) ekranı dili: renkli simgeler ve kısa açıklamalar.
const POINTS = [
  {
    icon: Buildings,
    color: "var(--system-blue)",
    title: "Dünyanın her yerinde mülk",
    text: "Farklı şehirlerde arsa, ev ve villa satın alın.",
  },
  {
    icon: Key,
    color: "var(--system-orange)",
    title: "Kirayı siz belirleyin",
    text: "Kiracılarınız her dönem bakiyelerinden otomatik öder.",
  },
  {
    icon: ChartLineUp,
    color: "var(--system-green)",
    title: "Kazancınız tek ekranda",
    text: "Portföyünüzü ve kira gelirinizi anlık takip edin.",
  },
]

/**
 * Kilit ekranı / iOS duvar kağıdı hissi veren, yavaşça salınan renk bulutları. Bulanıklık filtresi
 * yerine yumuşak radyal degradeler kullanılır (telefonda pil ve GPU dostu). Hareketi Azalt
 * açıkken bulutlar durur.
 */
function Aurora() {
  const blob = "absolute rounded-full animate-aurora will-change-transform"
  return (
    <div aria-hidden="true" className="fixed inset-0 -z-10 overflow-hidden bg-[#eef3fa] dark:bg-[#04060c]">
      <div
        className={`${blob} -top-[20vmax] -left-[18vmax] size-[70vmax] opacity-55 dark:opacity-60`}
        style={{ background: "radial-gradient(closest-side, var(--tint), transparent)" }}
      />
      <div
        className={`${blob} -right-[22vmax] top-[10vh] size-[62vmax] opacity-40 [animation-delay:-9s] [animation-duration:32s] dark:opacity-45`}
        style={{ background: "radial-gradient(closest-side, var(--system-indigo), transparent)" }}
      />
      <div
        className={`${blob} -bottom-[26vmax] left-[5vw] size-[66vmax] opacity-45 [animation-delay:-17s] [animation-duration:38s] dark:opacity-40`}
        style={{ background: "radial-gradient(closest-side, var(--system-cyan), transparent)" }}
      />
      {/* İnce doku: renkleri yumuşatır ve kartın okunaklı kalmasını sağlar */}
      <div className="absolute inset-0 bg-white/20 dark:bg-black/25" />
    </div>
  )
}

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="relative isolate flex min-h-dvh flex-col items-center justify-center px-4 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      <Aurora />
      <div className="w-full max-w-[420px] overflow-hidden rounded-[34px] glass lg:grid lg:max-w-[960px] lg:grid-cols-[minmax(0,1fr)_440px] desk:max-w-[820px] desk:grid-cols-[minmax(0,1fr)_380px] desk:rounded-[22px]">
        <aside
          className="relative hidden flex-col p-10 lg:flex desk:p-9"
          style={{
            background:
              "radial-gradient(120% 80% at 0% 0%, color-mix(in srgb, var(--tint) 22%, transparent), transparent 70%)",
          }}
        >
          <div className="flex items-center gap-3">
            <AppIcon className="size-11 shadow-[0_4px_14px_rgb(0_0_0/0.14)]" />
            <span className="text-title3 font-bold text-label">Erqan</span>
          </div>
          <h2 className="mt-12 text-large-title font-bold text-balance text-label desk:mt-10">
            Emlak yatırımlarınızı sanal dünyada yönetin
          </h2>
          <ul className="mt-10 grid gap-6">
            {POINTS.map(({ icon: Icon, color, title, text }) => (
              <li key={title} className="flex items-start gap-4">
                <span
                  className="flex size-11 shrink-0 items-center justify-center rounded-[12px] text-white desk:size-9 desk:rounded-[9px]"
                  style={{ background: color }}
                >
                  <Icon weight="fill" className="size-6 desk:size-5" />
                </span>
                <div className="min-w-0 pt-0.5">
                  <div className="text-headline text-label">{title}</div>
                  <div className="text-subheadline text-label-secondary">{text}</div>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-auto pt-12 text-footnote text-label-tertiary">© Erqan · erqan.com</p>
        </aside>
        <main className="px-6 pt-9 pb-7 sm:px-9 lg:flex lg:flex-col lg:justify-center lg:border-l lg:border-separator/60 lg:bg-background/55 lg:p-10 dark:lg:bg-background/35 desk:p-9">
          {children}
        </main>
      </div>
      <p className="mt-6 text-footnote text-label-secondary lg:hidden">© Erqan · erqan.com</p>
    </div>
  )
}
