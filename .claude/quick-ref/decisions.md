# Architecture Decisions

## Why SQLite (not PostgreSQL/MySQL)
POS runs locally on one Windows machine — no network DB required. SQLite eliminates install complexity and keeps the entire data store in a single file (`birdshop.db`) that's trivial to back up with `fs.copyFileSync`.

## Why callback-style SQLite (not async/await with better-sqlite3)
`sqlite3` npm package is callback-based. The codebase is consistent throughout. Switching would require rewriting every DB call. Multi-step operations use manual transaction functions (`step(i)`) instead of async/await chains.

## Why Express inside Electron (not native Electron IPC)
The frontend is plain HTML/JS that must work as both a web app (`node index.js`) and packaged desktop app. Keeping Express as the server means the same codebase works in both modes without any changes.

## Why `asar: false` in electron-builder config
SQLite native bindings (`.node` files) don't work inside ASAR archives. Disabling ASAR keeps all files accessible on disk, at the cost of a larger installation directory.

## Why invoice_number is MAX()+1 (not AUTOINCREMENT)
Invoice numbers must be sequential and gap-free for accounting purposes. SQLite AUTOINCREMENT can leave gaps on rollback. The MAX+1 approach is computed inside the same transaction, preventing duplicates under concurrent access (using IMMEDIATE transaction locking).

## Why role checks are middleware functions (not a table)
Only 3 roles (cashier, admin, developer) with static permissions. A roles table would add complexity without benefit. The hierarchy is: developer ⊃ admin ⊃ cashier ⊃ login-only.

## Why bcrypt with fallback to plaintext
Legacy installs may have plain-text passwords in the DB. The login handler checks if the stored password starts with `$2` (bcrypt prefix) before deciding which comparison to use. New passwords are always hashed with bcrypt.

## Why `xlsx.full.min.js` is bundled locally
The app runs in shops with unreliable or no internet. All JS dependencies needed for core features must be available offline.

## Why the WhatsApp bot is NOT imported by index.js
Puppeteer (required by whatsapp-web.js) is heavy and fails silently in many Windows POS environments. It's kept as an optional standalone module that can be required separately if the customer environment supports it.
