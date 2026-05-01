let products = []
let cart = []
let userRole = null
let editMode = false
let editId = null
let isCheckoutProcessing = false

const INVOICE_STYLE = `
  body { font-family:tahoma; width:80mm; margin:0; padding:5px; }
  .shop-header { text-align:center; border-bottom:2px dashed #000; padding-bottom:8px; margin-bottom:8px; }
  .shop-name { font-size:18px; font-weight:bold; }
  .shop-info { font-size:11px; color:#555; }
  h2 { text-align:center; font-size:14px; margin:8px 0; }
  table { width:100%; border-collapse:collapse; font-size:12px; }
  th,td { border-bottom:1px dashed #000; padding:4px; text-align:center; }
  h3 { text-align:center; margin-top:10px; }
  .footer { text-align:center; font-size:10px; color:#777; margin-top:10px; border-top:1px dashed #000; padding-top:5px; }
`

const SHOP_HEADER_HTML = `
  <div class="shop-header">
    <div class="shop-name">🧾 Smart POS System</div>
  </div>
`

/* =========================
إحصائيات اليوم
========================= */
async function loadTodayStats() {
  const res = await fetch('/sales/today', { credentials: 'include' })
  const data = await res.json()
  document.getElementById("todaySales").innerText = data.totalRevenue
  document.getElementById("todayItems").innerText = data.totalItems
  document.getElementById("topProduct").innerText = data.topProduct
}

async function loadMonthProfit() {
  const res = await fetch('/profits/month', { credentials: 'include' })
  const data = await res.json()
  document.getElementById("monthProfit").innerText = data.profit
}

/* =========================
جلب بيانات المستخدم
========================= */
async function getUser() {
  const res = await fetch('/me', { credentials: 'include' })
  const data = await res.json()

  if (!data.session) {
    location.href = "/login.html"
    return
  }

  userRole = data.session.role

  if (userRole === "cashier") {
    document.body.classList.add("cashier-theme")
  }

  if (userRole === "developer") {
    location.href = "/developer.html"
    return
  }

  if (userRole === "admin" || userRole === "cashier") {
    document.getElementById("adminSection").style.display = "block"
  }

  if (userRole === "cashier") {
    const clearBtn = document.querySelector("button[onclick='clearSalesHistory()']")
    if (clearBtn) clearBtn.parentElement.style.display = "none"
  }
}

/* =========================
تحميل المنتجات
========================= */
async function loadProducts() {
  const res = await fetch('/products', { credentials: 'include' })
  products = await res.json()
  renderProducts(products)
}

/* =========================
عرض المنتجات
========================= */
function renderProducts(list) {
  const table = document.getElementById("productsTable")
  let html = ""

  list.forEach(p => {
    let adminButtons = ""
    if (userRole === "admin") {
  adminButtons = `
    <button type="button" onclick="editProduct(${p.id});return false;">✏️ تعديل</button>
    <button type="button" onclick="deleteProduct(${p.id});return false;">🗑 حذف</button>
  `
} else if (userRole === "cashier") {
  adminButtons = `
    <button type="button" onclick="editProduct(${p.id});return false;">✏️ تعديل</button>
  `
}

    let lowStock = ""
    if (p.stock <= 5) lowStock = "⚠️"

    html += `
      <tr>
        <td>${p.name}</td>
        <td>${p.category}</td>
        <td>${p.cost_price ?? 0}</td>
        <td>${p.price}</td>
        <td>${p.stock} ${lowStock}</td>
        <td>
          <button type="button" onclick="sellProduct(${p.id})">بيع</button>
          ${adminButtons}
        </td>
      </tr>
    `
  })
  table.innerHTML = html
}

/* =========================
بيع منتج
========================= */
function sellProduct(id) {
  const product = products.find(p => p.id === id)

  if (!product) { alert("المنتج غير موجود"); return }
  if (product.stock <= 0) { alert("⚠️ لا يوجد مخزون لهذا المنتج"); return }

  const inCart = cart.find(c => c.id === id)
  const qtyInCart = inCart ? inCart.qty : 0

  if (qtyInCart >= product.stock) {
    alert(`⚠️ لا يمكن إضافة أكثر من ${product.stock} — المخزون المتاح`)
    return
  }

  if (inCart) {
    inCart.qty++
  } else {
    cart.push({ id: product.id, name: product.name, price: product.price, qty: 1 })
  }

  renderCart()
  // لا شيء هنا
}

/* =========================
عرض السلة
========================= */
function renderCart() {
  const table = document.getElementById("cartTable")
  table.innerHTML = ""
  let total = 0

  cart.forEach((c, index) => {
    let sum = c.price * c.qty
    total += sum
    table.innerHTML += `
      <tr>
        <td>${c.name}</td>
        <td>
          <button onclick="decreaseQty(${index})">-</button>
          ${c.qty}
          <button onclick="increaseQty(${index})">+</button>
        </td>
        <td>${c.price}</td>
        <td>${sum}</td>
        <td><button onclick="removeFromCart(${index})">❌</button></td>
      </tr>
    `
  })

  document.getElementById("total").innerText = total
}

/* =========================
زيادة / نقصان الكمية
========================= */
function increaseQty(index) {
  const item = cart[index]
  const product = products.find(p => p.id === item.id)
  if (!product) return
  if (item.qty >= product.stock) {
    alert(`⚠️ لا يمكن إضافة أكثر من ${product.stock} — المخزون المتاح`)
    return
  }
  cart[index].qty++
  renderCart()
}

function decreaseQty(index) {
  if (cart[index].qty > 1) cart[index].qty--
  renderCart()
}

function removeFromCart(index) {
  cart.splice(index, 1)
  renderCart()
}

/* =========================
إتمام البيع
========================= */
async function checkout() {
  if (isCheckoutProcessing) return
  if (cart.length === 0) { alert("السلة فارغة"); return }

  isCheckoutProcessing = true
  const soldItems = [...cart]
  const res = await fetch('/sales/checkout', {
    method: "POST",
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: cart.map((item) => ({ product_id: item.id, quantity: item.qty }))
    })
  })
  const data = await res.json()
  if (!res.ok) {
    alert(data.error || "فشل إتمام البيع")
    isCheckoutProcessing = false
    return
  }
  const invoiceNumber = data.invoice

  alert("تم البيع بنجاح")
  cart = []
  renderCart()
  loadProducts()
  loadTodayProfit()
  loadTodayStats()
  loadMonthProfit()
  loadSalesHistory()
  loadInvoices()

  if (invoiceNumber) {
    document.getElementById("invoiceNumber").innerText = invoiceNumber
    document.getElementById("invoiceDate").innerText = new Date().toLocaleString()
    printInvoice(soldItems, invoiceNumber)
  }
  isCheckoutProcessing = false
}

