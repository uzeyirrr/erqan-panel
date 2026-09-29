import type { OfferStatus, PropertyStatus, Rental, TransactionKind } from "./types"

const numberFmt = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 })

export function money(amount: number | undefined, currency = "USD"): string {
  return `${numberFmt.format(amount || 0)} ${currency}`
}

export function signedMoney(amount: number, currency = "USD"): string {
  const sign = amount > 0 ? "+" : amount < 0 ? "−" : ""
  return `${sign}${numberFmt.format(Math.abs(amount))} ${currency}`
}

export function num(n: number | undefined): string {
  return numberFmt.format(n || 0)
}

/** PocketBase tarih metnini ("2026-09-29 18:58:00.000Z") Date'e çevirir. */
export function toDate(s: string | undefined): Date | null {
  if (!s) return null
  const d = new Date(s.replace(" ", "T"))
  return isNaN(d.getTime()) ? null : d
}

export function date(s: string | undefined): string {
  const d = toDate(s)
  return d ? d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" }) : ""
}

export function dateTime(s: string | undefined): string {
  const d = toDate(s)
  return d
    ? d.toLocaleString("tr-TR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : ""
}

const rtf = new Intl.RelativeTimeFormat("tr-TR", { numeric: "auto" })

export function relative(s: string | undefined): string {
  const d = toDate(s)
  if (!d) return ""
  const diff = (d.getTime() - Date.now()) / 1000
  const abs = Math.abs(diff)
  if (abs < 60) return rtf.format(Math.round(diff), "second")
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute")
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour")
  if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), "day")
  return date(s)
}

export function monthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("tr-TR", { month: "short" })
}

export const STATUS_LABEL: Record<PropertyStatus, string> = {
  empty: "Boş",
  rent: "Kiralık",
  rented: "Kirada (dolu)",
  sale: "Satılık",
  building: "İnşaatta",
}

export const OFFER_STATUS_LABEL: Record<OfferStatus, string> = {
  pending: "Bekliyor",
  accepted: "Kabul edildi",
  rejected: "Reddedildi",
  withdrawn: "Geri çekildi",
  expired: "Süresi doldu",
}

export const TX_LABEL: Record<TransactionKind, string> = {
  purchase: "Mülk satın alma",
  rent_pay: "Kira ödemesi",
  rent_income: "Kira geliri",
  sale: "Mülk satın alma (ilan)",
  sale_income: "Satış geliri",
  build: "İnşaat",
  upgrade: "Yükseltme",
  offer_hold: "Teklif blokesi",
  offer_release: "Teklif iadesi",
  referral_bonus: "Davet bonusu",
  signup_bonus: "Hoş geldin bonusu",
  commission: "Komisyon",
  admin_adjust: "Yönetici düzeltmesi",
}

export const RENTAL_END_LABEL: Record<Exclude<Rental["ended_reason"], "">, string> = {
  cancelled: "Kiracı iptal etti",
  expired: "Süresi doldu",
  insufficient_credit: "Bakiye yetersiz",
  sold: "Mülk satıldı",
  admin: "Yönetici sonlandırdı",
}
