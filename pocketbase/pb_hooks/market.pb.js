/// <reference path="../../.pb/pb_data/types.d.ts" />

// Kullanıcı işlemleri. Para, stok veya sahiplik değiştiren her şey burada,
// tek bir transaction içinde yapılır; hata olursa hiçbir değişiklik kalmaz.

// Ayarlar (herkese açık)
routerAdd("GET", "/api/erqan/config", (e) => {
  const L = require(`${__hooks}/lib/core.js`)
  return e.json(200, L.getSettings(e.app))
})

// Merkezi stoktan satın alma
routerAdd("POST", "/api/erqan/buy", (e) => {
  const L = require(`${__hooks}/lib/core.js`)
  const { auth, s } = L.guard(e, { feature: "buy" })
  const b = L.body(e)
  let propertyId = ""

  e.app.runInTransaction((tx) => {
    const type = L.find(tx, "property_types", b.type, "Mülk tipi")
    const city = L.find(tx, "cities", b.city, "Şehir")
    if (!type.getBool("active")) throw new BadRequestError("Bu mülk tipi satışta değil.")
    if (!city.getBool("active")) throw new BadRequestError("Bu şehir satışa kapalı.")
    const country = L.find(tx, "countries", city.getString("country"), "Ülke")
    if (!country.getBool("active")) throw new BadRequestError("Bu ülke satışa kapalı.")

    const stock = L.findOne(tx, "city_stock", "city = {:c} && type = {:t}", { c: city.id, t: type.id })
    if (!stock || stock.getInt("stock") <= 0) throw new BadRequestError("Bu şehirde stok kalmadı.")

    const user = tx.findRecordById("users", auth.id)
    const need = type.getInt("required_rent_count")
    if (user.getInt("rent_count") < need) {
      throw new BadRequestError(`Bu mülkü alabilmek için en az ${need} kez kira ödemiş olmalısınız (şu an: ${user.getInt("rent_count")}).`)
    }

    const price = L.round2(type.getFloat("price") * city.getFloat("price_multiplier"))

    stock.set("stock", stock.getInt("stock") - 1)
    tx.save(stock)

    const p = new Record(tx.findCollectionByNameOrId("properties"))
    p.set("owner", auth.id)
    p.set("type", type.id)
    p.set("city", city.id)
    p.set("name", `${city.getString("name")} ${type.getString("name")} #${$security.randomStringWithAlphabet(4, "0123456789")}`)
    p.set("status", "empty")
    p.set("tenant_count", 0)
    p.set("purchase_price", price)
    p.set("invested", price)
    tx.save(p)
    L.recomputeLimits(tx, p)
    tx.save(p)
    propertyId = p.id

    L.adjustCredit(tx, auth.id, -price, "purchase", { property: p.id, note: p.getString("name") })
    L.addReputation(tx, s, auth.id, "purchase")
    L.maybeReferralReward(tx, s, auth.id, "first_purchase")
  })

  return e.json(200, { property: propertyId })
}, $apis.requireAuth("users"))

