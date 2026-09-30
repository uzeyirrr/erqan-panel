"use client"

import Link from "next/link"
import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { errorMessage } from "@/lib/pb"
import { useApp } from "@/components/app-provider"
import { EnvelopeSimple, LockSimple } from "@phosphor-icons/react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { AuthHeader, FieldGroup, OrDivider, PasswordField, StackedField } from "../_form"

function LoginForm() {
  const { login, user, ready } = useApp()
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get("next") || "/dashboard"
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (ready && user) router.replace(next.startsWith("/") ? next : "/dashboard")
  }, [ready, user, next, router])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    setError("")
    try {
      await login(email.trim(), password)
    } catch (err) {
      const msg = errorMessage(err)
      setError(msg === "Failed to authenticate." ? "E-posta veya şifre hatalı." : msg)
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <FieldGroup>
        <StackedField
          id="email"
          label="E-posta"
          icon={EnvelopeSimple}
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <PasswordField
          id="password"
          label="Şifre"
          icon={LockSimple}
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </FieldGroup>
      {error && (
        <p role="alert" className="px-1 text-footnote text-system-red lg:px-0">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" className="mt-1 w-full" disabled={pending}>
        {pending ? <Spinner className="size-5" /> : "Giriş Yap"}
      </Button>
    </form>
  )
}

export default function LoginPage() {
  return (
    <>
      <AuthHeader title="Tekrar hoş geldiniz" subtitle="Portföyünüze ve kira gelirinize kaldığınız yerden devam edin." />
      <Suspense>
        <LoginForm />
      </Suspense>
      <OrDivider />
      <Link href="/register" className={buttonVariants({ variant: "secondary", size: "lg", className: "w-full" })}>
        Yeni Hesap Oluştur
      </Link>
    </>
  )
}
