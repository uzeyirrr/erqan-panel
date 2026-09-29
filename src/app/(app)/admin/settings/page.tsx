"use client"

import { useMemo, useState } from "react"
import { ArrowCounterClockwise, Check } from "@phosphor-icons/react"
import { api } from "@/lib/pb"
import type { Settings } from "@/lib/types"
import { cn } from "@/lib/utils"
import { useAction, useLoad } from "@/hooks/use-data"
import { useApp } from "@/components/app-provider"
import { BarButton, ErrorState, FieldRow, Loading, PageHeader, Row, RowItem, Section, inlineInput } from "@/components/kit"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { NumberInput, SwitchRow } from "../_components/admin-kit"

type Group = keyof Settings

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

const REFERRAL_TRIGGERS: [Settings["referral"]["trigger"], string][] = [
  ["signup", "Kayıt olduğunda"],
  ["first_rent", "İlk kirasını ödediğinde"],
  ["first_purchase", "İlk mülkünü aldığında"],
]

/**
 * Açıklamalı ayar satırı: solda etiket ve altında kısa not (SwitchRow ile aynı düzen),
 * sağda sabit genişlikte satır içi kontrol (sayı, renk).
 */
function SettingRow({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string
  hint?: string
  htmlFor?: string
  children: React.ReactNode
}) {
  return (
    <li
      data-slot="list-row"
      className="relative flex min-h-11 items-center gap-4 px-4 py-1 after:hairline after:absolute after:right-0 after:bottom-0 after:left-4 after:bg-separator last:after:hidden"
    >
      <label htmlFor={htmlFor} className="min-w-0 flex-1 cursor-pointer py-1.5">
        <span className="block text-body text-label">{label}</span>
        {hint && <span className="block text-footnote text-label-secondary">{hint}</span>}
      </label>
      <div className="flex shrink-0 items-center gap-3">{children}</div>
    </li>
  )
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
  const saving = isPending("save")

  async function save() {
    if (!draft) return
    const res = await run("save", () => api.admin.saveSettings(draft), "Ayarlar kaydedildi.")
    if (res) {
      loaded.setData(res)
      setDraft(null)
      reloadConfig()
    }
  }

  const header = (
    <PageHeader
      title="Ayarlar"
      description="Sistemdeki tüm kurallar buradan yönetilir. Değişiklikler kaydedildiği anda tüm kullanıcılar için geçerli olur."
      actions={
        draft && (
          <>
            {dirty && !saving && <BarButton standalone label="Değişiklikleri geri al" icon={ArrowCounterClockwise} onClick={() => setDraft(null)} />}
            <Button
              variant={dirty ? "default" : "glass"}
              size="sm"
              className="h-11 px-4"
              disabled={!dirty || saving}
              onClick={save}
            >
              {saving ? <Spinner className="size-4" /> : "Kaydet"}
            </Button>
          </>
        )
      }
    />
  )

  if (loaded.error)
    return (
      <>
        {header}
        <ErrorState message={loaded.error} onRetry={loaded.reload} />
      </>
    )
  if (!draft)
    return (
      <>
        {header}
        <Loading />
      </>
    )

  function set<S extends Group, K extends keyof Settings[S]>(section: S, key: K, value: Settings[S][K]) {
    setDraft((d) => {
      const base = d ?? loaded.data
      return base ? { ...base, [section]: { ...base[section], [key]: value } } : base
    })
  }

  const num = <S extends Group>(section: S, key: keyof Settings[S] & string, label: string, hint?: string, step = "any") => (
    <SettingRow key={key} label={label} hint={hint} htmlFor={`${section}-${key}`}>
      <NumberInput
        id={`${section}-${key}`}
        inline
        step={step}
        placeholder="0"
        className="w-28"
        value={draft[section][key] as unknown as number}
        onChange={(v) => set(section, key, v as Settings[S][typeof key])}
      />
    </SettingRow>
  )

  const bool = <S extends Group>(section: S, key: keyof Settings[S] & string, label: string, hint?: string) => (
    <SwitchRow
      key={key}
      id={`${section}-${key}`}
      label={label}
      hint={hint}
      checked={!!draft[section][key]}
      onChange={(v) => set(section, key, v as Settings[S][typeof key])}
    />
  )

  const cur = draft.general.currency || "USD"
  // brand_color sunucu ayarlarına yeni eklendi; tip tanımı henüz yoksa da çalışsın.
  const brandColor = (draft.general as Settings["general"] & { brand_color?: string }).brand_color || "#0F91E3"
  const setBrandColor = (v: string) =>
    setDraft({ ...draft, general: { ...draft.general, brand_color: v } as Settings["general"] })
  const brandValid = /^#[0-9a-fA-F]{6}$/.test(brandColor)
  const swatch = brandValid ? brandColor : "#0f91e3"

  return (
    <>
      {header}

      {/* Geniş ekranda iki sütun; bölümler kaynak sırasını koruyarak sütunlara akar. */}
      <div className="gap-8 lg:columns-2 [&>section]:mb-8 [&>section]:break-inside-avoid">
        <Section header="Genel">
          <FieldRow label="Site adı" htmlFor="general-site_name">
            <Input
              id="general-site_name"
              value={draft.general.site_name}
              onChange={(e) => set("general", "site_name", e.target.value)}
              className={inlineInput}
            />
          </FieldRow>
          <SettingRow label="Para birimi" hint="Tutarların yanında gösterilir (ör. USD)." htmlFor="general-currency">
            <Input
              id="general-currency"
              value={draft.general.currency}
              maxLength={8}
              autoCapitalize="characters"
              onChange={(e) => set("general", "currency", e.target.value.toUpperCase())}
              className={cn(inlineInput, "w-24")}
            />
          </SettingRow>
          <SettingRow
            label="Marka rengi"
            hint="Düğmeler, bağlantılar ve seçili sekme bu renkte gösterilir."
            htmlFor="general-brand_color"
          >
            <Input
              id="general-brand_color"
              value={brandColor}
              maxLength={7}
              pattern="^#[0-9a-fA-F]{6}$"
              spellCheck={false}
              autoCapitalize="characters"
              aria-invalid={!brandValid || undefined}
              onChange={(e) => setBrandColor(e.target.value)}
              className={cn(inlineInput, "w-24 uppercase tabular-nums aria-invalid:outline-none", !brandValid && "text-system-red")}
            />
            {/* Yerel renk seçici, renk dairesinin üzerinde görünmez durur (iOS ColorPicker kuyusu). */}
            <span
              className="relative flex size-8 shrink-0 items-center justify-center rounded-full p-[3px]"
              style={{ background: "conic-gradient(#ff3b30, #ffcc00, #34c759, #00c7be, #007aff, #af52de, #ff2d55, #ff3b30)" }}
            >
              <span className="block size-full rounded-full border-2 border-grouped-secondary" style={{ background: swatch }} />
              <input
                type="color"
                aria-label="Marka rengi seçici"
                value={swatch}
                onChange={(e) => setBrandColor(e.target.value)}
                className="absolute inset-0 size-full cursor-pointer opacity-0"
              />
            </span>
          </SettingRow>
          {num("general", "signup_credit", `Başlangıç kredisi (${cur})`, "Yeni kaydolan her kullanıcıya bir kez verilir.")}
          {bool("general", "registration_open", "Yeni kayıtlar açık")}
        </Section>

        <Section header="Bakım">
          {bool("general", "maintenance", "Bakım modu", "Açıkken yöneticiler dışında kimse paneli kullanamaz.")}
          <RowItem className="grid gap-1">
            <label htmlFor="general-maintenance_message" className="text-footnote text-label-secondary">
              Bakım mesajı
            </label>
            <Textarea
              id="general-maintenance_message"
              rows={2}
              placeholder="Kullanıcılara gösterilecek mesaj"
              value={draft.general.maintenance_message}
              onChange={(e) => set("general", "maintenance_message", e.target.value)}
              className="min-h-16 resize-none rounded-none bg-transparent p-0 focus-visible:outline-none"
            />
          </RowItem>
        </Section>

        <Section header="Özellik Anahtarları">
          {(Object.keys(FEATURE_LABELS) as (keyof Settings["features"])[]).map((k) =>
            bool("features", k, FEATURE_LABELS[k][0], FEATURE_LABELS[k][1]),
          )}
        </Section>

        <Section header="Kira">
          {num("rent", "period_days", "Kira dönemi (gün)", "Her dönem sonunda kira yeniden tahsil edilir.", "1")}
          {num("rent", "commission_pct", "Kira komisyonu (%)", "Her kira ödemesinden sistemin kestiği pay.")}
          {num("rent", "min_price", `En düşük kira (${cur})`)}
          {num("rent", "max_price", `En yüksek kira (${cur})`, "Yükseltmeler bu tavanı yüzde olarak artırabilir.")}
          {num("rent", "grace_days", "Tolerans süresi (gün)", "Bakiye yetmezse kira bu kadar gün beklenir; 0 ise hemen biter.", "1")}
          {num("rent", "warn_days_before", "Uyarı (gün önce)", "Tahsilattan bu kadar gün önce bakiye yetmiyorsa uyarı gider.", "1")}
          {num("rent", "max_active_per_user", "Kullanıcı başına aktif kira", undefined, "1")}
          {bool("rent", "auto_renew", "Otomatik yenileme", "Kapalıyken kiralar dönem sonunda yenilenmeden biter.")}
        </Section>

        <Section header="Satış">
          {num("sale", "commission_pct", "Satış komisyonu (%)")}
          {num("sale", "min_price", `En düşük satış fiyatı (${cur})`)}
          {num("sale", "max_price", `En yüksek satış fiyatı (${cur})`)}
          {bool(
            "sale",
            "allow_with_tenants",
            "Kiracılı mülk satılabilir",
            "Açıksa kiracılar yeni sahibe devredilir; kapalıysa önce kiraların bitmesi gerekir.",
          )}
        </Section>

        <Section header="İnşaat">
          {num("build", "build_days", "İnşaat süresi (gün)", "0 ise inşaat anında tamamlanır.", "1")}
          {bool(
            "build",
            "only_when_target_out_of_stock",
            "Yalnızca stok bitince",
            "Açıksa arsaya ev, o şehirde satılık ev kalmadığında yapılabilir.",
          )}
        </Section>

        <Section header="Teklifler">
          {num("offers", "expire_days", "Geçerlilik süresi (gün)", "Süresi dolan teklifin blokesi iade edilir.", "1")}
          {num("offers", "min_pct_of_price", "En düşük teklif (%)", "İlan fiyatının yüzdesi olarak.")}
          {num("offers", "max_pending_per_user", "Kullanıcı başına bekleyen teklif", undefined, "1")}
        </Section>

        <Section header="Davet Sistemi">
          {num("referral", "inviter_bonus", `Davet edene bonus (${cur})`)}
          {num("referral", "invitee_bonus", `Davet edilene bonus (${cur})`)}
          {num("referral", "max_rewards_per_user", "Kişi başı en fazla davet bonusu", "Davet eden bu sayıdan sonra bonus almaz.", "1")}
        </Section>

        {/* Seçim listesi (iOS Ayarlar): seçili satırda onay işareti. */}
        <Section header="Bonus Ne Zaman Verilsin">
          {REFERRAL_TRIGGERS.map(([value, label]) => {
            const selected = draft.referral.trigger === value
            return (
              <Row
                key={value}
                onClick={() => set("referral", "trigger", value)}
                title={label}
                accessory={
                  selected ? (
                    <Check weight="bold" className="size-[18px] shrink-0 text-tint" aria-label="Seçili" />
                  ) : (
                    <span className="size-[18px] shrink-0" />
                  )
                }
              />
            )
          })}
        </Section>

        <Section header="İtibar Puanları" footer="Her olayda kullanıcının itibar puanına eklenecek değer.">
          {(Object.keys(REPUTATION_LABELS) as (keyof Settings["reputation"])[]).map((k) =>
            num("reputation", k, REPUTATION_LABELS[k]),
          )}
        </Section>

        <Section header="Bildirim Olayları" footer="Kapattığınız olaylar için kullanıcılara bildirim gönderilmez.">
          {Object.keys(NOTIFICATION_LABELS).map((k) => (
            <SwitchRow
              key={k}
              id={`notif-${k}`}
              label={NOTIFICATION_LABELS[k]}
              checked={draft.notifications[k] !== false}
              onChange={(v) => setDraft({ ...draft, notifications: { ...draft.notifications, [k]: v } })}
            />
          ))}
        </Section>
      </div>
    </>
  )
}