// İlan: mülkü boş / kiralık / satılık yap ve fiyat belirle
routerAdd("POST", "/api/erqan/listing", (e) => {
  const L = require(`${__hooks}/lib/core.js`)
  const { auth, s } = L.guard(e)
  const b = L.body(e)
  const status = String(b.status || "")
  if (["empty", "rent", "sale"].indexOf(status) === -1) throw new BadRequestError("Geçersiz durum.")

  e.app.runInTransaction((tx) => {
    const p = L.find(tx, "properties", b.property, "Mülk")
    if (p.getString("owner") !== auth.id) throw new ForbiddenError("Bu mülk size ait değil.")
    if (p.getString("status") === "building") throw new BadRequestError("İnşaat devam ederken ilan değiştirilemez.")
    const tenants = p.getInt("tenant_count")
    const cur = s.general.currency

    if (b.rent_price !== undefined && b.rent_price !== null && b.rent_price !== "") {
      p.set("rent_price", L.money(b.rent_price, "Kira fiyatı"))
    }
    if (b.sale_price !== undefined && b.sale_price !== null && b.sale_price !== "") {
      p.set("sale_price", L.money(b.sale_price, "Satış fiyatı"))
    }

    if (status === "empty" && tenants > 0) {
      throw new BadRequestError("Aktif kiracısı olan mülk boşaltılamaz; kiraların bitmesini bekleyin.")
    }
    if (status === "rent") {
      if (!s.features.rent) throw new BadRequestError("Kiralama şu anda kapalı.")
      const rp = p.getFloat("rent_price")
      const max = L.maxRentPrice(s, p)
      if (rp < s.rent.min_price || rp > max) {
        throw new BadRequestError(`Kira fiyatı ${s.rent.min_price} - ${max} ${cur} arasında olmalı.`)
      }
      if (p.getInt("tenant_limit") <= 0) throw new BadRequestError("Bu mülk kiraya verilemez.")
    }
    if (status === "sale") {
      if (!s.features.sale) throw new BadRequestError("Satış şu anda kapalı.")
      if (tenants > 0 && !s.sale.allow_with_tenants) {
        throw new BadRequestError("Kiracısı olan mülk satışa çıkarılamaz.")
      }
      const sp = p.getFloat("sale_price")
      if (sp < s.sale.min_price || sp > s.sale.max_price) {
        throw new BadRequestError(`Satış fiyatı ${s.sale.min_price} - ${s.sale.max_price} ${cur} arasında olmalı.`)
      }
    }

    const wasSale = p.getString("status") === "sale"
    p.set("status", status)
    L.syncRentStatus(p)
    tx.save(p)

    if (wasSale && status !== "sale") L.closePendingOffers(tx, s, p.id, "expired")
  })

  return e.json(200, { ok: true })
}, $apis.requireAuth("users"))

// Kiralama (ilk dönem ücreti hemen tahsil edilir)
routerAdd("POST", "/api/erqan/rent", (e) => {
  const L = require(`${__hooks}/lib/core.js`)
  const { auth, s } = L.guard(e, { feature: "rent" })
  const b = L.body(e)
  let rentalId = ""

  e.app.runInTransaction((tx) => {
    const p = L.find(tx, "properties", b.property, "Mülk")
    const ownerId = p.getString("owner")
    if (ownerId === auth.id) throw new BadRequestError("Kendi mülkünüzü kiralayamazsınız.")
    if (p.getString("status") !== "rent") throw new BadRequestError("Bu mülk kiralık değil.")
    if (p.getInt("tenant_count") >= p.getInt("tenant_limit")) throw new BadRequestError("Bu mülkün kiracı kapasitesi dolu.")
    if (L.findOne(tx, "rentals", "property = {:p} && tenant = {:u} && active = true", { p: p.id, u: auth.id })) {
      throw new BadRequestError("Bu mülkü zaten kiralıyorsunuz.")
    }
    if (L.count(tx, "rentals", "tenant = {:u} && active = true", { u: auth.id }) >= s.rent.max_active_per_user) {
      throw new BadRequestError(`En fazla ${s.rent.max_active_per_user} aktif kiralamanız olabilir.`)
    }
    const price = p.getFloat("rent_price")
    if (price <= 0) throw new BadRequestError("Bu mülkün kira fiyatı belirlenmemiş.")

    L.transfer(tx, s, auth.id, ownerId, price, {
      commissionPct: s.rent.commission_pct, payKind: "rent_pay", receiveKind: "rent_income",
      property: p.id, note: p.getString("name"),
    })

    const now = new Date()
    const r = new Record(tx.findCollectionByNameOrId("rentals"))
    r.set("property", p.id)
    r.set("tenant", auth.id)
    r.set("owner", ownerId)
    r.set("price", price)
    r.set("started", L.pbDate(now))
    r.set("next_charge", L.pbDate(L.addDays(now, s.rent.period_days)))
    r.set("active", true)
    r.set("cancel_at_period_end", false)
    r.set("warned", false)
    r.set("periods_paid", 1)
    tx.save(r)
    rentalId = r.id

    p.set("tenant_count", p.getInt("tenant_count") + 1)
    L.syncRentStatus(p)
    tx.save(p)

    L.incUser(tx, auth.id, "rent_count")
    L.addReputation(tx, s, auth.id, "rent_paid")
    L.maybeReferralReward(tx, s, auth.id, "first_rent")
    L.notify(tx, s, ownerId, "new_tenant", "Yeni kiracınız var",
      `${auth.getString("name") || "Bir kullanıcı"}, ${p.getString("name")} mülkünüzü kiraladı.`, `/properties/${p.id}`)
  })

  return e.json(200, { rental: rentalId })
}, $apis.requireAuth("users"))

