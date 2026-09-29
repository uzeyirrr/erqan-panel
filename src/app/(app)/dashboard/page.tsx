"use client"

import Link from "next/link"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { ArrowsDownUp, Bell, Buildings, ShareNetwork, Storefront, TrendDown, TrendUp, Wallet } from "@phosphor-icons/react"
import { toast } from "sonner"
import { api, pb } from "@/lib/pb"
import { money, monthLabel, num, relative } from "@/lib/format"
import type { Notification } from "@/lib/types"
import { cn } from "@/lib/utils"
import { useLoad } from "@/hooks/use-data"
import { useApp } from "@/components/app-provider"
import { BarButton, ErrorState, Loading, Money, PageHeader, Row, RowItem, Section, Tag } from "@/components/kit"
import { InstallBanner } from "@/components/install-app"

const compact = new Intl.NumberFormat("tr-TR", { notation: "compact", maximumFractionDigits: 1 })

type IconType = React.ComponentType<{ className?: string; weight?: "fill" | "regular" | "bold" }>

/** Sağlık / Fitness özet kutucuğu: renkli simge ve etiket, büyük değer, küçük not. */
function Tile({
  icon: Icon,
  color,
  label,
  value,
  hint,
}: {
  icon: IconType
  color: string
  label: string
  value: React.ReactNode
  hint?: React.ReactNode
}) {
  return (
    <div className="min-w-0 rounded-card bg-grouped-secondary p-4">
      <div className="flex items-center gap-1.5 text-footnote font-semibold" style={{ color }}>
        <Icon weight="fill" className="size-4 shrink-0" />
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-2 truncate text-title2 text-label tabular-nums">{value}</div>
      {hint && <div className="mt-0.5 truncate text-caption1 text-label-secondary">{hint}</div>}
    </div>
  )
}

