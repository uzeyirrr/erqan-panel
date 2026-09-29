"use client"

import { useState } from "react"
import {
  ArrowsClockwise,
  BellRinging,
  Buildings,
  ChartLineUp,
  Coins,
  Hammer,
  Handshake,
  Key,
  LockSimple,
  Receipt,
  UserPlus,
  Users,
} from "@phosphor-icons/react"
import { api } from "@/lib/pb"
import { STATUS_LABEL, num } from "@/lib/format"
import type { PropertyStatus } from "@/lib/types"
import { useAction, useLoad } from "@/hooks/use-data"
import { ErrorState, Loading, Money, PageHeader, Row, RowItem, Section, Tag } from "@/components/kit"
import { Spinner } from "@/components/ui/spinner"

type IconType = React.ComponentType<{ className?: string; weight?: "fill" | "regular" | "bold" }>

const JOB_LABEL: Record<string, string> = {
  charges: "Kira tahsilatı",
  warnings: "Bakiye uyarısı",
  offers: "Süresi dolan teklif",
  builds: "Tamamlanan inşaat",
}

const JOB_ICON: Record<string, [IconType, string]> = {
  charges: [Receipt, "green"],
  warnings: [BellRinging, "red"],
  offers: [Handshake, "orange"],
  builds: [Hammer, "indigo"],
}

const STATUS_DOT: Record<PropertyStatus, string> = {
  empty: "var(--system-gray)",
  rent: "var(--tint)",
  rented: "var(--system-green)",
  sale: "var(--system-orange)",
  building: "var(--system-indigo)",
}

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

export default function AdminOverviewPage() {
  const stats = useLoad(() => api.admin.stats(), [])
  const { run, isPending } = useAction()
  const [result, setResult] = useState<Record<string, { done: number; failed: number }> | null>(null)

  const s = stats.data
  const running = isPending("maint")

  async function runMaintenance() {
    const res = await run("maint", () => api.admin.runMaintenance(), "Bakım işi çalıştı.")
    if (res) {
      setResult(res)
      stats.reload()
    }
  }

  const maintenance = (
    <>
      <Section
        header="Bakım İşi"
        footer="Bu iş normalde her saat başı kendiliğinden çalışır: dönemi gelen kiraları tahsil eder, bakiye uyarılarını gönderir, süresi dolan teklifleri iade eder, biten inşaatları tamamlar."
      >
        <Row
          onClick={runMaintenance}
          disabled={running}
          icon={ArrowsClockwise}
          iconColor="gray"
          title="Bakım İşini Şimdi Çalıştır"
          accessory={running ? <Spinner className="size-4 text-label-secondary" /> : undefined}
        />
      </Section>
      {result && (
        <Section header="Bakım İşi Sonucu">
          {Object.entries(result).map(([k, v]) => {
            const [icon, color] = JOB_ICON[k] || [ArrowsClockwise, "gray"]
            return (
              <Row
                key={k}
                icon={icon}
                iconColor={color}
                title={JOB_LABEL[k] || k}
                accessory={
                  <span className="flex shrink-0 items-center gap-2">
                    {v.failed > 0 && <Tag tone="red" className="tabular-nums">{v.failed} hata</Tag>}
                    <span className="text-body text-label-secondary tabular-nums">{num(v.done)}</span>
                  </span>
                }
              />
            )
          })}
        </Section>
      )}
      </>
  )

  return (
    <>
      <PageHeader title="Genel Bakış" description="Sistemdeki kullanıcılar, kredi dolaşımı, mülkler ve kiralar." />

      {stats.error && <ErrorState message={stats.error} onRetry={stats.reload} />}
      {!s && stats.loading && <Loading />}
      {!s && !stats.loading && <div className="grid gap-8">{maintenance}</div>}

      {s && (
        <div className="grid gap-8">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Tile
              icon={Users}
              color="var(--system-blue)"
              label="Kullanıcı"
              value={num(s.users)}
              hint={s.banned_users ? `${s.banned_users} engelli` : "Engelli yok"}
            />
            <Tile
              icon={Coins}
              color="var(--system-green)"
              label="Dolaşımdaki kredi"
              value={<Money value={s.credit_in_circulation} />}
            />
            <Tile
              icon={LockSimple}
              color="var(--system-orange)"
              label="Tekliflerde bloke"
              value={<Money value={s.held_in_offers} />}
              hint={`${s.pending_offers} bekleyen teklif`}
            />
            <Tile
              icon={ChartLineUp}
              color="var(--system-mint)"
              label="Komisyon geliri"
              value={<Money value={s.commission_revenue} className="text-gain" />}
            />
            <Tile icon={UserPlus} color="var(--system-pink)" label="Davetle gelen" value={num(s.referred_users)} hint="kullanıcı" />
            <Tile icon={Buildings} color="var(--system-indigo)" label="Mülk" value={num(s.properties)} />
            <Tile icon={Key} color="var(--system-teal)" label="Aktif kira" value={num(s.active_rentals)} />
            <Tile
              icon={ArrowsClockwise}
              color="var(--system-purple)"
              label="Kira hacmi"
              value={<Money value={s.monthly_rent_volume} />}
              hint="Dönem başına"
            />
          </div>

          <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
            <div className="grid min-w-0 gap-8">
              <Section header="Mülk Tipleri" footer="Satış oranı: satılan mülklerin toplam (satılan + kalan stok) içindeki payı.">
                {s.by_type.length === 0 && (
                  <RowItem className="text-subheadline text-label-secondary">Henüz mülk tipi yok.</RowItem>
                )}
                {s.by_type.map((t) => {
                  const total = t.sold + t.stock
                  const pct = total ? Math.round((t.sold / total) * 100) : 0
                  return (
                    <Row
                      key={t.type}
                      title={t.type}
                      detail={<span className="inline-block min-w-11 tabular-nums">{t.sold > 0 && pct === 0 ? "%<1" : `%${pct}`}</span>}
                    >
                      <span className="mt-0.5 block text-subheadline text-label-secondary tabular-nums">
                        {num(t.sold)} satılan · {num(t.stock)} kalan stok
                      </span>
                      <span
                        role="progressbar"
                        aria-label={`${t.type} satış oranı`}
                        aria-valuenow={pct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        className="mt-2 mb-0.5 block h-1.5 overflow-hidden rounded-full bg-fill-tertiary"
                      >
                        <span className="block h-full rounded-full bg-tint" style={{ width: `${pct}%` }} />
                      </span>
                    </Row>
                  )
                })}
              </Section>

              <Section header="Mülk Durumları">
                {(Object.keys(STATUS_LABEL) as PropertyStatus[]).map((st) => (
                  <Row
                    key={st}
                    leading={<span className="size-2.5 shrink-0 rounded-full" style={{ background: STATUS_DOT[st] }} />}
                    title={STATUS_LABEL[st]}
                    detail={<span className="tabular-nums">{num(s.by_status[st] || 0)}</span>}
                  />
                ))}
              </Section>
            </div>

            <div className="grid min-w-0 gap-8">
              <Section header="Ülkelere Göre Mülkler">
                {s.by_country.length === 0 ? (
                  <RowItem className="text-subheadline text-label-secondary">Henüz satılmış mülk yok.</RowItem>
                ) : (
                  s.by_country.map((c) => (
                    <Row
                      key={c.country}
                      leading={
                        <span aria-hidden="true" className="w-[30px] shrink-0 text-center text-title3 leading-none">
                          {c.flag}
                        </span>
                      }
                      title={c.country}
                      detail={<span className="tabular-nums">{num(c.count)}</span>}
                    />
                  ))
                )}
              </Section>

              {maintenance}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
