"use client"

import Link from "next/link"
import { Suspense, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { X } from "lucide-react"
import { pb } from "@/lib/pb"
import { TX_LABEL, dateTime, num } from "@/lib/format"
import type { Transaction, TransactionKind, User } from "@/lib/types"
import { useLoad } from "@/hooks/use-data"
import { ErrorState, Field, Loading, Money, NativeSelect, PageHeader, Tag } from "@/components/kit"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Pager, TableWrap, usePageFor } from "../_components/admin-kit"

const PER_PAGE = 50

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

  const items = list.data?.items || []
  const inflow = items.filter((t) => t.amount > 0).reduce((a, t) => a + t.amount, 0)
  const outflow = items.filter((t) => t.amount < 0).reduce((a, t) => a + t.amount, 0)

  return (
    <>
      <PageHeader
        title="İşlemler"
        description="Her kredi hareketinin kaydı. Komisyon satırları sistemin gelirini gösterir."
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="İşlem türü" htmlFor="tx-kind">
          <NativeSelect id="tx-kind" value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="">Tümü</option>
            {(Object.keys(TX_LABEL) as TransactionKind[]).map((k) => (
              <option key={k} value={k}>
                {TX_LABEL[k]}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Başlangıç tarihi" htmlFor="tx-from">
          <Input id="tx-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9" />
        </Field>
        <Field label="Bitiş tarihi" htmlFor="tx-to">
          <Input id="tx-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9" />
        </Field>
        {userId && (
          <Field label="Kullanıcı">
            <div className="flex h-9 items-center justify-between gap-2 rounded-lg border bg-card px-2.5 type-body-medium">
              <span className="truncate">{filteredUser.data?.name || filteredUser.data?.email || userId}</span>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => router.replace(pathname)}
                aria-label="Kullanıcı filtresini kaldır"
              >
                <X />
              </Button>
            </div>
          </Field>
        )}
      </div>

      {list.error && <ErrorState message={list.error} onRetry={list.reload} />}
      {!list.data && list.loading && <Loading />}

      {list.data && (
        <>
          <p className="mb-2 type-body-medium text-muted-foreground">{num(list.data.totalItems)} işlem</p>
          <TableWrap>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Tarih</TableHead>
                  <TableHead>Kullanıcı</TableHead>
                  <TableHead>Tür</TableHead>
                  <TableHead>Ayrıntı</TableHead>
                  <TableHead className="text-right">Tutar</TableHead>
                  <TableHead className="pr-4 text-right">Sonraki bakiye</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      Filtrelerle eşleşen işlem yok.
                    </TableCell>
                  </TableRow>
                )}
                {items.map((t) => {
                  const u = t.expand?.user
                  const system = !t.user
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="pl-4 type-body-medium whitespace-nowrap">{dateTime(t.created)}</TableCell>
                      <TableCell className="type-body-medium">
                        {system ? (
                          <Tag className="bg-primary/10 text-primary">Sistem</Tag>
                        ) : (
                          <Link href={`/admin/transactions?user=${t.user}`} className="hover:underline">
                            {u?.name || u?.email || "Silinmiş kullanıcı"}
                          </Link>
                        )}
                      </TableCell>
                      <TableCell className="type-body-medium whitespace-nowrap">{TX_LABEL[t.kind]}</TableCell>
                      <TableCell className="max-w-72 type-body-medium">
                        {t.expand?.property && (
                          <Link href={`/properties/${t.property}`} className="block truncate hover:underline">
                            {t.expand.property.name}
                          </Link>
                        )}
                        <span className="block truncate type-body-small text-muted-foreground">
                          {[
                            t.expand?.counterparty && `Karşı taraf: ${t.expand.counterparty.name || t.expand.counterparty.email}`,
                            // Komisyon satırında not, komisyonun alındığı işlem türüdür.
                            system && t.note in TX_LABEL ? `${TX_LABEL[t.note as TransactionKind]} komisyonu` : t.note,
                          ]
                            .filter(Boolean)
                            .join(". ")}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Money value={t.amount} signed className="font-medium" />
                      </TableCell>
                      <TableCell className="pr-4 text-right">
                        {system ? <span className="text-muted-foreground">Yok</span> : <Money value={t.balance_after} />}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
              {items.length > 0 && (
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={4} className="pl-4 type-body-medium">
                      Bu sayfadaki toplam
                    </TableCell>
                    <TableCell className="text-right type-body-medium">
                      <div>
                        <Money value={inflow} signed />
                      </div>
                      <div>
                        <Money value={outflow} signed />
                      </div>
                    </TableCell>
                    <TableCell className="pr-4" />
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </TableWrap>
          <Pager page={page} totalPages={list.data.totalPages} onPage={setPage} />
        </>
      )}
    </>
  )
}

export default function AdminTransactionsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Transactions />
    </Suspense>
  )
}
