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

- [x] **Feature #1** — Product Category Management:
  - `database.js`: Added `categories` table (id, name UNIQUE). Backfills from `products.category` on startup so no existing data is lost.
  - `index.js`: Added `GET /categories`, `POST /categories` (cashier+), `DELETE /categories/:id` (admin, blocked if products use the category).
  - `frontend/index.html`: Replaced free-text category `<input>` with `<select>` + inline "add new" row. Added admin-only category tags section with per-tag delete buttons.
  - `frontend/app.js`: Added `loadCategories()`, `renderCategorySelect()`, `renderCategoryTags()`, `addCategory()`, `deleteCategory()`. Called in `window.onload`.
  - `frontend/admin.html`: Replaced `editCategory` text input with `<select>` + inline "add new" row.
  - `frontend/admin.js`: Added `loadCategories()`, `renderCategoryDropdown()`, `addCategoryAdmin()`. `editProduct()` now calls `renderCategoryDropdown(p.category)` to pre-select. Init calls `loadCategories()` before `loadProducts()`.

- [x] **Feature #2** — WhatsApp number + low-stock threshold fully wired:
  - `whatsapp-bot.js`: reads `whatsapp_number` from `settings` table at send time (was hardcoded `55951951@c.us`). Fails gracefully with a log if number is not set.
  - Number format: accepts `974xxxxxxxx` (auto-appends `@c.us`) or full `974xxxxxxxx@c.us`
  - `developer.html`: added `low_stock_threshold` input to settings form; `loadSettings()` and `saveSettings()` include it
  - Verified: empty number → logs warning + resolves cleanly (no crash)

## Features (2026-06-05)

- [x] **Feature #3** — Sales history search/filter + accurate pagination:
  - `index.js` `/sales/history`: added `?q=` (product name LIKE), `?from=`, `?to=` (date range); response changed to `{ rows, total }`.
  - `index.js` `/sales/invoices`: added `?page=`, `?q=` (invoice number contains), `?from=`, `?to=`; same `{ rows, total }` shape.
  - `frontend/app.js`: `loadSalesHistory(page)` builds URL with filter params, shows "صفحة X من Y (N صف)", disables Next at last page. Added `applyHistoryFilter()`, `resetHistoryFilter()`. All export functions and `printDailyReport` updated to use `.rows || []`.
  - `frontend/index.html`: filter row above sales history table (name search + date range). Filter row + pagination controls added to invoices table.
  - `frontend/developer.html`: updated invoices call to use `invoicesData.total` for accurate count.

- [x] **Feature #4** — Invoice table pagination (done as part of Feature #3).

- [x] **Feature #5** — Export functions fetch all pages (not just 50):
  - `frontend/app.js`: added `fetchAllSalesRows()` and `fetchAllInvoicesRows()` helpers that loop through all pages until `rows.length >= total`. Used in `exportWeeklyReport`, `exportMonthlyReport`, `exportFullReport`, and `printDailyReport`.

- [x] **Feature #6** — Invoice search by number in main invoices list:
  - `index.js` `/sales/invoices`: added `?q=` filtering on `CAST(invoice_number AS TEXT) LIKE '%q%'`.
  - `frontend/app.js`: added `invoicesSearch` state; `loadInvoices` sends `?q=`; `applyInvoicesFilter`/`resetInvoicesFilter` read `#invoicesSearch` input.
  - `frontend/index.html`: added invoice number text input to the invoices filter row.

- [x] **Feature #7** — Cashier sales history + invoices tables in UI:
  - `frontend/index.html`: added `cashierSalesTable` (4-col: product, qty, total, date) and `cashierInvoiceTable` (4-col: invoice#, date, total, print) inside `#cashierSection`, each with pagination controls using `*Cashier` IDs.
  - `frontend/app.js`: `loadSalesHistory` and `loadInvoices` now also update `historyPageInfoCashier`/`prevHistoryPageCashier`/`nextHistoryPageCashier` and invoice equivalents. Added `applyInvoicesFilterCashier()` and `resetInvoicesFilterCashier()` for cashier invoice search.
