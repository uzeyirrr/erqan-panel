// Erqan backend uçtan uca testi.
// Boş bir PocketBase'e karşı çalıştırılır:
//   ERQAN_ADMIN_EMAILS=admin@test.local pocketbase serve --dir=<boş> --hooksDir=pocketbase/pb_hooks --migrationsDir=pocketbase/pb_migrations
//   pocketbase superuser upsert su@test.local Passw0rd123! --dir=<aynı>
//   PB_URL=http://127.0.0.1:8091 node pocketbase/tests/e2e.mjs

const PB = process.env.PB_URL || "http://127.0.0.1:8091"
const SU = { email: process.env.PB_SU_EMAIL || "su@test.local", password: process.env.PB_SU_PASSWORD || "Passw0rd123!" }
const PASS = "Passw0rd123!"

let failures = 0
let passes = 0
const ok = (cond, msg, extra) => {
  if (cond) { passes++; console.log(`  ✓ ${msg}`) } else { failures++; console.log(`  ✗ ${msg}`, extra === undefined ? "" : JSON.stringify(extra)) }
}
const section = (t) => console.log(`\n# ${t}`)

async function call(method, path, token, body) {
  const res = await fetch(PB + path, {
    method,
    headers: Object.assign({ "Content-Type": "application/json" }, token ? { Authorization: token } : {}),
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  let data = null
  try { data = await res.json() } catch (_) {}
  return { status: res.status, data }
}
const api = {
  get: (p, t) => call("GET", p, t),
  post: (p, t, b) => call("POST", p, t, b || {}),
  patch: (p, t, b) => call("PATCH", p, t, b),
}

async function register(email, name, invite) {
  const body = { email, password: PASS, passwordConfirm: PASS, name }
  if (invite) body.invite_code = invite
  const r = await api.post("/api/collections/users/records", null, body)
  if (r.status !== 200) throw new Error(`register ${email}: ${JSON.stringify(r.data)}`)
  const a = await api.post("/api/collections/users/auth-with-password", null, { identity: email, password: PASS })
  return { id: a.data.record.id, token: a.data.token, record: a.data.record }
}
const me = async (u) => (await api.get(`/api/collections/users/records/${u.id}`, u.token)).data
const credit = async (u) => (await me(u)).credit
const first = async (coll, filter, token) =>
  (await api.get(`/api/collections/${coll}/records?filter=${encodeURIComponent(filter)}&perPage=1`, token)).data.items[0]

async function main() {
  const suAuth = await api.post("/api/collections/_superusers/auth-with-password", null, { identity: SU.email, password: SU.password })
  const su = suAuth.data.token
  const suPatch = (coll, id, body) => api.patch(`/api/collections/${coll}/records/${id}`, su, body)
  const past = new Date(Date.now() - 60000).toISOString().replace("T", " ")
  const maintenance = async (tok) => (await api.post("/api/erqan/admin/run-maintenance", tok)).data

  section("Kayıt, roller, ayarlar")
  const admin = await register("admin@test.local", "Admin")
  ok((await me(admin)).role === "admin", "ERQAN_ADMIN_EMAILS kullanıcısı admin oldu")
  let r = await api.post("/api/erqan/admin/settings", admin.token, {
    data: {
      general: { signup_credit: 5000 },
      rent: { commission_pct: 10, warn_days_before: 3 },
      sale: { commission_pct: 5 },
      referral: { inviter_bonus: 100, invitee_bonus: 50, trigger: "signup" },
      bogus: { x: 1 },
    },
  })
  ok(r.status === 200 && r.data.rent.commission_pct === 10 && r.data.bogus === undefined, "admin ayarları kaydetti, bilinmeyen anahtar atıldı", r.data)

  const alice = await register("alice@test.local", "Alice")
  const bob = await register("bob@test.local", "Bob")
  ok((await me(alice)).role === "user", "normal kullanıcı rolü user")
  ok((await credit(alice)) === 5000, "hoş geldin kredisi verildi")
  const aliceCode = (await me(alice)).referral_code
  const carol = await register("carol@test.local", "Carol", aliceCode)
  ok((await credit(carol)) === 5050, "davet edilen bonus aldı (5000 + 50)")
  ok((await credit(alice)) === 5100, "davet eden bonus aldı (5000 + 100)")
  r = await call("POST", "/api/collections/users/records", null, { email: "x@test.local", password: PASS, passwordConfirm: PASS, invite_code: "YOKBOYLE" })
  ok(r.status === 400, "geçersiz davet kodu reddedildi")

  section("Güvenlik")
  r = await api.patch(`/api/collections/users/records/${alice.id}`, alice.token, { credit: 999999 })
  ok(r.status >= 400, "kullanıcı kendi kredisini değiştiremez", r.status)
  r = await api.patch(`/api/collections/users/records/${alice.id}`, alice.token, { role: "admin" })
  ok(r.status >= 400, "kullanıcı kendini admin yapamaz", r.status)
  r = await api.post("/api/collections/users/records", null, { email: "hack@test.local", password: PASS, passwordConfirm: PASS, credit: 1e6 })
  ok(r.status >= 400, "kayıtta kredi gönderilemez", r.status)
  r = await api.get(`/api/collections/users/records/${bob.id}`, alice.token)
  ok(r.status === 200 && r.data.credit === undefined && r.data.referral_code === undefined, "başka kullanıcının kredisi ve davet kodu gizli", r.data)
  r = await api.post("/api/erqan/admin/credit", alice.token, { user: alice.id, amount: 100, note: "hile" })
  ok(r.status === 403, "normal kullanıcı admin endpoint'ine erişemez")
  r = await api.post("/api/collections/properties/records", alice.token, { name: "bedava" })
  ok(r.status >= 400, "istemci doğrudan mülk oluşturamaz", r.status)

  section("Satın alma")
  const istanbul = await first("cities", "name='İstanbul'")
  const land = await first("property_types", "key='land'")
  const home = await first("property_types", "key='home'")
  const premium = await first("property_types", "key='home_premium'")
  const stockBefore = (await first("city_stock", `city='${istanbul.id}' && type='${land.id}'`)).stock
  r = await api.post("/api/erqan/buy", alice.token, { type: land.id, city: istanbul.id })
  ok(r.status === 200, "Alice İstanbul'da arsa aldı", r.data)
  const landProp = r.data.property
  ok((await credit(alice)) === 5100 - 750, "fiyat = 500 × 1.5 çarpan = 750")
  ok((await first("city_stock", `city='${istanbul.id}' && type='${land.id}'`)).stock === stockBefore - 1, "şehir stoğu 1 azaldı")
  r = await api.post("/api/erqan/buy", alice.token, { type: home.id, city: istanbul.id })
  ok(r.status === 400 && /5 kez/.test(r.data.message), "Ev için 5 kira şartı uygulandı", r.data)
  r = await api.patch(`/api/collections/properties/records/${landProp}`, alice.token, { status: "rent" })
  ok(r.status >= 400, "durum doğrudan değiştirilemez (endpoint zorunlu)", r.status)
  r = await api.patch(`/api/collections/properties/records/${landProp}`, alice.token, { name: "Boğaz Arsası", area_m2: 500 })
  ok(r.status === 200 && r.data.name === "Boğaz Arsası", "sahip adı ve özellikleri düzenleyebilir")
  r = await api.patch(`/api/collections/properties/records/${landProp}`, bob.token, { name: "benim" })
  ok(r.status >= 400, "başkası mülkü düzenleyemez", r.status)

  section("Kiralama")
  r = await api.post("/api/erqan/listing", alice.token, { property: landProp, status: "rent", rent_price: 0 })
  ok(r.status === 400, "0 kira fiyatıyla kiraya verilemez")
  r = await api.post("/api/erqan/listing", alice.token, { property: landProp, status: "rent", rent_price: 100 })
  ok(r.status === 200, "Alice arsayı 100'e kiraya verdi", r.data)
  r = await api.post("/api/erqan/rent", alice.token, { property: landProp })
  ok(r.status === 400, "kendi mülkünü kiralayamaz")
  const aliceBefore = await credit(alice)
  r = await api.post("/api/erqan/rent", bob.token, { property: landProp })
  ok(r.status === 200, "Bob kiraladı", r.data)
  const rental1 = r.data.rental
  ok((await credit(bob)) === 4900, "Bob'dan 100 alındı")
  ok((await credit(alice)) === aliceBefore + 90, "Alice'e %10 komisyon düşülerek 90 geçti")
  let prop = (await api.get(`/api/collections/properties/records/${landProp}`, alice.token)).data
  ok(prop.status === "rented" && prop.tenant_count === 1, "kapasite dolunca durum 'kirada'", prop)
  r = await api.post("/api/erqan/rent", carol.token, { property: landProp })
  ok(r.status === 400, "dolu mülk kiralanamaz")
  ok((await me(bob)).rent_count === 1, "Bob'un kira sayısı 1")
  r = await api.post("/api/erqan/listing", alice.token, { property: landProp, status: "empty" })
  ok(r.status === 400, "kiracılı mülk boşaltılamaz")
  r = await api.post("/api/erqan/build", alice.token, { property: landProp })
  ok(r.status === 400, "kiracılı arsaya inşaat yapılamaz")
  const commission = await first("transactions", "kind='commission'", admin.token)
  ok(commission && commission.amount === 10, "komisyon sistem kaydına yazıldı")

  section("Otomatik yenileme")
  await suPatch("rentals", rental1, { next_charge: past })
  let m = await maintenance(admin.token)
  ok(m.charges.done === 1, "bakım işi dönemi gelen kirayı işledi", m)
  let rent1 = (await api.get(`/api/collections/rentals/records/${rental1}`, bob.token)).data
  ok(rent1.active && rent1.periods_paid === 2, "kira yenilendi (2. dönem)", rent1)
  ok((await credit(bob)) === 4800, "Bob'dan 2. dönem tahsil edildi")
  ok((await me(bob)).rent_count === 2, "Bob'un kira sayısı 2")
  ok(new Date(rent1.next_charge.replace(" ", "T")) > new Date(), "bir sonraki tahsilat ileri alındı")

  section("Bakiye uyarısı ve yetersiz bakiye")
  const bobCredit = await credit(bob)
  r = await api.post("/api/erqan/admin/credit", admin.token, { user: bob.id, amount: -bobCredit, note: "test" })
  ok(r.status === 200 && r.data.balance === 0, "admin Bob'un bakiyesini sıfırladı")
  r = await api.post("/api/erqan/admin/credit", admin.token, { user: bob.id, amount: -1, note: "test" })
  ok(r.status === 400, "bakiye eksiye düşürülemez")
  const soon = new Date(Date.now() + 2 * 86400000).toISOString().replace("T", " ")
  await suPatch("rentals", rental1, { next_charge: soon, warned: false })
  m = await maintenance(admin.token)
  ok(m.warnings.done === 1, "yaklaşan tahsilat için uyarı işi çalıştı", m)
  const warn = await first("notifications", "kind='rent_warning'", bob.token)
  ok(!!warn, "Bob'a 'bakiye yetersiz' uyarısı gitti")
  await suPatch("rentals", rental1, { next_charge: past })
  m = await maintenance(admin.token)
  rent1 = (await api.get(`/api/collections/rentals/records/${rental1}`, bob.token)).data
  ok(!rent1.active && rent1.ended_reason === "insufficient_credit", "bakiye yetmeyince kira sona erdi", rent1)
  prop = (await api.get(`/api/collections/properties/records/${landProp}`, alice.token)).data
  ok(prop.status === "rent" && prop.tenant_count === 0, "mülk yeniden kiralık listesine düştü", prop)

  section("Kiracı iptali")
  await api.post("/api/erqan/admin/credit", admin.token, { user: bob.id, amount: 1000, note: "test" })
  r = await api.post("/api/erqan/rent", bob.token, { property: landProp })
  const rental2 = r.data.rental
  r = await api.post("/api/erqan/rent/cancel", bob.token, { rental: rental2 })
  ok(r.status === 200, "Bob kirayı dönem sonunda sonlandırmak üzere iptal etti")
  r = await api.post("/api/erqan/rent/cancel", carol.token, { rental: rental2 })
  ok(r.status === 403, "başkası kirayı iptal edemez")
  const bobC = await credit(bob)
  await suPatch("rentals", rental2, { next_charge: past })
  await maintenance(admin.token)
  const rent2 = (await api.get(`/api/collections/rentals/records/${rental2}`, bob.token)).data
  ok(!rent2.active && rent2.ended_reason === "cancelled", "dönem sonunda kira bitti", rent2)
  ok((await credit(bob)) === bobC, "iptal edilen kira için tahsilat yapılmadı")

  section("Arsaya inşaat")
  r = await api.post("/api/erqan/listing", alice.token, { property: landProp, status: "empty" })
  ok(r.status === 200, "arsa boşaltıldı")
  const aC = await credit(alice)
  r = await api.post("/api/erqan/build", alice.token, { property: landProp })
  ok(r.status === 200, "arsaya ev inşa edildi", r.data)
  prop = (await api.get(`/api/collections/properties/records/${landProp}`, alice.token)).data
  ok(prop.type === home.id && prop.tenant_limit === 2, "tip Ev oldu, kapasite 2", prop)
  ok((await credit(alice)) === aC - 1000, "inşaat maliyeti düşüldü")

  section("Yükseltme")
  const ekOda = await first("upgrades", "name='Ek Oda'")
  const havuz = await first("upgrades", "name='Havuz Yapımı'")
  r = await api.post("/api/erqan/upgrade", alice.token, { property: landProp, upgrade: ekOda.id })
  ok(r.status === 200, "Ek Oda uygulandı", r.data)
  prop = (await api.get(`/api/collections/properties/records/${landProp}`, alice.token)).data
  ok(prop.tenant_limit === 3, "kapasite 3'e çıktı", prop.tenant_limit)
  r = await api.post("/api/erqan/upgrade", alice.token, { property: landProp, upgrade: havuz.id })
  ok(r.status === 400, "villa'ya özel yükseltme eve uygulanamaz")
  await api.post("/api/erqan/upgrade", alice.token, { property: landProp, upgrade: ekOda.id })
  r = await api.post("/api/erqan/upgrade", alice.token, { property: landProp, upgrade: ekOda.id })
  ok(r.status === 400, "mülk başına üst sınır (2) uygulandı")

  section("Satış ve teklif")
  r = await api.post("/api/erqan/buy", alice.token, { type: premium.id, city: istanbul.id })
  ok(r.status === 400 && /Yetersiz/.test(r.data.message), "bakiyesi yetmeyen Ev Premium (4500) alamaz", r.data)
  await api.post("/api/erqan/admin/credit", admin.token, { user: alice.id, amount: 5000, note: "test" })
  r = await api.post("/api/erqan/buy", alice.token, { type: premium.id, city: istanbul.id })
  ok(r.status === 200, "Alice Ev Premium aldı", r.data)
  const premProp = r.data.property
  r = await api.post("/api/erqan/listing", alice.token, { property: premProp, status: "sale", sale_price: 4000 })
  ok(r.status === 200, "Alice Ev Premium'u 4000'e satışa çıkardı")
  r = await api.post("/api/erqan/offer", carol.token, { property: premProp, amount: 1000 })
  ok(r.status === 400, "fiyatın %50'sinden düşük teklif reddedildi")
  const carolBefore = await credit(carol)
  r = await api.post("/api/erqan/offer", carol.token, { property: premProp, amount: 3000, message: "Olur mu?" })
  ok(r.status === 200, "Carol 3000 teklif verdi", r.data)
  const offer1 = r.data.offer
  ok((await credit(carol)) === carolBefore - 3000, "teklif tutarı bloke edildi")
  r = await api.post("/api/erqan/offer", carol.token, { property: premProp, amount: 3100 })
  ok(r.status === 400, "aynı mülke ikinci bekleyen teklif verilemez")
  r = await api.post("/api/erqan/offer/respond", carol.token, { offer: offer1, action: "accept" })
  ok(r.status === 403, "alıcı kendi teklifini kabul edemez")
  r = await api.post("/api/erqan/offer/respond", alice.token, { offer: offer1, action: "reject" })
  ok(r.status === 200 && (await credit(carol)) === carolBefore, "red edilince bloke iade edildi")
  r = await api.post("/api/erqan/offer", carol.token, { property: premProp, amount: 3500 })
  const offer2 = r.data.offer
  const aliceBeforeSale = await credit(alice)
  r = await api.post("/api/erqan/offer/respond", alice.token, { offer: offer2, action: "accept" })
  ok(r.status === 200, "Alice 3500 teklifi kabul etti", r.data)
  prop = (await api.get(`/api/collections/properties/records/${premProp}`, carol.token)).data
  ok(prop.owner === carol.id && prop.status === "empty", "sahiplik Carol'a geçti", prop)
  ok((await credit(alice)) === aliceBeforeSale + 3325, "Alice'e %5 komisyon düşülerek 3325 geçti")
  ok((await credit(carol)) === carolBefore - 3500, "Carol toplam 3500 ödedi")
  r = await api.post("/api/erqan/listing", carol.token, { property: premProp, status: "sale", sale_price: 5000 })
  r = await api.post("/api/erqan/sale/buy", bob.token, { property: premProp })
  ok(r.status === 400 && /Yetersiz/.test(r.data.message), "bakiyesi yetmeyen satın alamaz", r.data)
  r = await api.post("/api/erqan/offer", bob.token, { property: premProp, amount: 2600 })
  ok(r.status === 400, "bakiyesi yetmeyen teklif veremez")
  await api.post("/api/erqan/admin/credit", admin.token, { user: bob.id, amount: 6000, note: "test" })
  r = await api.post("/api/erqan/offer", bob.token, { property: premProp, amount: 2600 })
  const offer3 = r.data.offer
  const bobBeforeBuy = await credit(bob)
  await api.post("/api/erqan/admin/credit", admin.token, { user: admin.id, amount: 10000, note: "test" })
  r = await api.post("/api/erqan/sale/buy", admin.token, { property: premProp })
  ok(r.status === 200, "admin ilan fiyatından satın aldı")
  const o3 = (await api.get(`/api/collections/offers/records/${offer3}`, bob.token)).data
  ok(o3.status === "expired" && (await credit(bob)) === bobBeforeBuy + 2600, "satışta diğer teklifler kapandı, bloke iade edildi", o3)

  section("Teklif süresi dolması")
  await api.post("/api/erqan/listing", admin.token, { property: premProp, status: "sale", sale_price: 4000 })
  r = await api.post("/api/erqan/offer", bob.token, { property: premProp, amount: 2500 })
  const offer4 = r.data.offer
  const bobHeld = await credit(bob)
  await suPatch("offers", offer4, { expires: past })
  m = await maintenance(admin.token)
  ok(m.offers.done === 1 && (await credit(bob)) === bobHeld + 2500, "süresi dolan teklif iade edildi", m)

  section("Admin mülk silme")
  r = await api.post("/api/erqan/offer", bob.token, { property: premProp, amount: 2500 })
  const bobBeforeDelete = await credit(bob)
  r = await call("DELETE", `/api/collections/properties/records/${premProp}`, admin.token)
  ok(r.status === 204, "admin mülkü sildi", r.data)
  ok((await credit(bob)) === bobBeforeDelete + 2500, "silinen mülkteki teklif blokesi iade edildi")
  r = await api.get(`/api/collections/users/records/${bob.id}`, admin.token)
  ok(r.data.email === "bob@test.local", "admin başka kullanıcının e-postasını görür")
  r = await api.get(`/api/collections/users/records/${bob.id}`, alice.token)
  ok(!r.data.email, "normal kullanıcı başkasının e-postasını görmez")

  section("Portföy, profil, bildirimler, yönetim")
  r = await api.get("/api/erqan/portfolio", alice.token)
  ok(r.status === 200 && r.data.properties === 1 && r.data.months.length === 12, "portföy özeti", r.data)
  r = await api.get(`/api/erqan/users/${alice.id}/public`, bob.token)
  ok(r.status === 200 && r.data.user.name === "Alice" && r.data.user.credit === undefined && r.data.user.reputation > 0, "herkese açık profil (kredi yok, itibar var)", r.data.user)
  const unread = (await api.get("/api/collections/notifications/records?filter=read%3Dfalse", bob.token)).data.totalItems
  ok(unread > 0, `Bob'un ${unread} okunmamış bildirimi var`)
  await api.post("/api/erqan/notifications/read", bob.token)
  ok((await api.get("/api/collections/notifications/records?filter=read%3Dfalse", bob.token)).data.totalItems === 0, "hepsi okundu işaretlendi")
  ok((await api.get("/api/collections/notifications/records", alice.token)).data.items.every((n) => n.user === alice.id), "kullanıcı yalnızca kendi bildirimlerini görür")
  r = await api.get("/api/erqan/admin/stats", admin.token)
  ok(r.status === 200 && r.data.users === 4 && r.data.commission_revenue > 0, "admin istatistikleri", r.data)
  r = await api.get("/api/collections/transactions/records?perPage=1", alice.token)
  ok(r.data.items.every((t) => t.user === alice.id), "kullanıcı yalnızca kendi işlemlerini görür")

  section("Özellik anahtarı, bakım modu, engelleme")
  await api.post("/api/erqan/admin/settings", admin.token, { data: Object.assign((await api.get("/api/erqan/config")).data, { features: Object.assign((await api.get("/api/erqan/config")).data.features, { rent: false }) }) })
  r = await api.post("/api/erqan/rent", bob.token, { property: landProp })
  ok(r.status === 400 && /kapalı/.test(r.data.message), "kiralama kapatılınca engellendi")
  const cfg = (await api.get("/api/erqan/config")).data
  cfg.features.rent = true
  cfg.general.maintenance = true
  await api.post("/api/erqan/admin/settings", admin.token, { data: cfg })
  r = await api.get("/api/erqan/portfolio", bob.token)
  ok(r.status === 503, "bakım modunda kullanıcı işlemleri durdu")
  r = await api.get("/api/erqan/portfolio", admin.token)
  ok(r.status === 200, "bakım modunda admin çalışabiliyor")
  cfg.general.maintenance = false
  await api.post("/api/erqan/admin/settings", admin.token, { data: cfg })
  r = await api.post("/api/erqan/admin/user", admin.token, { user: carol.id, banned: true })
  ok(r.status === 200, "admin Carol'u engelledi")
  r = await api.get("/api/erqan/portfolio", carol.token)
  ok(r.status === 403, "engellenen kullanıcı işlem yapamaz")
  r = await api.post("/api/collections/users/auth-with-password", null, { identity: "carol@test.local", password: PASS })
  ok(r.status === 403, "engellenen kullanıcı giriş yapamaz")
  r = await api.post("/api/erqan/admin/user", admin.token, { user: admin.id, role: "user" })
  ok(r.status === 400, "admin kendi yetkisini kaldıramaz")

  section("Kredi tutarlılığı")
  const users = (await api.get("/api/collections/users/records?perPage=100", admin.token)).data.items
  const held = (await api.get("/api/erqan/admin/stats", admin.token)).data.held_in_offers
  const txs = (await api.get("/api/collections/transactions/records?perPage=500", admin.token)).data.items
  const sumCredit = users.reduce((a, u) => a + u.credit, 0)
  const minted = txs.filter((t) => ["signup_bonus", "referral_bonus", "admin_adjust"].includes(t.kind)).reduce((a, t) => a + t.amount, 0)
  const burned = -txs.filter((t) => ["purchase", "build", "upgrade"].includes(t.kind)).reduce((a, t) => a + t.amount, 0)
  const commissions = txs.filter((t) => t.kind === "commission").reduce((a, t) => a + t.amount, 0)
  ok(Math.abs(sumCredit + held + burned + commissions - minted) < 0.01, "toplam kredi = basılan − harcanan − komisyon (para kaybolmuyor)",
    { sumCredit, held, burned, commissions, minted })

  console.log(`\n${passes} başarılı, ${failures} başarısız`)
  process.exit(failures ? 1 : 0)
}

main().catch((e) => { console.error(e); process.exit(1) })