/* =========================
حذف / تعديل منتج
========================= */
async function deleteProduct(id) {
  if (!confirm("هل تريد حذف المنتج؟")) return
  await fetch('/products/' + id, { method: "DELETE", credentials: 'include' })
  loadProducts()
}

function editProduct(id) {
  const p = products.find(x => x.id === id)
  if (!p) { alert("المنتج غير موجود"); return }

  editMode = true
  editId = id

  document.getElementById("name").value = p.name
  document.getElementById("category").value = p.category
  document.getElementById("price").value = p.price
  document.getElementById("cost_price").value = p.cost_price ?? 0
  document.getElementById("stock").value = p.stock
  document.getElementById("barcode").value = p.barcode ?? ''

  // تغيير نص الزر للتوضيح
  const saveBtn = document.querySelector("button[onclick='addProduct()']")
  if (saveBtn) saveBtn.innerText = "✏️ حفظ التعديل"

  document.getElementById("formMessage").style.color = "#b8860b"
  document.getElementById("formMessage").innerText = "✏️ وضع التعديل — عدّل البيانات ثم اضغط حفظ"

  window.scrollTo({ top: 0, behavior: "smooth" })
}

async function addProduct() {
  const name = document.getElementById("name").value.trim()
  const category = document.getElementById("category").value.trim()
  const price = document.getElementById("price").value
  const cost_price = document.getElementById("cost_price").value
  const stock = document.getElementById("stock").value
  const barcode = document.getElementById("barcode").value.trim()
  const msgEl = document.getElementById("formMessage")

  if (!name || !category || price === "") {
    msgEl.style.color = "#c0392b"
    msgEl.innerText = "⚠️ يرجى تعبئة الاسم والتصنيف والسعر"
    return
  }

  let url = "/products"
  let method = "POST"

  if (editMode) { url = "/products/" + editId; method = "PUT" }

  try {
    const res = await fetch(url, {
      method: method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, category, price: parseFloat(price), cost_price: parseFloat(cost_price) || 0, stock: parseInt(stock) || 0, barcode: barcode || null })
    })

    let data
    try {
      data = await res.json()
    } catch {
      msgEl.style.color = "#c0392b"
      msgEl.innerText = "❌ خطأ في الاتصال بالسيرفر"
      return
    }

    if (res.ok) {
      msgEl.style.color = "#27ae60"
      msgEl.innerText = editMode ? "✅ تم تعديل المنتج بنجاح" : "✅ تمت إضافة المنتج بنجاح"
    } else {
      msgEl.style.color = "#c0392b"
      msgEl.innerText = "❌ " + (data.error || "حدث خطأ")
      return
    }
  } catch (err) {
    msgEl.style.color = "#c0392b"
    msgEl.innerText = "❌ فشل الاتصال بالسيرفر"
    return
  }

  editMode = false
  editId = null

  // إعادة تعيين زر الحفظ
  const saveBtn = document.querySelector("button[onclick='addProduct()']")
  if (saveBtn) saveBtn.innerText = "💾 حفظ المنتج"

  document.getElementById("name").value = ""
  document.getElementById("category").value = ""
  document.getElementById("price").value = ""
  document.getElementById("cost_price").value = ""
  document.getElementById("stock").value = ""
  document.getElementById("barcode").value = ""

  loadProducts()
  setTimeout(() => { if (msgEl) msgEl.innerText = "" }, 4000)
}

/* =========================
بحث سريع
========================= */
function quickAdd(e) {
  if (e.key !== "Enter") return
  const term = e.target.value.toLowerCase()
  const product = products.find(p =>
    p.name.toLowerCase().includes(term) ||
    (p.barcode && p.barcode === e.target.value.trim())
  )
  if (!product) { alert("المنتج غير موجود"); return }
  sellProduct(product.id)
  e.target.value = ""
}

function searchProducts() {
  const term = document.getElementById("searchProduct").value.toLowerCase()
  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(term) ||
    p.category.toLowerCase().includes(term)
  )
  renderProducts(filtered)
}

/* =========================
سجل المبيعات
========================= */
async function loadSalesHistory() {
  const res = await fetch('/sales/history', { credentials: 'include' })
  const data = await res.json()

  const adminTable = document.getElementById("salesHistoryTable")
  const cashierTable = document.getElementById("cashierSalesTable")

  const adminRows = () => {
    if (!data || data.length === 0) return `<tr><td colspan="6" style="text-align:center">لا توجد مبيعات</td></tr>`
    return data.map(s => `
      <tr>
        <td>${s.product}</td>
        <td>${s.quantity}</td>
        <td>${s.cost_price ?? 0}</td>
        <td>${s.total}</td>
        <td>${s.profit ?? 0}</td>
        <td>${new Date(s.created_at).toLocaleString('ar')}</td>
      </tr>
    `).join('')
  }

  const cashierRows = () => {
    if (!data || data.length === 0) return `<tr><td colspan="4" style="text-align:center">لا توجد مبيعات</td></tr>`
    return data.map(s => `
      <tr>
        <td>${s.product}</td>
        <td>${s.quantity}</td>
        <td>${s.total}</td>
        <td>${new Date(s.created_at).toLocaleString('ar')}</td>
      </tr>
    `).join('')
  }

  if (adminTable) adminTable.innerHTML = adminRows()
  if (cashierTable) cashierTable.innerHTML = cashierRows()
}

async function clearSalesHistory() {
  const optionEl = document.getElementById("clearOption")
  if (!optionEl) { alert("حدث خطأ — العنصر غير موجود"); return }

  const option = optionEl.value
  const label = option === "month" ? "السجلات الشهرية" : "كل السجلات"
  if (!confirm(`هل تريد حقًا مسح ${label}؟`)) return

  try {
    const res = await fetch(`/sales/history/clear?option=${option}`, { method: "DELETE", credentials: 'include' })
    const data = await res.json()
    if (res.ok) {
      alert(data.message)
      loadSalesHistory(); loadInvoices(); loadTodayProfit(); loadTodayStats(); loadMonthProfit()
    } else {
      alert(data.error || "حدث خطأ أثناء المسح")
    }
  } catch (err) {
    alert("فشل الاتصال بالسيرفر")
  }
}