export default function DashboardPage() {
  const { user, currency, config, unread } = useApp()
  const portfolio = useLoad(() => api.portfolio(), [user?.credit])
  const notes = useLoad(
    () =>
      pb.collection("notifications").getList<Notification>(1, 5, {
        filter: pb.filter("user = {:u}", { u: user!.id }),
        sort: "-created",
      }),
    [user?.id],
    !!user,
  )

  const p = portfolio.data
  const net = p ? p.monthly_rent_income - p.monthly_rent_expense : 0
  const period = config?.rent.period_days || 30
  const inviteUrl =
    typeof window !== "undefined" && user ? `${window.location.origin}/register?ref=${user.referral_code}` : ""
  const firstName = user?.name?.split(" ")[0]

  async function shareInvite() {
    // iPhone'da sistem paylaşım sayfasını açar; desteklenmiyorsa panoya kopyalar.
    if (navigator.share) {
      try {
        await navigator.share({ title: "Erqan", text: "Erqan'a katıl, birlikte yatırım yapalım.", url: inviteUrl })
        return
      } catch {
        /* kullanıcı paylaşımı kapattı */
        return
      }
    }
    await navigator.clipboard.writeText(inviteUrl)
    toast.success("Davet bağlantısı kopyalandı.")
  }

  return (
    <>
      <PageHeader
        title="Özet"
        description={firstName ? `Merhaba, ${firstName}` : undefined}
        actions={<BarButton standalone label="Bildirimler" icon={Bell} href="/notifications" badge={unread} />}
      />

      {portfolio.error && <ErrorState message={portfolio.error} onRetry={portfolio.reload} />}
      {!p && portfolio.loading && <Loading />}

      {p && (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
          <div className="grid min-w-0 gap-4">
            <InstallBanner />
            {/* Bakiye kartı (Apple Cash / Cüzdan dili) */}
            <section
              aria-label="Bakiye"
              className="relative overflow-hidden rounded-card bg-tint p-5 text-tint-foreground shadow-card"
              style={{
                backgroundImage:
                  "radial-gradient(120% 90% at 100% 0%, rgb(255 255 255 / 0.28), transparent 55%), linear-gradient(160deg, transparent, rgb(0 0 0 / 0.18))",
              }}
            >
              <div className="text-subheadline font-semibold opacity-85">Bakiye</div>
              <div className="mt-1 text-large-title tabular-nums">{money(user?.credit, currency)}</div>
              <div className="mt-5 grid grid-cols-2 gap-2.5">
                <Link
                  href="/market"
                  className="press-scale flex h-11 items-center justify-center gap-2 rounded-full bg-white/22 text-body font-semibold backdrop-blur-md"
                >
                  <Storefront weight="fill" className="size-5" />
                  Satın Al
                </Link>
                <Link
                  href="/wallet"
                  className="press-scale flex h-11 items-center justify-center gap-2 rounded-full bg-white/22 text-body font-semibold backdrop-blur-md"
                >
                  <Wallet weight="fill" className="size-5" />
                  Cüzdan
                </Link>
              </div>
            </section>

            <div className="grid grid-cols-2 gap-3">
              <Tile
                icon={TrendUp}
                color="var(--system-green)"
                label="Kira geliri"
                value={<Money value={p.monthly_rent_income} />}
                hint={`${period} günde · ${p.active_tenants} kiracı`}
              />
              <Tile
                icon={TrendDown}
                color="var(--system-orange)"
                label="Ödediğiniz kira"
                value={<Money value={p.monthly_rent_expense} />}
                hint={`${p.active_rentals} aktif kiralama`}
              />
              <Tile
                icon={ArrowsDownUp}
                color="var(--system-blue)"
                label="Net akış"
                value={<Money value={net} signed />}
                hint={`Dönem başına`}
              />
              <Tile
                icon={Buildings}
                color="var(--system-indigo)"
                label="Portföy"
                value={`${num(p.properties)} mülk`}
                hint={`${money(p.invested, currency)} yatırım`}
              />
            </div>
          </div>

          <div className="grid min-w-0 gap-8">
            <Section header="Son 12 Ay" plain bodyClassName="px-2 pt-4 pb-2">
              <div className="mb-2 flex gap-4 px-2 text-caption1 text-label-secondary">
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-system-green" /> Gelir
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-system-red" /> Gider
                </span>
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={p.months.map((m) => ({ ...m, label: monthLabel(m.month) }))} barGap={2}>
                    <CartesianGrid vertical={false} stroke="var(--separator)" strokeDasharray="2 3" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} stroke="var(--label-secondary)" />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      fontSize={11}
                      width={40}
                      stroke="var(--label-secondary)"
                      orientation="right"
                      tickFormatter={(v: number) => compact.format(v)}
                    />
                    <Tooltip
                      cursor={{ fill: "var(--fill-quaternary)" }}
                      contentStyle={{
                        background: "var(--glass-bg-thick)",
                        backdropFilter: "var(--glass-blur)",
                        border: "none",
                        borderRadius: 14,
                        boxShadow: "var(--glass-shadow)",
                        color: "var(--label)",
                        fontSize: 13,
                      }}
                      labelStyle={{ color: "var(--label-secondary)", fontSize: 12 }}
                      formatter={(v, name) => [money(Number(v), currency), name === "income" ? "Gelir" : "Gider"]}
                    />
                    <Bar dataKey="income" name="income" fill="var(--system-green)" radius={[4, 4, 4, 4]} maxBarSize={14} />
                    <Bar dataKey="expense" name="expense" fill="var(--system-red)" radius={[4, 4, 4, 4]} maxBarSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Section>

            <Section header="Mülkleriniz" actions={<Link href="/my-properties" className="text-tint">Tümü</Link>}>
              {p.properties === 0 ? (
                <Row href="/market" icon={Storefront} iconColor="green" title="İlk mülkünüzü satın alın" />
              ) : (
                (
                  [
                    ["Kiracı bekleyen", p.by_status.rent, "tint"],
                    ["Kirada (dolu)", p.by_status.rented, "green"],
                    ["Satışta", p.by_status.sale, "orange"],
                    ["Boş", p.by_status.empty, "gray"],
                    ["İnşaatta", p.by_status.building, "indigo"],
                  ] as const
                )
                  .filter(([, n]) => n > 0)
                  .map(([label, n, tone]) => (
                    <Row
                      key={label}
                      href="/my-properties"
                      title={label}
                      accessory={
                        <span className="flex items-center gap-2">
                          <Tag tone={tone} className="tabular-nums">
                            {n}
                          </Tag>
                        </span>
                      }
                    />
                  ))
              )}
            </Section>

            <Section header="Son Bildirimler" actions={<Link href="/notifications" className="text-tint">Tümü</Link>}>
              {notes.data && notes.data.items.length === 0 && (
                <RowItem className="text-subheadline text-label-secondary">Henüz bildiriminiz yok.</RowItem>
              )}
              {notes.data?.items.map((n) => (
                <Row
                  key={n.id}
                  href={n.link || "/notifications"}
                  accessory="none"
                  leading={
                    <span className={cn("size-2.5 shrink-0 self-start rounded-full mt-[18px]", n.read ? "bg-transparent" : "bg-tint")} />
                  }
                >
                  <span className="flex items-baseline gap-2">
                    <span className="min-w-0 flex-1 truncate text-headline text-label">{n.title}</span>
                    <span className="shrink-0 text-footnote text-label-secondary">{relative(n.created)}</span>
                  </span>
                  <span className="line-clamp-2 text-subheadline text-label-secondary">{n.body}</span>
                </Row>
              ))}
            </Section>

            {config?.features.referral && user?.referral_code && (
              <Section
                header="Arkadaşını Davet Et"
                footer={
                  config.referral.inviter_bonus > 0
                    ? `Davet ettiğiniz her kişi için ${money(config.referral.inviter_bonus, currency)} kazanın.`
                    : "Davet bağlantınızı paylaşın."
                }
              >
                <Row title="Davet kodu" detail={<span className="font-mono tracking-widest text-label">{user.referral_code}</span>} />
                <Row onClick={shareInvite} icon={ShareNetwork} iconColor="tint" title="Bağlantıyı Paylaş" />
              </Section>
            )}
          </div>
        </div>
      )}
    </>
  )
}
