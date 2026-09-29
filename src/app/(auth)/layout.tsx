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

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh items-center justify-center px-5 pt-[calc(env(safe-area-inset-top)+2rem)] pb-[calc(env(safe-area-inset-bottom)+2rem)] lg:gap-24">
      <aside className="hidden max-w-sm lg:block">
        <AppIcon className="size-20" />
        <h2 className="mt-6 text-large-title text-label">Emlak yatırımlarınızı sanal dünyada yönetin</h2>
        <ul className="mt-10 grid gap-7">
          {POINTS.map(({ icon: Icon, color, title, text }) => (
            <li key={title} className="flex items-start gap-4">
              <Icon weight="fill" className="size-9 shrink-0" style={{ color }} />
              <div>
                <div className="text-headline text-label">{title}</div>
                <div className="text-subheadline text-label-secondary">{text}</div>
              </div>
            </li>
          ))}
        </ul>
      </aside>
      <main className="w-full max-w-sm">{children}</main>
    </div>
  )
}
