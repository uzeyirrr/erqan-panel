"use client"

import { Suspense, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  ArrowFatUp,
  CurrencyCircleDollar,
  Gift,
  Hammer,
  HandCoins,
  Handshake,
  Key,
  Lock,
  LockOpen,
  Percent,
  Receipt,
  Storefront,
  UserPlus,
  Wrench,
  XCircle,
} from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { pb } from "@/lib/pb"
import { TX_LABEL, dateTime, num } from "@/lib/format"
import type { Transaction, TransactionKind, User } from "@/lib/types"
import { useLoad } from "@/hooks/use-data"
import {
  Avatar,
  EmptyState,
  ErrorState,
  FieldRow,
  IconTile,
  Loading,
  Money,
  NativeSelect,
  PageHeader,
  Row,
  Section,
  Tag,
  inlineInput,
} from "@/components/kit"
import { Input } from "@/components/ui/input"
import { Dialog, DialogBody, DialogContent, DialogHeader } from "@/components/ui/dialog"
import { Pager, usePageFor } from "../_components/admin-kit"

const PER_PAGE = 50

type IconType = React.ComponentType<{ className?: string; weight?: "regular" | "bold" | "fill" }>

/** İşlem türüne göre simge kutucuğu (Cüzdan uygulamasındaki kategori simgeleri gibi). */
const KIND_ICON: Record<TransactionKind, { icon: IconType; color: string }> = {
  purchase: { icon: Storefront, color: "blue" },
  rent_pay: { icon: Key, color: "orange" },
  rent_income: { icon: HandCoins, color: "green" },
  sale: { icon: Handshake, color: "indigo" },
  sale_income: { icon: CurrencyCircleDollar, color: "mint" },
  build: { icon: Hammer, color: "brown" },
  upgrade: { icon: ArrowFatUp, color: "purple" },
  offer_hold: { icon: Lock, color: "yellow" },
  offer_release: { icon: LockOpen, color: "teal" },
  referral_bonus: { icon: UserPlus, color: "pink" },
  signup_bonus: { icon: Gift, color: "red" },
  commission: { icon: Percent, color: "gray" },
  admin_adjust: { icon: Wrench, color: "cyan" },
}

/** Satır içi tarih alanı: değer sağa yaslı (Safari ve Chromium iç öğeleri). */
const dateInput =
  "[&::-webkit-date-and-time-value]:text-right [&::-webkit-datetime-edit]:ml-auto [&::-webkit-datetime-edit]:flex-none [&::-webkit-calendar-picker-indicator]:ml-2 [&::-webkit-calendar-picker-indicator]:opacity-50"

const userName = (t: Transaction) => t.expand?.user?.name || t.expand?.user?.email || "Silinmiş kullanıcı"

/** İşlemin açıklama satırı: karşı taraf ve not (komisyon satırında not, komisyonun alındığı işlem türüdür). */
function noteText(t: Transaction) {
  const system = !t.user
  return [
    t.expand?.counterparty && `Karşı taraf: ${t.expand.counterparty.name || t.expand.counterparty.email}`,
    system && t.note in TX_LABEL ? `${TX_LABEL[t.note as TransactionKind]} komisyonu` : t.note,
  ]
    .filter(Boolean)
    .join(". ")
}

