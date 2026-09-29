"use client"

import { useMemo, useState } from "react"
import { Loader2 } from "lucide-react"
import { api } from "@/lib/pb"
import type { Settings } from "@/lib/types"
import { useAction, useLoad } from "@/hooks/use-data"
import { useApp } from "@/components/app-provider"
import { ErrorState, Field, Loading, NativeSelect, PageHeader, Panel } from "@/components/kit"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { NumberInput, SwitchRow } from "../_components/admin-kit"

type Section = keyof Settings

const FEATURE_LABELS: Record<keyof Settings["features"], [string, string]> = {
  buy: ["Merkezi stoktan satın alma", "Kullanıcılar şehir ve tip seçerek yeni mülk alabilir."],
  rent: ["Kiralama", "Kapalıyken yeni kiralama yapılamaz; açık kiralar dönem sonunda biter."],
  sale: ["Kullanıcılar arası satış", "Mülkler satılığa çıkarılabilir ve satın alınabilir."],
  offers: ["Teklif sistemi", "Satılık mülklere fiyat teklifi verilebilir."],
  build: ["Arsaya inşaat", "Arsa sahipleri arsalarını eve dönüştürebilir."],
  upgrades: ["Yükseltmeler", "Mülklere ücretli yükseltme uygulanabilir."],
  referral: ["Davet sistemi", "Davet kodu ile kayıt ve davet bonusları."],
  public_profiles: ["Herkese açık profiller", "Kullanıcıların profil sayfası diğerlerine görünür."],
  notifications: ["Bildirimler", "Kapalıyken hiçbir uygulama içi bildirim oluşturulmaz."],
}

const NOTIFICATION_LABELS: Record<string, string> = {
  rent_charged: "Kira tahsil edildi (kiracıya)",
  rent_income: "Kira geliri alındı (sahibe)",
  rent_warning: "Bakiye yetersiz uyarısı",
  rent_ended: "Kiralama sona erdi",
  new_tenant: "Yeni kiracı",
  sold: "Mülk satıldı / devredildi",
  offer_received: "Yeni teklif alındı",
  offer_updated: "Teklif durumu değişti",
  build_done: "İnşaat tamamlandı",
  admin_credit: "Yönetici kredi düzeltmesi",
  referral: "Davet bonusu",
}

const REPUTATION_LABELS: Record<keyof Settings["reputation"], string> = {
  purchase: "Mülk satın alma",
  rent_paid: "Kira dönemi ödeme",
  sale_completed: "Satış tamamlama (satıcı)",
  rent_cancelled: "Kira iptali (eksi değer ceza olur)",
}

