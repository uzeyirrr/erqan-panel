"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { Envelope, Globe, Password, SignOut } from "@phosphor-icons/react"
import { toast } from "sonner"
import { errorMessage, fileUrl, pb } from "@/lib/pb"
import { date, money, num } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useApp } from "@/components/app-provider"
import { ADMIN, MORE } from "@/components/nav"
import { ConfirmDialog, FieldRow, Notice, PageHeader, Row, Section, inlineInput } from "@/components/kit"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Segmented } from "@/components/ui/tabs"
import { Spinner } from "@/components/ui/spinner"
import { Dialog, DialogBody, DialogContent, DialogHeader } from "@/components/ui/dialog"

type SheetKind = "profile" | "email" | "password" | null

export default function AccountPage() {
  const { user, config, isAdmin, unread, currency, logout } = useApp()
  const router = useRouter()
  const [sheet, setSheet] = useState<SheetKind>(null)
  const [confirmLogout, setConfirmLogout] = useState(false)
  if (!user) return null
  const avatar = fileUrl(user, user.avatar, "100x100")

  return (
    <>
      <PageHeader title="Hesap" />

      <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
        <div className="grid min-w-0 gap-8">
          <Section>
            <Row
              onClick={() => setSheet("profile")}
              accessory="chevron"
              leading={<ProfileAvatar name={user.name || user.email} src={avatar} className="size-[60px] text-title2" />}
            >
              <span className="block truncate text-title3 text-label">{user.name || "Adınızı ekleyin"}</span>
              <span className="block truncate text-subheadline text-label-secondary">{user.email}</span>
            </Row>
          </Section>

          <Section header="Özet" footer={`Üyelik tarihi: ${date(user.created)}`}>
            <Row title="Bakiye" detail={<span className="tabular-nums">{money(user.credit, currency)}</span>} href="/wallet" />
            <Row title="Ödenen kira dönemi" detail={<span className="tabular-nums">{num(user.rent_count)}</span>} />
            <Row title="İtibar puanı" detail={<span className="tabular-nums">{num(user.reputation)}</span>} />
          </Section>

          <Section>
            {MORE.map((item) => (
              <Row
                key={item.href}
                href={item.href}
                icon={item.icon}
                iconColor={item.color}
                title={item.label}
                detail={item.href === "/notifications" && unread > 0 ? <UnreadCount n={unread} /> : undefined}
              />
            ))}
            {config?.features.public_profiles && (
              <Row href={`/users/${user.id}`} icon={Globe} iconColor="blue" title="Herkese Açık Profil" />
            )}
          </Section>
        </div>

        <div className="grid min-w-0 gap-8">
          {isAdmin && (
            <Section header="Yönetim">
              {ADMIN.map((item) => (
                <Row key={item.href} href={item.href} icon={item.icon} iconColor={item.color} title={item.label} />
              ))}
            </Section>
          )}

          <Section header="Giriş ve Güvenlik">
            <Row onClick={() => setSheet("email")} icon={Envelope} iconColor="blue" title="E-posta" detail={user.email} accessory="chevron" />
            <Row onClick={() => setSheet("password")} icon={Password} iconColor="gray" title="Şifre" accessory="chevron" />
          </Section>

          <AppearanceSection />

          <Section>
            <Row
              onClick={() => setConfirmLogout(true)}
              icon={SignOut}
              iconColor="red"
              title="Çıkış Yap"
              destructive
            />
          </Section>
        </div>
      </div>

      <ConfirmDialog
        open={confirmLogout}
        onOpenChange={setConfirmLogout}
        title="Çıkış yapılsın mı?"
        description="Tekrar giriş yapana kadar bu cihazda portföyünüzü göremezsiniz."
        confirmLabel="Çıkış Yap"
        destructive
        onConfirm={() => {
          logout()
          router.replace("/login")
        }}
      />
      <ProfileSheet open={sheet === "profile"} onOpenChange={(o) => setSheet(o ? "profile" : null)} />
      <EmailSheet open={sheet === "email"} onOpenChange={(o) => setSheet(o ? "email" : null)} />
      <PasswordSheet open={sheet === "password"} onOpenChange={(o) => setSheet(o ? "password" : null)} />
    </>
  )
}

