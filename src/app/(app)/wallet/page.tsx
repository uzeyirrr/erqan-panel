"use client"

import Link from "next/link"
import { useState } from "react"
import {
  ArrowDownLeft,
  Buildings,
  CaretLeft,
  CaretRight,
  Copy,
  Gift,
  Hammer,
  Key,
  LockSimple,
  LockSimpleOpen,
  Percent,
  Receipt,
  ShieldCheck,
  Sparkle,
  Storefront,
  TrendUp,
  Wallet,
  Wrench,
} from "@phosphor-icons/react"
import { toast } from "sonner"
import { pb } from "@/lib/pb"
import { dateTime, money, signedMoney, toDate, TX_LABEL } from "@/lib/format"
import type { Offer, Transaction, TransactionKind } from "@/lib/types"
import { cn } from "@/lib/utils"
import { useLoad } from "@/hooks/use-data"
import { useApp } from "@/components/app-provider"
import { Chips, EmptyState, ErrorState, IconTile, Loading, Money, PageHeader, Row, Section } from "@/components/kit"
import { Button } from "@/components/ui/button"

const PER_PAGE = 30

type IconType = React.ComponentType<{ className?: string; weight?: "regular" | "bold" | "fill" }>

// Hareket türüne göre simge kutucuğu (Cüzdan / Apple Cash hareket listesi).
const TX_ICON: Record<TransactionKind, { icon: IconType; color: string }> = {
  purchase: { icon: Storefront, color: "blue" },
  sale: { icon: Buildings, color: "blue" },
  rent_pay: { icon: Key, color: "orange" },
  rent_income: { icon: ArrowDownLeft, color: "green" },
  sale_income: { icon: TrendUp, color: "green" },
  build: { icon: Hammer, color: "orange" },
  upgrade: { icon: Wrench, color: "orange" },
  offer_hold: { icon: LockSimple, color: "indigo" },
  offer_release: { icon: LockSimpleOpen, color: "indigo" },
  referral_bonus: { icon: Gift, color: "pink" },
  signup_bonus: { icon: Sparkle, color: "pink" },
  commission: { icon: Percent, color: "gray" },
  admin_adjust: { icon: ShieldCheck, color: "purple" },
}

const FILTERS: { value: TransactionKind | ""; label: string }[] = [
  { value: "", label: "Tümü" },
  ...(Object.keys(TX_LABEL) as TransactionKind[])
    .filter((k) => k !== "commission")
    .map((k) => ({ value: k, label: TX_LABEL[k] })),
]

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

/** Gün başlığı: Bugün, Dün veya "27 Eylül Pazar" (başka yılsa yıl eklenir). */
function dayLabel(d: Date) {
  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (sameDay(d, now)) return "Bugün"
  if (sameDay(d, yesterday)) return "Dün"
  return d.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    weekday: "long",
    ...(d.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}),
  })
}

/** Hareketleri güne göre gruplar (liste zaten yeniden eskiye sıralı). */
function groupByDay(items: Transaction[]) {
  const groups: { key: string; label: string; items: Transaction[] }[] = []
  for (const t of items) {
    const d = toDate(t.created)
    const key = d ? d.toDateString() : ""
    const last = groups[groups.length - 1]
    if (last && last.key === key) last.items.push(t)
    else groups.push({ key, label: d ? dayLabel(d) : "", items: [t] })
  }
  return groups
}

