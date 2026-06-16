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

## Suppliers screen bug fixes (2026-06-05)

- [x] **Suppliers #1** — `nextAllPurchasesPage()` upper bound: added `allPurchasesTotalPages` module var; stored in `loadAllPurchases`; `nextAllPurchasesPage` guards `allPurchasesPage >= allPurchasesTotalPages`. `suppliers.js`
- [x] **Suppliers #2** — `payPurchaseSelect` stale after "عرض الكل": `loadAllPurchases` now clears `lastPurchases = []` and calls `renderPayPurchaseSelect()` before fetching, so the payment dropdown resets when entering all-purchases mode. `suppliers.js`
- [x] **Suppliers #3** — `unitCost = 0` allowed: changed guard in `addItemToDraft` from `unitCost < 0` to `unitCost <= 0`. `suppliers.js`
- [x] **Suppliers #4** — Duplicate product in draft: added `draftItems.some(it => it.product_id === pid)` check before push; shows Arabic error "هذا المنتج موجود بالفعل في الفاتورة". `suppliers.js`
- [x] **Suppliers #5** — Payment exceeds balance: `createPayment()` reads `payRemaining` field and blocks save if `amount > remaining`, showing Arabic error with the current balance. `suppliers.js`
- [x] **Suppliers #6** — Invoice date free-text: changed `purchaseInvoiceDate` input to `type="date"` (native browser date picker, `YYYY-MM-DD`). Existing stored data unaffected. `suppliers.html`
- [x] **Suppliers #7** — No save confirmation: added `confirm('هل أنت متأكد من حفظ الفاتورة؟')` at the top of `savePurchase()`. `suppliers.js`

## Suppliers screen – additional fixes (2026-06-05)

- [x] **Suppliers #8** — "عرض" button in invoice table: `viewPurchase()` was only populating a hidden inline detail section with no print option. Replaced with a `window.open` popup (450×700) showing supplier name, invoice number, date, notes, full line-items table, grand total, and a print button. Uses existing `PRINT_STYLE`. `suppliers.js`

## Login screen (2026-06-11)

- [x] **Login #1** — Added Sky Bird logo (`skybird-logo.png.jpeg`, max 150px) and bold shop name centered above the login form. `frontend/login.html`
- [x] **Login #2** — Fixed image src path: file on disk is `skybird-logo.png.jpeg` (double extension), not `skybird-logo.png`. `frontend/login.html`

## UI & Settings (2026-06-11)

- [x] **UI #1** — Login button styled gold (`background:#b8860b`) to match app accent. `frontend/login.html`
- [x] **Settings #1** — Added `invoice_title` and `shop_phone` fields to developer panel settings form. `frontend/developer.html`
- [x] **Settings #2** — `loadAppSettings()` in `app.js` now calls `GET /settings` (new public route) instead of `GET /developer/settings` — fixes settings not loading for cashier/admin roles. `index.js` + `frontend/app.js`
- [x] **Settings #3** — `GET /settings` route added behind `requireLogin`, returns `shop_name`, `invoice_title`, `shop_phone`. Default DB rows added for `invoice_title` and `shop_phone`. `index.js` + `database.js`

## License subscription system (2026-06-11)

- [x] **License #1** — `license.js` rewritten: new format is base64-encoded JSON `{machineId, expiry, sig}` signed with `HMAC-SHA256(SECRET, machineId|expiry)`. `getLicenseStatus()` returns `{valid, reason, daysRemaining, expiry}` checking signature → machine match → expiry in order. `license.js`
- [x] **License #2** — `generate-license.js` updated: accepts two args `MACHINEID YYYY-MM-DD`; validates date format before generating. `generate-license.js`
- [x] **License #3** — `GET /license/status` returns full status object (machineId, licensed, status, expiry, daysRemaining). `POST /license/activate` validates new base64 format with specific Arabic error messages for wrong key / wrong machine / expired key. `index.js`
- [x] **License #4** — License middleware and root route now pass `?reason=expired|machine_mismatch|not_licensed` to blocked screen redirect. `index.js`
- [x] **License #5** — `license.html` shows reason-specific Arabic messages with colour coding; expired screen shows expiry date; input has no length restriction for base64 key. `frontend/license.html`
- [x] **License #6** — Developer panel: new 🔑 licence info card showing machine ID, colour-coded status, expiry date, days remaining (red ≤7 / orange ≤30 / green). Renewal textarea + activate button calling `POST /license/activate`. `frontend/developer.html`
- [x] **License #7** — `app.js`: `showLicenseWarning()` prepends dismissible gold banner on page load when `daysRemaining ≤ 30` with message "تنبيه: ينتهي اشتراكك خلال X يوم". `frontend/app.js`
- [x] **License #8** — Feature developed on `feature/license-subscription` branch, merged to `main` at commit `849873b`.