/* =========================
الفواتير
========================= */
async function loadInvoices() {
  const res = await fetch('/sales/invoices', { credentials: 'include' })
  const data = await res.json()

  const adminTable = document.getElementById("invoiceTable")
  const cashierTable = document.getElementById("cashierInvoiceTable")

  const buildRows = () => {
    if (!data || data.length === 0) return `<tr><td colspan="4" style="text-align:center">لا توجد فواتير</td></tr>`
    return data.map(inv => `
      <tr>
        <td>${inv.invoice_number}</td>
        <td>${new Date(inv.created_at).toLocaleString('ar')}</td>
        <td>${inv.total}</td>
        <td>
          <button onclick="openInvoice(${inv.invoice_number})">🖨️ طباعة</button>
          <button onclick="openInvoiceWindow(${inv.invoice_number})">👁️ عرض</button>
        </td>
      </tr>
    `).join('')
  }

  if (adminTable) adminTable.innerHTML = buildRows()
  if (cashierTable) cashierTable.innerHTML = buildRows()
}

/* =========================
الأرباح اليومية
========================= */
async function loadTodayProfit() {
  const res = await fetch('/profits/today', { credentials: 'include' })
  const data = await res.json()
  document.getElementById("todayProfit").innerText = data.profit
}

/* =========================
المخزون المنخفض
========================= */
async function checkLowStock() {
  const res = await fetch('/products/low-stock', { credentials: 'include' })
  const data = await res.json()
  const low = data.filter(p => p.stock <= 5)

  if (low.length === 0) {
    alert("لا يوجد منتجات منخفضة المخزون")
    return
  }

  let rows = ""
  low.forEach(p => {
  const editBtn = `<button type="button" onclick="window.opener.editProduct(${p.id});window.close();">✏️ تعديل</button>`

    rows += `
      <tr>
        <td>${p.name}</td>
        <td>${p.category}</td>
        <td style="color:${p.stock === 0 ? '#c0392b' : '#e67e22'};font-weight:bold">
          ${p.stock === 0 ? '❌ نفذ' : '⚠️ ' + p.stock}
        </td>
        <td>${p.price}</td>
        <td>${editBtn}</td>
      </tr>
    `
  })

  const html = `
    <html dir="rtl">
    <head>
      <title>المخزون المنخفض</title>
      <style>
        body { font-family:tahoma; padding:20px; background:#f9f9f9; }
        h2 { text-align:center; color:#c0392b; }
        table { width:100%; border-collapse:collapse; margin-top:20px; background:#fff; border-radius:8px; overflow:hidden; }
        th { background:#f0f0f0; padding:10px; border:1px solid #ddd; font-size:13px; }
        td { padding:9px 10px; border:1px solid #ddd; text-align:center; font-size:13px; }
        tr:hover td { background:#fff8e1; }
        button { background:#e67e22; color:#fff; border:none; padding:5px 12px; border-radius:5px; cursor:pointer; font-family:tahoma; }
        button:hover { background:#d35400; }
      </style>
    </head>
    <body>
      <h2>⚠️ المنتجات منخفضة المخزون</h2>
      <table>
        <tr><th>المنتج</th><th>التصنيف</th><th>المخزون</th><th>السعر</th><th>إدارة</th></tr>
        ${rows}
      </table>
    </body>
    </html>
  `

  const win = window.open("", "", "width=800,height=500")
  win.document.write(html)
  win.document.close()
}

/* =========================
طباعة الفاتورة
========================= */
function printInvoice(items, invoiceNumber) {
  if (!items || items.length === 0) { alert("لا يوجد منتجات للطباعة"); return }

  let total = 0
  const date = new Date().toLocaleString()
  let rows = ''

  items.forEach(c => {
    const sum = c.price * c.qty
    total += sum
    rows += `<tr><td>${c.name}</td><td>${c.qty}</td><td>${c.price}</td><td>${sum}</td></tr>`
  })

  const html = `
    <html dir="rtl"><head><title>فاتورة</title><style>${INVOICE_STYLE}</style></head>
    <body>
      ${SHOP_HEADER_HTML}
      <h2>فاتورة بيع</h2>
      <p>رقم الفاتورة : ${invoiceNumber}</p>
      <p>التاريخ : ${date}</p>
      <table><tr><th>المنتج</th><th>الكمية</th><th>السعر</th><th>المجموع</th></tr>${rows}</table>
      <h3>الإجمالي : ${total}</h3>
      <div class="footer">شكراً لزيارتكم — نتمنى لكم تجربة ممتعة</div>
    </body></html>
  `

  const win = window.open("", "", "width=700,height=700")
  win.document.write(html)
  win.document.close()
}

/* =========================
البحث عن فاتورة
========================= */
async function searchInvoice() {
  const number = document.getElementById("searchInvoiceInput").value
  if (!number) { alert("أدخل رقم الفاتورة"); return }

  const res = await fetch(`/sales/invoice/${number}`, { credentials: 'include' })
  const data = await res.json()
  const div = document.getElementById("invoiceResult")
  div.innerHTML = ""

  if (res.status !== 200) { div.innerText = data.error; return }

  let total = 0
  let rows = ""

  data.items.forEach(item => {
    const price = item.price ?? (item.total / item.quantity)
    const sum = item.total ?? (item.quantity * price)
    total += sum
    rows += `<tr><td>${item.name}</td><td>${item.quantity}</td><td>${price}</td><td>${sum}</td></tr>`
  })

  const invoiceHtml = `
    <div style="text-align:center; border-bottom:2px dashed #000; padding-bottom:8px; margin-bottom:8px;">
      <div style="font-size:18px; font-weight:bold;">🧾 Smart POS System</div>
    </div>
    <p>🧾 رقم الفاتورة: ${data.invoice_number}</p>
    <p>📅 تاريخ الفاتورة: ${new Date(data.date).toLocaleString()}</p>
    <table border="1" width="100%">
      <tr><th>المنتج</th><th>الكمية</th><th>السعر</th><th>المجموع</th></tr>
      ${rows}
    </table>
    <h3>الإجمالي: ${total}</h3>
    <div style="text-align:center; font-size:11px; color:#777; margin-top:8px; border-top:1px dashed #000; padding-top:5px;">
      شكراً لزيارتكم — نتمنى لكم تجربة ممتعة
    </div>
    <button onclick="printInvoiceFromSearch()">🖨️ طباعة الفاتورة</button>
  `

  div.innerHTML = invoiceHtml
  window.lastInvoiceHtml = invoiceHtml
}

