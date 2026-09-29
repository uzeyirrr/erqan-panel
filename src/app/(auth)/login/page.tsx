"use client"

import Link from "next/link"
import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { errorMessage } from "@/lib/pb"
import { useApp } from "@/components/app-provider"
import { Field } from "@/components/kit"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

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
      <Field label="E-posta" htmlFor="email">
        <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Field label="Şifre" htmlFor="password">
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>
      {error && (
        <p role="alert" className="type-body-medium text-error">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" disabled={pending}>
        {pending && <Loader2 className="animate-spin" />}
        Giriş yap
      </Button>
    </form>
  )
}

export default function LoginPage() {
  return (
    <>
      <h1 className="type-headline-medium">Giriş yap</h1>
      <p className="mt-1 mb-8 type-body-medium text-on-surface-variant">Portföyünüze ve kira gelirinize devam edin.</p>
      <Suspense>
        <LoginForm />
      </Suspense>
      <p className="mt-6 type-body-medium text-on-surface-variant">
        Hesabınız yok mu?{" "}
        <Link href="/register" className="type-label-large text-primary underline-offset-4 hover:underline">
          Kayıt olun
        </Link>
      </p>
    </>
  )
}