// Kiracı: dönem sonunda sonlandır / iptali geri al
routerAdd("POST", "/api/erqan/rent/cancel", (e) => {
  const L = require(`${__hooks}/lib/core.js`)
  const { auth, s } = L.guard(e)
  const b = L.body(e)
  const undo = b.undo === true

  e.app.runInTransaction((tx) => {
    const r = L.find(tx, "rentals", b.rental, "Kiralama")
    if (r.getString("tenant") !== auth.id) throw new ForbiddenError("Bu kiralama size ait değil.")
    if (!r.getBool("active")) throw new BadRequestError("Bu kiralama zaten sona ermiş.")
    if (r.getBool("cancel_at_period_end") === !undo) return
    r.set("cancel_at_period_end", !undo)
    tx.save(r)
    if (!undo) L.addReputation(tx, s, auth.id, "rent_cancelled")
  })

  return e.json(200, { ok: true })
}, $apis.requireAuth("users"))

// Satılık mülkü ilan fiyatından satın alma
routerAdd("POST", "/api/erqan/sale/buy", (e) => {
  const L = require(`${__hooks}/lib/core.js`)
  const { auth, s } = L.guard(e, { feature: "sale" })
  const b = L.body(e)

  e.app.runInTransaction((tx) => {
    const p = L.find(tx, "properties", b.property, "Mülk")
    if (p.getString("owner") === auth.id) throw new BadRequestError("Kendi mülkünüzü satın alamazsınız.")
    if (p.getString("status") !== "sale") throw new BadRequestError("Bu mülk satılık değil.")
    const price = p.getFloat("sale_price")
    if (price <= 0) throw new BadRequestError("Bu mülkün satış fiyatı belirlenmemiş.")
    L.executeSale(tx, s, p, auth.id, price)
  })

  return e.json(200, { ok: true })
}, $apis.requireAuth("users"))

// Teklif ver (tutar bakiyeden bloke edilir)
routerAdd("POST", "/api/erqan/offer", (e) => {
  const L = require(`${__hooks}/lib/core.js`)
  const { auth, s } = L.guard(e, { feature: ["sale", "offers"] })
  const b = L.body(e)
  let offerId = ""

  e.app.runInTransaction((tx) => {
    const p = L.find(tx, "properties", b.property, "Mülk")
    const sellerId = p.getString("owner")
    if (sellerId === auth.id) throw new BadRequestError("Kendi mülkünüze teklif veremezsiniz.")
    if (p.getString("status") !== "sale") throw new BadRequestError("Bu mülk satılık değil.")
    const amount = L.money(b.amount, "Teklif")
    const min = L.round2(p.getFloat("sale_price") * s.offers.min_pct_of_price / 100)
    if (amount <= 0 || amount < min) throw new BadRequestError(`Teklif en az ${min} ${s.general.currency} olmalı.`)
    if (L.findOne(tx, "offers", "property = {:p} && buyer = {:u} && status = 'pending'", { p: p.id, u: auth.id })) {
      throw new BadRequestError("Bu mülke zaten bekleyen bir teklifiniz var.")
    }
    if (L.count(tx, "offers", "buyer = {:u} && status = 'pending'", { u: auth.id }) >= s.offers.max_pending_per_user) {
      throw new BadRequestError(`Aynı anda en fazla ${s.offers.max_pending_per_user} bekleyen teklifiniz olabilir.`)
    }

    L.adjustCredit(tx, auth.id, -amount, "offer_hold", {
      property: p.id, counterparty: sellerId, note: "Teklif blokesi",
      insufficientMessage: "Teklif tutarı kadar bakiyeniz yok.",
    })

    const o = new Record(tx.findCollectionByNameOrId("offers"))
    o.set("property", p.id)
    o.set("buyer", auth.id)
    o.set("seller", sellerId)
    o.set("amount", amount)
    o.set("message", String(b.message || "").slice(0, 500))
    o.set("status", "pending")
    o.set("expires", L.pbDate(L.addDays(new Date(), s.offers.expire_days)))
    tx.save(o)
    offerId = o.id

    L.notify(tx, s, sellerId, "offer_received", "Yeni teklif aldınız",
      `${p.getString("name")} için ${amount} ${s.general.currency} teklif var.`, "/offers")
  })

  return e.json(200, { offer: offerId })
}, $apis.requireAuth("users"))