function printInvoiceFromSearch() {
  if (!window.lastInvoiceHtml) { alert("لا يوجد فاتورة للطباعة"); return }

  const win = window.open("", "", "width=700,height=700")
  const htmlContent = window.lastInvoiceHtml.replace(/<button[^>]*>🖨️ طباعة الفاتورة<\/button>/g, '')
  win.document.write(`
    <html dir="rtl"><head><style>${INVOICE_STYLE}</style></head>
    <body>
      ${htmlContent}
      <div style="text-align:center; margin-top:10px;">
        <button onclick="window.print()">🖨️ طباعة الفاتورة</button>
      </div>
    </body></html>
  `)
  win.document.close()
}

async function openInvoiceWindow(invoiceNumber) {
  if (!invoiceNumber) { alert("رقم الفاتورة غير موجود"); return }

  const res = await fetch(`/sales/invoice/${invoiceNumber}`, { credentials: 'include' })
  const data = await res.json()

  if (!data || !data.items) { alert("الفاتورة غير موجودة"); return }

  let total = 0
  let rows = ""

  data.items.forEach(item => {
    const price = item.price ?? (item.total / item.quantity)
    const sum = item.total ?? (item.quantity * price)
    total += sum
    rows += `<tr><td>${item.name}</td><td>${item.quantity}</td><td>${price}</td><td>${sum}</td></tr>`
  })

  const html = `
    <html dir="rtl"><head><title>فاتورة ${invoiceNumber}</title><style>${INVOICE_STYLE}</style></head>
    <body>
      ${SHOP_HEADER_HTML}
      <h2>فاتورة بيع</h2>
      <p>🧾 رقم الفاتورة: ${invoiceNumber}</p>
      <p>📅 تاريخ الفاتورة: ${new Date(data.date).toLocaleString()}</p>
      <table><tr><th>المنتج</th><th>الكمية</th><th>السعر</th><th>المجموع</th></tr>${rows}</table>
      <h3>الإجمالي: ${total}</h3>
      <div class="footer">شكراً لزيارتكم — نتمنى لكم تجربة ممتعة</div>
      <div style="text-align:center; margin-top:10px;">
        <button onclick="window.print()">🖨️ طباعة الفاتورة</button>
      </div>
    </body></html>
  `

  const win = window.open("", "", "width=700,height=700")
  win.document.write(html)
  win.document.close()
}

async function openInvoice(number) {
  const res = await fetch(`/sales/invoice/${number}`, { credentials: 'include' })
  const data = await res.json()

  if (!data || !data.items) { alert("الفاتورة غير موجودة"); return }

  let total = 0
  let rows = ""

  data.items.forEach(item => {
    const price = item.total / item.quantity
    const sum = item.total
    total += sum
    rows += `<tr><td>${item.name}</td><td>${item.quantity}</td><td>${price}</td><td>${sum}</td></tr>`
  })

  const html = `
    <html dir="rtl"><head><title>فاتورة</title><style>${INVOICE_STYLE}</style></head>
    <body>
      ${SHOP_HEADER_HTML}
      <h2>فاتورة بيع</h2>
      <p>رقم الفاتورة : ${data.invoice_number}</p>
      <p>التاريخ : ${new Date(data.date).toLocaleString()}</p>
      <table><tr><th>المنتج</th><th>الكمية</th><th>السعر</th><th>المجموع</th></tr>${rows}</table>
      <h3>الإجمالي : ${total}</h3>
      <div class="footer">شكراً لزيارتكم — نتمنى لكم تجربة ممتعة</div>
    </body></html>
  `

  const win = window.open("", "", "width=700,height=700")
  win.document.write(html)
  win.document.close()
}

/* =========================
تسجيل الخروج
========================= */
async function logout() {
  await fetch('/logout', { method: 'POST', credentials: 'include' })
  location.href = "/login.html"
}

function searchInvoiceByNumber(number) {
  const input = document.getElementById("searchInvoiceInput")
  input.value = number
  searchInvoice()
}

/* =========================
نسخ احتياطي يدوي
========================= */
async function manualBackup() {
  const btn = document.querySelector("button[onclick='manualBackup()']")
  const msg = document.getElementById("backupMsg")

  btn.disabled = true
  btn.innerText = "⏳ جاري النسخ..."

  try {
    const res = await fetch('/developer/backup-now', { method: 'POST', credentials: 'include' })
    const data = await res.json()
    if (res.ok) {
      msg.innerText = "✅ تم النسخ بنجاح — " + new Date().toLocaleTimeString('ar')
      msg.style.color = "#27ae60"
    } else {
      msg.innerText = "❌ فشل النسخ"
      msg.style.color = "#c0392b"
    }
  } catch (err) {
    msg.innerText = "❌ فشل الاتصال"
    msg.style.color = "#c0392b"
  }

  btn.disabled = false
  btn.innerText = "💾 نسخ احتياطي الآن"
  setTimeout(() => { msg.innerText = "" }, 5000)
}

function openSuppliersWindow() {
  window.open("/suppliers.html", "", "width=1100,height=700")
}




