/// <reference path="../../../.pb/pb_data/types.d.ts" />

// Erqan iş kuralları için ortak yardımcılar.
// pb_hooks içinde her handler izole çalıştığı için bu modül handler'ın
// içinde `require(`${__hooks}/lib/core.js`)` ile yüklenir.

// Tüm iş kuralları buradaki varsayılanlardan gelir; admin paneli yalnızca
// bu yapıdaki anahtarları değiştirebilir (bilinmeyen anahtarlar atılır).
const DEFAULTS = {
  general: {
    site_name: "Erqan",
    brand_color: "#0F91E3", // Material 3 renk şemasının üretildiği ana renk
    currency: "USD",
    maintenance: false,
    maintenance_message: "Sistem bakımda, lütfen daha sonra tekrar deneyin.",
    registration_open: true,
    signup_credit: 0,
  },
  features: {
    buy: true,
    rent: true,
    sale: true,
    offers: true,
    build: true,
    upgrades: true,
    referral: true,
    public_profiles: true,
    notifications: true,
  },
  rent: {
    period_days: 30,
    auto_renew: true,
    grace_days: 0,
    min_price: 1,
    max_price: 100000,
    commission_pct: 0,
    max_active_per_user: 10,
    warn_days_before: 3,
  },
  sale: {
    commission_pct: 0,
    min_price: 1,
    max_price: 10000000,
    allow_with_tenants: false,
  },
  build: {
    only_when_target_out_of_stock: false,
    build_days: 0,
  },
  offers: {
    expire_days: 7,
    min_pct_of_price: 50,
    max_pending_per_user: 5,
  },
  referral: {
    inviter_bonus: 0,
    invitee_bonus: 0,
    trigger: "signup", // signup | first_rent | first_purchase
    max_rewards_per_user: 50,
  },
  reputation: {
    purchase: 1,
    rent_paid: 1,
    sale_completed: 5,
    rent_cancelled: 0,
  },
  notifications: {
    rent_charged: true,
    rent_income: true,
    rent_warning: true,
    rent_ended: true,
    new_tenant: true,
    sold: true,
    offer_received: true,
    offer_updated: true,
    build_done: true,
    admin_credit: true,
    referral: true,
  },
}

const REFERRAL_TRIGGERS = ["signup", "first_rent", "first_purchase"]

function isObj(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v)
}

// Varsayılan yapıyı temel alarak birleştirir ve tipleri zorlar.
function mergeSettings(base, over) {
  const out = {}
  const src = isObj(over) ? over : {}
  for (const k in base) {
    const def = base[k]
    const v = src[k]
    if (isObj(def)) {
      out[k] = mergeSettings(def, v)
    } else if (v === undefined || v === null) {
      out[k] = def
    } else if (typeof def === "number") {
      const n = Number(v)
      out[k] = isFinite(n) ? n : def
    } else if (typeof def === "boolean") {
      out[k] = v === true || v === "true" || v === 1
    } else {
      out[k] = String(v)
    }
  }
  return out
}

function readJSON(record, field) {
  try {
    const raw = record.get(field)
    if (raw === null || raw === undefined) return {}
    const s = typeof raw === "string" ? raw : toString(raw)
    return s ? JSON.parse(s) : {}
  } catch (_) {
    return {}
  }
}

function getSettings(app) {
  let data = {}
  try {
    const rec = app.findFirstRecordByFilter("settings", "key = 'main'")
    data = readJSON(rec, "data")
  } catch (_) {}
  const s = mergeSettings(DEFAULTS, data)
  if (REFERRAL_TRIGGERS.indexOf(s.referral.trigger) === -1) s.referral.trigger = "signup"
  return s
}

