# Completed

- [x] **2026-06-01** — Initial project scan and .claude memory system setup
- [x] **2026-06-01** — Verified DB connectivity
- [x] **2026-06-01** — Full supplier module, Excel export, developer panel — already implemented

## Bug fixes (2026-06-01)

- [x] **Bug 1** — `GET /sales/invoice/:number` returns 404 on missing invoice. `index.js`
- [x] **Bug 2** — `checkLowStock()` removed redundant client-side filter. `frontend/app.js`
- [x] **Bug 3** — `/developer/backup-now` guard lowered to `requireCashier`. `index.js`
- [x] **Bug 4** — Sales history pagination: `loadSalesHistory(page)` + prev/next buttons. `app.js` + `index.html`
- [x] **Bug 5** — `saveSettings()` now real: `settings` DB table + GET/PUT API + dev panel. `database.js` + `index.js` + `developer.html`
- [x] **Bug 6** — WhatsApp daily report wired to 20:00 cron with try/catch guard. `index.js`
- [x] **Bug 7** — `admin.html` edit replaced `prompt()` with inline form (all fields + credentials). `admin.html` + `admin.js`
- [x] **Bug 8** — `/products/low-stock` reads threshold from `settings` table. `index.js`

## Features (2026-06-01)

- [x] **Feature #2** — WhatsApp number + low-stock threshold fully wired:
  - `whatsapp-bot.js`: reads `whatsapp_number` from `settings` table at send time (was hardcoded `55951951@c.us`). Fails gracefully with a log if number is not set.
  - Number format: accepts `974xxxxxxxx` (auto-appends `@c.us`) or full `974xxxxxxxx@c.us`
  - `developer.html`: added `low_stock_threshold` input to settings form; `loadSettings()` and `saveSettings()` include it
  - Verified: empty number → logs warning + resolves cleanly (no crash)
