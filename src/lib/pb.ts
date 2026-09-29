"use client"

import PocketBase, { ClientResponseError } from "pocketbase"
import type { AdminStats, Portfolio, PublicProfile, Settings } from "./types"

export const PB_URL = process.env.NEXT_PUBLIC_PB_URL || "http://127.0.0.1:8090"

export const pb = new PocketBase(PB_URL)
// Aynı anda gelen istekleri iptal etme (liste + sayım gibi paralel çağrılar için).
pb.autoCancellation(false)

/** Hata nesnesinden kullanıcıya gösterilecek Türkçe mesajı çıkarır. */
export function errorMessage(err: unknown): string {
  if (err instanceof ClientResponseError) {
    if (err.status === 0) return "Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edin."
    const data = err.response?.data as Record<string, { message?: string }> | undefined
    const field = data && Object.values(data).find((v) => v && typeof v.message === "string")
    if (err.status === 400 && field?.message && err.response?.message === "Failed to create record.") {
      return field.message
    }
    return err.response?.message || err.message
  }
  if (err instanceof Error) return err.message
  return "Beklenmeyen bir hata oluştu."
}

async function send<T>(path: string, method: "GET" | "POST", body?: unknown): Promise<T> {
  return pb.send<T>(path, { method, body: body as Record<string, unknown> | undefined })
}

/** Sunucu tarafı iş kuralları (pocketbase/pb_hooks). */
export const api = {
  config: () => send<Settings>("/api/erqan/config", "GET"),
  buy: (type: string, city: string) => send<{ property: string }>("/api/erqan/buy", "POST", { type, city }),
  listing: (property: string, status: "empty" | "rent" | "sale", prices: { rent_price?: number; sale_price?: number }) =>
    send<{ ok: true }>("/api/erqan/listing", "POST", { property, status, ...prices }),
  rent: (property: string) => send<{ rental: string }>("/api/erqan/rent", "POST", { property }),
  cancelRent: (rental: string, undo = false) => send<{ ok: true }>("/api/erqan/rent/cancel", "POST", { rental, undo }),
  buyListing: (property: string) => send<{ ok: true }>("/api/erqan/sale/buy", "POST", { property }),
  offer: (property: string, amount: number, message: string) =>
    send<{ offer: string }>("/api/erqan/offer", "POST", { property, amount, message }),
  respondOffer: (offer: string, action: "accept" | "reject" | "withdraw") =>
    send<{ ok: true }>("/api/erqan/offer/respond", "POST", { offer, action }),
  build: (property: string) => send<{ ok: true }>("/api/erqan/build", "POST", { property }),
  upgrade: (property: string, upgrade: string) => send<{ ok: true }>("/api/erqan/upgrade", "POST", { property, upgrade }),
  readNotifications: (id?: string) => send<{ ok: true }>("/api/erqan/notifications/read", "POST", id ? { id } : {}),
  portfolio: () => send<Portfolio>("/api/erqan/portfolio", "GET"),
  publicProfile: (id: string) => send<PublicProfile>(`/api/erqan/users/${id}/public`, "GET"),
  admin: {
    saveSettings: (data: Settings) => send<Settings>("/api/erqan/admin/settings", "POST", { data }),
    credit: (user: string, amount: number, note: string) =>
      send<{ balance: number }>("/api/erqan/admin/credit", "POST", { user, amount, note }),
    user: (user: string, patch: { role?: "user" | "admin"; banned?: boolean }) =>
      send<{ ok: true }>("/api/erqan/admin/user", "POST", { user, ...patch }),
    endRental: (rental: string) => send<{ ok: true }>("/api/erqan/admin/rental/end", "POST", { rental }),
    transfer: (property: string, owner: string) =>
      send<{ ok: true }>("/api/erqan/admin/property/transfer", "POST", { property, owner }),
    stats: () => send<AdminStats>("/api/erqan/admin/stats", "GET"),
    runMaintenance: () => send<Record<string, { done: number; failed: number }>>("/api/erqan/admin/run-maintenance", "POST"),
  },
}

/** Dosya alanı için tam URL (thumb: "100x100", "400x300"). */
export function fileUrl(
  record: { id: string; collectionId?: string; collectionName?: string },
  filename: string | undefined,
  thumb?: string,
): string | undefined {
  if (!filename) return undefined
  const col = record.collectionId || record.collectionName
  const q = thumb ? `?thumb=${thumb}` : ""
  return `${PB_URL}/api/files/${col}/${record.id}/${filename}${q}`
}