/* =========================
تصدير تقرير أسبوعي
========================= */
async function exportWeeklyReport() {
  const res = await fetch('/sales/history', { credentials: 'include' })
  const sales = await res.json()
  const resInvoices = await fetch('/sales/invoices', { credentials: 'include' })
  const allInvoices = await resInvoices.json()
  const resProducts = await fetch('/products', { credentials: 'include' })
  const products = await resProducts.json()

  const now = new Date()
  const weekAgo = new Date()
  weekAgo.setDate(now.getDate() - 7)

  const weekly = sales.filter(s => new Date(s.created_at) >= weekAgo)
  if (weekly.length === 0) { alert("لا توجد مبيعات في هذا الأسبوع"); return }

  let totalRevenue = 0, totalProfit = 0, totalItems = 0
  let productCount = {}, dailyStats = {}

  weekly.forEach(s => {
    totalRevenue += s.total
    totalProfit += s.profit ?? 0
    totalItems += s.quantity
    productCount[s.product] = (productCount[s.product] ?? 0) + s.quantity
    const day = new Date(s.created_at).toLocaleDateString('ar')
    if (!dailyStats[day]) dailyStats[day] = { revenue: 0, profit: 0, items: 0 }
    dailyStats[day].revenue += s.total
    dailyStats[day].profit += s.profit ?? 0
    dailyStats[day].items += s.quantity
  })

  const topProduct = Object.entries(productCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "-"
  const weeklyInvoices = allInvoices.filter(inv => new Date(inv.created_at) >= weekAgo)
  const lowStockNames = products.filter(p => p.stock > 0 && p.stock <= 5).map(p => p.name + " (" + p.stock + ")").join(" | ") || "لا يوجد"
  const outOfStockNames = products.filter(p => p.stock === 0).map(p => p.name).join(" | ") || "لا يوجد"

  const summaryRows = [
    { "الإحصائية": "📋 تقرير أسبوعي", "القيمة": "" },
    { "الإحصائية": "📅 من تاريخ", "القيمة": weekAgo.toLocaleDateString('ar') },
    { "الإحصائية": "📅 إلى تاريخ", "القيمة": now.toLocaleDateString('ar') },
    { "الإحصائية": "🕐 وقت التصدير", "القيمة": now.toLocaleString('ar') },
    { "الإحصائية": "━━━━━━━━━━━━━━━━━━━━", "القيمة": "" },
    { "الإحصائية": "💰 أرباح الأسبوع", "القيمة": totalProfit },
    { "الإحصائية": "🛒 مبيعات الأسبوع", "القيمة": totalRevenue },
    { "الإحصائية": "📦 عدد القطع المباعة", "القيمة": totalItems },
    { "الإحصائية": "🧾 عدد الفواتير", "القيمة": weeklyInvoices.length + " فاتورة — من " + (weeklyInvoices[weeklyInvoices.length - 1]?.invoice_number ?? "-") + " إلى " + (weeklyInvoices[0]?.invoice_number ?? "-") },
    { "الإحصائية": "🔥 الأكثر مبيعًا", "القيمة": topProduct },
    { "الإحصائية": "━━━━━━━━━━━━━━━━━━━━", "القيمة": "" },
    { "الإحصائية": "📦 عدد أصناف المنتجات", "القيمة": products.length },
    { "الإحصائية": "⚠️ منتجات منخفضة المخزون", "القيمة": products.filter(p => p.stock > 0 && p.stock <= 5).length },
    { "الإحصائية": "⚠️ أسماء المنخفضة", "القيمة": lowStockNames },
    { "الإحصائية": "❌ منتجات نفذت من المخزون", "القيمة": products.filter(p => p.stock === 0).length },
    { "الإحصائية": "❌ أسماء النافذة", "القيمة": outOfStockNames },
  ]

  const dailyRows = Object.entries(dailyStats).map(([day, stat]) => ({ "التاريخ": day, "إجمالي المبيعات": stat.revenue, "إجمالي الأرباح": stat.profit, "عدد القطع": stat.items }))
  dailyRows.push({ "التاريخ": "📊 المجموع", "إجمالي المبيعات": totalRevenue, "إجمالي الأرباح": totalProfit, "عدد القطع": totalItems })

  const invoiceRows = weeklyInvoices.map(inv => ({ "رقم الفاتورة": inv.invoice_number, "التاريخ": new Date(inv.created_at).toLocaleDateString('ar'), "اليوم": new Date(inv.created_at).toLocaleDateString('ar', { weekday: 'long' }), "الوقت": new Date(inv.created_at).toLocaleTimeString('ar'), "الإجمالي": inv.total }))
  invoiceRows.push({ "رقم الفاتورة": "📊 المجموع", "التاريخ": "", "اليوم": "", "الوقت": "", "الإجمالي": weeklyInvoices.reduce((a, b) => a + b.total, 0) })

  const rows = weekly.map(s => ({ "رقم الفاتورة": s.invoice_number, "التاريخ": new Date(s.created_at).toLocaleDateString('ar'), "اليوم": new Date(s.created_at).toLocaleDateString('ar', { weekday: 'long' }), "الوقت": new Date(s.created_at).toLocaleTimeString('ar'), "المنتج": s.product, "الكمية": s.quantity, "سعر الشراء": s.cost_price ?? 0, "سعر البيع": s.total, "الربح": s.profit ?? 0 }))
  rows.push({ "رقم الفاتورة": "", "التاريخ": "", "اليوم": "", "الوقت": "", "المنتج": "📊 المجموع", "الكمية": totalItems, "سعر الشراء": "", "سعر البيع": totalRevenue, "الربح": totalProfit })

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), "الملخص")
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dailyRows), "ملخص يومي")
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(invoiceRows), "الفواتير")
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "تفاصيل المبيعات")
  XLSX.writeFile(wb, "تقرير-اسبوعي-" + now.toLocaleDateString('ar') + ".xlsx")
}

