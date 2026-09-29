import { Building2, House, Wallet } from "lucide-react"

const POINTS = [
  { icon: House, text: "Dünyanın farklı şehirlerinde arsa, ev ve villa satın alın." },
  { icon: Building2, text: "Kira fiyatınızı siz belirleyin, kiracılarınız her dönem otomatik ödesin." },
  { icon: Wallet, text: "Portföyünüzü ve kazancınızı tek ekrandan takip edin." },
]

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-screen bg-surface lg:grid-cols-[1fr_minmax(440px,520px)]">
      <aside className="m-4 hidden flex-col justify-between rounded-3xl bg-primary-container p-12 text-on-primary-container lg:flex">
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-xl bg-primary text-on-primary">
            <House className="size-7" />
          </span>
          <span className="type-headline-small">Erqan</span>
        </div>
        <div className="max-w-lg">
          <h2 className="type-display-small">Emlak yatırımlarınızı sanal dünyada yönetin</h2>
          <ul className="mt-8 grid gap-5">
            {POINTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-4 type-body-large">
                <Icon className="mt-0.5 size-6 shrink-0" />
                {text}
              </li>
            ))}
          </ul>
        </div>
      </aside>
      <main className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  )
}
