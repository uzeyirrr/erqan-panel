"use client"

import Link from "next/link"
import { useState } from "react"
import { ChevronLeft, ChevronRight, Copy, Receipt } from "lucide-react"
import { toast } from "sonner"
import { pb } from "@/lib/pb"
import { dateTime, money, TX_LABEL } from "@/lib/format"
import type { Offer, Transaction, TransactionKind } from "@/lib/types"
import { useLoad } from "@/hooks/use-data"
import { useApp } from "@/components/app-provider"
import { EmptyState, ErrorState, Loading, Money, NativeSelect, PageHeader, Panel, Stat } from "@/components/kit"
import { Button } from "@/components/ui/button"

const PER_PAGE = 30

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

  return (
    <>
      <PageHeader title="Cüzdan" description="Bakiyeniz ve tüm kredi hareketleriniz." />

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="min-w-0 rounded-xl border bg-card p-5 lg:col-span-2">
          <div className="grid grid-cols-2 gap-5">
            <Stat label="Kullanılabilir bakiye" value={money(user?.credit, currency)} />
            <Stat
              label="Tekliflerde bloke"
              value={money(held.data?.total, currency)}
              hint={
                held.data && held.data.count > 0 ? (
                  <Link href="/offers" className="text-primary hover:underline">
                    {held.data.count} bekleyen teklif
                  </Link>
                ) : (
                  "Bekleyen teklif yok"
                )
              }
            />
          </div>
          <p className="mt-5 max-w-prose type-body-medium text-muted-foreground">
            Şu an kredi yükleme yok. Hesabınıza kredi yöneticiler tarafından eklenir; kira ve satış gelirleriniz otomatik
            olarak bakiyenize geçer.
          </p>
        </section>

        {referralOn && config && user && (
          <Panel title="Davet kodunuz">
            <div className="rounded-lg border border-dashed px-3 py-2 text-center type-title-large">
              {user.referral_code}
            </div>
            <Button
              variant="outline"
              className="mt-3 w-full"
              onClick={() => navigator.clipboard.writeText(inviteUrl).then(() => toast.success("Davet bağlantısı kopyalandı."))}
            >
              <Copy />
              Bağlantıyı kopyala
            </Button>
            <dl className="mt-4 grid gap-1.5 type-body-medium">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Davet ettikleriniz</dt>
                <dd className="font-medium">{user.referral_count || 0}</dd>
              </div>
              {config.referral.inviter_bonus > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Davet başına kazancınız</dt>
                  <dd>
                    <Money value={config.referral.inviter_bonus} />
                  </dd>
                </div>
              )}
              {config.referral.invitee_bonus > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Arkadaşınızın kazancı</dt>
                  <dd>
                    <Money value={config.referral.invitee_bonus} />
                  </dd>
                </div>
              )}
            </dl>
            <p className="mt-3 type-body-small text-muted-foreground">
              {config.referral.trigger === "signup" && "Bonus, arkadaşınız kayıt olduğunda verilir."}
              {config.referral.trigger === "first_rent" && "Bonus, arkadaşınız ilk kirasını ödediğinde verilir."}
              {config.referral.trigger === "first_purchase" && "Bonus, arkadaşınız ilk mülkünü aldığında verilir."}
            </p>
          </Panel>
        )}
      </div>

      <Panel
        className="mt-4"
        title="Hareketler"
        bodyClassName="p-0"
        actions={
          <NativeSelect
            aria-label="Hareket türü"
            className="h-8 w-auto"
            value={kind}
            onChange={(e) => {
              setKind(e.target.value as TransactionKind | "")
              setPage(1)
            }}
          >
            <option value="">Tüm hareketler</option>
            {(Object.keys(TX_LABEL) as TransactionKind[])
              .filter((k) => k !== "commission")
              .map((k) => (
                <option key={k} value={k}>
                  {TX_LABEL[k]}
                </option>
              ))}
          </NativeSelect>
        }
      >
        {txs.error && (
          <div className="p-4">
            <ErrorState message={txs.error} onRetry={txs.reload} />
          </div>
        )}
        {!data && txs.loading && <Loading />}
        {data && data.items.length === 0 && (
          <EmptyState
            className="m-4"
            icon={<Receipt className="size-6" />}
            title={kind ? "Bu türde hareket yok" : "Henüz hareket yok"}
            description={kind ? "Filtreyi temizleyip tüm hareketlere bakın." : "Mülk aldığınızda veya kira ödediğinizde burada görünür."}
          />
        )}
        {data && data.items.length > 0 && (
          <ul className="divide-y">
            {data.items.map((t) => (
              <TxRow key={t.id} tx={t} />
            ))}
          </ul>
        )}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3 type-body-medium">
            <span className="text-muted-foreground">
              Sayfa {data.page} / {data.totalPages}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft />
                Önceki
              </Button>
              <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>
                Sonraki
                <ChevronRight />
              </Button>
            </div>
          </div>
        )}
      </Panel>
    </>
  )
}

function TxRow({ tx }: { tx: Transaction }) {
  const { currency } = useApp()
  const prop = tx.expand?.property
  const who = tx.expand?.counterparty
  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="type-title-small">{TX_LABEL[tx.kind] || tx.kind}</div>
        <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 type-body-small text-muted-foreground">
          <span>{dateTime(tx.created)}</span>
          {prop && (
            <Link href={`/properties/${prop.id}`} className="truncate text-primary hover:underline">
              {prop.name}
            </Link>
          )}
          {who && who.name && <span className="truncate">{who.name}</span>}
          {tx.note && !prop && <span className="truncate">{tx.note}</span>}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <Money value={tx.amount} signed className="type-title-small" />
        <div className="type-body-small text-muted-foreground">{money(tx.balance_after, currency)}</div>
      </div>
    </li>
  )
}