/* =========================
تصدير تقرير شهري
========================= */
async function exportMonthlyReport() {
  const res = await fetch('/sales/history', { credentials: 'include' })
  const sales = await res.json()
  const resInvoices = await fetch('/sales/invoices', { credentials: 'include' })
  const allInvoices = await resInvoices.json()
  const resProducts = await fetch('/products', { credentials: 'include' })
  const products = await resProducts.json()

  const now = new Date()
  const monthly = sales.filter(s => { const d = new Date(s.created_at); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() })
  if (monthly.length === 0) { alert("لا توجد مبيعات في هذا الشهر"); return }

  let totalRevenue = 0, totalProfit = 0, totalItems = 0
  let productCount = {}, dailyStats = {}

  monthly.forEach(s => {
    totalRevenue += s.total
    totalProfit += s.profit ?? 0
    totalItems += s.quantity
    productCount[s.product] = (productCount[s.product] ?? 0) + s.quantity
    const day = new Date(s.created_at).toLocaleDateString('ar')
    if (!dailyStats[day]) dailyStats[day] = { revenue: 0, profit: 0, items: 0 }
    dailyStats[day].revenue += s.total
    dailyStats[day].profit += s.profit ?? 0
    dailyStats[day].items += s.quantity
  })

  const topProduct = Object.entries(productCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "-"
  const monthName = now.toLocaleDateString('ar', { month: 'long', year: 'numeric' })
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString('ar')
  const lastDay = now.toLocaleDateString('ar')
  const monthlyInvoices = allInvoices.filter(inv => { const d = new Date(inv.created_at); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() })
  const lowStockNames = products.filter(p => p.stock > 0 && p.stock <= 5).map(p => p.name + " (" + p.stock + ")").join(" | ") || "لا يوجد"
  const outOfStockNames = products.filter(p => p.stock === 0).map(p => p.name).join(" | ") || "لا يوجد"

  const summaryRows = [
    { "الإحصائية": "📋 تقرير شهري", "القيمة": "" },
    { "الإحصائية": "📅 الشهر", "القيمة": monthName },
    { "الإحصائية": "📅 من تاريخ", "القيمة": firstDay },
    { "الإحصائية": "📅 إلى تاريخ", "القيمة": lastDay },
    { "الإحصائية": "🕐 وقت التصدير", "القيمة": now.toLocaleString('ar') },
    { "الإحصائية": "━━━━━━━━━━━━━━━━━━━━", "القيمة": "" },
    { "الإحصائية": "💰 أرباح الشهر", "القيمة": totalProfit },
    { "الإحصائية": "🛒 مبيعات الشهر", "القيمة": totalRevenue },
    { "الإحصائية": "📦 عدد القطع المباعة", "القيمة": totalItems },
    { "الإحصائية": "🧾 عدد الفواتير", "القيمة": monthlyInvoices.length + " فاتورة — من " + (monthlyInvoices[monthlyInvoices.length - 1]?.invoice_number ?? "-") + " إلى " + (monthlyInvoices[0]?.invoice_number ?? "-") },
    { "الإحصائية": "🔥 الأكثر مبيعًا", "القيمة": topProduct },
    { "الإحصائية": "━━━━━━━━━━━━━━━━━━━━", "القيمة": "" },
    { "الإحصائية": "📦 عدد أصناف المنتجات", "القيمة": products.length },
    { "الإحصائية": "⚠️ منتجات منخفضة المخزون", "القيمة": products.filter(p => p.stock > 0 && p.stock <= 5).length },
    { "الإحصائية": "⚠️ أسماء المنخفضة", "القيمة": lowStockNames },
    { "الإحصائية": "❌ منتجات نفذت من المخزون", "القيمة": products.filter(p => p.stock === 0).length },
    { "الإحصائية": "❌ أسماء النافذة", "القيمة": outOfStockNames },
  ]

  const dailyRows = Object.entries(dailyStats).map(([day, stat]) => ({ "التاريخ": day, "إجمالي المبيعات": stat.revenue, "إجمالي الأرباح": stat.profit, "عدد القطع": stat.items }))
  dailyRows.push({ "التاريخ": "📊 المجموع", "إجمالي المبيعات": totalRevenue, "إجمالي الأرباح": totalProfit, "عدد القطع": totalItems })

  const invoiceRows = monthlyInvoices.map(inv => ({ "رقم الفاتورة": inv.invoice_number, "التاريخ": new Date(inv.created_at).toLocaleDateString('ar'), "اليوم": new Date(inv.created_at).toLocaleDateString('ar', { weekday: 'long' }), "الوقت": new Date(inv.created_at).toLocaleTimeString('ar'), "الإجمالي": inv.total }))
  invoiceRows.push({ "رقم الفاتورة": "📊 المجموع", "التاريخ": "", "اليوم": "", "الوقت": "", "الإجمالي": monthlyInvoices.reduce((a, b) => a + b.total, 0) })

  const rows = monthly.map(s => ({ "رقم الفاتورة": s.invoice_number, "التاريخ": new Date(s.created_at).toLocaleDateString('ar'), "اليوم": new Date(s.created_at).toLocaleDateString('ar', { weekday: 'long' }), "الوقت": new Date(s.created_at).toLocaleTimeString('ar'), "المنتج": s.product, "الكمية": s.quantity, "سعر الشراء": s.cost_price ?? 0, "سعر البيع": s.total, "الربح": s.profit ?? 0 }))
  rows.push({ "رقم الفاتورة": "", "التاريخ": "", "اليوم": "", "الوقت": "", "المنتج": "📊 المجموع", "الكمية": totalItems, "سعر الشراء": "", "سعر البيع": totalRevenue, "الربح": totalProfit })

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), "الملخص")
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dailyRows), "ملخص يومي")
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(invoiceRows), "الفواتير")
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "تفاصيل المبيعات")
  XLSX.writeFile(wb, "تقرير-شهري-" + monthName + ".xlsx")
}

