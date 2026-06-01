# Database Schema

SQLite file: `backend/birdshop.db` (dev) or `%APPDATA%/smart-pos-system/birdshop.db` (packaged).

## products

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK AUTOINCREMENT | |
| name | TEXT NOT NULL | |
| category | TEXT NOT NULL | free-text, no category table |
| price | REAL NOT NULL | selling price |
| cost_price | REAL DEFAULT 0 | purchase price (for profit calc) |
| stock | INTEGER DEFAULT 0 | decremented on sale, incremented on supplier purchase |
| barcode | TEXT UNIQUE | nullable |

## sales

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK AUTOINCREMENT | |
| product_id | INTEGER | FK → products.id (no constraint enforced) |
| quantity | INTEGER | |
| total | REAL | price × quantity at time of sale |
| invoice_number | INTEGER | groups items into one invoice; MAX()+1 per checkout |
| user_id | INTEGER | FK → users.id |
| created_at | DATETIME DEFAULT CURRENT_TIMESTAMP | |

## users

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK AUTOINCREMENT | |
| name | TEXT | display name (migrated in) |
| email | TEXT UNIQUE | can login with email (migrated in) |
| username | TEXT UNIQUE | primary login field |
| password | TEXT | bcrypt hash OR plain text (legacy) |
| role | TEXT DEFAULT 'cashier' | 'cashier' \| 'admin' \| 'developer' |

Password check: if starts with `$2` → bcrypt.compare, else plain text equality.

## logs

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK AUTOINCREMENT | |
| user_id | INTEGER | |
| username | TEXT | denormalized for display |
| action | TEXT | Arabic action label |
| details | TEXT | free-text details |
| created_at | DATETIME DEFAULT CURRENT_TIMESTAMP | |

## suppliers

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK AUTOINCREMENT | |
| name | TEXT UNIQUE NOT NULL | |
| phone | TEXT | nullable |
| address | TEXT | nullable |
| created_at | DATETIME DEFAULT CURRENT_TIMESTAMP | |

## supplier_purchases

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK AUTOINCREMENT | |
| supplier_id | INTEGER NOT NULL | FK → suppliers.id |
| invoice_number | TEXT | supplier's own invoice number |
| invoice_date | TEXT | supplier's invoice date |
| total | REAL NOT NULL DEFAULT 0 | sum of all line items |
| notes | TEXT | nullable |
| created_at | DATETIME DEFAULT CURRENT_TIMESTAMP | |

## supplier_purchase_items

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK AUTOINCREMENT | |
| purchase_id | INTEGER NOT NULL | FK → supplier_purchases.id |
| product_id | INTEGER NOT NULL | FK → products.id |
| quantity | INTEGER NOT NULL | also added to products.stock |
| unit_cost | REAL NOT NULL | |
| total | REAL NOT NULL | quantity × unit_cost |

## supplier_payments

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK AUTOINCREMENT | |
| supplier_id | INTEGER NOT NULL | FK → suppliers.id |
| purchase_id | INTEGER | nullable (payment on account) |
| amount | REAL NOT NULL | |
| method | TEXT | nullable (cash, transfer, etc.) |
| notes | TEXT | nullable |
| paid_at | DATETIME DEFAULT CURRENT_TIMESTAMP | |
| created_at | DATETIME DEFAULT CURRENT_TIMESTAMP | |

## Key relationships

- `sales.product_id` → `products.id` (no FK constraint; JOIN used in queries)
- `supplier_purchases.supplier_id` → `suppliers.id` (FK declared, not enforced by SQLite without PRAGMA)
- `supplier_purchase_items.purchase_id` → `supplier_purchases.id`
- `supplier_purchase_items.product_id` → `products.id`
- `supplier_payments.supplier_id` → `suppliers.id`
- `supplier_payments.purchase_id` → `supplier_purchases.id` (nullable)
