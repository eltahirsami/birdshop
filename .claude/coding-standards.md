# Coding Standards

## Backend (index.js)

**All DB calls use callbacks, never promises:**
```js
db.get("SELECT ...", [params], (err, row) => { ... })
db.all("SELECT ...", [params], (err, rows) => { ... })
db.run("INSERT ...", [params], function(err) { /* this.lastID */ })
```

**Multi-step mutations use explicit SQLite transactions:**
```js
db.run('BEGIN IMMEDIATE TRANSACTION', (err) => {
  function step(i) {
    if (i >= items.length) return db.run('COMMIT', ...)
    // ... do work, then call step(i + 1) or ROLLBACK on error
  }
  step(0)
})
```

**Error response shape:**
- Failure: `{ error: 'English', message: 'Arabic' }`
- Success: `{ message: 'Arabic' }` (plus relevant IDs/data)

**Log every mutation:**
```js
logAction(req.session.user.id, req.session.user.username, 'Arabic action', 'details')
```

**Route guard order:** `requireLogin` first, then domain guard.

## Frontend (app.js / suppliers.js)

**All fetch calls include credentials:**
```js
fetch('/endpoint', { credentials: 'include' })
```

**suppliers.js uses `fetchJson()` wrapper** — throws on non-OK with Arabic message from server.

**app.js uses inline fetch** — no wrapper, checks `res.ok` manually.

**Checkout double-submit guard:** `isCheckoutProcessing` boolean flag in app.js.

**Cart deduplication:** `sellProduct()` increments qty if product already in cart.

## HTML / UI conventions

- All pages are RTL Arabic (`<html lang="ar" dir="rtl">`)
- `index.html` serves BOTH cashier and admin via `userRole` conditional rendering
- `admin.html` is a legacy secondary admin panel (older `admin.js` uses `prompt()` for editing)
- `developer.html` is fully self-contained with inline `<script>` — dark cyberpunk theme
- `xlsx.full.min.js` is bundled locally (no CDN) for Excel export

## Schema migration pattern

```js
db.all("PRAGMA table_info(tableName)", [], (err, columns) => {
  const colNames = new Set(columns.map(c => c.name))
  if (!colNames.has('new_col')) db.run("ALTER TABLE tableName ADD COLUMN new_col TEXT")
})
```
All migrations live in `database.js` inside `db.serialize()`.