export default function WalletPage() {
  const { user, currency, config } = useApp()
  const [kind, setKind] = useState<TransactionKind | "">("")
  const [page, setPage] = useState(1)
  const uid = user?.id

  const txs = useLoad(
    () =>
      pb.collection("transactions").getList<Transaction>(page, PER_PAGE, {
        filter: kind ? pb.filter("user = {:u} && kind = {:k}", { u: uid, k: kind }) : pb.filter("user = {:u}", { u: uid }),
        sort: "-created",
        expand: "property,counterparty",
      }),
    [uid, kind, page, user?.credit],
    !!uid,
  )

  const held = useLoad(
    async () => {
      const list = await pb.collection("offers").getFullList<Offer>({
        filter: pb.filter("buyer = {:u} && status = 'pending'", { u: uid }),
        fields: "id,amount",
      })
      return { count: list.length, total: list.reduce((a, o) => a + o.amount, 0) }
    },
    [uid, user?.credit],
    !!uid,
  )

  const referralOn = !!config?.features.referral && !!user?.referral_code
  const inviteUrl =
    typeof window !== "undefined" && user ? `${window.location.origin}/register?ref=${user.referral_code}` : ""
  const data = txs.data
  const heldCount = held.data?.count || 0

  const heldContent = (
    <>
      <LockSimple weight="fill" className="size-5 shrink-0 opacity-90" />
      <span className="min-w-0 flex-1">
        <span className="block text-footnote font-medium opacity-85">Tekliflerde bloke</span>
        <span className="block truncate text-headline tabular-nums">{money(held.data?.total, currency)}</span>
      </span>
      <span className="shrink-0 text-footnote font-medium opacity-85">
        {heldCount > 0 ? `${heldCount} bekleyen teklif` : "Bekleyen teklif yok"}
      </span>
      {heldCount > 0 && <CaretRight weight="bold" className="size-3.5 shrink-0 opacity-70" />}
    </>
  )
  const heldCls = "flex items-center gap-3 rounded-[16px] bg-white/18 px-3.5 py-2.5 backdrop-blur-md"

  return (
    <>
      <PageHeader title="Cüzdan" description="Bakiyeniz ve tüm kredi hareketleriniz." />

      <div className="grid gap-8 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start">
        <div className="grid min-w-0 gap-8">
          <div>
            {/* Bakiye kartı (Apple Cash dili, kart oranında) */}
            <section
              aria-label="Bakiye"
              className="flex aspect-[1.586] flex-col justify-between gap-4 rounded-card bg-tint p-5 text-tint-foreground shadow-card"
              style={{
                backgroundImage:
                  "radial-gradient(120% 90% at 100% 0%, rgb(255 255 255 / 0.28), transparent 55%), linear-gradient(160deg, transparent, rgb(0 0 0 / 0.18))",
              }}
            >
              <div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-subheadline font-semibold opacity-85">Kullanılabilir Bakiye</span>
                  <Wallet weight="fill" className="size-6 opacity-85" />
                </div>
                <div className="mt-1 truncate text-large-title tabular-nums">{money(user?.credit, currency)}</div>
              </div>
              {heldCount > 0 ? (
                <Link href="/offers" className={cn(heldCls, "press-scale outline-none focus-visible:outline-2")}>
                  {heldContent}
                </Link>
              ) : (
                <div className={heldCls}>{heldContent}</div>
              )}
            </section>
            <p className="mt-2 px-4 text-footnote text-label-secondary">
              Şu an kredi yükleme yok. Hesabınıza kredi yöneticiler tarafından eklenir; kira ve satış gelirleriniz
              otomatik olarak bakiyenize geçer.
            </p>
          </div>

          {referralOn && config && user && (
            <Section
              header="Davet Kodunuz"
              footer={
                <>
                  {config.referral.trigger === "signup" && "Bonus, arkadaşınız kayıt olduğunda verilir."}
                  {config.referral.trigger === "first_rent" && "Bonus, arkadaşınız ilk kirasını ödediğinde verilir."}
                  {config.referral.trigger === "first_purchase" && "Bonus, arkadaşınız ilk mülkünü aldığında verilir."}
                </>
              }
            >
              <Row
                title="Davet kodu"
                detail={<span className="font-mono tracking-widest text-label">{user.referral_code}</span>}
              />
              <Row
                icon={Copy}
                iconColor="tint"
                title="Bağlantıyı Kopyala"
                onClick={() => navigator.clipboard.writeText(inviteUrl).then(() => toast.success("Davet bağlantısı kopyalandı."))}
              />
              <Row title="Davet ettikleriniz" detail={<span className="tabular-nums">{user.referral_count || 0}</span>} />
              {config.referral.inviter_bonus > 0 && (
                <Row title="Davet başına kazancınız" detail={<Money value={config.referral.inviter_bonus} />} />
              )}
              {config.referral.invitee_bonus > 0 && (
                <Row title="Arkadaşınızın kazancı" detail={<Money value={config.referral.invitee_bonus} />} />
              )}
            </Section>
          )}
        </div>

        <section aria-labelledby="tx-title" className="grid min-w-0 gap-4">
          <h2 id="tx-title" className="px-1 text-title3 text-label">
            Hareketler
          </h2>
          <Chips
            aria-label="Hareket türü"
            value={kind}
            onChange={(v) => {
              setKind(v)
              setPage(1)
            }}
            items={FILTERS}
          />

          {txs.error && <ErrorState message={txs.error} onRetry={txs.reload} />}
          {!data && txs.loading && <Loading />}
          {data && data.items.length === 0 && (
            <EmptyState
              icon={<Receipt weight="fill" />}
              title={kind ? "Bu türde hareket yok" : "Henüz hareket yok"}
              description={kind ? "Filtreyi temizleyip tüm hareketlere bakın." : "Mülk aldığınızda veya kira ödediğinizde burada görünür."}
            />
          )}
          {data && data.items.length > 0 && (
            <div className={cn("mt-2 grid gap-6 transition-opacity", txs.loading && "opacity-60")}>
              {groupByDay(data.items).map((g) => (
                <Section key={g.key} header={g.label}>
                  {g.items.map((t) => (
                    <TxRow key={t.id} tx={t} />
                  ))}
                </Section>
              ))}
            </div>
          )}
          {data && data.totalPages > 1 && (
            <nav aria-label="Sayfalar" className="mt-2 flex items-center justify-center gap-3">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                <CaretLeft weight="bold" />
                Önceki
              </Button>
              <span className="min-w-16 text-center text-subheadline text-label-secondary tabular-nums">
                {data.page} / {data.totalPages}
              </span>
              <Button variant="secondary" size="sm" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>
                Sonraki
                <CaretRight weight="bold" />
              </Button>
            </nav>
          )}
        </section>
      </div>
    </>
  )
}

