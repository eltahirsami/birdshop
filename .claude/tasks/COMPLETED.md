# Completed

- [x] **2026-06-01** — Initial project scan and .claude memory system setup
- [x] **2026-06-01** — Verified DB connectivity (`node -e "require('./database')"` exits 0)
- [x] **2026-06-01** — Full supplier module (purchases, payments, export) — already implemented
- [x] **2026-06-01** — Excel export (weekly, monthly, full) — already implemented via xlsx.full.min.js
- [x] **2026-06-01** — Developer panel with user management, backup/restore, logs — already implemented

## Bug fixes (2026-06-01)

- [x] **Bug 1** — `GET /sales/invoice/:number` now returns HTTP 404 when invoice not found (was 200+null). `index.js`
- [x] **Bug 2** — `checkLowStock()` removed redundant client-side `.filter(p => p.stock <= 5)` — server already filters. `frontend/app.js`
- [x] **Bug 3** — `/developer/backup-now` guard changed `requireDeveloper` → `requireCashier` — all staff can now trigger backup from index.html button. `index.js`
- [x] **Bug 4** — Sales history pagination: `loadSalesHistory()` now accepts `page` param and sends `?page=N` to API. Added prev/next buttons + page indicator to `index.html`. `frontend/app.js` + `frontend/index.html`
- [x] **Bug 5** — `saveSettings()` now persists to DB via `PUT /developer/settings`. Added `GET /developer/settings` route. Added `settings` table to `database.js` with defaults for `shop_name`, `whatsapp_number`, `low_stock_threshold`. Settings load on developer panel init. `database.js` + `index.js` + `frontend/developer.html`
- [x] **Bug 6** — WhatsApp daily report wired to existing 20:00 cron in `index.js`. Bot is required with try/catch — if Puppeteer/Chromium is unavailable the server still starts normally. `index.js`
- [x] **Bug 7** — `admin.html` edit dialog replaced `prompt()` with inline form containing all fields (name, category, price, cost_price, stock, barcode). Added `credentials: 'include'` to all fetch calls in `admin.js`. `frontend/admin.html` + `frontend/admin.js`
- [x] **Bug 8** — Low-stock threshold now reads from `settings` table (`low_stock_threshold` key, default 5) instead of hardcoded value. `index.js` `/products/low-stock` route
