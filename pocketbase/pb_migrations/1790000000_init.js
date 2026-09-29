/// <reference path="../../.pb/pb_data/types.d.ts" />

// Erqan şeması: tüm koleksiyonlar, alanlar ve API kuralları.
// Para/stok/sahiplik değiştiren hiçbir koleksiyona istemciden yazılamaz;
// bu işlemler yalnızca pb_hooks içindeki endpoint'lerden yapılır.

migrate((app) => {
  const ADMIN = '@request.auth.role = "admin"'
  const AUTH = '@request.auth.id != ""'

  const created = () => ({ name: "created", type: "autodate", onCreate: true, onUpdate: false })
  const updated = () => ({ name: "updated", type: "autodate", onCreate: true, onUpdate: true })
  const text = (name, opts) => Object.assign({ name, type: "text", max: 500 }, opts || {})
  const num = (name, opts) => Object.assign({ name, type: "number" }, opts || {})
  const int = (name, opts) => Object.assign({ name, type: "number", onlyInt: true }, opts || {})
  const bool = (name) => ({ name, type: "bool" })
  const date = (name) => ({ name, type: "date" })
  const select = (name, values, opts) => Object.assign({ name, type: "select", values, maxSelect: 1 }, opts || {})
  const image = (name) => ({
    name, type: "file", maxSelect: 1, maxSize: 5242880,
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    thumbs: ["100x100", "400x300"],
  })
  const rel = (name, collection, opts) => Object.assign({
    name, type: "relation", collectionId: app.findCollectionByNameOrId(collection).id, maxSelect: 1,
  }, opts || {})

  const create = (def) => {
    const c = new Collection(Object.assign({ type: "base" }, def))
    c.fields.add(new Field(created()))
    c.fields.add(new Field(updated()))
    app.save(c)
    return c
  }

  const catalogRules = { listRule: "", viewRule: "", createRule: ADMIN, updateRule: ADMIN, deleteRule: ADMIN }

  // ---------------------------------------------------------------- users
  const users = app.findCollectionByNameOrId("users")
  users.fields.add(new Field(num("credit", { min: 0 })))
  users.fields.add(new Field(select("role", ["user", "admin"])))
  users.fields.add(new Field(int("rent_count", { min: 0 })))
  users.fields.add(new Field(num("reputation")))
  users.fields.add(new Field(bool("banned")))
  users.fields.add(new Field(text("referral_code", { max: 32 })))
  users.fields.add(new Field(rel("referred_by", "users")))
  users.fields.add(new Field(bool("referral_rewarded")))
  users.fields.add(new Field(int("referral_count", { min: 0 })))

  const userLocked = ["credit", "role", "rent_count", "reputation", "banned", "referral_code",
    "referred_by", "referral_rewarded", "referral_count"]
    .map((f) => `@request.body.${f}:isset = false`).join(" && ")

  users.listRule = `id = @request.auth.id || ${ADMIN}`
  users.viewRule = AUTH // başkalarının hassas alanları onRecordEnrich ile gizlenir
  users.createRule = userLocked
  users.updateRule = `id = @request.auth.id && ${userLocked}`
  users.deleteRule = null
  users.addIndex("idx_users_referral_code", true, "referral_code", "referral_code != ''")
  app.save(users)

  // ---------------------------------------------------------------- settings
  create({
    name: "settings",
    listRule: "", viewRule: "", createRule: null, updateRule: null, deleteRule: null,
    fields: [text("key", { required: true, max: 50 }), { name: "data", type: "json", maxSize: 200000 }],
    indexes: ["CREATE UNIQUE INDEX idx_settings_key ON settings (`key`)"],
  })

  // ---------------------------------------------------------------- konumlar
  create(Object.assign({
    name: "continents",
    fields: [text("name", { required: true, max: 100 }), int("sort"), bool("active")],
  }, catalogRules))

  create(Object.assign({
    name: "countries",
    fields: [
      rel("continent", "continents", { required: true, cascadeDelete: true }),
      text("name", { required: true, max: 100 }),
      text("code", { max: 3 }),
      text("flag", { max: 16 }),
      int("sort"),
      bool("active"),
    ],
  }, catalogRules))

  create(Object.assign({
    name: "cities",
    fields: [
      rel("country", "countries", { required: true, cascadeDelete: true }),
      text("name", { required: true, max: 100 }),
      num("price_multiplier", { required: true, min: 0.01 }),
      image("image"),
      int("sort"),
      bool("active"),
    ],
  }, catalogRules))

  // ---------------------------------------------------------------- mülk tipleri
  const types = create(Object.assign({
    name: "property_types",
    fields: [
      text("key", { required: true, max: 50, pattern: "^[a-z0-9_]+$" }),
      text("name", { required: true, max: 100 }),
      text("description", { max: 2000 }),
      num("price", { min: 0 }),
      int("tenant_limit", { min: 0 }),
      int("required_rent_count", { min: 0 }),
      num("build_cost", { min: 0 }),
      text("color", { max: 20 }),
      image("image"),
      int("sort"),
      bool("active"),
    ],
    indexes: ["CREATE UNIQUE INDEX idx_property_types_key ON property_types (`key`)"],
  }, catalogRules))
  types.fields.add(new Field(rel("build_target", "property_types")))
  app.save(types)

  create(Object.assign({
    name: "city_stock",
    fields: [
      rel("city", "cities", { required: true, cascadeDelete: true }),
      rel("type", "property_types", { required: true, cascadeDelete: true }),
      int("stock", { min: 0 }),
    ],
    indexes: ["CREATE UNIQUE INDEX idx_city_stock ON city_stock (city, type)"],
  }, catalogRules))

  create(Object.assign({
    name: "features",
    fields: [text("name", { required: true, max: 100 }), text("icon", { max: 50 }), int("sort"), bool("active")],
  }, catalogRules))

  create(Object.assign({
    name: "upgrades",
    fields: [
      text("name", { required: true, max: 100 }),
      text("description", { max: 1000 }),
      num("cost", { min: 0 }),
      int("tenant_limit_bonus", { min: 0 }),
      num("rent_cap_bonus_pct", { min: 0 }),
      rel("types", "property_types", { maxSelect: 50 }),
      int("max_per_property", { min: 0 }),
      int("sort"),
      bool("active"),
    ],
  }, catalogRules))

  // ---------------------------------------------------------------- mülkler
  const propLocked = ["owner", "type", "city", "status", "rent_price", "sale_price", "tenant_limit",
    "tenant_count", "rent_cap_bonus_pct", "purchase_price", "invested", "building_to", "build_ready_at"]
    .map((f) => `@request.body.${f}:isset = false`).join(" && ")

  create({
    name: "properties",
    listRule: AUTH,
    viewRule: AUTH,
    createRule: null,
    updateRule: `(owner = @request.auth.id && ${propLocked}) || ${ADMIN}`,
    deleteRule: ADMIN,
    fields: [
      rel("owner", "users", { required: true }),
      rel("type", "property_types", { required: true }),
      rel("city", "cities", { required: true }),
      text("name", { required: true, max: 120 }),
      text("description", { max: 2000 }),
      select("status", ["empty", "rent", "rented", "sale", "building"], { required: true }),
      num("rent_price", { min: 0 }),
      num("sale_price", { min: 0 }),
      int("tenant_limit", { min: 0 }),
      int("tenant_count", { min: 0 }),
      num("rent_cap_bonus_pct", { min: 0 }),
      num("purchase_price", { min: 0 }),
      num("invested", { min: 0 }),
      num("area_m2", { min: 0, max: 1000000 }),
      int("rooms", { min: 0, max: 1000 }),
      rel("features", "features", { maxSelect: 50 }),
      image("image"),
      rel("building_to", "property_types"),
      date("build_ready_at"),
    ],
    indexes: [
      "CREATE INDEX idx_properties_owner ON properties (owner)",
      "CREATE INDEX idx_properties_status ON properties (status)",
    ],
  })

  create({
    name: "property_upgrades",
    listRule: AUTH, viewRule: AUTH, createRule: null, updateRule: null, deleteRule: null,
    fields: [
      rel("property", "properties", { required: true, cascadeDelete: true }),
      rel("upgrade", "upgrades", { required: true }),
      num("paid", { min: 0 }),
    ],
  })

  // ---------------------------------------------------------------- kiralar
  create({
    name: "rentals",
    listRule: `tenant = @request.auth.id || owner = @request.auth.id || ${ADMIN}`,
    viewRule: `tenant = @request.auth.id || owner = @request.auth.id || ${ADMIN}`,
    createRule: null, updateRule: null, deleteRule: null,
    fields: [
      rel("property", "properties", { required: true, cascadeDelete: true }),
      rel("tenant", "users", { required: true }),
      rel("owner", "users"),
      num("price", { min: 0 }),
      date("started"),
      date("next_charge"),
      date("grace_until"),
      date("ended"),
      bool("active"),
      bool("cancel_at_period_end"),
      bool("warned"),
      int("periods_paid", { min: 0 }),
      select("ended_reason", ["cancelled", "expired", "insufficient_credit", "sold", "admin"]),
    ],
    indexes: [
      "CREATE INDEX idx_rentals_active_charge ON rentals (active, next_charge)",
      "CREATE INDEX idx_rentals_tenant ON rentals (tenant)",
      "CREATE INDEX idx_rentals_property ON rentals (property)",
    ],
  })

  // ---------------------------------------------------------------- işlemler
  create({
    name: "transactions",
    listRule: `user = @request.auth.id || ${ADMIN}`,
    viewRule: `user = @request.auth.id || ${ADMIN}`,
    createRule: null, updateRule: null, deleteRule: null,
    fields: [
      rel("user", "users"), // boş = sistem (komisyon geliri)
      num("amount"),
      num("balance_after"),
      select("kind", ["purchase", "rent_pay", "rent_income", "sale", "sale_income", "build", "upgrade",
        "offer_hold", "offer_release", "referral_bonus", "signup_bonus", "commission", "admin_adjust"], { required: true }),
      rel("property", "properties"),
      rel("counterparty", "users"),
      text("note", { max: 500 }),
    ],
    indexes: [
      "CREATE INDEX idx_transactions_user ON transactions (user, created)",
      "CREATE INDEX idx_transactions_kind ON transactions (kind)",
    ],
  })

  // ---------------------------------------------------------------- teklifler
  create({
    name: "offers",
    listRule: `buyer = @request.auth.id || seller = @request.auth.id || ${ADMIN}`,
    viewRule: `buyer = @request.auth.id || seller = @request.auth.id || ${ADMIN}`,
    createRule: null, updateRule: null, deleteRule: null,
    fields: [
      rel("property", "properties", { required: true, cascadeDelete: true }),
      rel("buyer", "users", { required: true }),
      rel("seller", "users", { required: true }),
      num("amount", { min: 0 }),
      text("message", { max: 500 }),
      select("status", ["pending", "accepted", "rejected", "withdrawn", "expired"], { required: true }),
      date("expires"),
    ],
    indexes: ["CREATE INDEX idx_offers_status ON offers (status, expires)"],
  })

  // ---------------------------------------------------------------- bildirimler
  const notifLocked = ["user", "kind", "title", "body", "link"]
    .map((f) => `@request.body.${f}:isset = false`).join(" && ")
  create({
    name: "notifications",
    listRule: "user = @request.auth.id",
    viewRule: "user = @request.auth.id",
    createRule: null,
    updateRule: `user = @request.auth.id && ${notifLocked}`,
    deleteRule: "user = @request.auth.id",
    fields: [
      rel("user", "users", { required: true, cascadeDelete: true }),
      text("kind", { max: 50 }),
      text("title", { max: 200 }),
      text("body", { max: 1000 }),
      text("link", { max: 300 }),
      bool("read"),
    ],
    indexes: ["CREATE INDEX idx_notifications_user ON notifications (user, read)"],
  })
}, (app) => {
  const names = ["notifications", "offers", "transactions", "rentals", "property_upgrades", "properties",
    "upgrades", "features", "city_stock", "property_types", "cities", "countries", "continents", "settings"]
  for (const n of names) {
    try { app.delete(app.findCollectionByNameOrId(n)) } catch (_) {}
  }
  const users = app.findCollectionByNameOrId("users")
  for (const f of ["credit", "role", "rent_count", "reputation", "banned", "referral_code", "referred_by",
    "referral_rewarded", "referral_count"]) {
    users.fields.removeByName(f)
  }
  users.removeIndex("idx_users_referral_code")
  app.save(users)
})
