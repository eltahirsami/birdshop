# Frontend Functions Map

## app.js (index.html — POS screen)

### Initialization
| Function | Description |
|---|---|
| `window.onload` | Calls getUser → loadProducts → stats → salesHistory → invoices → checkLowStockAlert |
| `getUser()` | GET /me; sets `userRole`; redirects developer to developer.html |

### Products
| Function | Description |
|---|---|
| `loadProducts()` | GET /products; stores in `products[]`; calls renderProducts |
| `renderProducts(list)` | Builds product table rows; shows edit/delete buttons by role |
| `addProduct()` | POST/PUT /products; handles both add and edit mode via `editMode` flag |
| `editProduct(id)` | Fills form with product data; sets `editMode=true`, `editId` |
| `deleteProduct(id)` | DELETE /products/:id after confirm |
| `searchProducts()` | Client-side filter of `products[]` by name/category |
| `quickAdd(e)` | On Enter in search box: finds product by name/barcode and calls sellProduct |

### Cart / Checkout
| Function | Description |
|---|---|
| `sellProduct(id)` | Adds product to `cart[]`; validates stock; calls renderCart |
| `renderCart()` | Rebuilds cart table HTML; updates total |
| `increaseQty(index)` | +1 qty with stock check |
| `decreaseQty(index)` | -1 qty (min 1) |
| `removeFromCart(index)` | Splices item from cart |
| `checkout()` | POST /sales/checkout; guarded by `isCheckoutProcessing`; auto-prints invoice on success |

### Sales & Invoices
| Function | Description |
|---|---|
| `loadSalesHistory()` | GET /sales/history (page 1, 50 rows); renders into salesHistoryTable and cashierSalesTable |
| `clearSalesHistory()` | DELETE /sales/history/clear?option=month\|all |
| `loadInvoices()` | GET /sales/invoices; renders invoiceTable and cashierInvoiceTable |
| `searchInvoice()` | GET /sales/invoice/:number; renders result in #invoiceResult |
| `searchInvoiceByNumber(n)` | Sets input value and calls searchInvoice |
| `openInvoice(number)` | Fetches invoice and opens print window |
| `openInvoiceWindow(number)` | Fetches invoice and opens view+print window |
| `printInvoiceFromSearch()` | Prints last searched invoice from `window.lastInvoiceHtml` |

### Stats / Profits
| Function | Description |
|---|---|
| `loadTodayStats()` | GET /sales/today → updates todaySales, todayItems, topProduct |
| `loadTodayProfit()` | GET /profits/today → updates todayProfit |
| `loadMonthProfit()` | GET /profits/month → updates monthProfit |

### Printing
| Function | Description |
|---|---|
| `printInvoice(items, invoiceNumber)` | Generates 80mm thermal invoice HTML and opens print window |
| `printDailyReport()` | Fetches today's stats + sales + invoices; prints daily summary |

### Reports (Excel)
| Function | Description |
|---|---|
| `exportWeeklyReport()` | Multi-sheet Excel: summary, daily, invoices, sales detail (last 7 days) |
| `exportMonthlyReport()` | Same structure but for current month |
| `exportFullReport()` | 6-sheet all-time report: summary, monthly breakdown, inventory, product sales, invoices, raw sales |

### Other
| Function | Description |
|---|---|
| `checkLowStock()` | GET /products/low-stock; opens popup window with low/zero stock table |
| `checkLowStockAlert()` | Same fetch; shows floating alert banner if issues found |
| `showStockAlert(msg, type)` | Creates fixed-position alert div; auto-removes after 8s |
| `manualBackup()` | POST /developer/backup-now (NOTE: requires developer role — bug) |
| `openSuppliersWindow()` | Opens /suppliers.html as popup |
| `logout()` | POST /logout; redirects to login |

---

## suppliers.js (suppliers.html — popup window)

### State
- `suppliers[]`, `products[]`, `selectedSupplierId`, `draftItems[]`, `lastPurchases[]`