function Transactions() {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const userId = params.get("user") || ""
  const [kind, setKind] = useState("")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const parts: string[] = []
  const vals: Record<string, string> = {}
  if (userId) {
    parts.push("user = {:u}")
    vals.u = userId
  }
  if (kind) {
    parts.push("kind = {:k}")
    vals.k = kind
  }
  if (from) {
    parts.push("created >= {:from}")
    vals.from = `${from} 00:00:00.000Z`
  }
  if (to) {
    parts.push("created <= {:to}")
    vals.to = `${to} 23:59:59.999Z`
  }
  const filter = parts.length ? pb.filter(parts.join(" && "), vals) : ""
  const [page, setPage] = usePageFor(filter)

  const list = useLoad(
    () =>
      pb.collection("transactions").getList<Transaction>(page, PER_PAGE, {
        filter,
        sort: "-created",
        expand: "user,property,counterparty",
      }),
    [page, filter],
  )
  const filteredUser = useLoad(
    () => pb.collection("users").getOne<User>(userId, { fields: "id,name,email" }),
    [userId],
    !!userId,
  )
  const [selected, setSelected] = useState<Transaction | null>(null)

  const items = list.data?.items || []
  const inflow = items.filter((t) => t.amount > 0).reduce((a, t) => a + t.amount, 0)
  const outflow = items.filter((t) => t.amount < 0).reduce((a, t) => a + t.amount, 0)
  const filteredName = filteredUser.data?.name || filteredUser.data?.email || userId

  return (
    <>
      <PageHeader
        title="İşlemler"
        description="Her kredi hareketinin kaydı. Komisyon satırları sistemin gelirini gösterir."
      />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:grid-rows-[auto_1fr] lg:items-start">
        <Section header="Filtreler" className="lg:col-start-2 lg:row-start-1">
          {userId && (
            <Row
              leading={<Avatar name={filteredName} className="size-[30px] text-caption1" />}
              title={filteredName}
              subtitle="Yalnızca bu kullanıcı"
              accessory={
                <button
                  type="button"
                  onClick={() => router.replace(pathname)}
                  aria-label="Kullanıcı filtresini kaldır"
                  className="-mr-2 flex size-11 shrink-0 items-center justify-center rounded-full text-label-tertiary outline-none press-dim focus-visible:outline-2"
                >
                  <XCircle weight="fill" className="size-[22px]" />
                </button>
              }
            />
          )}
          <FieldRow label="Tür" htmlFor="tx-kind">
            <NativeSelect inline id="tx-kind" value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="">Tümü</option>
              {(Object.keys(TX_LABEL) as TransactionKind[]).map((k) => (
                <option key={k} value={k}>
                  {TX_LABEL[k]}
                </option>
              ))}
            </NativeSelect>
          </FieldRow>
          <FieldRow label="Başlangıç" htmlFor="tx-from">
            <Input id="tx-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={cn(inlineInput, dateInput, !from && "text-label-tertiary")} />
          </FieldRow>
          <FieldRow label="Bitiş" htmlFor="tx-to">
            <Input id="tx-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className={cn(inlineInput, dateInput, !to && "text-label-tertiary")} />
          </FieldRow>
        </Section>

        <div className="min-w-0 lg:col-start-1 lg:row-span-2 lg:row-start-1">
          {list.error && <ErrorState message={list.error} onRetry={list.reload} />}
          {!list.data && list.loading && <Loading />}

          {list.data &&
            (items.length === 0 ? (
              <EmptyState icon={<Receipt weight="fill" />} title="İşlem yok" description="Filtrelerle eşleşen işlem yok." />
            ) : (
              <>
                <Section header={`${num(list.data.totalItems)} işlem`}>
                  {items.map((t) => {
                    const k = KIND_ICON[t.kind]
                    const note = noteText(t)
                    return (
                      <Row
                        key={t.id}
                        onClick={() => setSelected(t)}
                        leading={<IconTile icon={k?.icon || Receipt} color={k?.color || "gray"} className="size-9 rounded-full" />}
                        detail={
                          <span className="flex flex-col items-end">
                            <Money value={t.amount} signed className="font-semibold" />
                            {/* Sonraki bakiye dar ekranda ayrıntı sayfasında gösterilir. */}
                            {t.user && (
                              <span className="hidden text-footnote sm:block" title="Sonraki bakiye">
                                <Money value={t.balance_after} />
                              </span>
                            )}
                          </span>
                        }
                        accessory="chevron"
                      >
                        <span className="block truncate text-body text-label">{TX_LABEL[t.kind]}</span>
                        <span className="flex min-w-0 items-center gap-1.5 text-subheadline text-label-secondary">
                          {!t.user && <Tag tone="tint">Sistem</Tag>}
                          <span className="min-w-0 truncate">
                            {[t.user && userName(t), t.expand?.property?.name].filter(Boolean).join(" · ")}
                          </span>
                        </span>
                        <span className="block truncate text-footnote text-label-secondary">
                          {[dateTime(t.created), note].filter(Boolean).join(" · ")}
                        </span>
                      </Row>
                    )
                  })}
                </Section>
                <Pager page={page} totalPages={list.data.totalPages} onPage={setPage} />
              </>
            ))}
        </div>

        {items.length > 0 && (
          <Section header="Bu sayfadaki toplam" className="lg:col-start-2">
            <Row title="Giriş" detail={<Money value={inflow} signed />} />
            <Row title="Çıkış" detail={<Money value={outflow} signed />} />
          </Section>
        )}
      </div>

      <TransactionSheet
        tx={selected}
        onOpenChange={(o) => !o && setSelected(null)}
        onFilterUser={(id) => {
          setSelected(null)
          router.push(`${pathname}?user=${id}`)
        }}
      />
    </>
  )
}

/** İşlem ayrıntısı (Cüzdan'daki hareket ayrıntısı gibi). */
function TransactionSheet({
  tx,
  onOpenChange,
  onFilterUser,
}: {
  tx: Transaction | null
  onOpenChange: (open: boolean) => void
  onFilterUser: (id: string) => void
}) {
  // Kapanış animasyonu sırasında içerik boşalmasın diye son kayıt tutulur.
  const [last, setLast] = useState<Transaction | null>(tx)
  if (tx && tx !== last) setLast(tx)
  const t = tx || last
  const k = t ? KIND_ICON[t.kind] : undefined
  const note = t ? noteText(t) : ""

  return (
    <Dialog open={!!tx} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader title="İşlem" />
        {t && (
          <DialogBody>
            <div className="flex flex-col items-center gap-2 pt-1 text-center">
              <IconTile icon={k?.icon || Receipt} color={k?.color || "gray"} size="lg" className="size-14 rounded-full [&_svg]:size-7" />
              <Money value={t.amount} signed className="text-large-title" />
              <div>
                <div className="text-headline text-label">{TX_LABEL[t.kind]}</div>
                <div className="text-subheadline text-label-secondary">{dateTime(t.created)}</div>
              </div>
            </div>

            <Section>
              {t.user ? (
                <Row onClick={() => onFilterUser(t.user)} title="Kullanıcı" detail={userName(t)} accessory="chevron" />
              ) : (
                <Row title="Kullanıcı" detail={<Tag tone="tint">Sistem</Tag>} />
              )}
              <Row title="Sonraki bakiye" detail={t.user ? <Money value={t.balance_after} /> : "Yok"} />
              {t.expand?.property && <Row href={`/properties/${t.property}`} title="Mülk" detail={t.expand.property.name} />}
              {t.expand?.counterparty && (
                <Row title="Karşı taraf" detail={t.expand.counterparty.name || t.expand.counterparty.email} />
              )}
            </Section>

            {note && (
              <Section header="Ayrıntı" plain>
                <p className="text-body text-label">{note}</p>
              </Section>
            )}
          </DialogBody>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default function AdminTransactionsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Transactions />
    </Suspense>
  )
}
