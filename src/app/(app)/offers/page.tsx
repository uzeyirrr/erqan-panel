"use client"

import Link from "next/link"
import { useState } from "react"
import { Handshake } from "lucide-react"
import { api, pb } from "@/lib/pb"
import { money, OFFER_STATUS_LABEL, relative } from "@/lib/format"
import type { Offer, OfferStatus } from "@/lib/types"
import { cn } from "@/lib/utils"
import { useAction, useLoad } from "@/hooks/use-data"
import { useApp } from "@/components/app-provider"
import { PropertyVisual } from "@/components/property-card"
import { ConfirmDialog, EmptyState, ErrorState, Loading, Money, PageHeader } from "@/components/kit"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type Side = "in" | "out"
type Pending = { offer: Offer; action: "accept" | "reject" | "withdraw" } | null

const STATUS_STYLE: Record<OfferStatus, string> = {
  pending: "border-primary/40 bg-primary/10 text-primary",
  accepted: "border-gain/40 bg-gain/10 text-gain",
  rejected: "border-loss/40 bg-loss/10 text-loss",
  withdrawn: "border-border text-muted-foreground",
  expired: "border-border text-muted-foreground",
}

function sortOffers(list: Offer[]) {
  return [...list].sort((a, b) => {
    const pa = a.status === "pending" ? 0 : 1
    const pbb = b.status === "pending" ? 0 : 1
    if (pa !== pbb) return pa - pbb
    return b.created.localeCompare(a.created)
  })
}

