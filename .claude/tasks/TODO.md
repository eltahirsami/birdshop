# TODO

All known bugs resolved. No pending work.

## Completed bugs (all fixed in code)

- [x] `manualBackup()` required developer role — fixed, route now uses `requireCashier` (`index.js:901`)
- [x] `saveSettings()` was a stub — fixed, `GET/PUT /developer/settings` endpoints added (`index.js:986,995`)
- [x] WhatsApp daily report never scheduled — fixed, `sendDailyReport` conditionally imported and called in daily cron (`index.js:10-15, 1183-1184`)
- [x] Sales history pagination broken — fixed, `app.js` sends `?page=` param (`app.js:1007`)
- [x] Invoice-not-found returned HTTP 200 + null — fixed, now returns 404 (`index.js:435`)
- [x] `admin.js` used `prompt()` dialogs — fixed, no `prompt()` calls remain

## Completed enhancements

- [x] Product category autocomplete (Feature #1)
- [x] Sales history search/filter (Feature #3)
- [x] Invoice table pagination controls (Feature #4)
- [x] `low_stock_threshold` in developer UI (Feature #2)
- [x] WhatsApp target number from `settings.whatsapp_number` (Feature #2)
- [x] 58mm thermal print CSS + ESC/POS `/print/receipt` route