function saveSettings(app, data) {
  const s = mergeSettings(DEFAULTS, data)
  if (REFERRAL_TRIGGERS.indexOf(s.referral.trigger) === -1) {
    throw new BadRequestError("Geçersiz referans tetikleyicisi.")
  }
  const nonNegative = [
    s.general.signup_credit, s.rent.period_days, s.rent.grace_days, s.rent.min_price, s.rent.max_price,
    s.rent.commission_pct, s.rent.max_active_per_user, s.rent.warn_days_before, s.sale.commission_pct,
    s.sale.min_price, s.sale.max_price, s.build.build_days, s.offers.expire_days, s.offers.min_pct_of_price,
    s.offers.max_pending_per_user, s.referral.inviter_bonus, s.referral.invitee_bonus,
    s.referral.max_rewards_per_user,
  ]
  if (nonNegative.some((n) => n < 0)) throw new BadRequestError("Ayarlarda negatif değer olamaz.")
  if (s.rent.period_days < 1) throw new BadRequestError("Kira dönemi en az 1 gün olmalı.")
  if (s.rent.commission_pct > 100 || s.sale.commission_pct > 100) {
    throw new BadRequestError("Komisyon oranı %100'den büyük olamaz.")
  }
  if (s.rent.min_price > s.rent.max_price) throw new BadRequestError("Minimum kira, maksimumdan büyük olamaz.")
  if (s.sale.min_price > s.sale.max_price) throw new BadRequestError("Minimum satış fiyatı, maksimumdan büyük olamaz.")
  if (!/^#[0-9a-fA-F]{6}$/.test(s.general.brand_color)) throw new BadRequestError("Tema rengi #RRGGBB biçiminde olmalı.")

  let rec
  try {
    rec = app.findFirstRecordByFilter("settings", "key = 'main'")
  } catch (_) {
    rec = new Record(app.findCollectionByNameOrId("settings"))
    rec.set("key", "main")
  }
  rec.set("data", s)
  app.save(rec)
  return s
}

// ------------------------------------------------------------------ genel

function round2(n) {
  return Math.round(Number(n) * 100) / 100
}

function pbDate(d) {
  return d.toISOString().replace("T", " ")
}

function parseDate(s) {
  if (!s) return null
  const str = String(s)
  if (!str) return null
  return new Date(str.replace(" ", "T"))
}

function addDays(d, days) {
  return new Date(d.getTime() + days * 86400000)
}

function body(e) {
  return e.requestInfo().body || {}
}

function money(v, label) {
  const n = Number(v)
  if (!isFinite(n) || n < 0) throw new BadRequestError(`${label} geçerli bir tutar olmalı.`)
  return round2(n)
}

function find(app, collection, id, label) {
  if (!id) throw new BadRequestError(`${label} belirtilmedi.`)
  try {
    return app.findRecordById(collection, String(id))
  } catch (_) {
    throw new NotFoundError(`${label} bulunamadı.`)
  }
}

function findOne(app, collection, filter, params) {
  try {
    return app.findFirstRecordByFilter(collection, filter, params || {})
  } catch (_) {
    return null
  }
}

function count(app, collection, filter, params) {
  return app.findRecordsByFilter(collection, filter, "", 0, 0, params || {}).length
}

// Her endpoint'in başında çağrılır: giriş, engel, bakım modu, özellik anahtarı, yetki.
function guard(e, opts) {
  const o = opts || {}
  const auth = e.auth
  if (!auth || auth.collection().name !== "users") throw new UnauthorizedError("Giriş yapmalısınız.")
  if (auth.getBool("banned")) throw new ForbiddenError("Hesabınız askıya alınmış.")
  const s = getSettings(e.app)
  const isAdmin = auth.getString("role") === "admin"
  if (o.admin && !isAdmin) throw new ForbiddenError("Bu işlem için yetkiniz yok.")
  if (s.general.maintenance && !isAdmin) throw new ApiError(503, s.general.maintenance_message)
  const flags = o.feature ? [].concat(o.feature) : []
  for (const f of flags) {
    if (!s.features[f]) throw new BadRequestError("Bu özellik şu anda kapalı.")
  }
  return { auth, s, isAdmin }
}

// ------------------------------------------------------------------ para

function logTx(app, t) {
  const r = new Record(app.findCollectionByNameOrId("transactions"))
  r.set("user", t.user || "")
  r.set("amount", round2(t.amount))
  r.set("balance_after", t.balance_after === undefined ? 0 : round2(t.balance_after))
  r.set("kind", t.kind)
  r.set("property", t.property || "")
  r.set("counterparty", t.counterparty || "")
  r.set("note", t.note || "")
  app.save(r)
}

// Kullanıcı kredisini değiştirir ve işlem kaydı yazar. Bakiye eksiye düşemez.
// Her çağrı kullanıcıyı yeniden okur; çağıran taraf eski bir kullanıcı
// kaydını daha sonra kaydetmemelidir.
function adjustCredit(app, userId, amount, kind, o) {
  const opts = o || {}
  const amt = round2(amount)
  const u = app.findRecordById("users", userId)
  const next = round2(u.getFloat("credit") + amt)
  if (next < 0) throw new BadRequestError(opts.insufficientMessage || "Yetersiz bakiye.")
  u.set("credit", next)
  app.save(u)
  logTx(app, {
    user: userId, amount: amt, balance_after: next, kind,
    property: opts.property, counterparty: opts.counterparty, note: opts.note,
  })
  return next
}

// Ödeyenden alır, komisyonu kesip alıcıya aktarır.
function transfer(app, s, from, to, amount, o) {
  const opts = o || {}
  const gross = round2(amount)
  const commission = round2(gross * (opts.commissionPct || 0) / 100)
  const net = round2(gross - commission)
  adjustCredit(app, from, -gross, opts.payKind, {
    property: opts.property, counterparty: to, note: opts.note, insufficientMessage: opts.insufficientMessage,
  })
  adjustCredit(app, to, net, opts.receiveKind, {
    property: opts.property, counterparty: from,
    note: commission > 0 ? `Komisyon: ${commission} ${s.general.currency}` : opts.note,
  })
  if (commission > 0) {
    logTx(app, { user: "", amount: commission, kind: "commission", property: opts.property, note: opts.payKind })
  }
  return { gross, commission, net }
}

// ------------------------------------------------------------------ bildirim / itibar

function notify(app, s, userId, kind, title, text, link) {
  if (!userId || !s.features.notifications) return
  if (s.notifications[kind] === false) return
  const r = new Record(app.findCollectionByNameOrId("notifications"))
  r.set("user", userId)
  r.set("kind", kind)
  r.set("title", title)
  r.set("body", text || "")
  r.set("link", link || "")
  r.set("read", false)
  app.save(r)
}

function addReputation(app, s, userId, key) {
  const pts = Number(s.reputation[key] || 0)
  if (!pts) return
  const u = app.findRecordById("users", userId)
  u.set("reputation", round2(u.getFloat("reputation") + pts))
  app.save(u)
}

function incUser(app, userId, field, by) {
  const u = app.findRecordById("users", userId)
  u.set(field, u.getInt(field) + (by === undefined ? 1 : by))
  app.save(u)
}

// Referans bonusu: admin'in seçtiği tetikleyici gerçekleştiğinde, kullanıcı başına bir kez.
function maybeReferralReward(app, s, userId, trigger) {
  if (!s.features.referral || s.referral.trigger !== trigger) return
  const u = app.findRecordById("users", userId)
  const inviterId = u.getString("referred_by")
  if (!inviterId || u.getBool("referral_rewarded")) return
  u.set("referral_rewarded", true)
  app.save(u)

  let inviter
  try { inviter = app.findRecordById("users", inviterId) } catch (_) { return }
  const cur = s.general.currency
  if (s.referral.invitee_bonus > 0) {
    adjustCredit(app, userId, s.referral.invitee_bonus, "referral_bonus", { counterparty: inviterId, note: "Davet bonusu" })
    notify(app, s, userId, "referral", "Davet bonusu kazandınız",
      `${s.referral.invitee_bonus} ${cur} hesabınıza eklendi.`, "/wallet")
  }
  if (inviter.getInt("referral_count") < s.referral.max_rewards_per_user) {
    incUser(app, inviterId, "referral_count")
    if (s.referral.inviter_bonus > 0) {
      adjustCredit(app, inviterId, s.referral.inviter_bonus, "referral_bonus", { counterparty: userId, note: "Davet bonusu" })
      notify(app, s, inviterId, "referral", "Davet bonusu kazandınız",
        `Davet ettiğiniz ${u.getString("name") || "kullanıcı"} sayesinde ${s.referral.inviter_bonus} ${cur} kazandınız.`, "/wallet")
    }
  }
}

// ------------------------------------------------------------------ mülk

// Kiracı kapasitesi ve kira tavanı bonusunu tip + yükseltmelerden yeniden hesaplar.
function recomputeLimits(app, property) {
  const type = app.findRecordById("property_types", property.getString("type"))
  let tenantBonus = 0
  let capBonus = 0
  const ups = app.findRecordsByFilter("property_upgrades", "property = {:p}", "", 0, 0, { p: property.id })
  for (const pu of ups) {
    try {
      const up = app.findRecordById("upgrades", pu.getString("upgrade"))
      tenantBonus += up.getInt("tenant_limit_bonus")
      capBonus += up.getFloat("rent_cap_bonus_pct")
    } catch (_) {}
  }
  property.set("tenant_limit", type.getInt("tenant_limit") + tenantBonus)
  property.set("rent_cap_bonus_pct", capBonus)
  syncRentStatus(property)
}

// Kiralık/kirada durumunu doluluk oranına göre günceller.
function syncRentStatus(property) {
  const st = property.getString("status")
  if (st !== "rent" && st !== "rented") return
  property.set("status", property.getInt("tenant_count") >= property.getInt("tenant_limit") ? "rented" : "rent")
}

function maxRentPrice(s, property) {
  return round2(s.rent.max_price * (1 + property.getFloat("rent_cap_bonus_pct") / 100))
}

function endRental(app, s, rental, reason) {
  if (!rental.getBool("active")) return
  rental.set("active", false)
  rental.set("ended", pbDate(new Date()))
  rental.set("ended_reason", reason)
  app.save(rental)

  const propertyId = rental.getString("property")
  let property = null
  try { property = app.findRecordById("properties", propertyId) } catch (_) {}
  const name = property ? property.getString("name") : "Mülk"
  if (property) {
    property.set("tenant_count", Math.max(0, property.getInt("tenant_count") - 1))
    syncRentStatus(property)
    app.save(property)
  }

  const reasons = {
    cancelled: "kiracı tarafından iptal edildi",
    expired: "süresi doldu",
    insufficient_credit: "bakiye yetersiz olduğu için sonlandı",
    sold: "mülk satıldığı için sonlandı",
    admin: "yönetici tarafından sonlandırıldı",
  }
  const why = reasons[reason] || "sonlandı"
  notify(app, s, rental.getString("tenant"), "rent_ended", "Kiralamanız sona erdi", `${name}: kiralama ${why}.`, "/my-properties?tab=rented")
  notify(app, s, rental.getString("owner"), "rent_ended", "Bir kiracınız ayrıldı", `${name}: kiralama ${why}.`, `/properties/${propertyId}`)
}

// Bekleyen teklifi kapatır ve bloke tutarı alıcıya iade eder.
function closeOffer(app, s, offer, status) {
  if (offer.getString("status") !== "pending") return
  offer.set("status", status)
  app.save(offer)
  adjustCredit(app, offer.getString("buyer"), offer.getFloat("amount"), "offer_release", {
    property: offer.getString("property"), counterparty: offer.getString("seller"), note: `Teklif ${status}`,
  })
}

function closePendingOffers(app, s, propertyId, status, exceptId) {
  const offers = app.findRecordsByFilter("offers", "property = {:p} && status = 'pending'", "", 0, 0, { p: propertyId })
  for (const o of offers) {
    if (exceptId && o.id === exceptId) continue
    closeOffer(app, s, o, status)
    notify(app, s, o.getString("buyer"), "offer_updated", "Teklifiniz kapandı",
      "Teklif verdiğiniz mülk artık satışta değil; bloke tutar iade edildi.", "/offers")
  }
}

// Satış: alıcı öder, komisyon kesilir, sahiplik ve aktif kiralar alıcıya geçer.
function executeSale(app, s, property, buyerId, price, note) {
  const sellerId = property.getString("owner")
  transfer(app, s, buyerId, sellerId, price, {
    commissionPct: s.sale.commission_pct, payKind: "sale", receiveKind: "sale_income",
    property: property.id, note: note || "Mülk satışı",
  })

  property.set("owner", buyerId)
  property.set("sale_price", 0)
  property.set("invested", round2(price))
  property.set("status", property.getInt("tenant_count") > 0 ? "rent" : "empty")
  syncRentStatus(property)
  app.save(property)

  const rentals = app.findRecordsByFilter("rentals", "property = {:p} && active = true", "", 0, 0, { p: property.id })
  for (const r of rentals) {
    r.set("owner", buyerId)
    app.save(r)
  }

  closePendingOffers(app, s, property.id, "expired")
  addReputation(app, s, sellerId, "sale_completed")
  addReputation(app, s, buyerId, "purchase")

  const cur = s.general.currency
  const name = property.getString("name")
  notify(app, s, sellerId, "sold", "Mülkünüz satıldı", `${name} ${price} ${cur} karşılığında satıldı.`, "/wallet")
  notify(app, s, buyerId, "sold", "Mülk satın aldınız", `${name} artık sizin.`, `/properties/${property.id}`)
}

function finishBuild(app, s, property) {
  const targetId = property.getString("building_to")
  if (!targetId) return
  const target = app.findRecordById("property_types", targetId)
  property.set("type", targetId)
  property.set("building_to", "")
  property.set("build_ready_at", "")
  property.set("status", "empty")
  recomputeLimits(app, property)
  app.save(property)
  notify(app, s, property.getString("owner"), "build_done", "İnşaat tamamlandı",
    `${property.getString("name")} artık bir ${target.getString("name")}.`, `/properties/${property.id}`)
}

module.exports = {
  DEFAULTS,
  getSettings,
  saveSettings,
  round2,
  pbDate,
  parseDate,
  addDays,
  body,
  money,
  find,
  findOne,
  count,
  guard,
  logTx,
  adjustCredit,
  transfer,
  notify,
  addReputation,
  incUser,
  maybeReferralReward,
  recomputeLimits,
  syncRentStatus,
  maxRentPrice,
  endRental,
  closeOffer,
  closePendingOffers,
  executeSale,
  finishBuild,
}