/* =========================
تصدير تقرير شامل
========================= */
async function exportFullReport() {
  const resInvoices = await fetch('/sales/invoices', { credentials: 'include' })
  const invoices = await resInvoices.json()
  const resProducts = await fetch('/products', { credentials: 'include' })
  const products = await resProducts.json()
  const resSales = await fetch('/sales/history', { credentials: 'include' })
  const sales = await resSales.json()

  let totalRevenue = 0, totalProfit = 0, totalItems = 0
  let productStats = {}, monthlyStats = {}

  sales.forEach(s => {
    totalRevenue += s.total
    totalProfit += s.profit ?? 0
    totalItems += s.quantity
    if (!productStats[s.product]) productStats[s.product] = { qty: 0, revenue: 0, profit: 0 }
    productStats[s.product].qty += s.quantity
    productStats[s.product].revenue += s.total
    productStats[s.product].profit += s.profit ?? 0
    const date = new Date(s.created_at)
    const monthKey = date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, '0')
    const monthLabel = date.toLocaleDateString('ar', { month: 'long', year: 'numeric' })
    if (!monthlyStats[monthKey]) monthlyStats[monthKey] = { label: monthLabel, revenue: 0, profit: 0, items: 0, invoices: new Set(), dailyStats: {} }
    monthlyStats[monthKey].revenue += s.total
    monthlyStats[monthKey].profit += s.profit ?? 0
    monthlyStats[monthKey].items += s.quantity
    if (s.invoice_number) monthlyStats[monthKey].invoices.add(s.invoice_number)
    const dayKey = date.toLocaleDateString('ar')
    if (!monthlyStats[monthKey].dailyStats[dayKey]) monthlyStats[monthKey].dailyStats[dayKey] = { revenue: 0, profit: 0, items: 0 }
    monthlyStats[monthKey].dailyStats[dayKey].revenue += s.total
    monthlyStats[monthKey].dailyStats[dayKey].profit += s.profit ?? 0
    monthlyStats[monthKey].dailyStats[dayKey].items += s.quantity
  })

  const topProduct = Object.entries(productStats).sort((a, b) => b[1].qty - a[1].qty)[0]?.[0] ?? "-"
  const firstSaleDate = sales.length > 0 ? new Date(Math.min(...sales.map(s => new Date(s.created_at)))).toLocaleDateString('ar') : "-"
  const lowStockNames = products.filter(p => p.stock > 0 && p.stock <= 5).map(p => p.name + " (" + p.stock + ")").join(" | ") || "لا يوجد"
  const outOfStockNames = products.filter(p => p.stock === 0).map(p => p.name).join(" | ") || "لا يوجد"

  const summaryRows = [
    { "الإحصائية": "📋 تقرير شامل للمحل", "القيمة": "" },
    { "الإحصائية": "📅 من تاريخ", "القيمة": firstSaleDate },
    { "الإحصائية": "📅 إلى تاريخ", "القيمة": new Date().toLocaleDateString('ar') },
    { "الإحصائية": "🕐 وقت التصدير", "القيمة": new Date().toLocaleString('ar') },
    { "الإحصائية": "━━━━━━━━━━━━━━━━━━━━", "القيمة": "" },
    { "الإحصائية": "💰 إجمالي الأرباح الكلية", "القيمة": totalProfit },
    { "الإحصائية": "🛒 إجمالي المبيعات الكلية", "القيمة": totalRevenue },
    { "الإحصائية": "📦 إجمالي القطع المباعة", "القيمة": totalItems },
    { "الإحصائية": "🧾 عدد الفواتير الكلي", "القيمة": invoices.length + " فاتورة — من " + (invoices[invoices.length - 1]?.invoice_number ?? "-") + " إلى " + (invoices[0]?.invoice_number ?? "-") },
    { "الإحصائية": "🔥 الأكثر مبيعًا", "القيمة": topProduct },
    { "الإحصائية": "━━━━━━━━━━━━━━━━━━━━", "القيمة": "" },
    { "الإحصائية": "📦 عدد أصناف المنتجات", "القيمة": products.length },
    { "الإحصائية": "⚠️ منتجات منخفضة المخزون", "القيمة": products.filter(p => p.stock > 0 && p.stock <= 5).length },
    { "الإحصائية": "⚠️ أسماء المنخفضة", "القيمة": lowStockNames },
    { "الإحصائية": "❌ منتجات نفذت من المخزون", "القيمة": products.filter(p => p.stock === 0).length },
    { "الإحصائية": "❌ أسماء النافذة", "القيمة": outOfStockNames },
  ]

  const allMonthsRows = []
  Object.keys(monthlyStats).sort().forEach(monthKey => {
    const m = monthlyStats[monthKey]
    allMonthsRows.push({ "": "📅 " + m.label, "إجمالي المبيعات": "", "إجمالي الأرباح": "", "عدد القطع": "", "عدد الفواتير": "" })
    Object.entries(m.dailyStats).forEach(([day, stat]) => {
      allMonthsRows.push({ "": "      " + day, "إجمالي المبيعات": stat.revenue, "إجمالي الأرباح": stat.profit, "عدد القطع": stat.items, "عدد الفواتير": "" })
    })
    allMonthsRows.push({ "": "📊 مجموع " + m.label, "إجمالي المبيعات": m.revenue, "إجمالي الأرباح": m.profit, "عدد القطع": m.items, "عدد الفواتير": m.invoices.size })
    allMonthsRows.push({ "": "━━━━━━━━━━━━━━━━━━━━", "إجمالي المبيعات": "", "إجمالي الأرباح": "", "عدد القطع": "", "عدد الفواتير": "" })
  })
  allMonthsRows.push({ "": "💰 المجموع الكلي", "إجمالي المبيعات": totalRevenue, "إجمالي الأرباح": totalProfit, "عدد القطع": totalItems, "عدد الفواتير": invoices.length })

  const inventoryRows = products.map(p => ({ "المنتج": p.name, "التصنيف": p.category, "سعر الشراء": p.cost_price ?? 0, "سعر البيع": p.price, "المخزون الحالي": p.stock, "قيمة المخزون (شراء)": (p.cost_price ?? 0) * p.stock, "قيمة المخزون (بيع)": p.price * p.stock, "الحالة": p.stock === 0 ? "❌ نفذ" : p.stock <= 5 ? "⚠️ منخفض" : "✅ متوفر" }))
  inventoryRows.push({ "المنتج": "📊 المجموع", "التصنيف": "", "سعر الشراء": "", "سعر البيع": "", "المخزون الحالي": products.reduce((a, p) => a + p.stock, 0), "قيمة المخزون (شراء)": products.reduce((a, p) => a + (p.cost_price ?? 0) * p.stock, 0), "قيمة المخزون (بيع)": products.reduce((a, p) => a + p.price * p.stock, 0), "الحالة": "" })

  const productSalesRows = Object.entries(productStats).sort((a, b) => b[1].revenue - a[1].revenue).map(([name, stat]) => ({ "المنتج": name, "الكمية المباعة": stat.qty, "إجمالي المبيعات": stat.revenue, "إجمالي الأرباح": stat.profit }))
  productSalesRows.push({ "المنتج": "📊 المجموع", "الكمية المباعة": totalItems, "إجمالي المبيعات": totalRevenue, "إجمالي الأرباح": totalProfit })

  const invoiceDetailsRows = invoices.map(inv => ({ "رقم الفاتورة": inv.invoice_number, "التاريخ": new Date(inv.created_at).toLocaleDateString('ar'), "اليوم": new Date(inv.created_at).toLocaleDateString('ar', { weekday: 'long' }), "الوقت": new Date(inv.created_at).toLocaleTimeString('ar'), "الإجمالي": inv.total }))
  invoiceDetailsRows.push({ "رقم الفاتورة": "📊 المجموع", "التاريخ": "", "اليوم": "", "الوقت": "", "الإجمالي": invoices.reduce((a, b) => a + b.total, 0) })

  const salesRows = sales.map(s => ({ "التاريخ": new Date(s.created_at).toLocaleDateString('ar'), "اليوم": new Date(s.created_at).toLocaleDateString('ar', { weekday: 'long' }), "الوقت": new Date(s.created_at).toLocaleTimeString('ar'), "رقم الفاتورة": s.invoice_number, "المنتج": s.product, "الكمية": s.quantity, "سعر الشراء": s.cost_price ?? 0, "سعر البيع": s.total, "الربح": s.profit ?? 0 }))
  salesRows.push({ "التاريخ": "", "اليوم": "", "الوقت": "", "رقم الفاتورة": "", "المنتج": "📊 المجموع الكلي", "الكمية": totalItems, "سعر الشراء": "", "سعر البيع": totalRevenue, "الربح": totalProfit })

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), "ملخص عام")
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(allMonthsRows), "تقرير الشهور")
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(inventoryRows), "جرد المخزون")
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(productSalesRows), "مبيعات المنتجات")
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(invoiceDetailsRows), "الفواتير")
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(salesRows), "سجل المبيعات")
  XLSX.writeFile(wb, "تقرير-شامل-" + new Date().toLocaleDateString('ar') + ".xlsx")
}