export default function AdminSettingsPage() {
  const { reloadConfig } = useApp()
  const loaded = useLoad(() => api.config(), [])
  // Düzenleme yapılana kadar taslak yok; ekrandaki değerler sunucudakilerdir.
  const [edited, setDraft] = useState<Settings | null>(null)
  const draft = edited ?? loaded.data
  const { run, isPending } = useAction()

  const dirty = useMemo(
    () => !!edited && !!loaded.data && JSON.stringify(edited) !== JSON.stringify(loaded.data),
    [edited, loaded.data],
  )

  if (loaded.error) return <ErrorState message={loaded.error} onRetry={loaded.reload} />
  if (!draft) return <Loading />

  function set<S extends Section, K extends keyof Settings[S]>(section: S, key: K, value: Settings[S][K]) {
    setDraft((d) => {
      const base = d ?? loaded.data
      return base ? { ...base, [section]: { ...base[section], [key]: value } } : base
    })
  }

  const num = <S extends Section>(section: S, key: keyof Settings[S] & string, label: string, hint?: string, step = "any") => (
    <Field label={label} htmlFor={`${section}-${key}`} hint={hint}>
      <NumberInput
        id={`${section}-${key}`}
        step={step}
        value={draft[section][key] as unknown as number}
        onChange={(v) => set(section, key, v as Settings[S][typeof key])}
      />
    </Field>
  )

  const bool = <S extends Section>(section: S, key: keyof Settings[S] & string, label: string, hint?: string) => (
    <SwitchRow
      id={`${section}-${key}`}
      label={label}
      hint={hint}
      checked={!!draft[section][key]}
      onChange={(v) => set(section, key, v as Settings[S][typeof key])}
    />
  )

  async function save() {
    if (!draft) return
    const res = await run("save", () => api.admin.saveSettings(draft), "Ayarlar kaydedildi.")
    if (res) {
      loaded.setData(res)
      setDraft(null)
      reloadConfig()
    }
  }

  const cur = draft.general.currency || "USD"
  // brand_color sunucu ayarlarına yeni eklendi; tip tanımı henüz yoksa da çalışsın.
  const brandColor = (draft.general as Settings["general"] & { brand_color?: string }).brand_color || "#0F91E3"
  const setBrandColor = (v: string) =>
    setDraft({ ...draft, general: { ...draft.general, brand_color: v } as Settings["general"] })

  return (
    <div className="pb-20">
      <PageHeader
        title="Ayarlar"
        description="Sistemdeki tüm kurallar buradan yönetilir. Değişiklikler kaydedildiği anda tüm kullanıcılar için geçerli olur."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Genel">
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Site adı" htmlFor="general-site_name">
                <Input
                  id="general-site_name"
                  value={draft.general.site_name}
                  onChange={(e) => set("general", "site_name", e.target.value)}
                />
              </Field>
              <Field label="Para birimi" htmlFor="general-currency" hint="Tutarların yanında gösterilir (ör. USD).">
                <Input
                  id="general-currency"
                  value={draft.general.currency}
                  maxLength={8}
                  onChange={(e) => set("general", "currency", e.target.value.toUpperCase())}
                />
              </Field>
            </div>
            <Field
              label="Marka rengi"
              htmlFor="general-brand_color"
              hint="Tüm arayüz renkleri bu renkten Material 3 kurallarıyla üretilir."
            >
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  aria-label="Marka rengi seçici"
                  value={/^#[0-9a-fA-F]{6}$/.test(brandColor) ? brandColor : "#0f91e3"}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="h-9 w-12 shrink-0 cursor-pointer rounded-lg border bg-background p-1"
                />
                <Input
                  id="general-brand_color"
                  value={brandColor}
                  maxLength={7}
                  pattern="^#[0-9a-fA-F]{6}$"
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="figure w-32"
                />
              </div>
            </Field>
            {num("general", "signup_credit", `Başlangıç kredisi (${cur})`, "Yeni kaydolan her kullanıcıya bir kez verilir.")}
            {bool("general", "registration_open", "Yeni kayıtlar açık")}
            {bool("general", "maintenance", "Bakım modu", "Açıkken yöneticiler dışında kimse paneli kullanamaz.")}
            <Field label="Bakım mesajı" htmlFor="general-maintenance_message">
              <Textarea
                id="general-maintenance_message"
                rows={2}
                value={draft.general.maintenance_message}
                onChange={(e) => set("general", "maintenance_message", e.target.value)}
              />
            </Field>
          </div>
        </Panel>

        <Panel title="Özellik anahtarları">
          <div className="divide-y">
            {(Object.keys(FEATURE_LABELS) as (keyof Settings["features"])[]).map((k) => (
              <div key={k}>{bool("features", k, FEATURE_LABELS[k][0], FEATURE_LABELS[k][1])}</div>
            ))}
          </div>
        </Panel>

        <Panel title="Kira">
          <div className="grid gap-4 sm:grid-cols-2">
            {num("rent", "period_days", "Kira dönemi (gün)", "Her dönem sonunda kira yeniden tahsil edilir.", "1")}
            {num("rent", "commission_pct", "Kira komisyonu (%)", "Her kira ödemesinden sistemin kestiği pay.")}
            {num("rent", "min_price", `En düşük kira (${cur})`)}
            {num("rent", "max_price", `En yüksek kira (${cur})`, "Yükseltmeler bu tavanı yüzde olarak artırabilir.")}
            {num("rent", "grace_days", "Tolerans süresi (gün)", "Bakiye yetmezse kira bu kadar gün beklenir; 0 ise hemen biter.", "1")}
            {num("rent", "warn_days_before", "Uyarı (gün önce)", "Tahsilattan bu kadar gün önce bakiye yetmiyorsa uyarı gider.", "1")}
            {num("rent", "max_active_per_user", "Kullanıcı başına aktif kira", undefined, "1")}
          </div>
          <div className="mt-2">{bool("rent", "auto_renew", "Otomatik yenileme", "Kapalıyken kiralar dönem sonunda yenilenmeden biter.")}</div>
        </Panel>

        <Panel title="Satış">
          <div className="grid gap-4 sm:grid-cols-2">
            {num("sale", "commission_pct", "Satış komisyonu (%)")}
            <span className="hidden sm:block" />
            {num("sale", "min_price", `En düşük satış fiyatı (${cur})`)}
            {num("sale", "max_price", `En yüksek satış fiyatı (${cur})`)}
          </div>
          <div className="mt-2">
            {bool(
              "sale",
              "allow_with_tenants",
              "Kiracılı mülk satılabilir",
              "Açıksa kiracılar yeni sahibe devredilir; kapalıysa önce kiraların bitmesi gerekir.",
            )}
          </div>
        </Panel>

        <Panel title="İnşaat">
          <div className="grid gap-4">
            {num("build", "build_days", "İnşaat süresi (gün)", "0 ise inşaat anında tamamlanır.", "1")}
            {bool(
              "build",
              "only_when_target_out_of_stock",
              "Yalnızca stok bitince",
              "Açıksa arsaya ev, o şehirde satılık ev kalmadığında yapılabilir.",
            )}
          </div>
        </Panel>

        <Panel title="Teklifler">
          <div className="grid gap-4 sm:grid-cols-2">
            {num("offers", "expire_days", "Geçerlilik süresi (gün)", "Süresi dolan teklifin blokesi iade edilir.", "1")}
            {num("offers", "min_pct_of_price", "En düşük teklif (%)", "İlan fiyatının yüzdesi olarak.")}
            {num("offers", "max_pending_per_user", "Kullanıcı başına bekleyen teklif", undefined, "1")}
          </div>
        </Panel>

        <Panel title="Davet sistemi">
          <div className="grid gap-4 sm:grid-cols-2">
            {num("referral", "inviter_bonus", `Davet edene bonus (${cur})`)}
            {num("referral", "invitee_bonus", `Davet edilene bonus (${cur})`)}
            <Field label="Bonus ne zaman verilsin" htmlFor="referral-trigger">
              <NativeSelect
                id="referral-trigger"
                value={draft.referral.trigger}
                onChange={(e) => set("referral", "trigger", e.target.value as Settings["referral"]["trigger"])}
              >
                <option value="signup">Kayıt olduğunda</option>
                <option value="first_rent">İlk kirasını ödediğinde</option>
                <option value="first_purchase">İlk mülkünü aldığında</option>
              </NativeSelect>
            </Field>
            {num("referral", "max_rewards_per_user", "Kişi başı en fazla davet bonusu", "Davet eden bu sayıdan sonra bonus almaz.", "1")}
          </div>
        </Panel>

        <Panel title="İtibar puanları">
          <p className="mb-3 type-body-medium text-muted-foreground">Her olayda kullanıcının itibar puanına eklenecek değer.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {(Object.keys(REPUTATION_LABELS) as (keyof Settings["reputation"])[]).map((k) => (
              <div key={k}>{num("reputation", k, REPUTATION_LABELS[k])}</div>
            ))}
          </div>
        </Panel>

        <Panel title="Bildirim olayları" className="lg:col-span-2">
          <p className="mb-2 type-body-medium text-muted-foreground">Kapattığınız olaylar için kullanıcılara bildirim gönderilmez.</p>
          <div className="grid gap-x-8 divide-y sm:grid-cols-2 sm:divide-y-0">
            {Object.keys(NOTIFICATION_LABELS).map((k) => (
              <SwitchRow
                key={k}
                id={`notif-${k}`}
                label={NOTIFICATION_LABELS[k]}
                checked={draft.notifications[k] !== false}
                onChange={(v) => setDraft({ ...draft, notifications: { ...draft.notifications, [k]: v } })}
              />
            ))}
          </div>
        </Panel>
      </div>

      {dirty && (
        <div className="fixed inset-x-0 bottom-16 z-20 border-t bg-card/95 backdrop-blur lg:bottom-0 lg:left-64">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <span className="type-body-medium">Kaydedilmemiş değişiklikler var.</span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setDraft(null)} disabled={isPending("save")}>
                Geri al
              </Button>
              <Button onClick={save} disabled={isPending("save")}>
                {isPending("save") && <Loader2 className="animate-spin" />}
                Ayarları kaydet
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
