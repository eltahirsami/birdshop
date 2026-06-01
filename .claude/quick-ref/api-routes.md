# API Routes

All routes in `backend/index.js`. Server: `http://localhost:3000`.

## Auth

| Method | Path | Guard | Description |
|---|---|---|---|
| POST | `/login` | public | `{ username/email, password }` → session |
| POST | `/logout` | public | destroys session |
| GET | `/me` | public | returns `{ session: { id, role, username } \| null }` |

## License

| Method | Path | Guard | Description |
|---|---|---|---|
| GET | `/license/status` | public | `{ licensed: bool, machineId }` |
| POST | `/license/activate` | public | `{ key }` → validates HMAC key and saves to `license.dat` |

## Products

| Method | Path | Guard | Description |
|---|---|---|---|
| GET | `/products` | requireLogin | all products |
| POST | `/products` | requireCashier | `{ name, category, price, cost_price, stock, barcode? }` |
| PUT | `/products/:id` | requireCashier | same body as POST |
| DELETE | `/products/:id` | requireAdmin | |
| GET | `/products/top` | requireCashier | top 5 by qty sold |
| GET | `/products/low-stock` | requireCashier | stock <= 5 |

## Sales

| Method | Path | Guard | Description |
|---|---|---|---|
| POST | `/sales` | requireCashier | single item `{ product_id, quantity }` |
| POST | `/sales/checkout` | requireCashier | cart `{ items: [{product_id, quantity}] }` — transactional |
| GET | `/sales/today` | requireCashier | `{ totalRevenue, totalItems, topProduct }` |
| GET | `/sales/week` | requireCashier | `{ revenue, items }` |
| GET | `/sales/month` | requireCashier | `{ revenue, items }` |
| GET | `/sales/history` | requireCashier | paginated `?page=1` (50/page) |
| GET | `/sales/invoices` | requireCashier | all invoices grouped by invoice_number |
| GET | `/sales/week-invoices` | requireCashier | invoices last 7 days |
| GET | `/sales/month-invoices` | requireCashier | invoices this month |
| GET | `/sales/invoice/:number` | requireLogin | `{ invoice_number, date, items }` or null |
| DELETE | `/sales/history/clear` | requireAdmin | `?option=month\|all` |

## Profits

| Method | Path | Guard | Description |
|---|---|---|---|
| GET | `/profits/today` | requireCashier | `{ profit }` |
| GET | `/profits/month` | requireCashier | `{ profit }` |

## Suppliers

| Method | Path | Guard | Description |
|---|---|---|---|
| GET | `/suppliers` | requireCashier | all suppliers |
| POST | `/suppliers` | requireCashier | `{ name, phone?, address? }` |
| GET | `/suppliers/:id/summary` | requireCashier | `{ totalPurchases, totalPaid, remaining }` |
| GET | `/suppliers/:id/purchases` | requireCashier | purchases for this supplier |
| GET | `/suppliers/purchases` | requireCashier | all purchases paginated `?page&limit&q` |
| GET | `/suppliers/purchases/:purchaseId` | requireCashier | `{ purchase, items }` |
| POST | `/suppliers/purchases` | requireCashier | `{ supplier_id, invoice_number?, invoice_date?, notes?, items: [{product_id, quantity, unit_cost}] }` |
| POST | `/suppliers/payments` | requireCashier | `{ supplier_id, purchase_id?, amount, method?, notes?, paid_at? }` |
| GET | `/suppliers/:id/payments` | requireCashier | payments for supplier |
| GET | `/suppliers/export-data` | requireCashier | full export `{ suppliers, purchases, items, payments }` |

## Developer

| Method | Path | Guard | Description |
|---|---|---|---|
| GET | `/developer/users` | requireDeveloper | all users |
| POST | `/developer/users` | requireDeveloper | `{ username, password, role }` |
| DELETE | `/developer/users/:id` | requireDeveloper | cannot delete developer role |
| PUT | `/developer/users/:id/password` | requireDeveloper | `{ password }` |
| GET | `/developer/backups` | requireDeveloper | list .db files in backups/ |
| POST | `/developer/backup-now` | requireDeveloper | copies DB to backups/ |
| POST | `/developer/restore` | requireDeveloper | `{ filename }` — restores from backups/ |
| GET | `/developer/dbsize` | requireDeveloper | `{ size: "X KB/MB" }` |
| POST | `/developer/restart` | requireDeveloper | calls `process.exit(0)` after 500ms |
| GET | `/developer/logs` | requireDeveloper | last 200 log entries |
| GET | `/developer/stats` | requireDeveloper | sales count + total per user |
