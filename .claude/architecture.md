# Architecture

## Runtime topology

```
Electron (main.js)
  └── spawns child: node index.js   [Express on :3000]
        ├── database.js             [SQLite connection + schema]
        ├── license.js              [machine-ID HMAC check]
        ├── whatsapp-bot.js         [optional daily report — NOT imported by index.js]
        └── frontend/               [static files served by Express]
```

Electron loads `loading.html` first, then polls `http://localhost:3000` every 1 s (max 30 tries) and switches to the app once the server responds.

## Request lifecycle

1. **License middleware** (`index.js:105`) — every non-public path checks `isLicensed()`. Unlicensed → redirect `/license.html`.
2. **Session middleware** — `express-session`, cookie `birdshop.sid`, 8-hour TTL.
3. **Auth guards** (in order of strictness):
   - `requireLogin` — any authenticated session
   - `requireCashier` — roles: admin | cashier | developer
   - `requireAdmin` — role: admin only
   - `requireDeveloper` — role: developer only
4. **Route handler** — direct SQLite callback, no ORM.
5. **logAction()** — writes to `logs` table after every successful mutation.

## Frontend page routing

| URL | File | Role |
|---|---|---|
| `/login.html` | frontend/login.html | unauthenticated |
| `/license.html` | frontend/license.html | unlicensed machine |
| `/` or `/app` | frontend/index.html + app.js | cashier & admin |
| `/admin.html` | frontend/admin.html + admin.js | admin (legacy) |
| `/developer.html` | frontend/developer.html (inline JS) | developer |
| `/suppliers.html` | frontend/suppliers.html + suppliers.js | popup window |

`getUser()` in app.js: developer role → auto-redirect to `/developer.html`.

## DB file location

| Mode | Path |
|---|---|
| Dev (`node index.js`) | `backend/birdshop.db` |
| Electron packaged | `%APPDATA%/smart-pos-system/birdshop.db` |

`main.js` sets `DB_PATH` env var to `app.getPath('userData')/birdshop.db` before spawning the server.

## Backup strategy

- **Daily** at 20:00 Asia/Qatar → `backend/backups/birdshop-YYYY-MM-DD.db` (keeps last 30)
- **Weekly** Fri 23:30 → `backend/backups/weekly/weekly-YYYY-MM-DD.db` (keeps last 12)
- **Manual** via `POST /developer/backup-now`
- **Pre-restore safety** — restore endpoint copies current DB to `before-restore-DATE.db` first

## License system

- `getMachineId()` → `machineIdSync(true).slice(0,16).toUpperCase()`
- `generateLicenseKey(machineId)` → HMAC-SHA256(machineId, SECRET).hex.slice(0,24).upper, split 4×6
- `SECRET` = `process.env.LICENSE_SECRET` || `'SKYBIRD2026SECRET'`
- Key stored in `backend/license.dat` (gitignored)
- To generate for a customer: `node generate-license.js <MACHINE_ID>`

## WhatsApp bot (whatsapp-bot.js)

Not imported by `index.js` — standalone optional module. Auth persists in `.wwebjs_auth/`. Target number hardcoded line 89: `"55951951@c.us"` — format: `{country_code}{number}@c.us`.