## Suppliers screen – new features (2026-06-05)

- [x] **Suppliers Feature A** — Payment history list in left panel: scrollable table (date, amount, method, notes) inserted under the 3 totals. `loadPayments()` now populates both the existing right-panel table and the new `supplierPaymentsBody` — no extra fetch. `suppliers.html` + `suppliers.js`
- [x] **Suppliers Feature B** — Print supplier statement ("كشف حساب" button): fetches purchases, payments, and summary in parallel; merges into one chronological table sorted by `created_at` with columns التاريخ / البيان / مشتريات / مدفوع / الرصيد (running balance per row); header shows supplier name, phone, address; footer shows final remaining balance. 620×800 popup, `PRINT_STYLE` widened to 130mm. `suppliers.js`
  - `frontend/index.html`: added `cashierSalesTable` (4-col: product, qty, total, date) and `cashierInvoiceTable` (4-col: invoice#, date, total, print) inside `#cashierSection`, each with pagination controls using `*Cashier` IDs.
  - `frontend/app.js`: `loadSalesHistory` and `loadInvoices` now also update `historyPageInfoCashier`/`prevHistoryPageCashier`/`nextHistoryPageCashier` and invoice equivalents. Added `applyInvoicesFilterCashier()` and `resetInvoicesFilterCashier()` for cashier invoice search.

## WhatsApp QR display (2026-06-11)

- [x] **WA #1** — Developer panel QR fix: `await loadWaQr()`, null-guard on img, `console.error` in catch blocks, poll 10s → 5s. `frontend/developer.html`
- [x] **WA #2** — Main page QR section: `#waSection` added at bottom of `index.html` outside all role divs (visible to admin + cashier). Three states: checking / connected / QR image. `frontend/index.html`
- [x] **WA #3** — `loadWhatsAppStatus()` extended to drive `#waSection`; `loadMainPageQr()` added; poll 30s → 5s. `frontend/app.js`
- [x] **WA #4** — Cache bug: `app.js?v=2` served stale code — bumped to `v=3`. `frontend/index.html`
- [x] **WA #5** — Blank section bug: `not connected + no QR` now shows "واتساب غير متصل ❌" instead of hiding all children. `frontend/app.js`
- [x] **WA #6** — Auth bug: `/whatsapp/qr` was `requireDeveloper` — admin/cashier got HTML redirect instead of JSON → broken image icon. Changed to `requireLogin`. `index.js`

## Electron build & packaging (2026-06-11)

- [x] **Build #1** — `package.json`: `name` → `skybird`, `productName` → `Sky Bird`.
- [x] **Build #2** — `package.json`: `win.icon: "skybird.ico"` added to build config.
- [x] **Build #3** — `skybird.ico` was a directory (file nested one level too deep) — extracted and regenerated as proper 256×256 ICO from `skybird-logo.png.jpeg` via PowerShell `System.Drawing`.
- [x] **Build #4** — App startup hang fix: replaced `spawn(node, [index.js])` with `require('./index.js')` in Electron main process. Root cause: `bcrypt` ABI-specific prebuilt not matching Electron's Node.js ABI with `npmRebuild: false` — server crashed silently, loading screen hung forever. In-process execution uses the same runtime, eliminating all ABI mismatches. Added `server.log` file logging and 15-second error timeout with Arabic error page. `main.js`

## Pagination (2026-06-12)

- [x] **Pagination #1** — Sales history page size 50 → 5: added `limit: 5` to URL params in `loadSalesHistory()`; fixed `Math.ceil(total / 50)` → `Math.ceil(total / 5)`. `frontend/app.js`
- [x] **Pagination #2** — Invoices page size 50 → 5: same two changes in `loadInvoices()`. `frontend/app.js`

## Backup system (2026-06-12)

- [x] **Backup #1** — `backup.bat`: replaced rclone/Google Drive with local copy to `C:\SkyBird-Backup\`; timestamped filename `birdshop_YYYY-MM-DD_HH-MM.db`; auto-deletes oldest files to keep last 10. `backend/backup.bat`
- [x] **Backup #2** — `/developer/backup-now` route: same destination and filename format as backup.bat; reads `C:\SkyBird-Backup\`, sorts files, deletes oldest beyond 10 after each manual backup. `index.js`

## Sales & invoice UI fixes (2026-06-12)

- [x] **Sales #1** — Backend pagination limit ignored: `/sales/history` and `/sales/invoices` had `const limit = 50` hardcoded — changed to `parseInt(req.query.limit) || 50` so `?limit=5` from the frontend is respected. `index.js`
- [x] **Sales #2** — Invoice table print button: `openInvoice()` never called `win.print()` — added `setTimeout(() => win.print(), 500)` after `win.document.close()`. `frontend/app.js`
- [x] **Sales #3** — Auto-print after checkout: `checkout()` called `printInvoice()` which has no `win.print()`; replaced with `openInvoice(invoiceNumber)`. `frontend/app.js`
- [x] **Sales #4** — Two invoice copies on checkout: added `openInvoiceTwoCopies(number)` — fetches invoice, renders "نسخة العميل" + "نسخة المحل" with `page-break-after:always` in one window; `checkout()` calls this. `frontend/app.js`

## Developer logs – clear button (2026-06-16)

- [x] **Logs #1** — `loadLogs()` auto-refresh ignored active filter: changed last line from `renderLogs(allLogs)` → `filterLogs()` so 60-second refresh preserves the current dropdown selection. `frontend/developer.html`
- [x] **Logs #2** — `clearLogsFilter()` called `renderLogs(allLogs)` (stale in-memory data, no visible effect): changed to `loadLogs()` so clearing fetches fresh data from server. `frontend/developer.html`
- [x] **Logs #3** — Replaced "مسح الفلتر" button with "🗑 مسح كل السجل": shows Arabic confirmation, calls `DELETE /logs/all`, reloads table. Old `clearLogsFilter()` replaced with `async clearAllLogs()`. `frontend/developer.html`
- [x] **Logs #4** — `DELETE /logs/all` route: inline admin/developer guard, deletes all rows from `logs` table, writes `logAction('مسح سجلات', 'ALL')`. `index.js`

## Invoice print — thermal printer overhaul (2026-06-17)

- [x] **Print #1** — Checkout invoice changed from 2 copies to 1 copy: removed `copyHtml()` helper and page-break duplication from `openInvoiceTwoCopies()`. No "نسخة العميل" / "نسخة المحل" labels. `frontend/app.js`
- [x] **Print #2** — `INVOICE_STYLE` fully replaced for 58mm thermal printer: `table-layout: fixed`, column widths 30/10/18/42% (المنتج/الكمية/السعر/المجموع), `9px` cell font, `white-space: nowrap` + `text-overflow: ellipsis`, `@page { size: 58mm auto; margin: 0 }`, `body` at `56mm` with `padding: 0 1mm`. `frontend/app.js`
- [x] **Print #3** — ESC/POS backend route: installed `escpos` npm package; added `buildEscPosBuffer()` generating raw ESC/POS bytes (init, alignment, bold, separator, items, cut); added `POST /print/receipt` (requireCashier) sending bytes via TCP `net.Socket` to `printer_ip`:`printer_port` from settings table. `index.js` + `package.json`

## Suppliers payment form (2026-06-12)

- [x] **Suppliers Pay #1** — Added `paySupplierSelect` to payment panel with `onPaySupplierChange()` handler; `renderSuppliers()` now populates all three supplier dropdowns in sync. `suppliers.html` + `suppliers.js`
- [x] **Suppliers Pay #2** — Per-invoice balance: added `lastPayments` module var (populated in `loadPayments()`); `getInvoiceRemaining(id)` computes `invoice.total − Σ payments`; `renderPayPurchaseSelect()` filters out fully-paid invoices and shows "متبقي: X"; `onPayPurchaseChange()` updates `payRemaining` on selection; `refreshSupplier()` calls `renderPayPurchaseSelect()` after `loadPayments()` so balances are always fresh. `suppliers.js` + `suppliers.html`
