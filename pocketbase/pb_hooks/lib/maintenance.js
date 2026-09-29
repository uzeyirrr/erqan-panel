/// <reference path="../../../.pb/pb_data/types.d.ts" />

// Periyodik bakım işleri. cron.pb.js (saatlik) ve admin "şimdi çalıştır" endpoint'i kullanır.

const BATCH = 500

function each(app, collection, filter, params, fn) {
  const list = app.findRecordsByFilter(collection, filter, "", BATCH, 0, params)
  let done = 0
  let failed = 0
  for (const rec of list) {
    try {
      app.runInTransaction((tx) => fn(tx, tx.findRecordById(collection, rec.id)))
      done++
    } catch (err) {
      failed++
      console.log(`maintenance ${collection} ${rec.id} error`, err)
    }
  }
  return { done, failed }
}

function run(app) {
  const L = require(`${__hooks}/lib/core.js`)
  const s = L.getSettings(app)
  const now = new Date()
  const nowStr = L.pbDate(now)
  const cur = s.general.currency
  const out = {}

  // 1) Dönemi gelen kiralar: yenile, bitir veya tolerans süresi başlat.
  out.charges = each(app, "rentals", "active = true && next_charge != '' && next_charge <= {:now}", { now: nowStr }, (tx, r) => {
    if (!r.getBool("active")) return
    if (r.getBool("cancel_at_period_end")) return L.endRental(tx, s, r, "cancelled")
    if (!s.rent.auto_renew || !s.features.rent) return L.endRental(tx, s, r, "expired")

    const tenantId = r.getString("tenant")
    const ownerId = r.getString("owner")
    const price = r.getFloat("price")
    const tenant = tx.findRecordById("users", tenantId)
    let property = null
    try { property = tx.findRecordById("properties", r.getString("property")) } catch (_) {}
    const name = property ? property.getString("name") : "Mülk"

    if (tenant.getFloat("credit") >= price) {
      L.transfer(tx, s, tenantId, ownerId, price, {
        commissionPct: s.rent.commission_pct, payKind: "rent_pay", receiveKind: "rent_income",
        property: r.getString("property"), note: `${name} (yenileme)`,
      })
      // Bir sonraki dönem, bir önceki vade tarihinden itibaren hesaplanır (kayma olmaz).
      let next = L.parseDate(r.getString("next_charge"))
      while (next <= now) next = L.addDays(next, s.rent.period_days)
      r.set("next_charge", L.pbDate(next))
      r.set("periods_paid", r.getInt("periods_paid") + 1)
      r.set("warned", false)
      r.set("grace_until", "")
      tx.save(r)
      L.incUser(tx, tenantId, "rent_count")
      L.addReputation(tx, s, tenantId, "rent_paid")
      L.notify(tx, s, tenantId, "rent_charged", "Kira ödendi", `${name} için ${price} ${cur} tahsil edildi.`, "/wallet")
      L.notify(tx, s, ownerId, "rent_income", "Kira geliri", `${name} için kira ödemesi alındı.`, "/wallet")
      return
    }

    // Bakiye yetersiz
    if (s.rent.grace_days > 0) {
      const grace = L.parseDate(r.getString("grace_until"))
      if (!grace) {
        r.set("grace_until", L.pbDate(L.addDays(now, s.rent.grace_days)))
        tx.save(r)
        L.notify(tx, s, tenantId, "rent_warning", "Kira ödenemedi",
          `${name} için ${price} ${cur} gerekiyor. ${s.rent.grace_days} gün içinde bakiye yüklenmezse kiralama sona erecek.`, "/wallet")
        return
      }
      if (grace > now) return
    }
    L.endRental(tx, s, r, "insufficient_credit")
  })

  // 2) Yaklaşan tahsilat için bakiye uyarısı (dönem başına bir kez).
  const warnUntil = L.pbDate(L.addDays(now, s.rent.warn_days_before))
  out.warnings = s.rent.warn_days_before <= 0 ? { done: 0, failed: 0 } : each(app, "rentals",
    "active = true && warned = false && cancel_at_period_end = false && next_charge > {:now} && next_charge <= {:until}",
    { now: nowStr, until: warnUntil }, (tx, r) => {
      const tenant = tx.findRecordById("users", r.getString("tenant"))
      const price = r.getFloat("price")
      if (tenant.getFloat("credit") < price) {
        const when = L.parseDate(r.getString("next_charge"))
        const days = Math.max(1, Math.ceil((when.getTime() - now.getTime()) / 86400000))
        L.notify(tx, s, tenant.id, "rent_warning", "Bakiyeniz kira için yetersiz",
          `${days} gün sonra ${price} ${cur} kira tahsil edilecek; bakiyeniz yetmiyor.`, "/my-properties?tab=rented")
      }
      r.set("warned", true)
      tx.save(r)
    })

  // 3) Süresi dolan teklifler: blokeyi iade et.
  out.offers = each(app, "offers", "status = 'pending' && expires != '' && expires <= {:now}", { now: nowStr }, (tx, o) => {
    L.closeOffer(tx, s, o, "expired")
    L.notify(tx, s, o.getString("buyer"), "offer_updated", "Teklifinizin süresi doldu", "Bloke tutar bakiyenize iade edildi.", "/offers")
  })

  // 4) Tamamlanan inşaatlar.
  out.builds = each(app, "properties", "status = 'building' && build_ready_at != '' && build_ready_at <= {:now}", { now: nowStr }, (tx, p) => {
    L.finishBuild(tx, s, p)
  })

  return out
}

module.exports = { run }