### Initialization
| Function | Description |
|---|---|
| `window.onload` | ensureSession → refreshAll → renderDraftItems |
| `ensureSession()` | GET /me; redirects if not logged in or role insufficient |
| `refreshAll()` | loadSuppliers + loadProducts + refreshSupplier |
| `refreshSupplier()` | loadSummary + loadPurchases + loadPayments |

### Suppliers
| Function | Description |
|---|---|
| `loadSuppliers()` | GET /suppliers; renders dropdowns |
| `renderSuppliers()` | Populates supplierSelect and purchaseSupplierSelect |
| `createSupplier()` | POST /suppliers |
| `onSupplierChange()` | Syncs both supplier dropdowns; calls refreshSupplier |

### Purchases
| Function | Description |
|---|---|
| `loadPurchases()` | GET /suppliers/:id/purchases; renders purchasesBody |
| `loadAllPurchases(page)` | GET /suppliers/purchases?page&limit&q; paginated all-suppliers view |
| `savePurchase()` | POST /suppliers/purchases with draftItems |
| `viewPurchase(id)` | GET /suppliers/purchases/:id; renders details |
| `addItemToDraft()` | Adds row to `draftItems[]`; calls renderDraftItems |
| `removeDraftItem(idx)` | Removes from draftItems |
| `renderDraftItems()` | Rebuilds draft table; updates total |
| `clearDraft()` | Empties draftItems |
| `printDraftPurchase()` | Prints current draft as supplier invoice |
| `calcDraftTotal()` | Returns sum of draftItems |

### Payments
| Function | Description |
|---|---|
| `loadPayments()` | GET /suppliers/:id/payments; renders paymentsBody |
| `createPayment()` | POST /suppliers/payments |
| `renderPayPurchaseSelect()` | Populates payPurchaseSelect from lastPurchases |

### Summary
| Function | Description |
|---|---|
| `loadSummary()` | GET /suppliers/:id/summary; updates totalPurchases/totalPaid/remaining |

### Export
| Function | Description |
|---|---|
| `exportSuppliersReport()` | GET /suppliers/export-data; 5-sheet Excel with suppliers, purchases, items, payments |

### Pagination
| Function | Description |
|---|---|
| `searchAllPurchases()` | Re-runs loadAllPurchases(1) with search term |
| `prevAllPurchasesPage()` / `nextAllPurchasesPage()` | Page nav for all-purchases mode |

### Helpers
| Function | Description |
|---|---|
| `fetchJson(url, options)` | fetch wrapper; throws Error with Arabic message on non-OK |
| `setMsg(id, text, ok)` | Sets color + text of a message element |
| `money(x)` | Formats number: integer → no decimals, float → 2 decimals |

---

## admin.js (admin.html — legacy)

| Function | Description |
|---|---|
| `loadProducts()` | GET /products (no credentials); renders adminProducts table |
| `deleteProduct(id)` | DELETE /products/:id |
| `editProduct(id)` | Uses `prompt()` for price and stock only — missing category/cost_price/barcode |

---

## developer.html (inline script)

| Function | Description |
|---|---|
| `loadUsers()` | GET /developer/users; renders usersTable + changePassUser select |
| `addUser()` | POST /developer/users |
| `deleteUser(id, username)` | DELETE /developer/users/:id |
| `changePassword()` | PUT /developer/users/:id/password |
| `saveSettings()` | **STUB** — only logs, does not persist (bug) |
| `loadBackups()` | GET /developer/backups; renders backup list with restore buttons |
| `createBackupNow()` | POST /developer/backup-now |
| `restoreBackup(filename)` | POST /developer/restore |
| `restartServer()` | POST /developer/restart; reloads page after 5s |
| `loadSystemInfo()` | Fetches products, invoices, dbsize; renders systemTable |
| `loadLogs()` | GET /developer/logs; stores in `allLogs[]`; calls renderLogs |
| `filterLogs()` | Client-side filter by user + action |
| `renderLogs(logs)` | Builds log table with color-coded actions |
| `exportLogs()` | Exports filtered logs to Excel |
| `addLog(msg)` | Appends line to terminal div |
| `showAlert(id, msg, type)` | Shows/hides alert div; auto-hides after 6s |
| `updateTime()` | Updates currentTime every second |
| `logout()` | POST /logout → /login.html |
