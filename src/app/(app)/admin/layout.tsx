"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useApp } from "@/components/app-provider"
import { Loading } from "@/components/kit"

/** Yönetim sayfaları: iskelet (app) layout'undan gelir; burada yalnızca yetki kontrolü var. */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { ready, isAdmin } = useApp()
  const router = useRouter()

  useEffect(() => {
    if (ready && !isAdmin) router.replace("/dashboard")
  }, [ready, isAdmin, router])

  if (!ready || !isAdmin) return <Loading />
  return <>{children}</>
}
