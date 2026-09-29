"use client"

import Link from "next/link"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Copy, Store } from "lucide-react"
import { toast } from "sonner"
import { api, pb } from "@/lib/pb"
import { money, monthLabel, relative } from "@/lib/format"
import type { Notification } from "@/lib/types"
import { useLoad } from "@/hooks/use-data"
import { useApp } from "@/components/app-provider"
import { ErrorState, Loading, Money, PageHeader, Panel, Stat } from "@/components/kit"
import { Button, buttonVariants } from "@/components/ui/button"

export default function DashboardPage() {
  const { user, currency, config } = useApp()
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

  return (
    <>
      <PageHeader
        title={`Merhaba, ${user?.name?.split(" ")[0] || "yatırımcı"}`}
        description="Portföyünüzün bugünkü durumu."
        actions={
          <Link href="/market" className={buttonVariants({ size: "lg" })}>
            <Store />
            Mülk satın al
          </Link>
        }
      />

      {portfolio.error && <ErrorState message={portfolio.error} onRetry={portfolio.reload} />}
      {!p && portfolio.loading && <Loading />}

      {p && (
        <div className="grid gap-4 lg:grid-cols-3">
          <section className="min-w-0 rounded-xl border bg-card p-5 lg:col-span-3">
            <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
              <Stat label="Bakiye" value={money(user?.credit, currency)} />
              <Stat
                label={`Dönemlik kira geliri (${period} gün)`}
                value={<Money value={p.monthly_rent_income} className="text-gain" />}
                hint={`${p.active_tenants} aktif kiracı`}
              />
              <Stat
                label="Ödediğiniz kira"
                value={<Money value={p.monthly_rent_expense} />}
                hint={`${p.active_rentals} aktif kiralama`}
              />
              <Stat
                label="Net dönemlik akış"
                value={<Money value={net} signed />}
                hint={`${p.properties} mülk, ${money(p.invested, currency)} yatırım`}
              />
            </div>
          </section>

          <Panel title="Son 12 ay" className="lg:col-span-2" bodyClassName="h-72 p-2 sm:p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={p.months.map((m) => ({ ...m, label: monthLabel(m.month) }))} barGap={2}>
                <CartesianGrid vertical={false} stroke="var(--md-sys-color-outline-variant)" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} stroke="var(--md-sys-color-on-surface-variant)" />
                <YAxis tickLine={false} axisLine={false} fontSize={12} width={48} stroke="var(--md-sys-color-on-surface-variant)" />
                <Tooltip
                  cursor={{ fill: "var(--md-sys-color-surface-container-highest)" }}
                  contentStyle={{
                    background: "var(--md-sys-color-inverse-surface)",
                    border: "none",
                    borderRadius: 4,
                    color: "var(--md-sys-color-inverse-on-surface)",
                  }}
                  formatter={(v, name) => [money(Number(v), currency), name === "income" ? "Gelir" : "Gider"]}
                />
                <Bar dataKey="income" name="income" fill="var(--md-custom-gain)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="expense" name="expense" fill="var(--md-sys-color-error)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Panel>

          <Panel
            title="Mülkleriniz"
            actions={
              <Link href="/my-properties" className="type-body-medium text-primary hover:underline">
                Tümü
              </Link>
            }
          >
            {p.properties === 0 ? (
              <p className="type-body-medium text-on-surface-variant">Henüz mülkünüz yok. İlk arsanızla başlayın.</p>
            ) : (
              <dl className="grid gap-2 type-body-medium">
                {(
                  [
                    ["Kiracı bekleyen", p.by_status.rent],
                    ["Kirada (dolu)", p.by_status.rented],
                    ["Satışta", p.by_status.sale],
                    ["Boş", p.by_status.empty],
                    ["İnşaatta", p.by_status.building],
                  ] as const
                )
                  .filter(([, n]) => n > 0)
                  .map(([label, n]) => (
                    <div key={label} className="flex justify-between">
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className="figure font-medium">{n}</dd>
                    </div>
                  ))}
              </dl>
            )}
          </Panel>

          <Panel
            title="Son bildirimler"
            className="lg:col-span-2"
            actions={
              <Link href="/notifications" className="type-body-medium text-primary hover:underline">
                Tümü
              </Link>
            }
            bodyClassName="p-0"
          >
            {notes.data && notes.data.items.length === 0 && (
              <p className="p-4 type-body-medium text-muted-foreground">Henüz bildiriminiz yok.</p>
            )}
            <ul className="divide-y">
              {notes.data?.items.map((n) => (
                <li key={n.id}>
                  <Link href={n.link || "/notifications"} className="flex gap-3 px-4 py-3 hover:bg-muted/50">
                    <span className={`mt-1.5 size-2 shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-primary"}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate type-title-small">{n.title}</span>
                      <span className="block truncate type-body-medium text-muted-foreground">{n.body}</span>
                    </span>
                    <span className="shrink-0 type-body-small text-muted-foreground">{relative(n.created)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>

          {config?.features.referral && user?.referral_code && (
            <Panel title="Arkadaşını davet et">
              <p className="type-body-medium text-muted-foreground">
                {config.referral.inviter_bonus > 0
                  ? `Davet ettiğiniz her kişi için ${money(config.referral.inviter_bonus, currency)} kazanın.`
                  : "Davet bağlantınızı paylaşın."}
              </p>
              <div className="figure mt-3 rounded-lg border border-dashed px-3 py-2 text-center type-title-large tracking-widest">
                {user.referral_code}
              </div>
              <Button
                variant="outline"
                className="mt-3 w-full"
                onClick={() => {
                  navigator.clipboard.writeText(inviteUrl).then(() => toast.success("Davet bağlantısı kopyalandı."))
                }}
              >
                <Copy />
                Bağlantıyı kopyala
              </Button>
            </Panel>
          )}
        </div>
      )}
    </>
  )
}
