"use client"

import Link from "next/link"
import { useState } from "react"
import { ArrowLeftRight, Search, Trash2 } from "lucide-react"
import { api, pb } from "@/lib/pb"
import { loadCatalog, PROPERTY_EXPAND } from "@/lib/catalog"
import { STATUS_LABEL, num } from "@/lib/format"
import type { Property, PropertyStatus, User } from "@/lib/types"
import { useAction, useLoad } from "@/hooks/use-data"
import { ConfirmDialog, ErrorState, Field, Loading, Money, NativeSelect, PageHeader, StatusBadge } from "@/components/kit"
import { Parcel } from "@/components/parcel"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FormDialog, Pager, TableWrap, useDebounced, usePageFor } from "../_components/admin-kit"

const PER_PAGE = 25

export default function AdminPropertiesPage() {
  const catalog = useLoad(() => loadCatalog(true), [])
  const [q, setQ] = useState("")
  const query = useDebounced(q.trim())
  const [status, setStatus] = useState("")
  const [type, setType] = useState("")
  const [city, setCity] = useState("")
  const filters: string[] = []
  const params: Record<string, string> = {}
  if (query) {
    filters.push("name ~ {:q}")
    params.q = query
  }
  if (status) {
    filters.push("status = {:s}")
    params.s = status
  }
  if (type) {
    filters.push("type = {:t}")
    params.t = type
  }
  if (city) {
    filters.push("city = {:c}")
    params.c = city
  }
  const filter = filters.length ? pb.filter(filters.join(" && "), params) : ""
  const [page, setPage] = usePageFor(filter)

  const list = useLoad(
    () => pb.collection("properties").getList<Property>(page, PER_PAGE, { sort: "-created", filter, expand: PROPERTY_EXPAND }),
    [page, filter],
  )

  const { run, isPending } = useAction()
  const [transfer, setTransfer] = useState<{ property: Property; email: string; candidates: User[]; owner: string } | null>(null)
  const [deleting, setDeleting] = useState<Property | null>(null)

  async function searchOwner(email: string) {
    if (!transfer) return
    setTransfer({ ...transfer, email })
    if (email.trim().length < 2) return
    try {
      const res = await pb.collection("users").getList<User>(1, 8, {
        filter: pb.filter("email ~ {:q} || name ~ {:q}", { q: email.trim() }),
      })
      setTransfer((t) => (t ? { ...t, candidates: res.items } : t))
    } catch {
      /* arama hatası sessiz geçilir */
    }
  }

  const cat = catalog.data

  return (
    <>
      <PageHeader title="Mülkler" description="Sistemdeki tüm mülkler. Sahiplik devri ve silme buradan yapılır." />

      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Mülk adıyla ara"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-9 pl-8"
            aria-label="Mülk ara"
          />
        </div>
        <NativeSelect value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Durum">
          <option value="">Tüm durumlar</option>
          {(Object.keys(STATUS_LABEL) as PropertyStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect value={type} onChange={(e) => setType(e.target.value)} aria-label="Tip">
          <option value="">Tüm tipler</option>
          {cat?.types.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect value={city} onChange={(e) => setCity(e.target.value)} aria-label="Şehir">
          <option value="">Tüm şehirler</option>
          {cat?.countries.map((co) => (
            <optgroup key={co.id} label={`${co.flag} ${co.name}`}>
              {cat.cities
                .filter((c) => c.country === co.id)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </optgroup>
          ))}
        </NativeSelect>
      </div>

      {list.error && <ErrorState message={list.error} onRetry={list.reload} />}
      {!list.data && list.loading && <Loading />}

      {list.data && (
        <>
          <p className="mb-2 type-body-medium text-muted-foreground">{num(list.data.totalItems)} mülk</p>
          <TableWrap>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Mülk</TableHead>
                  <TableHead>Sahibi</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead className="text-right">Kiracı</TableHead>
                  <TableHead className="text-right">Yatırım</TableHead>
                  <TableHead className="pr-4 text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.data.items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      Filtrelerle eşleşen mülk yok.
                    </TableCell>
                  </TableRow>
                )}
                {list.data.items.map((p) => {
                  const t = p.expand?.type
                  const c = p.expand?.city
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="pl-4">
                        <div className="flex items-center gap-3">
                          <Parcel id={p.id} typeKey={t?.key} color={t?.color} className="size-10 shrink-0 rounded-md" />
                          <div className="min-w-0">
                            <Link href={`/properties/${p.id}`} className="font-medium hover:underline">
                              {p.name}
                            </Link>
                            <div className="type-body-small text-muted-foreground">
                              {t?.name}, {c?.expand?.country?.flag} {c?.name}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="type-body-medium">
                        <Link href={`/users/${p.owner}`} className="hover:underline">
                          {p.expand?.owner?.name || p.expand?.owner?.email || "Bilinmiyor"}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={p.status} />
                      </TableCell>
                      <TableCell className="figure text-right">
                        {p.tenant_count}/{p.tenant_limit}
                      </TableCell>
                      <TableCell className="text-right">
                        <Money value={p.invested} />
                      </TableCell>
                      <TableCell className="pr-4">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setTransfer({ property: p, email: "", candidates: [], owner: "" })}
                          >
                            <ArrowLeftRight />
                            Devret
                          </Button>
                          <Button variant="ghost" size="icon-sm" onClick={() => setDeleting(p)} aria-label={`${p.name} sil`}>
                            <Trash2 />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableWrap>
          <Pager page={page} totalPages={list.data.totalPages} onPage={setPage} />
        </>
      )}

      {transfer && (
        <FormDialog
          open
          onOpenChange={(o) => !o && setTransfer(null)}
          title={`${transfer.property.name} devret`}
          description="Mülk ücretsiz olarak yeni sahibe geçer. Aktif kiralar yeni sahiple devam eder, bekleyen teklifler iade edilir."
          pending={isPending("transfer")}
          submitLabel="Mülkü devret"
          onSubmit={async () => {
            if (!transfer.owner) return
            const res = await run("transfer", () => api.admin.transfer(transfer.property.id, transfer.owner), "Mülk devredildi.")
            if (res) {
              setTransfer(null)
              list.reload()
            }
          }}
        >
          <Field label="Yeni sahip" htmlFor="tr-q" hint="E-posta veya adla arayın, listeden seçin.">
            <Input id="tr-q" value={transfer.email} onChange={(e) => searchOwner(e.target.value)} autoComplete="off" autoFocus />
          </Field>
          {transfer.candidates.length > 0 && (
            <ul className="grid max-h-56 gap-1 overflow-y-auto" role="listbox" aria-label="Kullanıcılar">
              {transfer.candidates
                .filter((u) => u.id !== transfer.property.owner)
                .map((u) => (
                  <li key={u.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={transfer.owner === u.id}
                      onClick={() => setTransfer({ ...transfer, owner: u.id })}
                      className={`w-full rounded-md border px-3 py-2 text-left type-body-medium ${
                        transfer.owner === u.id ? "border-primary bg-primary/10" : "hover:bg-muted"
                      }`}
                    >
                      <span className="font-medium">{u.name || "İsimsiz"}</span>
                      <span className="block type-body-small text-muted-foreground">{u.email}</span>
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </FormDialog>
      )}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`${deleting?.name} silinsin mi?`}
        description="Mülk kalıcı olarak silinir; kiralama kayıtları, teklifler ve yükseltmeleri de silinir. Bekleyen teklif blokeleri iade edilmez, bu yüzden önce mülkü satıştan kaldırın. Bu işlem geri alınamaz."
        confirmLabel="Kalıcı olarak sil"
        destructive
        pending={isPending("delete")}
        onConfirm={async () => {
          if (!deleting) return
          const res = await run("delete", () => pb.collection("properties").delete(deleting.id), "Mülk silindi.")
          if (res === undefined) return false
          list.reload()
        }}
      />
    </>
  )
}