function TxRow({ tx }: { tx: Transaction }) {
  const { currency } = useApp()
  const prop = tx.expand?.property
  const who = tx.expand?.counterparty
  const meta = TX_ICON[tx.kind] || { icon: Receipt, color: "gray" }
  const context = [prop?.name, who?.name, !prop && tx.note ? tx.note : ""].filter(Boolean).join(" · ")
  const d = toDate(tx.created)
  return (
    <Row
      href={prop ? `/properties/${prop.id}` : undefined}
      leading={<IconTile icon={meta.icon} color={meta.color} />}
      accessory={
        <span className="flex shrink-0 items-center gap-2">
          <span className="text-right">
            {/* Gelir yeşil ve "+", gider normal renkte "−" (Apple Cash) */}
            <span className={cn("block text-body whitespace-nowrap tabular-nums", tx.amount > 0 ? "text-gain" : "text-label")}>
              {signedMoney(tx.amount, currency)}
            </span>
            <span className="block text-footnote whitespace-nowrap text-label-secondary tabular-nums">
              {money(tx.balance_after, currency)}
            </span>
          </span>
          {prop && <CaretRight weight="bold" className="size-3.5 shrink-0 text-label-tertiary" />}
        </span>
      }
    >
      <span className="block truncate text-headline text-label">{TX_LABEL[tx.kind] || tx.kind}</span>
      {context && <span className="block truncate text-subheadline text-label-secondary">{context}</span>}
      <time dateTime={tx.created} title={dateTime(tx.created)} className="block text-footnote text-label-secondary tabular-nums">
        {d ? d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) : ""}
      </time>
    </Row>
  )
}