// Teklife yanıt: accept / reject (satıcı), withdraw (alıcı)
routerAdd("POST", "/api/erqan/offer/respond", (e) => {
  const L = require(`${__hooks}/lib/core.js`)
  const { auth, s } = L.guard(e)
  const b = L.body(e)
  const action = String(b.action || "")

  e.app.runInTransaction((tx) => {
    const o = L.find(tx, "offers", b.offer, "Teklif")
    if (o.getString("status") !== "pending") throw new BadRequestError("Bu teklif artık beklemede değil.")
    const buyerId = o.getString("buyer")
    const sellerId = o.getString("seller")

    if (action === "withdraw") {
      if (buyerId !== auth.id) throw new ForbiddenError("Bu teklif size ait değil.")
      L.closeOffer(tx, s, o, "withdrawn")
      return
    }
    if (sellerId !== auth.id) throw new ForbiddenError("Bu teklif size yapılmadı.")

    if (action === "reject") {
      L.closeOffer(tx, s, o, "rejected")
      L.notify(tx, s, buyerId, "offer_updated", "Teklifiniz reddedildi", "Bloke tutar bakiyenize iade edildi.", "/offers")
      return
    }
    if (action !== "accept") throw new BadRequestError("Geçersiz işlem.")
    if (!s.features.sale || !s.features.offers) throw new BadRequestError("Satış şu anda kapalı.")

    const p = L.find(tx, "properties", o.getString("property"), "Mülk")
    if (p.getString("owner") !== sellerId || p.getString("status") !== "sale") {
      throw new BadRequestError("Mülk artık satışta değil.")
    }
    // Blokeyi çöz, ardından normal satış akışıyla teklif tutarından sat.
    L.closeOffer(tx, s, o, "accepted")
    L.executeSale(tx, s, p, buyerId, o.getFloat("amount"), "Teklif ile satış")
    L.notify(tx, s, buyerId, "offer_updated", "Teklifiniz kabul edildi", `${p.getString("name")} artık sizin.`, `/properties/${p.id}`)
  })

  return e.json(200, { ok: true })
}, $apis.requireAuth("users"))

