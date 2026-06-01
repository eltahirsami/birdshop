# Workflow

## Add a new API route

1. Pick guard: `requireLogin` / `requireCashier` / `requireAdmin` / `requireDeveloper`
2. Add route to `index.js` in the appropriate resource section
3. Call `logAction()` after every successful write
4. Return `{ error, message }` on failure, `{ message }` on success
5. Multi-step writes → wrap in `BEGIN IMMEDIATE TRANSACTION` / `COMMIT` / `ROLLBACK`

## Add a DB column

1. Add to `CREATE TABLE IF NOT EXISTS` in `database.js`
2. Add `ALTER TABLE ... ADD COLUMN` inside the `PRAGMA table_info` migration block
3. Update affected routes in `index.js`

## Add a frontend feature

1. Edit the right HTML: `index.html` (POS/admin), `suppliers.html` (supplier module), `developer.html` (dev tools)
2. Add JS to the corresponding file: `app.js`, `suppliers.js`, or inline in `developer.html`
3. Role-gate UI by checking `userRole` (set by `getUser()` in `app.js`)
4. Always pass `{ credentials: 'include' }` to fetch

## Run the app for testing

```bash
cd backend
node index.js          # http://localhost:3000
# or double-click start.bat
```

## Create a test user

```bash
node createCashier.js     # creates cashier / 1234
node createDeveloper.js   # see file for credentials
node checkUsers.js        # list all users
```

## Build the installer

```bash
npm run build    # → dist/Smart POS System Setup.exe
```
Build excludes: `.wwebjs_auth`, `.wwebjs_cache`, `backups`, `dist`.

## Fix checkout bugs

Flow: `checkout()` (app.js) → `POST /sales/checkout` → SQLite transaction (insert sale + decrement stock per item) → COMMIT or ROLLBACK. The `isCheckoutProcessing` flag in app.js prevents double-submission. Stock validation happens server-side before the transaction begins.
