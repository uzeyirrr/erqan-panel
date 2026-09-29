"use client"

import { useState } from "react"
import { Coins, MagnifyingGlass, Prohibit, Receipt, ShieldCheck, ShieldSlash, UserCheck, UserCircle } from "@phosphor-icons/react"
import { api, pb } from "@/lib/pb"
import { date, money, num } from "@/lib/format"
import type { User } from "@/lib/types"
import { useAction, useLoad } from "@/hooks/use-data"
import { useApp } from "@/components/app-provider"
import {
  Avatar,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  FieldRow,
  Loading,
  Money,
  PageHeader,
  Row,
  SearchField,
  Section,
  Tag,
} from "@/components/kit"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogBody, DialogContent, DialogHeader } from "@/components/ui/dialog"
import { FormDialog, NumberInput, Pager, useDebounced, usePageFor } from "../_components/admin-kit"

const PER_PAGE = 25

type Patch = { role?: "user" | "admin"; banned?: boolean }

function UserTags({ user }: { user: User }) {
  if (user.role !== "admin" && !user.banned) return null
  return (
    <>
      {user.role === "admin" && <Tag tone="tint">Yönetici</Tag>}
      {user.banned && <Tag tone="red">Engelli</Tag>}
    </>
  )
}

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
  const [selected, setSelected] = useState<User | null>(null)
  const [credit, setCredit] = useState<{ user: User; amount: number; note: string } | null>(null)
  const [confirm, setConfirm] = useState<{ user: User; patch: Patch } | null>(null)

  const users = list.data?.items || []

  // Sayfadaki eylemler: ayrıntı sayfası kapanır, ilgili form / uyarı açılır.
  function openCredit(u: User) {
    setSelected(null)
    setCredit({ user: u, amount: 0, note: "" })
  }
  function openConfirm(u: User, patch: Patch) {
    setSelected(null)
    setConfirm({ user: u, patch })
  }

  return (
    <>
      <PageHeader title="Kullanıcılar" description="Bakiye düzeltme, yetki verme ve hesap engelleme." />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
        <SearchField value={q} onChange={setQ} placeholder="Ad veya e-posta ile ara" aria-label="Kullanıcı ara" className="lg:max-w-sm" />

        {list.error && <ErrorState message={list.error} onRetry={list.reload} />}
        {!list.data && list.loading && <Loading />}

        {list.data &&
          (users.length === 0 ? (
            <EmptyState
              icon={<MagnifyingGlass weight="bold" />}
              title="Sonuç yok"
              description="Aramanızla eşleşen kullanıcı yok."
            />
          ) : (
            <div>
              <Section header={`${num(list.data.totalItems)} kullanıcı`}>
                {users.map((u) => (
                  <Row
                    key={u.id}
                    onClick={() => setSelected(u)}
                    leading={<Avatar name={u.name || u.email} />}
                    accessory="chevron"
                    detail={<Money value={u.credit} />}
                  >
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className="min-w-0 truncate text-body text-label">{u.name || "İsimsiz"}</span>
                      <UserTags user={u} />
                    </span>
                    <span className="block truncate text-subheadline text-label-secondary">{u.email}</span>
                  </Row>
                ))}
              </Section>
              <Pager page={page} totalPages={list.data.totalPages} onPage={setPage} />
            </div>
          ))}
      </div>

      <UserSheet
        user={selected}
        isSelf={!!selected && selected.id === me?.id}
        onOpenChange={(o) => !o && setSelected(null)}
        onCredit={openCredit}
        onPatch={openConfirm}
      />

      {credit && (
        <FormDialog
          open
          onOpenChange={(o) => !o && setCredit(null)}
          title="Bakiye Düzelt"
          description={`${credit.user.name || credit.user.email} için şu anki bakiye: ${money(credit.user.credit, currency)}. Eklemek için pozitif, düşmek için negatif tutar girin.`}
          pending={isPending("credit")}
          submitLabel="Güncelle"
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
          <Section footer="Örnek: 500 veya -250">
            <FieldRow label={`Tutar (${currency})`} htmlFor="c-amount">
              <NumberInput inline id="c-amount" value={credit.amount} onChange={(v) => setCredit({ ...credit, amount: v })} autoFocus />
            </FieldRow>
            <Row
              title="Yeni bakiye"
              detail={
                <span className={credit.amount !== 0 ? "font-semibold text-label" : undefined}>
                  <Money value={credit.user.credit + credit.amount} />
                </span>
              }
            />
          </Section>
          <Section header="Açıklama" footer="Kullanıcıya bildirimde ve işlem geçmişinde gösterilir." plain bodyClassName="p-0">
            <Textarea
              id="c-note"
              aria-label="Açıklama"
              required
              rows={2}
              placeholder="Gerekli"
              value={credit.note}
              onChange={(e) => setCredit({ ...credit, note: e.target.value })}
              className="min-h-20 rounded-none bg-transparent focus-visible:outline-none"
            />
          </Section>
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
            ? "Yönetici Yap"
            : confirm?.patch.role === "user"
              ? "Yöneticiliği Kaldır"
              : confirm?.patch.banned
                ? "Engelle"
                : "Engeli Kaldır"
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

/** Kullanıcı ayrıntısı (Kişiler kartı): bilgiler, bağlantılar ve yönetici eylemleri. */
function UserSheet({
  user,
  isSelf,
  onOpenChange,
  onCredit,
  onPatch,
}: {
  user: User | null
  isSelf: boolean
  onOpenChange: (open: boolean) => void
  onCredit: (u: User) => void
  onPatch: (u: User, patch: Patch) => void
}) {
  // Kapanış animasyonu sırasında içerik boşalmasın diye son kullanıcı tutulur.
  const [last, setLast] = useState<User | null>(user)
  if (user && user !== last) setLast(user)
  const u = user || last

  return (
    <Dialog open={!!user} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader title={u ? u.name || "İsimsiz" : ""} />
        {u && (
          <DialogBody>
            <div className="flex flex-col items-center gap-2 pt-1 text-center">
              <Avatar name={u.name || u.email} className="size-20 text-title1" />
              <div className="min-w-0">
                <div className="truncate text-title2 text-label">{u.name || "İsimsiz"}</div>
                <div className="truncate text-subheadline text-label-secondary">{u.email}</div>
              </div>
              <div className="flex gap-1.5 empty:hidden">
                <UserTags user={u} />
              </div>
            </div>

            <Section>
              <Row title="Bakiye" detail={<Money value={u.credit} />} />
              <Row title="Kira sayısı" detail={<span className="tabular-nums">{num(u.rent_count)}</span>} />
              <Row title="İtibar" detail={<span className="tabular-nums">{num(u.reputation)}</span>} />
              <Row title="Kayıt" detail={date(u.created)} />
            </Section>

            <Section>
              <Row href={`/users/${u.id}`} icon={UserCircle} iconColor="blue" title="Profil" />
              <Row href={`/admin/transactions?user=${u.id}`} icon={Receipt} iconColor="purple" title="İşlemler" />
            </Section>

            <Section footer={isSelf ? "Kendi hesabınızın yetkisini veya engel durumunu değiştiremezsiniz." : undefined}>
              <Row onClick={() => onCredit(u)} icon={Coins} iconColor="green" title="Bakiye Düzelt" accessory="chevron" />
              <Row
                onClick={() => onPatch(u, { role: u.role === "admin" ? "user" : "admin" })}
                disabled={isSelf}
                icon={u.role === "admin" ? ShieldSlash : ShieldCheck}
                iconColor={u.role === "admin" ? "gray" : "indigo"}
                title={u.role === "admin" ? "Yöneticiliği Kaldır" : "Yönetici Yap"}
              />
              <Row
                onClick={() => onPatch(u, { banned: !u.banned })}
                disabled={isSelf}
                icon={u.banned ? UserCheck : Prohibit}
                iconColor={u.banned ? "green" : "red"}
                title={u.banned ? "Engeli Kaldır" : "Engelle"}
                destructive={!u.banned}
              />
            </Section>
          </DialogBody>
        )}
      </DialogContent>
    </Dialog>
  )
}