// Arsaya ev inşası
routerAdd("POST", "/api/erqan/build", (e) => {
  const L = require(`${__hooks}/lib/core.js`)
  const { auth, s } = L.guard(e, { feature: "build" })
  const b = L.body(e)

  e.app.runInTransaction((tx) => {
    const p = L.find(tx, "properties", b.property, "Mülk")
    if (p.getString("owner") !== auth.id) throw new ForbiddenError("Bu mülk size ait değil.")
    if (p.getString("status") !== "empty" || p.getInt("tenant_count") > 0) {
      throw new BadRequestError("İnşaat için mülk boş olmalı (kiracısız ve ilanda değil).")
    }
    const type = tx.findRecordById("property_types", p.getString("type"))
    const targetId = type.getString("build_target")
    if (!targetId) throw new BadRequestError("Bu mülk tipine inşaat yapılamaz.")
    const target = tx.findRecordById("property_types", targetId)

    if (s.build.only_when_target_out_of_stock) {
      const st = L.findOne(tx, "city_stock", "city = {:c} && type = {:t}", { c: p.getString("city"), t: targetId })
      if (st && st.getInt("stock") > 0) {
        throw new BadRequestError(`Bu şehirde hâlâ satılık ${target.getString("name")} var; inşaat stok bitince açılır.`)
      }
    }

    const cost = type.getFloat("build_cost")
    if (cost > 0) L.adjustCredit(tx, auth.id, -cost, "build", { property: p.id, note: `${target.getString("name")} inşaatı` })
    p.set("invested", L.round2(p.getFloat("invested") + cost))
    p.set("building_to", targetId)

    if (s.build.build_days > 0) {
      p.set("status", "building")
      p.set("build_ready_at", L.pbDate(L.addDays(new Date(), s.build.build_days)))
      tx.save(p)
    } else {
      L.finishBuild(tx, s, p)
    }
  })

  return e.json(200, { ok: true })
}, $apis.requireAuth("users"))

// Yükseltme uygula
routerAdd("POST", "/api/erqan/upgrade", (e) => {
  const L = require(`${__hooks}/lib/core.js`)
  const { auth, s } = L.guard(e, { feature: "upgrades" })
  const b = L.body(e)

  e.app.runInTransaction((tx) => {
    const p = L.find(tx, "properties", b.property, "Mülk")
    if (p.getString("owner") !== auth.id) throw new ForbiddenError("Bu mülk size ait değil.")
    if (p.getString("status") === "building") throw new BadRequestError("İnşaat sürerken yükseltme yapılamaz.")
    const up = L.find(tx, "upgrades", b.upgrade, "Yükseltme")
    if (!up.getBool("active")) throw new BadRequestError("Bu yükseltme şu anda sunulmuyor.")
    const allowed = up.getStringSlice("types")
    if (allowed.length > 0 && allowed.indexOf(p.getString("type")) === -1) {
      throw new BadRequestError("Bu yükseltme bu mülk tipine uygulanamaz.")
    }
    const max = up.getInt("max_per_property")
    if (max > 0 && L.count(tx, "property_upgrades", "property = {:p} && upgrade = {:u}", { p: p.id, u: up.id }) >= max) {
      throw new BadRequestError("Bu yükseltmeyi bu mülke daha fazla uygulayamazsınız.")
    }
    const cost = up.getFloat("cost")
    if (cost > 0) L.adjustCredit(tx, auth.id, -cost, "upgrade", { property: p.id, note: up.getString("name") })

    const pu = new Record(tx.findCollectionByNameOrId("property_upgrades"))
    pu.set("property", p.id)
    pu.set("upgrade", up.id)
    pu.set("paid", cost)
    tx.save(pu)

    p.set("invested", L.round2(p.getFloat("invested") + cost))
    L.recomputeLimits(tx, p)
    tx.save(p)
  })

  return e.json(200, { ok: true })
}, $apis.requireAuth("users"))

// Bildirimleri okundu işaretle (id verilmezse hepsi)
routerAdd("POST", "/api/erqan/notifications/read", (e) => {
  const L = require(`${__hooks}/lib/core.js`)
  const { auth } = L.guard(e)
  const b = L.body(e)
  e.app.runInTransaction((tx) => {
    const list = b.id
      ? tx.findRecordsByFilter("notifications", "id = {:id} && user = {:u}", "", 1, 0, { id: String(b.id), u: auth.id })
      : tx.findRecordsByFilter("notifications", "user = {:u} && read = false", "", 0, 0, { u: auth.id })
    for (const n of list) {
      n.set("read", true)
      tx.save(n)
    }
  })
  return e.json(200, { ok: true })
}, $apis.requireAuth("users"))

