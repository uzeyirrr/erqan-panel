"use client"

import Link from "next/link"
import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { errorMessage, pb } from "@/lib/pb"
import { money } from "@/lib/format"
import { useApp } from "@/components/app-provider"
import { Field } from "@/components/kit"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

function RegisterForm() {
  const { login, user, ready, config, currency } = useApp()
  const router = useRouter()
  const params = useSearchParams()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [invite, setInvite] = useState(params.get("ref") || "")
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (ready && user) router.replace("/dashboard")
  }, [ready, user, router])

  if (config && !config.general.registration_open) {
    return <p className="rounded-lg border p-4 type-body-medium">Yeni kayıtlar şu anda kapalı. Daha sonra tekrar deneyin.</p>
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      setError("Şifre en az 8 karakter olmalı.")
      return
    }
    setPending(true)
    setError("")
    try {
      await pb.collection("users").create({
        name: name.trim(),
        email: email.trim(),
        password,
        passwordConfirm: password,
        invite_code: invite.trim() || undefined,
      })
      await login(email.trim(), password)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setPending(false)
    }
  }

  const bonus = config?.general.signup_credit || 0
  const referral = config?.features.referral

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      {bonus > 0 && (
        <p className="rounded-xl bg-gain-container px-4 py-3 type-body-medium text-on-gain-container">
          Kayıt olduğunuzda hesabınıza {money(bonus, currency)} başlangıç kredisi eklenir.
        </p>
      )}
      <Field label="Ad soyad" htmlFor="name">
        <Input id="name" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="E-posta" htmlFor="email">
        <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Field label="Şifre" htmlFor="password" hint="En az 8 karakter.">
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>
      {referral && (
        <Field label="Davet kodu (isteğe bağlı)" htmlFor="invite">
          <Input
            id="invite"
            value={invite}
            onChange={(e) => setInvite(e.target.value.toUpperCase())}
            className="uppercase"
            autoComplete="off"
          />
        </Field>
      )}
      {error && (
        <p role="alert" className="type-body-medium text-error">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" disabled={pending}>
        {pending && <Loader2 className="animate-spin" />}
        Hesap oluştur
      </Button>
    </form>
  )
}

export default function RegisterPage() {
  return (
    <>
      <h1 className="type-headline-medium">Hesap oluştur</h1>
      <p className="mt-1 mb-8 type-body-medium text-on-surface-variant">İlk mülkünüzü birkaç dakika içinde alabilirsiniz.</p>
      <Suspense>
        <RegisterForm />
      </Suspense>
      <p className="mt-6 type-body-medium text-on-surface-variant">
        Zaten hesabınız var mı?{" "}
        <Link href="/login" className="type-label-large text-primary underline-offset-4 hover:underline">
          Giriş yapın
        </Link>
      </p>
    </>
  )
}