export default function OffersPage() {
  const { user, config, currency } = useApp()
  const [tab, setTab] = useState<Side>("in")
  const [confirm, setConfirm] = useState<Pending>(null)
  const { run, pending } = useAction()
  const uid = user?.id

  const offers = useLoad(
    async () => {
      const list = await pb.collection("offers").getFullList<Offer>({
        filter: pb.filter("buyer = {:u} || seller = {:u}", { u: uid }),
        sort: "-created",
        expand: "property,property.type,buyer,seller",
      })
      return {
        in: sortOffers(list.filter((o) => o.seller === uid)),
        out: sortOffers(list.filter((o) => o.buyer === uid)),
      }
    },
    [uid],
    !!uid,
  )

  const inPending = offers.data?.in.filter((o) => o.status === "pending").length || 0
  const outPending = offers.data?.out.filter((o) => o.status === "pending").length || 0
  const commission = config?.sale.commission_pct || 0

  async function execute() {
    if (!confirm) return
    const { offer, action } = confirm
    const msg = { accept: "Teklif kabul edildi.", reject: "Teklif reddedildi.", withdraw: "Teklif geri çekildi." }[action]
    const res = await run(offer.id, () => api.respondOffer(offer.id, action), msg)
    if (res) offers.reload()
  }

  const dialog = (() => {
    if (!confirm) return null
    const { offer, action } = confirm
    const name = offer.expand?.property?.name || "Mülk"
    const amount = money(offer.amount, currency)
    if (action === "accept") {
      const net = Math.round(offer.amount * (1 - commission / 100) * 100) / 100
      return {
        title: "Teklifi kabul et",
        confirmLabel: "Kabul et ve sat",
        description: (
          <>
            {name}, {offer.expand?.buyer?.name || "alıcıya"} {amount} karşılığında devredilecek.
            {commission > 0
              ? ` %${commission} komisyon düşüldükten sonra hesabınıza ${money(net, currency)} geçer.`
              : ` Hesabınıza ${amount} geçer.`}{" "}
            Bu mülke gelen diğer teklifler kapanır. Bu işlem geri alınamaz.
          </>
        ),
      }
    }
    if (action === "reject")
      return {
        title: "Teklifi reddet",
        confirmLabel: "Reddet",
        destructive: true,
        description: `${name} için ${amount} teklif reddedilecek; bloke tutar alıcıya iade edilir.`,
      }
    return {
      title: "Teklifi geri çek",
      confirmLabel: "Geri çek",
      destructive: true,
      description: `${name} için verdiğiniz ${amount} teklif geri çekilecek; bloke tutar bakiyenize iade edilir.`,
    }
  })()

  return (
    <>
      <PageHeader
        title="Teklifler"
        description={
          config?.offers
            ? `Teklif tutarı, teklif sürdükçe bakiyenizde bloke kalır. Teklifler ${config.offers.expire_days} gün sonra kendiliğinden kapanır.`
            : undefined
        }
      />

      {offers.error && <ErrorState message={offers.error} onRetry={offers.reload} />}
      {!offers.data && offers.loading && <Loading />}

      {offers.data && (
        <Tabs value={tab} onValueChange={(v) => setTab(v as Side)}>
          <TabsList>
            <TabsTrigger value="in" className="px-3">
              Gelen{inPending > 0 && <span className="type-body-small text-primary">({inPending})</span>}
            </TabsTrigger>
            <TabsTrigger value="out" className="px-3">
              Giden{outPending > 0 && <span className="type-body-small text-primary">({outPending})</span>}
            </TabsTrigger>
          </TabsList>
          {(["in", "out"] as Side[]).map((side) => (
            <TabsContent key={side} value={side} className="mt-2">
              {offers.data![side].length === 0 ? (
                <EmptyState
                  icon={<Handshake className="size-6" />}
                  title={side === "in" ? "Size gelen teklif yok" : "Henüz teklif vermediniz"}
                  description={
                    side === "in"
                      ? "Bir mülkünüzü satışa çıkardığınızda alıcıların teklifleri burada görünür."
                      : "Satılık ilanlarda beğendiğiniz mülke fiyat teklif edebilirsiniz."
                  }
                  action={
                    side === "out" ? (
                      <Link href="/listings?tab=sale" className="type-title-small text-primary hover:underline">
                        Satılık ilanlara bak
                      </Link>
                    ) : undefined
                  }
                />
              ) : (
                <ul className="grid gap-3">
                  {offers.data![side].map((o) => (
                    <OfferRow
                      key={o.id}
                      offer={o}
                      side={side}
                      busy={pending === o.id}
                      onAction={(action) => setConfirm({ offer: o, action })}
                    />
                  ))}
                </ul>
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}

      {dialog && (
        <ConfirmDialog
          open={!!confirm}
          onOpenChange={(o) => !o && setConfirm(null)}
          title={dialog.title}
          description={dialog.description}
          confirmLabel={dialog.confirmLabel}
          destructive={"destructive" in dialog ? dialog.destructive : false}
          pending={!!pending}
          onConfirm={execute}
        />
      )}
    </>
  )
}

function OfferRow({
  offer,
  side,
  busy,
  onAction,
}: {
  offer: Offer
  side: Side
  busy: boolean
  onAction: (a: "accept" | "reject" | "withdraw") => void
}) {
  const { currency } = useApp()
  const prop = offer.expand?.property
  const other = side === "in" ? offer.expand?.buyer : offer.expand?.seller
  const isPending = offer.status === "pending"
  return (
    <li className="flex flex-col gap-3 rounded-xl border bg-card p-3 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Link href={prop ? `/properties/${prop.id}` : "#"} className="shrink-0 overflow-hidden rounded-lg border bg-background">
          {prop ? <PropertyVisual property={prop} className="size-14" /> : <div className="size-14 bg-muted" />}
        </Link>
        <div className="min-w-0">
          <Link href={prop ? `/properties/${prop.id}` : "#"} className="block truncate font-medium hover:underline">
            {prop?.name || "Mülk"}
          </Link>
          <div className="mt-0.5 type-body-small text-muted-foreground">
            {side === "in" ? "Alıcı: " : "Satıcı: "}
            {other ? (
              <Link href={`/users/${other.id}`} className="hover:underline">
                {other.name || "Kullanıcı"}
              </Link>
            ) : (
              "Kullanıcı"
            )}
            {prop && prop.sale_price > 0 && isPending && <>, ilan fiyatı {money(prop.sale_price, currency)}</>}
          </div>
          {offer.message && <p className="mt-1 line-clamp-2 type-body-medium text-muted-foreground">“{offer.message}”</p>}
        </div>
      </div>
      <div className="flex items-center justify-between gap-4 border-t pt-3 sm:justify-end sm:border-0 sm:pt-0">
        <div className="sm:text-right">
          <Money value={offer.amount} className="type-title-large" />
          <div className="mt-0.5 flex items-center gap-2 type-body-small text-muted-foreground sm:justify-end">
            <span className={cn("rounded-full border px-2 py-0.5 font-medium", STATUS_STYLE[offer.status])}>
              {OFFER_STATUS_LABEL[offer.status]}
            </span>
            {isPending ? <span>{relative(offer.expires)} kapanır</span> : <span>{relative(offer.updated)}</span>}
          </div>
        </div>
        {isPending && (
          <div className="flex shrink-0 gap-2">
            {side === "in" ? (
              <>
                <Button variant="outline" size="sm" disabled={busy} onClick={() => onAction("reject")}>
                  Reddet
                </Button>
                <Button size="sm" disabled={busy} onClick={() => onAction("accept")}>
                  Kabul et
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" disabled={busy} onClick={() => onAction("withdraw")}>
                Geri çek
              </Button>
            )}
          </div>
        )}
      </div>
    </li>
  )
}
