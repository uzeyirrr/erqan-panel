"use client"

import Link from "next/link"
import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { errorMessage } from "@/lib/pb"
import { useApp } from "@/components/app-provider"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { AppIcon } from "@/components/brand"
import { FieldGroup, StackedField } from "../_form"

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
          label="Şifre"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </FieldGroup>
      {error && (
        <p role="alert" className="px-4 text-footnote text-system-red">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" className="mt-2 w-full" disabled={pending}>
        {pending ? <Spinner className="size-5" /> : "Giriş Yap"}
      </Button>
    </form>
  )
}

export default function LoginPage() {
  return (
    <>
      <div className="mb-8 flex flex-col items-center text-center">
        <AppIcon className="size-[76px] lg:hidden" />
        <h1 className="mt-5 text-title1 text-label lg:mt-0">Giriş Yap</h1>
        <p className="mt-1.5 text-subheadline text-label-secondary">Portföyünüze ve kira gelirinize devam edin.</p>
      </div>
      <Suspense>
        <LoginForm />
      </Suspense>
      <p className="mt-8 text-center text-subheadline text-label-secondary">
        Hesabınız yok mu?{" "}
        <Link href="/register" className="font-semibold text-tint press-dim">
          Kayıt olun
        </Link>
      </p>
    </>
  )
}
