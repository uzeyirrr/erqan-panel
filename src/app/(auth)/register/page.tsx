"use client"

import Link from "next/link"
import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Gift, LockSimple } from "@phosphor-icons/react"
import { errorMessage, pb } from "@/lib/pb"
import { money } from "@/lib/format"
import { useApp } from "@/components/app-provider"
import { EmptyState, Notice } from "@/components/kit"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { AppIcon } from "../_app-icon"
import { FieldGroup, StackedField } from "../_form"

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
    return (
      <EmptyState
        icon={<LockSimple weight="fill" />}
        title="Kayıtlar kapalı"
        description="Yeni kayıtlar şu anda kapalı. Daha sonra tekrar deneyin."
        className="py-6"
      />
    )
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
        <Notice tone="orange" icon={Gift}>
          Kayıt olduğunuzda hesabınıza {money(bonus, currency)} başlangıç kredisi eklenir.
        </Notice>
      )}
      <FieldGroup>
        <StackedField id="name" label="Ad soyad" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} />
        <StackedField
          id="email"
          label="E-posta"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <StackedField
          id="password"
          label="Şifre (en az 8 karakter)"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </FieldGroup>
      {referral && (
        <FieldGroup>
          <StackedField
            id="invite"
            label="Davet kodu (isteğe bağlı)"
            value={invite}
            onChange={(e) => setInvite(e.target.value.toUpperCase())}
            className="uppercase placeholder:normal-case"
            autoComplete="off"
            autoCapitalize="characters"
          />
        </FieldGroup>
      )}
      {error && (
        <p role="alert" className="px-4 text-footnote text-system-red">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" className="mt-2 w-full" disabled={pending}>
        {pending ? <Spinner className="size-5" /> : "Hesap Oluştur"}
      </Button>
    </form>
  )
}

export default function RegisterPage() {
  return (
    <>
      <div className="mb-8 flex flex-col items-center text-center">
        <AppIcon className="size-[76px] lg:hidden" />
        <h1 className="mt-5 text-title1 text-label lg:mt-0">Hesap Oluştur</h1>
        <p className="mt-1.5 text-subheadline text-label-secondary">İlk mülkünüzü birkaç dakika içinde alabilirsiniz.</p>
      </div>
      <Suspense>
        <RegisterForm />
      </Suspense>
      <p className="mt-8 text-center text-subheadline text-label-secondary">
        Zaten hesabınız var mı?{" "}
        <Link href="/login" className="font-semibold text-tint press-dim">
          Giriş yapın
        </Link>
      </p>
    </>
  )
}
