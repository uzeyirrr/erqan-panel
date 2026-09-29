"use client"

import Link from "next/link"
import { useState } from "react"
import { Ban, Coins, Receipt, Search, ShieldCheck, ShieldOff, UserCheck } from "lucide-react"
import { api, pb } from "@/lib/pb"
import { date, money, num } from "@/lib/format"
import type { User } from "@/lib/types"
import { useAction, useLoad } from "@/hooks/use-data"
import { useApp } from "@/components/app-provider"
import { ConfirmDialog, ErrorState, Field, Loading, Money, PageHeader, Tag } from "@/components/kit"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FormDialog, NumberInput, Pager, TableWrap, useDebounced, usePageFor } from "../_components/admin-kit"

const PER_PAGE = 25

export default function AdminUsersPage() {
  const { user: me, currency } = useApp()
  const [q, setQ] = useState("")
  const query = useDebounced(q.trim())
  const [page, setPage] = usePageFor(query)
  const list = useLoad(
    () =>
      pb.collection("users").getList<User>(page, PER_PAGE, {
        sort: "-created",
        filter: query ? pb.filter("name ~ {:q} || email ~ {:q}", { q: query }) : "",
      }),
    [page, query],
  )
  const { run, isPending } = useAction()
  const [credit, setCredit] = useState<{ user: User; amount: number; note: string } | null>(null)
  const [confirm, setConfirm] = useState<{ user: User; patch: { role?: "user" | "admin"; banned?: boolean } } | null>(null)

  const users = list.data?.items || []

  return (
    <>
      <PageHeader title="Kullanıcılar" description="Bakiye düzeltme, yetki verme ve hesap engelleme." />

      <div className="relative mb-4 max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Ad veya e-posta ile ara"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="pl-8"
          aria-label="Kullanıcı ara"
        />
      </div>

      {list.error && <ErrorState message={list.error} onRetry={list.reload} />}
      {!list.data && list.loading && <Loading />}

      {list.data && (
        <>
          <p className="mb-2 type-body-medium text-muted-foreground">{num(list.data.totalItems)} kullanıcı</p>
          <TableWrap>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Kullanıcı</TableHead>
                  <TableHead className="text-right">Bakiye</TableHead>
                  <TableHead className="text-right">Kira sayısı</TableHead>
                  <TableHead className="text-right">İtibar</TableHead>
                  <TableHead>Kayıt</TableHead>
                  <TableHead className="pr-4 text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      Aramanızla eşleşen kullanıcı yok.
                    </TableCell>
                  </TableRow>
                )}
                {users.map((u) => (
                  <TableRow key={u.id} className={u.banned ? "opacity-70" : undefined}>
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-2">
                        <Link href={`/users/${u.id}`} className="font-medium hover:underline">
                          {u.name || "İsimsiz"}
                        </Link>
                        {u.role === "admin" && <Tag className="bg-primary/10 text-primary">Yönetici</Tag>}
                        {u.banned && <Tag className="bg-destructive/10 text-destructive">Engelli</Tag>}
                      </div>
                      <div className="type-body-small text-muted-foreground">{u.email}</div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Money value={u.credit} className="font-medium" />
                    </TableCell>
                    <TableCell className="figure text-right">{num(u.rent_count)}</TableCell>
                    <TableCell className="figure text-right">{num(u.reputation)}</TableCell>
                    <TableCell className="type-body-medium whitespace-nowrap">{date(u.created)}</TableCell>
                    <TableCell className="pr-4">
                      <div className="flex justify-end gap-1">
                        <Button variant="outline" size="sm" onClick={() => setCredit({ user: u, amount: 0, note: "" })}>
                          <Coins />
                          Bakiye
                        </Button>
                        <Link
                          href={`/admin/transactions?user=${u.id}`}
                          className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
                          aria-label={`${u.name} işlemleri`}
                          title="İşlemler"
                        >
                          <Receipt />
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          disabled={u.id === me?.id}
                          onClick={() => setConfirm({ user: u, patch: { role: u.role === "admin" ? "user" : "admin" } })}
                          aria-label={u.role === "admin" ? "Yöneticiliği kaldır" : "Yönetici yap"}
                          title={u.role === "admin" ? "Yöneticiliği kaldır" : "Yönetici yap"}
                        >
                          {u.role === "admin" ? <ShieldOff /> : <ShieldCheck />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          disabled={u.id === me?.id}
                          onClick={() => setConfirm({ user: u, patch: { banned: !u.banned } })}
                          aria-label={u.banned ? "Engeli kaldır" : "Engelle"}
                          title={u.banned ? "Engeli kaldır" : "Engelle"}
                        >
                          {u.banned ? <UserCheck /> : <Ban />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableWrap>
          <Pager page={page} totalPages={list.data.totalPages} onPage={setPage} />
        </>
      )}

      {credit && (
        <FormDialog
          open
          onOpenChange={(o) => !o && setCredit(null)}
          title={`${credit.user.name || credit.user.email} bakiyesi`}
          description={`Şu anki bakiye: ${money(credit.user.credit, currency)}. Eklemek için pozitif, düşmek için negatif tutar girin.`}
          pending={isPending("credit")}
          submitLabel="Bakiyeyi güncelle"
          onSubmit={async () => {
            if (!credit.amount) return
            const res = await run(
              "credit",
              () => api.admin.credit(credit.user.id, credit.amount, credit.note.trim()),
              "Bakiye güncellendi.",
            )
            if (res) {
              setCredit(null)
              list.reload()
            }
          }}
        >
          <Field label={`Tutar (${currency})`} htmlFor="c-amount" hint="Örnek: 500 veya -250">
            <NumberInput id="c-amount" value={credit.amount} onChange={(v) => setCredit({ ...credit, amount: v })} autoFocus />
          </Field>
          {credit.amount !== 0 && (
            <p className="type-body-medium">
              Yeni bakiye: <span className="figure font-medium">{money(credit.user.credit + credit.amount, currency)}</span>
            </p>
          )}
          <Field label="Açıklama" htmlFor="c-note" hint="Kullanıcıya bildirimde ve işlem geçmişinde gösterilir.">
            <Textarea
              id="c-note"
              required
              rows={2}
              value={credit.note}
              onChange={(e) => setCredit({ ...credit, note: e.target.value })}
            />
          </Field>
        </FormDialog>
      )}

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={
          confirm?.patch.role === "admin"
            ? `${confirm.user.name} yönetici yapılsın mı?`
            : confirm?.patch.role === "user"
              ? `${confirm?.user.name} yöneticilikten çıkarılsın mı?`
              : confirm?.patch.banned
                ? `${confirm?.user.name} engellensin mi?`
                : `${confirm?.user.name} için engel kaldırılsın mı?`
        }
        description={
          confirm?.patch.role === "admin"
            ? "Yöneticiler tüm ayarları, kullanıcıları ve bakiyeleri değiştirebilir."
            : confirm?.patch.banned
              ? "Engellenen kullanıcı giriş yapamaz ve işlem yapamaz. Mevcut kiraları dönem sonunda normal şekilde işler."
              : undefined
        }
        confirmLabel={
          confirm?.patch.role === "admin"
            ? "Yönetici yap"
            : confirm?.patch.role === "user"
              ? "Yöneticiliği kaldır"
              : confirm?.patch.banned
                ? "Engelle"
                : "Engeli kaldır"
        }
        destructive={confirm?.patch.banned === true || confirm?.patch.role === "user"}
        pending={isPending("user")}
        onConfirm={async () => {
          if (!confirm) return
          const res = await run("user", () => api.admin.user(confirm.user.id, confirm.patch), "Kullanıcı güncellendi.")
          if (res === undefined) return false
          list.reload()
        }}
      />
    </>
  )
}
