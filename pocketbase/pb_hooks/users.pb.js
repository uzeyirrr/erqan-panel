/// <reference path="../../.pb/pb_data/types.d.ts" />

// Kayıt: kayıt kapalıysa engelle, davet kodunu çöz.
onRecordCreateRequest((e) => {
  const L = require(`${__hooks}/lib/core.js`)
  const s = L.getSettings(e.app)
  if (!e.hasSuperuserAuth()) {
    if (!s.general.registration_open) throw new BadRequestError("Yeni kayıtlar şu anda kapalı.")
    if (s.general.maintenance) throw new ApiError(503, s.general.maintenance_message)
  }
  const code = String(L.body(e).invite_code || "").trim().toUpperCase()
  if (code && s.features.referral) {
    const inviter = L.findOne(e.app, "users", "referral_code = {:c}", { c: code })
    if (!inviter) throw new BadRequestError("Davet kodu geçersiz.")
    e.record.set("referred_by", inviter.id)
  }
  e.next()
}, "users")

// Varsayılanlar: rol, davet kodu. ERQAN_ADMIN_EMAILS içindeki e-postalar admin olur.
onRecordCreate((e) => {
  const r = e.record
  const admins = String($os.getenv("ERQAN_ADMIN_EMAILS") || "")
    .split(",").map((x) => x.trim().toLowerCase()).filter((x) => x)
  if (admins.indexOf(r.getString("email").toLowerCase()) !== -1) {
    r.set("role", "admin")
  } else if (!r.getString("role")) {
    r.set("role", "user")
  }
  if (!r.getString("referral_code")) {
    r.set("referral_code", $security.randomStringWithAlphabet(8, "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"))
  }
  e.next()
}, "users")

// Başlangıç kredisi ve "kayıtta" tetiklenen davet bonusu.
onRecordAfterCreateSuccess((e) => {
  const L = require(`${__hooks}/lib/core.js`)
  try {
    e.app.runInTransaction((tx) => {
      const s = L.getSettings(tx)
      if (s.general.signup_credit > 0) {
        L.adjustCredit(tx, e.record.id, s.general.signup_credit, "signup_bonus", { note: "Hoş geldin bonusu" })
      }
      L.maybeReferralReward(tx, s, e.record.id, "signup")
    })
  } catch (err) {
    console.log("signup bonus error", err)
  }
  e.next()
}, "users")

// Engellenmiş kullanıcılar giriş yapamaz.
onRecordAuthRequest((e) => {
  if (e.record && e.record.getBool("banned")) throw new ForbiddenError("Hesabınız askıya alınmış.")
  e.next()
}, "users")

// Başka kullanıcıların hassas alanlarını gizle (kredi, rol, davet bilgileri...).
onRecordEnrich((e) => {
  const info = e.requestInfo
  const auth = info ? info.auth : null
  const self = auth && auth.collection().name === "users" && auth.id === e.record.id
  const admin = auth && (auth.isSuperuser() || auth.getString("role") === "admin")
  if (!self && !admin) {
    e.record.hide("credit", "rent_count", "banned", "referral_code", "referred_by", "referral_rewarded",
      "referral_count", "role")
  }
  // Admin paneli kullanıcıları e-postayla arar ve gösterir.
  if (admin) e.record.ignoreEmailVisibility(true)
  e.next()
}, "users")