/* =========================
تشغيل الصفحة
========================= */
window.addEventListener("message", function (e) {
  if (!e.data) return
  if (e.data.type === "editProduct") editProduct(e.data.id)
})

async function checkLowStockAlert() {
  const res = await fetch('/products/low-stock', { credentials: 'include' })
  const data = await res.json()
  const outOfStock = data.filter(p => p.stock === 0)
  const lowStock = data.filter(p => p.stock > 0 && p.stock <= 5)

  if (outOfStock.length > 0) {
    showStockAlert('❌ منتجات نفذت من المخزون: ' + outOfStock.map(p => p.name).join(' | '), 'danger')
  } else if (lowStock.length > 0) {
    showStockAlert('⚠️ منتجات منخفضة المخزون: ' + lowStock.map(p => p.name + ' (' + p.stock + ')').join(' | '), 'warning')
  }
}

function showStockAlert(msg, type) {
  const colors = { danger: { bg: '#c0392b', text: '#fff' }, warning: { bg: '#e67e22', text: '#fff' } }
  const div = document.createElement('div')
  div.style.cssText = `position:fixed;top:70px;left:50%;transform:translateX(-50%);background:${colors[type].bg};color:${colors[type].text};padding:12px 24px;border-radius:8px;z-index:9999;font-weight:bold;font-size:14px;box-shadow:0 4px 20px rgba(0,0,0,0.2);max-width:80%;text-align:center;`
  div.innerText = msg
  document.body.appendChild(div)
  setTimeout(() => div.remove(), 8000)
}

window.onload = async () => {
  await getUser()
  await loadProducts()

  loadTodayProfit()
  loadTodayStats()
  loadMonthProfit()

  if (userRole === "admin" || userRole === "cashier") {
    loadSalesHistory()
    loadInvoices()
    checkLowStockAlert()
  }

  if (userRole === "admin") {
    setInterval(() => {
      loadSalesHistory(); loadInvoices()
      loadTodayProfit(); loadTodayStats(); loadMonthProfit()
    }, 30000)
  }

  if (userRole === "cashier") {
    setInterval(() => {
      loadTodayProfit(); loadTodayStats(); loadMonthProfit()
      loadSalesHistory(); loadInvoices()
    }, 30000)
  }
}

async function printDailyReport() {
  const today = new Date().toISOString().slice(0, 10)

  const resStats = await fetch('/sales/today', { credentials: 'include' })
  const stats = await resStats.json()

  const resProfit = await fetch('/profits/today', { credentials: 'include' })
  const profit = await resProfit.json()

  const resHistory = await fetch('/sales/history', { credentials: 'include' })
  const allSales = await resHistory.json()

  const todaySales = allSales.filter(s => s.created_at.slice(0, 10) === today)

  const resInvoices = await fetch('/sales/invoices', { credentials: 'include' })
  const allInvoices = await resInvoices.json()
  const todayInvoices = allInvoices.filter(inv => inv.created_at.slice(0, 10) === today)

  const date = new Date().toLocaleDateString('ar', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  let salesRows = ''
  todaySales.forEach(s => {
    salesRows += `<tr><td>${s.product}</td><td>${s.quantity}</td><td>${s.total}</td></tr>`
  })

  const html = `
    <html dir="rtl">
    <head>
      <title>تقرير اليوم</title>
      <style>
        body { font-family:tahoma; width:80mm; margin:0; padding:5px; font-size:12px; }
        .header { text-align:center; border-bottom:2px dashed #000; padding-bottom:6px; margin-bottom:6px; }
        .shop-name { font-size:16px; font-weight:bold; }
        .shop-info { font-size:10px; color:#555; }
        h2 { text-align:center; font-size:13px; margin:6px 0; }
        table { width:100%; border-collapse:collapse; font-size:11px; }
        th,td { border-bottom:1px dashed #ccc; padding:3px; text-align:center; }
        .summary { margin:8px 0; font-size:12px; }
        .summary tr td:first-child { text-align:right; }
        .summary tr td:last-child { text-align:left; font-weight:bold; }
        .total-line { border-top:2px dashed #000; margin-top:6px; padding-top:6px; text-align:center; font-size:14px; font-weight:bold; }
        .footer { text-align:center; font-size:10px; color:#777; margin-top:8px; border-top:1px dashed #000; padding-top:4px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="shop-name">🧾 Smart POS System</div>
      </div>

      <h2>📊 تقرير اليوم</h2>
      <p style="text-align:center;font-size:11px;">${date}</p>

      <table class="summary">
        <tr><td>💰 إجمالي المبيعات</td><td>${stats.totalRevenue} ر.ق</td></tr>
        <tr><td>📈 إجمالي الأرباح</td><td>${profit.profit} ر.ق</td></tr>
        <tr><td>📦 عدد القطع</td><td>${stats.totalItems}</td></tr>
        <tr><td>🧾 عدد الفواتير</td><td>${todayInvoices.length}</td></tr>
        <tr><td>🔥 الأكثر مبيعاً</td><td>${stats.topProduct}</td></tr>
      </table>

      <hr style="border:1px dashed #000;margin:6px 0;">
      <h2 style="font-size:12px;">تفاصيل المبيعات</h2>
      <table>
        <tr><th>المنتج</th><th>الكمية</th><th>المبلغ</th></tr>
        ${salesRows || '<tr><td colspan="3">لا توجد مبيعات</td></tr>'}
      </table>

      <div class="total-line">الإجمالي: ${stats.totalRevenue} ر.ق</div>
      <div class="footer">
        ${new Date().toLocaleTimeString('ar')} — ${new Date().toLocaleDateString('ar')}<br>
        شكراً لزيارتكم
      </div>
    </body>
    </html>
  `

  const win = window.open("", "", "width=400,height=600")
  win.document.write(html)
  win.document.close()
  setTimeout(() => win.print(), 500)
}