function UnreadCount({ n }: { n: number }) {
  return (
    <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-system-red px-2 text-footnote font-semibold text-white tabular-nums">
      {n > 99 ? "99+" : n}
    </span>
  )
}

function ProfileAvatar({ name, src, className }: { name: string; src?: string; className?: string }) {
  const initials =
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toLocaleUpperCase("tr-TR"))
      .join("") || "?"
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-linear-to-b from-[#a5abb8] to-[#858994] font-semibold text-white",
        className,
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="size-full object-cover" />
      ) : (
        initials
      )}
    </span>
  )
}

function AppearanceSection() {
  // Sayfa yalnızca istemcide (oturum yüklendikten sonra) çizildiği için hidrasyon farkı olmaz.
  const { theme, setTheme } = useTheme()
  return (
    <Section header="Görünüm" footer="Sistem seçiliyken cihazınızın açık/koyu ayarı izlenir." plain bodyClassName="p-3">
      <Segmented
        aria-label="Tema"
        value={(theme as "system" | "light" | "dark") || "system"}
        onValueChange={setTheme}
        className="[&_[data-slot=tabs-list]]:w-full"
        items={[
          { value: "system", label: "Sistem" },
          { value: "light", label: "Açık" },
          { value: "dark", label: "Koyu" },
        ]}
      />
    </Section>
  )
}

function SaveButton({ form, pending, disabled, children = "Kaydet" }: { form: string; pending: boolean; disabled?: boolean; children?: React.ReactNode }) {
  return (
    <Button type="submit" form={form} size="sm" disabled={pending || disabled} className="h-11 px-4">
      {pending ? <Spinner className="size-4" /> : children}
    </Button>
  )
}

function ProfileSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { user, refreshUser } = useApp()
  const [name, setName] = useState(user?.name || "")
  const [file, setFile] = useState<File | null>(null)
  const [pending, setPending] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : undefined), [file])
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview)
  }, [preview])

  if (!user) return null
  const current = fileUrl(user, user.avatar, "100x100")
  const dirty = name.trim() !== user.name || !!file

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    if (!name.trim()) {
      toast.error("Ad soyad boş olamaz.")
      return
    }
    setPending(true)
    try {
      const data = new FormData()
      data.append("name", name.trim())
      if (file) data.append("avatar", file)
      await pb.collection("users").update(user.id, data)
      await refreshUser()
      setFile(null)
      toast.success("Profiliniz kaydedildi.")
      onOpenChange(false)
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setPending(false)
    }
  }

  async function removeAvatar() {
    if (!user) return
    setPending(true)
    try {
      await pb.collection("users").update(user.id, { avatar: null })
      await refreshUser()
      toast.success("Profil fotoğrafı kaldırıldı.")
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) {
          setName(user.name || "")
          setFile(null)
        }
        onOpenChange(o)
      }}
    >
      <DialogContent>
        <DialogHeader title="Profil" action={<SaveButton form="profile-form" pending={pending} disabled={!dirty} />} />
        <DialogBody>
          <form id="profile-form" onSubmit={save} className="grid gap-6">
            <div className="flex flex-col items-center gap-3 pt-2">
              <ProfileAvatar name={name || user.email} src={preview || current} className="size-24 text-large-title" />
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0] || null
                  if (f && f.size > 5 * 1024 * 1024) {
                    toast.error("Fotoğraf en fazla 5 MB olabilir.")
                    return
                  }
                  setFile(f)
                }}
              />
              <div className="flex gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>
                  {current || file ? "Fotoğrafı değiştir" : "Fotoğraf ekle"}
                </Button>
                {(file || user.avatar) && (
                  <Button
                    type="button"
                    variant="destructive-secondary"
                    size="sm"
                    disabled={pending}
                    onClick={() => (file ? setFile(null) : removeAvatar())}
                  >
                    {file ? "Vazgeç" : "Kaldır"}
                  </Button>
                )}
              </div>
            </div>
            <Section>
              <FieldRow label="Ad soyad" htmlFor="name">
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  maxLength={255}
                  placeholder="Gerekli"
                  className={inlineInput}
                />
              </FieldRow>
            </Section>
          </form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}

function EmailSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { user } = useApp()
  const [email, setEmail] = useState("")
  const [pending, setPending] = useState(false)
  const [sentTo, setSentTo] = useState("")
  if (!user) return null

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const next = email.trim()
    if (!next || next === user?.email) return
    setPending(true)
    try {
      await pb.collection("users").requestEmailChange(next)
      setSentTo(next)
      setEmail("")
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader
          title="E-posta"
          action={<SaveButton form="email-form" pending={pending} disabled={!email.trim()}>Gönder</SaveButton>}
        />
        <DialogBody>
          <form id="email-form" onSubmit={submit} className="grid gap-6">
            <Section header="Mevcut adres">
              <Row title={user.email} />
            </Section>
            <Section
              header="Yeni adres"
              footer="Yeni adrese bir onay bağlantısı gönderilir; onaylayana kadar mevcut adresiniz geçerli kalır."
            >
              <FieldRow label="E-posta" htmlFor="new-email">
                <Input
                  id="new-email"
                  type="email"
                  required
                  autoComplete="email"
                  inputMode="email"
                  placeholder="ornek@eposta.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inlineInput}
                />
              </FieldRow>
            </Section>
            {sentTo && (
              <Notice tone="tint" icon={Envelope}>
                {sentTo} adresine bir onay e-postası gönderdik. Bağlantıya dokunduğunuzda e-postanız değişir.
              </Notice>
            )}
          </form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}

function PasswordSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { user, login } = useApp()
  const [oldPassword, setOld] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)
  if (!user) return null

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (password.length < 8) return setError("Yeni şifre en az 8 karakter olmalı.")
    if (password !== confirm) return setError("Yeni şifreler eşleşmiyor.")
    if (!user) return
    setPending(true)
    try {
      await pb.collection("users").update(user.id, { oldPassword, password, passwordConfirm: confirm })
      // Şifre değişince mevcut oturum geçersizleşir; yeni şifreyle tekrar giriş yap.
      await login(user.email, password)
      setOld("")
      setPassword("")
      setConfirm("")
      toast.success("Şifreniz değiştirildi.")
      onOpenChange(false)
    } catch (err) {
      const msg = errorMessage(err)
      setError(/oldPassword|Failed to update/i.test(msg) ? "Mevcut şifreniz hatalı." : msg)
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader
          title="Şifreyi Değiştir"
          action={<SaveButton form="password-form" pending={pending} disabled={!oldPassword || !password}>Değiştir</SaveButton>}
        />
        <DialogBody>
          <form id="password-form" onSubmit={submit} className="grid gap-6">
            <Section>
              <FieldRow label="Mevcut" htmlFor="old-password">
                <Input
                  id="old-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="Gerekli"
                  value={oldPassword}
                  onChange={(e) => setOld(e.target.value)}
                  className={inlineInput}
                />
              </FieldRow>
            </Section>
            <Section footer="Şifreniz en az 8 karakter olmalı.">
              <FieldRow label="Yeni" htmlFor="new-password">
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  placeholder="Gerekli"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inlineInput}
                />
              </FieldRow>
              <FieldRow label="Tekrar" htmlFor="confirm-password">
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  placeholder="Gerekli"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className={inlineInput}
                />
              </FieldRow>
            </Section>
            {error && (
              <p role="alert" className="px-4 text-footnote text-system-red">
                {error}
              </p>
            )}
          </form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
