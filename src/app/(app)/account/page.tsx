"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { useTheme } from "next-themes"
import { Loader2, Monitor, Moon, Sun, Upload } from "lucide-react"
import { toast } from "sonner"
import { errorMessage, fileUrl, pb } from "@/lib/pb"
import { date, num } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useApp } from "@/components/app-provider"
import { Field, PageHeader, Panel, Stat } from "@/components/kit"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function AccountPage() {
  const { user, config } = useApp()
  if (!user) return null
  return (
    <>
      <PageHeader
        title="Hesabım"
        description="Profil bilgileriniz, giriş ayarlarınız ve görünüm tercihiniz."
        actions={
          config?.features.public_profiles ? (
            <Link href={`/users/${user.id}`} className="type-title-small text-primary hover:underline">
              Herkese açık profilimi gör
            </Link>
          ) : undefined
        }
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="grid min-w-0 gap-4 lg:col-span-2">
          <ProfileForm />
          <EmailForm />
          <PasswordForm />
        </div>
        <div className="grid min-w-0 content-start gap-4">
          <Panel title="Hesap özeti">
            <div className="grid grid-cols-2 gap-5">
              <Stat label="Ödenen kira" value={num(user.rent_count)} hint="dönem" />
              <Stat label="İtibar" value={num(user.reputation)} hint="puan" />
            </div>
            <p className="mt-4 type-body-medium text-muted-foreground">Üyelik tarihi: {date(user.created)}</p>
          </Panel>
          <ThemePanel />
        </div>
      </div>
    </>
  )
}

function Avatar({ name, src, className }: { name: string; src?: string; className?: string }) {
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
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary type-title-large text-primary-foreground",
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

function ProfileForm() {
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
    <Panel title="Profil">
      <form onSubmit={save} className="grid gap-4">
        <div className="flex items-center gap-4">
          <Avatar name={name || user.email} src={preview || current} className="size-16" />
          <div className="flex flex-wrap gap-2">
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
            <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
              <Upload />
              Fotoğraf seç
            </Button>
            {(file || user.avatar) && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => (file ? setFile(null) : removeAvatar())}
              >
                {file ? "Seçimi iptal et" : "Fotoğrafı kaldır"}
              </Button>
            )}
          </div>
        </div>
        <Field label="Ad soyad" htmlFor="name">
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={255} />
        </Field>
        <div>
          <Button type="submit" disabled={!dirty || pending}>
            {pending && <Loader2 className="animate-spin" />}
            Profili kaydet
          </Button>
        </div>
      </form>
    </Panel>
  )
}

function EmailForm() {
  const { user } = useApp()
  const [editing, setEditing] = useState(false)
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
      setEditing(false)
      setEmail("")
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setPending(false)
    }
  }

  return (
    <Panel title="E-posta">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-medium">{user.email}</div>
          <div className="type-body-medium text-muted-foreground">Giriş için kullandığınız adres.</div>
        </div>
        {!editing && (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            E-postayı değiştir
          </Button>
        )}
      </div>
      {sentTo && (
        <p className="mt-4 rounded-lg bg-muted px-3 py-2 type-body-medium text-gain">
          {sentTo} adresine bir onay e-postası gönderdik. Bağlantıya tıkladığınızda e-postanız değişir.
        </p>
      )}
      {editing && (
        <form onSubmit={submit} className="mt-4 grid gap-3">
          <Field
            label="Yeni e-posta"
            htmlFor="new-email"
            hint="Yeni adrese bir onay bağlantısı gönderilir; onaylayana kadar mevcut adresiniz geçerli kalır."
          >
            <Input id="new-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <div className="flex gap-2">
            <Button type="submit" disabled={pending || !email.trim()}>
              {pending && <Loader2 className="animate-spin" />}
              Onay e-postası gönder
            </Button>
            <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
              Vazgeç
            </Button>
          </div>
        </form>
      )}
    </Panel>
  )
}

function PasswordForm() {
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
    } catch (err) {
      const msg = errorMessage(err)
      setError(/oldPassword|Failed to update/i.test(msg) ? "Mevcut şifreniz hatalı." : msg)
    } finally {
      setPending(false)
    }
  }

  return (
    <Panel title="Şifre">
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-3">
        <Field label="Mevcut şifre" htmlFor="old-password">
          <Input
            id="old-password"
            type="password"
            autoComplete="current-password"
            required
            value={oldPassword}
            onChange={(e) => setOld(e.target.value)}
          />
        </Field>
        <Field label="Yeni şifre" htmlFor="new-password">
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <Field label="Yeni şifre (tekrar)" htmlFor="confirm-password">
          <Input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </Field>
        {error && (
          <p role="alert" className="type-body-medium text-destructive sm:col-span-3">
            {error}
          </p>
        )}
        <div className="sm:col-span-3">
          <Button type="submit" disabled={pending || !oldPassword || !password}>
            {pending && <Loader2 className="animate-spin" />}
            Şifreyi değiştir
          </Button>
        </div>
      </form>
    </Panel>
  )
}

function ThemePanel() {
  // Sayfa yalnızca istemcide (oturum yüklendikten sonra) çizildiği için hidrasyon farkı olmaz.
  const { theme, setTheme } = useTheme()
  const options = [
    { value: "light", label: "Açık", icon: Sun },
    { value: "dark", label: "Koyu", icon: Moon },
    { value: "system", label: "Sistem", icon: Monitor },
  ]
  return (
    <Panel title="Görünüm">
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Tema">
        {options.map((o) => {
          const active = theme === o.value
          const Icon = o.icon
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setTheme(o.value)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-lg border px-2 py-3 type-body-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                active ? "border-primary bg-primary/10 font-medium text-primary" : "hover:bg-muted",
              )}
            >
              <Icon className="size-4" />
              {o.label}
            </button>
          )
        })}
      </div>
    </Panel>
  )
}
