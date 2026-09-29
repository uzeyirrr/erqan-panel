"use client"

import Link from "next/link"
import { useState } from "react"
import { Handshake } from "@phosphor-icons/react"
import { api, pb } from "@/lib/pb"
import { money, OFFER_STATUS_LABEL, relative } from "@/lib/format"
import type { Offer, OfferStatus } from "@/lib/types"
import { useAction, useLoad } from "@/hooks/use-data"
import { useApp } from "@/components/app-provider"
import { PropertyVisual } from "@/components/property-card"
import { ConfirmDialog, EmptyState, ErrorState, Loading, Money, PageHeader, Section, Tag } from "@/components/kit"
import { Button, buttonVariants } from "@/components/ui/button"
import { Segmented } from "@/components/ui/tabs"

type Side = "in" | "out"
type Pending = { offer: Offer; action: "accept" | "reject" | "withdraw" } | null

const STATUS_TONE: Record<OfferStatus, "orange" | "green" | "red" | "gray"> = {
  pending: "orange",
  accepted: "green",
  rejected: "red",
  withdrawn: "gray",
  expired: "gray",
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
        confirmLabel: "Kabul Et ve Sat",
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
      confirmLabel: "Geri Çek",
      destructive: true,
      description: `${name} için verdiğiniz ${amount} teklif geri çekilecek; bloke tutar bakiyenize iade edilir.`,
    }
  })()

  const list = offers.data?.[tab] || []
  const open = list.filter((o) => o.status === "pending")
  const past = list.filter((o) => o.status !== "pending")

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
        <div className="grid gap-6">
          <Segmented
            aria-label="Teklif yönü"
            value={tab}
            onValueChange={setTab}
            items={[
              { value: "in", label: <SegmentLabel label="Gelen" count={inPending} /> },
              { value: "out", label: <SegmentLabel label="Giden" count={outPending} /> },
            ]}
          />

          {list.length === 0 ? (
            <EmptyState
              icon={<Handshake weight="fill" />}
              title={tab === "in" ? "Size gelen teklif yok" : "Henüz teklif vermediniz"}
              description={
                tab === "in"
                  ? "Bir mülkünüzü satışa çıkardığınızda alıcıların teklifleri burada görünür."
                  : "Satılık ilanlarda beğendiğiniz mülke fiyat teklif edebilirsiniz."
              }
              action={
                tab === "out" ? (
                  <Link href="/listings?tab=sale" className={buttonVariants({ variant: "secondary" })}>
                    Satılık İlanlara Bak
                  </Link>
                ) : undefined
              }
            />
          ) : (
            <div className="grid gap-8">
              {[
                { key: "open", header: "Bekleyen", items: open },
                { key: "past", header: "Geçmiş", items: past },
              ]
                .filter((g) => g.items.length > 0)
                .map((g) => (
                  <Section key={g.key} header={g.header}>
                    {g.items.map((o) => (
                      <OfferRow
                        key={o.id}
                        offer={o}
                        side={tab}
                        busy={pending === o.id}
                        onAction={(action) => setConfirm({ offer: o, action })}
                      />
                    ))}
                  </Section>
                ))}
            </div>
          )}
        </div>
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

function SegmentLabel({ label, count }: { label: string; count: number }) {
  return (
    <>
      {label}
      {count > 0 && <span className="font-normal text-label-secondary tabular-nums">({count})</span>}
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
  const href = prop ? `/properties/${prop.id}` : "#"
  return (
    <li data-slot="list-row" className="group/row relative flex items-start gap-3 pl-4">
      <Link
        href={href}
        aria-hidden="true"
        tabIndex={-1}
        className="press-dim mt-3 shrink-0 overflow-hidden rounded-[12px] bg-fill-tertiary"
      >
        {prop ? <PropertyVisual property={prop} className="size-14" /> : <span className="block size-14" />}
      </Link>
      <div className="relative min-w-0 flex-1 py-3 pr-4 after:hairline after:absolute after:right-0 after:bottom-0 after:left-0 after:bg-separator group-last/row:after:hidden">
        <div className="flex items-baseline gap-3">
          <Link href={href} className="press-dim line-clamp-2 min-w-0 flex-1 text-headline break-words text-label outline-none focus-visible:underline">
            {prop?.name || "Mülk"}
          </Link>
          <Money value={offer.amount} className="shrink-0 text-headline text-label" />
        </div>
        <p className="mt-0.5 truncate text-subheadline text-label-secondary">
          {side === "in" ? "Alıcı: " : "Satıcı: "}
          {other ? (
            <Link href={`/users/${other.id}`} className="press-dim text-tint">
              {other.name || "Kullanıcı"}
            </Link>
          ) : (
            "Kullanıcı"
          )}
        </p>
        {prop && prop.sale_price > 0 && isPending && (
          <p className="text-footnote text-label-secondary tabular-nums">İlan fiyatı {money(prop.sale_price, currency)}</p>
        )}
        {offer.message && <p className="mt-1 line-clamp-2 text-subheadline text-label">“{offer.message}”</p>}
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
          <Tag tone={STATUS_TONE[offer.status]}>{OFFER_STATUS_LABEL[offer.status]}</Tag>
          <span className="text-footnote whitespace-nowrap text-label-secondary">
            {isPending ? `${relative(offer.expires)} kapanır` : relative(offer.updated)}
          </span>
        </div>
        {isPending && (
          <div className="mt-3 flex gap-2">
            {side === "in" ? (
              <>
                <Button
                  variant="destructive-secondary"
                  size="sm"
                  className="flex-1 sm:flex-none sm:px-5"
                  disabled={busy}
                  onClick={() => onAction("reject")}
                >
                  Reddet
                </Button>
                <Button size="sm" className="flex-1 sm:flex-none sm:px-5" disabled={busy} onClick={() => onAction("accept")}>
                  Kabul Et
                </Button>
              </>
            ) : (
              <Button
                variant="destructive-secondary"
                size="sm"
                className="flex-1 sm:flex-none sm:px-5"
                disabled={busy}
                onClick={() => onAction("withdraw")}
              >
                Geri Çek
              </Button>
            )}
          </div>
        )}
      </div>
    </li>
  )
}
