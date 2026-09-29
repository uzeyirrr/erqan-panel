/// <reference path="../../.pb/pb_data/types.d.ts" />

// Admin işlemleri. Katalog koleksiyonları (tipler, konumlar, stok, özellikler,
// yükseltmeler) API kurallarıyla doğrudan yönetilir; buradakiler kredi, rol,
// kira ve sahiplik gibi kayıt/denetim gerektiren işlemlerdir.

routerAdd("POST", "/api/erqan/admin/settings", (e) => {
  const L = require(`${__hooks}/lib/core.js`)
  L.guard(e, { admin: true })
  let saved
  e.app.runInTransaction((tx) => {
    saved = L.saveSettings(tx, L.body(e).data || {})
  })
  return e.json(200, saved)
}, $apis.requireAuth("users"))

routerAdd("POST", "/api/erqan/admin/credit", (e) => {
  const L = require(`${__hooks}/lib/core.js`)
  const { auth, s } = L.guard(e, { admin: true })
  const b = L.body(e)
  const amount = L.round2(Number(b.amount))
  const note = String(b.note || "").trim()
  if (!isFinite(amount) || amount === 0) throw new BadRequestError("Tutar sıfırdan farklı bir sayı olmalı.")
  if (!note) throw new BadRequestError("Açıklama zorunlu.")
  let balance = 0
  e.app.runInTransaction((tx) => {
    const u = L.find(tx, "users", b.user, "Kullanıcı")
    balance = L.adjustCredit(tx, u.id, amount, "admin_adjust", {
      counterparty: auth.id, note, insufficientMessage: "Kullanıcının bakiyesi bu tutarı düşmeye yetmiyor.",
    })
    L.notify(tx, s, u.id, "admin_credit", amount > 0 ? "Hesabınıza kredi eklendi" : "Hesabınızdan kredi düşüldü",
      `${Math.abs(amount)} ${s.general.currency} — ${note}`, "/wallet")
  })
  return e.json(200, { balance })
}, $apis.requireAuth("users"))

routerAdd("POST", "/api/erqan/admin/user", (e) => {
  const L = require(`${__hooks}/lib/core.js`)
  const { auth } = L.guard(e, { admin: true })
  const b = L.body(e)
  e.app.runInTransaction((tx) => {
    const u = L.find(tx, "users", b.user, "Kullanıcı")
    if (b.role !== undefined) {
      if (["user", "admin"].indexOf(b.role) === -1) throw new BadRequestError("Geçersiz rol.")
      if (u.id === auth.id && b.role !== "admin") throw new BadRequestError("Kendi yöneticiliğinizi kaldıramazsınız.")
      u.set("role", b.role)
    }
    if (b.banned !== undefined) {
      if (u.id === auth.id && b.banned) throw new BadRequestError("Kendinizi engelleyemezsiniz.")
      u.set("banned", !!b.banned)
    }
    tx.save(u)
  })
  return e.json(200, { ok: true })
}, $apis.requireAuth("users"))

routerAdd("POST", "/api/erqan/admin/rental/end", (e) => {
  const L = require(`${__hooks}/lib/core.js`)
  const { s } = L.guard(e, { admin: true })
  const b = L.body(e)
  e.app.runInTransaction((tx) => {
    const r = L.find(tx, "rentals", b.rental, "Kiralama")
    if (!r.getBool("active")) throw new BadRequestError("Kiralama zaten sona ermiş.")
    L.endRental(tx, s, r, "admin")
  })
  return e.json(200, { ok: true })
}, $apis.requireAuth("users"))

routerAdd("POST", "/api/erqan/admin/property/transfer", (e) => {
  const L = require(`${__hooks}/lib/core.js`)
  const { s } = L.guard(e, { admin: true })
  const b = L.body(e)
  e.app.runInTransaction((tx) => {
    const p = L.find(tx, "properties", b.property, "Mülk")
    const to = L.find(tx, "users", b.owner, "Yeni sahip")
    const from = p.getString("owner")
    if (from === to.id) return
    // Yeni sahip, kendi mülkünde kiracı olamaz.
    const own = L.findOne(tx, "rentals", "property = {:p} && tenant = {:u} && active = true", { p: p.id, u: to.id })
    if (own) L.endRental(tx, s, own, "admin")
    p.set("owner", to.id)
    if (p.getString("status") === "sale") {
      p.set("status", p.getInt("tenant_count") > 0 ? "rent" : "empty")
      L.syncRentStatus(p)
    }
    tx.save(p)
    for (const r of tx.findRecordsByFilter("rentals", "property = {:p} && active = true", "", 0, 0, { p: p.id })) {
      r.set("owner", to.id)
      tx.save(r)
    }
    L.closePendingOffers(tx, s, p.id, "expired")
    L.notify(tx, s, to.id, "sold", "Size bir mülk devredildi", `${p.getString("name")} yönetici tarafından size devredildi.`, `/properties/${p.id}`)
  })
  return e.json(200, { ok: true })
}, $apis.requireAuth("users"))

