/// <reference path="../../.pb/pb_data/types.d.ts" />

// Saatlik bakım: kira tahsilatı, bakiye uyarıları, teklif süreleri, inşaatlar.
// Her kayıt kendi transaction'ında işlenir; biri hata verirse diğerleri etkilenmez.
cronAdd("erqan_hourly", "0 * * * *", () => {
  const summary = require(`${__hooks}/lib/maintenance.js`).run($app)
  console.log("erqan_hourly", JSON.stringify(summary))
})

// Admin'in bakımı elle tetiklemesi (test ve acil durum için).
routerAdd("POST", "/api/erqan/admin/run-maintenance", (e) => {
  const L = require(`${__hooks}/lib/core.js`)
  L.guard(e, { admin: true })
  return e.json(200, require(`${__hooks}/lib/maintenance.js`).run(e.app))
}, $apis.requireAuth("users"))
