/// <reference path="../../.pb/pb_data/types.d.ts" />

// Başlangıç verisi. Tüm değerler admin panelinden değiştirilebilir.
migrate((app) => {
  const put = (collection, data) => {
    const r = new Record(app.findCollectionByNameOrId(collection))
    for (const k in data) r.set(k, data[k])
    app.save(r)
    return r
  }

  put("settings", { key: "main", data: {} })

  // Mülk tipleri
  const types = {
    land: put("property_types", {
      key: "land", name: "Arsa", sort: 1, active: true, color: "emerald",
      description: "Üzerine ev inşa edilebilir; uzun vadeli yatırım.",
      price: 500, tenant_limit: 1, required_rent_count: 0, build_cost: 1000,
    }),
    home: put("property_types", {
      key: "home", name: "Ev", sort: 2, active: true, color: "blue",
      description: "Almak için önce 5 kez kira ödemiş olmak gerekir. 2 kiracıya verilebilir.",
      price: 1500, tenant_limit: 2, required_rent_count: 5, build_cost: 0,
    }),
    home_premium: put("property_types", {
      key: "home_premium", name: "Ev Premium", sort: 3, active: true, color: "violet",
      description: "Kira şartı olmadan direkt alınır. 5 kiracıya verilebilir.",
      price: 3000, tenant_limit: 5, required_rent_count: 0, build_cost: 0,
    }),
    villa: put("property_types", {
      key: "villa", name: "Villa", sort: 4, active: true, color: "amber",
      description: "En yüksek kiracı kapasitesi ve kira potansiyeli.",
      price: 7500, tenant_limit: 8, required_rent_count: 0, build_cost: 0,
    }),
  }
  types.land.set("build_target", types.home.id)
  app.save(types.land)

  // Konumlar
  const world = [
    { name: "Avrupa", countries: [
      { name: "Türkiye", code: "TR", flag: "🇹🇷", cities: [["İstanbul", 1.5], ["Ankara", 1.0], ["İzmir", 1.2], ["Antalya", 1.3]] },
      { name: "Almanya", code: "DE", flag: "🇩🇪", cities: [["Berlin", 1.8], ["Münih", 2.0]] },
    ] },
    { name: "Asya", countries: [
      { name: "Japonya", code: "JP", flag: "🇯🇵", cities: [["Tokyo", 2.2]] },
      { name: "BAE", code: "AE", flag: "🇦🇪", cities: [["Dubai", 2.5]] },
    ] },
    { name: "Amerika", countries: [
      { name: "ABD", code: "US", flag: "🇺🇸", cities: [["New York", 2.5], ["Miami", 1.9]] },
    ] },
    { name: "Afrika", countries: [
      { name: "Mısır", code: "EG", flag: "🇪🇬", cities: [["Kahire", 0.8]] },
    ] },
  ]
  world.forEach((cont, ci) => {
    const c = put("continents", { name: cont.name, sort: ci + 1, active: true })
    cont.countries.forEach((co, coi) => {
      const country = put("countries", { continent: c.id, name: co.name, code: co.code, flag: co.flag, sort: coi + 1, active: true })
      co.cities.forEach((city, cii) => {
        const cr = put("cities", { country: country.id, name: city[0], price_multiplier: city[1], sort: cii + 1, active: true })
        for (const k in types) put("city_stock", { city: cr.id, type: types[k].id, stock: k === "villa" ? 20 : 100 })
      })
    })
  })

  // Mülk özellikleri
  ;[["Havuz", "waves"], ["Bahçe", "trees"], ["Otopark", "car"], ["Deniz Manzarası", "sunset"],
    ["Asansör", "arrow-up-down"], ["Güvenlik", "shield"], ["Spor Salonu", "dumbbell"], ["Balkon", "door-open"]]
    .forEach((f, i) => put("features", { name: f[0], icon: f[1], sort: i + 1, active: true }))

  // Yükseltmeler
  put("upgrades", {
    name: "Ek Oda", description: "Kiracı kapasitesini 1 artırır.", cost: 400,
    tenant_limit_bonus: 1, rent_cap_bonus_pct: 0, max_per_property: 2, sort: 1, active: true,
    types: [types.home.id, types.home_premium.id, types.villa.id],
  })
  put("upgrades", {
    name: "Lüks Tadilat", description: "Maksimum kira fiyatını %25 artırır.", cost: 800,
    tenant_limit_bonus: 0, rent_cap_bonus_pct: 25, max_per_property: 1, sort: 2, active: true,
    types: [types.home.id, types.home_premium.id, types.villa.id],
  })
  put("upgrades", {
    name: "Havuz Yapımı", description: "Kiracı kapasitesini 2, kira tavanını %15 artırır.", cost: 2000,
    tenant_limit_bonus: 2, rent_cap_bonus_pct: 15, max_per_property: 1, sort: 3, active: true,
    types: [types.villa.id],
  })
}, (app) => {
  for (const n of ["upgrades", "features", "city_stock", "cities", "countries", "continents", "property_types", "settings"]) {
    app.db().newQuery(`DELETE FROM ${n}`).execute()
  }
})