// Mülk silinmeden önce: bekleyen tekliflerin blokesini iade et, aktif kiraları sonlandır.
// (Kiralar ve teklifler cascade ile silineceği için bu işlem silmeyle aynı transaction'da yapılır.)
onRecordDelete((e) => {
  const L = require(`${__hooks}/lib/core.js`)
  const s = L.getSettings(e.app)
  const pid = e.record.id
  for (const o of e.app.findRecordsByFilter("offers", "property = {:p} && status = 'pending'", "", 0, 0, { p: pid })) {
    L.closeOffer(e.app, s, o, "expired")
    L.notify(e.app, s, o.getString("buyer"), "offer_updated", "Teklifiniz kapandı",
      "Teklif verdiğiniz mülk kaldırıldı; bloke tutar iade edildi.", "/offers")
  }
  for (const r of e.app.findRecordsByFilter("rentals", "property = {:p} && active = true", "", 0, 0, { p: pid })) {
    r.set("active", false)
    r.set("ended", L.pbDate(new Date()))
    r.set("ended_reason", "admin")
    e.app.save(r)
    L.notify(e.app, s, r.getString("tenant"), "rent_ended", "Kiralamanız sona erdi",
      `${e.record.getString("name")} yönetici tarafından kaldırıldı.`, "/my-properties?tab=rented")
  }
  e.next()
}, "properties")

routerAdd("GET", "/api/erqan/admin/stats", (e) => {
  const L = require(`${__hooks}/lib/core.js`)
  L.guard(e, { admin: true })
  const db = e.app.db()

  const scalar = (sql, params) => {
    const row = new DynamicModel({ v: 0 })
    db.newQuery(sql).bind(params || {}).one(row)
    return L.round2(row.v)
  }

  const statusRows = arrayOf(new DynamicModel({ status: "", n: 0 }))
  db.newQuery("SELECT status, COUNT(*) AS n FROM properties GROUP BY status").all(statusRows)
  const byStatus = {}
  for (const r of statusRows) byStatus[r.status] = r.n

  const countryRows = arrayOf(new DynamicModel({ country: "", flag: "", n: 0 }))
  db.newQuery(`
    SELECT co.name AS country, co.flag AS flag, COUNT(p.id) AS n
    FROM properties p JOIN cities ci ON ci.id = p.city JOIN countries co ON co.id = ci.country
    GROUP BY co.id ORDER BY n DESC
  `).all(countryRows)

  const typeRows = arrayOf(new DynamicModel({ type: "", sold: 0, stock: 0 }))
  db.newQuery(`
    SELECT t.name AS type,
      (SELECT COUNT(*) FROM properties p WHERE p.type = t.id) AS sold,
      (SELECT COALESCE(SUM(s.stock), 0) FROM city_stock s WHERE s.type = t.id) AS stock
    FROM property_types t ORDER BY t.sort
  `).all(typeRows)

  return e.json(200, {
    users: scalar("SELECT COUNT(*) AS v FROM users"),
    banned_users: scalar("SELECT COUNT(*) AS v FROM users WHERE banned = TRUE"),
    credit_in_circulation: scalar("SELECT COALESCE(SUM(credit), 0) AS v FROM users"),
    held_in_offers: scalar("SELECT COALESCE(SUM(amount), 0) AS v FROM offers WHERE status = 'pending'"),
    commission_revenue: scalar("SELECT COALESCE(SUM(amount), 0) AS v FROM transactions WHERE kind = 'commission'"),
    properties: scalar("SELECT COUNT(*) AS v FROM properties"),
    active_rentals: scalar("SELECT COUNT(*) AS v FROM rentals WHERE active = TRUE"),
    monthly_rent_volume: scalar("SELECT COALESCE(SUM(price), 0) AS v FROM rentals WHERE active = TRUE"),
    pending_offers: scalar("SELECT COUNT(*) AS v FROM offers WHERE status = 'pending'"),
    referred_users: scalar("SELECT COUNT(*) AS v FROM users WHERE referred_by != ''"),
    by_status: byStatus,
    by_country: countryRows.map((r) => ({ country: r.country, flag: r.flag, count: r.n })),
    by_type: typeRows.map((r) => ({ type: r.type, sold: r.sold, stock: r.stock })),
  })
}, $apis.requireAuth("users"))