// Portföy ve kazanç özeti
routerAdd("GET", "/api/erqan/portfolio", (e) => {
  const L = require(`${__hooks}/lib/core.js`)
  const { auth } = L.guard(e)
  const app = e.app
  const uid = auth.id

  const props = app.findRecordsByFilter("properties", "owner = {:u}", "", 0, 0, { u: uid })
  const byStatus = { empty: 0, rent: 0, rented: 0, sale: 0, building: 0 }
  let invested = 0
  for (const p of props) {
    byStatus[p.getString("status")] = (byStatus[p.getString("status")] || 0) + 1
    invested += p.getFloat("invested")
  }

  const asOwner = app.findRecordsByFilter("rentals", "owner = {:u} && active = true", "", 0, 0, { u: uid })
  let rentIncome = 0
  for (const r of asOwner) rentIncome += r.getFloat("price")

  const asTenant = app.findRecordsByFilter("rentals", "tenant = {:u} && active = true", "", 0, 0, { u: uid })
  let rentExpense = 0
  for (const r of asTenant) rentExpense += r.getFloat("price")

  const since = new Date()
  since.setUTCMonth(since.getUTCMonth() - 11, 1)
  since.setUTCHours(0, 0, 0, 0)
  const rows = arrayOf(new DynamicModel({ month: "", income: 0, expense: 0 }))
  app.db().newQuery(`
    SELECT strftime('%Y-%m', created) AS month,
           COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) AS income,
           COALESCE(SUM(CASE WHEN amount < 0 THEN -amount ELSE 0 END), 0) AS expense
    FROM transactions
    WHERE user = {:u} AND created >= {:since} AND kind NOT IN ('offer_hold', 'offer_release')
    GROUP BY month ORDER BY month
  `).bind({ u: uid, since: L.pbDate(since) }).all(rows)

  const months = []
  for (let i = 0; i < 12; i++) {
    const d = new Date(since.getTime())
    d.setUTCMonth(since.getUTCMonth() + i)
    const key = d.toISOString().slice(0, 7)
    const row = rows.find((r) => r.month === key)
    months.push({ month: key, income: row ? L.round2(row.income) : 0, expense: row ? L.round2(row.expense) : 0 })
  }

  return e.json(200, {
    properties: props.length,
    by_status: byStatus,
    invested: L.round2(invested),
    monthly_rent_income: L.round2(rentIncome),
    active_tenants: asOwner.length,
    monthly_rent_expense: L.round2(rentExpense),
    active_rentals: asTenant.length,
    months,
  })
}, $apis.requireAuth("users"))

// Herkese açık kullanıcı profili
routerAdd("GET", "/api/erqan/users/{id}/public", (e) => {
  const L = require(`${__hooks}/lib/core.js`)
  L.guard(e, { feature: "public_profiles" })
  const u = L.find(e.app, "users", e.request.pathValue("id"), "Kullanıcı")
  const props = e.app.findRecordsByFilter("properties", "owner = {:u}", "-created", 0, 0, { u: u.id })
  e.app.expandRecords(props, ["type", "city"], null)

  let tenants = 0
  const list = props.map((p) => {
    tenants += p.getInt("tenant_count")
    const type = p.expandedOne("type")
    const city = p.expandedOne("city")
    return {
      id: p.id,
      name: p.getString("name"),
      status: p.getString("status"),
      type: type ? type.getString("name") : "",
      city: city ? city.getString("name") : "",
      rent_price: p.getFloat("rent_price"),
      sale_price: p.getFloat("sale_price"),
      image: p.getString("image"),
    }
  })

  return e.json(200, {
    user: {
      id: u.id,
      collectionId: u.collection().id,
      name: u.getString("name"),
      avatar: u.getString("avatar"),
      reputation: u.getFloat("reputation"),
      created: u.getString("created"),
    },
    stats: {
      properties: props.length,
      for_rent: list.filter((p) => p.status === "rent" || p.status === "rented").length,
      for_sale: list.filter((p) => p.status === "sale").length,
      tenants,
    },
    properties: list,
  })
}, $apis.requireAuth("users"))
