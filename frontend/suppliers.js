let suppliers = []
let products = []
let selectedSupplierId = null
let draftItems = []
let lastPurchases = []
let allPurchasesMode = false
let allPurchasesPage = 1
const ALL_PURCHASES_LIMIT = 50

function money(x) {
  const n = Number(x || 0)
  return n % 1 === 0 ? String(n) : n.toFixed(2)
}

const PRINT_STYLE = `
  body { font-family:tahoma; width:80mm; margin:0; padding:6px; }
  .header { text-align:center; border-bottom:2px dashed #000; padding-bottom:8px; margin-bottom:8px; }
  .title { font-size:16px; font-weight:bold; margin:0; }
  .sub { font-size:11px; color:#555; margin:2px 0; }
  h2 { text-align:center; font-size:13px; margin:8px 0; }
  table { width:100%; border-collapse:collapse; font-size:12px; }
  th,td { border-bottom:1px dashed #000; padding:4px; text-align:center; }
  .tot { text-align:center; font-size:14px; font-weight:bold; margin-top:10px; }
  .footer { text-align:center; font-size:10px; color:#777; margin-top:10px; border-top:1px dashed #000; padding-top:6px; }
`

function clearPurchasesPaginationUi() {
  const info = document.getElementById('allPurchasesPageInfo')
  if (info) info.innerText = ''
}

async function fetchJson(url, options) {
  const res = await fetch(url, { credentials: 'include', ...(options || {}) })
  let data = null
  try { data = await res.json() } catch { /* ignore */ }
  if (!res.ok) {
    const msg = data?.message || data?.error || `HTTP ${res.status}`
    throw new Error(msg)
  }
  return data
}

async function ensureSession() {
  const data = await fetchJson('/me')
  if (!data.session) {
    location.href = '/login.html'
    return false
  }
  const role = data.session.role
  if (!['admin', 'cashier', 'developer'].includes(role)) {
    document.body.innerHTML = '<div style="font-family:tahoma;padding:20px">غير مصرح</div>'
    return false
  }
  return true
}

function setMsg(id, text, ok) {
  const el = document.getElementById(id)
  if (!el) return
  el.style.color = ok ? '#27ae60' : '#c0392b'
  el.innerText = text || ''
}

function renderSuppliers() {
  const topSel = document.getElementById('supplierSelect')
  const purchaseSel = document.getElementById('purchaseSupplierSelect')
  const sels = [topSel, purchaseSel].filter(Boolean)
  sels.forEach(s => { s.innerHTML = '' })

  suppliers.forEach(sp => {
    sels.forEach(s => {
      const opt = document.createElement('option')
      opt.value = String(sp.id)
      opt.textContent = sp.name
      s.appendChild(opt)
    })
  })

  if (suppliers.length > 0) {
    if (!selectedSupplierId) selectedSupplierId = suppliers[0].id
    sels.forEach(s => { s.value = String(selectedSupplierId) })
  } else {
    selectedSupplierId = null
    sels.forEach(s => {
      const opt = document.createElement('option')
      opt.value = ''
      opt.textContent = 'لا يوجد موردين'
      s.appendChild(opt)
      s.value = ''
    })
  }
}

function renderProducts() {
  const sel = document.getElementById('productSelect')
  sel.innerHTML = ''
  products.forEach(p => {
    const opt = document.createElement('option')
    opt.value = String(p.id)
    opt.textContent = `${p.name} (المخزون: ${p.stock})`
    sel.appendChild(opt)
  })
  if (products.length === 0) {
    const opt = document.createElement('option')
    opt.value = ''
    opt.textContent = 'لا يوجد منتجات'
    sel.appendChild(opt)
  }
}

function calcDraftTotal() {
  return draftItems.reduce((sum, it) => sum + (it.quantity * it.unit_cost), 0)
}

function printDraftPurchase() {
  if (!selectedSupplierId) { alert('اختر مورد أولاً'); return }
  if (!draftItems || draftItems.length === 0) { alert('لا توجد بنود للطباعة'); return }

  const supplierName = suppliers.find(s => s.id === selectedSupplierId)?.name || 'مورد'
  const invoiceNo = (document.getElementById('purchaseInvoiceNo')?.value || '').trim()
  const invoiceDate = (document.getElementById('purchaseInvoiceDate')?.value || '').trim()
  const notes = (document.getElementById('purchaseNotes')?.value || '').trim()

  let total = 0
  const rows = draftItems.map(it => {
    const line = it.quantity * it.unit_cost
    total += line
    return `<tr><td>${it.product_name}</td><td>${it.quantity}</td><td>${money(it.unit_cost)}</td><td>${money(line)}</td></tr>`
  }).join('')

  const meta = `
    <div class="sub">المورد: ${supplierName}</div>
    ${invoiceNo ? `<div class="sub">رقم الفاتورة: ${invoiceNo}</div>` : ''}
    ${invoiceDate ? `<div class="sub">تاريخ الفاتورة: ${invoiceDate}</div>` : ''}
    <div class="sub">التاريخ: ${new Date().toLocaleString('ar')}</div>
    ${notes ? `<div class="sub">ملاحظات: ${notes}</div>` : ''}
  `

  const html = `
    <html dir="rtl">
      <head><title>فاتورة مورد</title><style>${PRINT_STYLE}</style></head>
      <body>
        <div class="header">
          <p class="title">فاتورة مورد</p>
          ${meta}
        </div>
        <table>
          <tr><th>المنتج</th><th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th></tr>
          ${rows}
        </table>
        <div class="tot">الإجمالي: ${money(total)}</div>
        <div class="footer">تمت الطباعة — حسابات الموردين</div>
        <div style="text-align:center;margin-top:10px;">
          <button onclick="window.print()" style="padding:6px 12px;border:none;border-radius:8px;background:#2980b9;color:#fff;font-family:tahoma;cursor:pointer">طباعة</button>
        </div>
      </body>
    </html>
  `

  const win = window.open('', '', 'width=450,height=700')
  win.document.write(html)
  win.document.close()
}

function renderDraftItems() {
  const body = document.getElementById('draftItemsBody')
  body.innerHTML = ''
  draftItems.forEach((it, idx) => {
    const tr = document.createElement('tr')
    tr.innerHTML = `
      <td>${it.product_name}</td>
      <td>${it.quantity}</td>
      <td>${money(it.unit_cost)}</td>
      <td>${money(it.quantity * it.unit_cost)}</td>
      <td><button type="button" style="background:#c0392b;color:#fff;border:none;border-radius:6px;padding:4px 10px;cursor:pointer" onclick="removeDraftItem(${idx})">حذف</button></td>
    `
    body.appendChild(tr)
  })
  document.getElementById('draftTotal').innerText = money(calcDraftTotal())
}

function removeDraftItem(idx) {
  draftItems.splice(idx, 1)
  renderDraftItems()
}

function clearDraft() {
  draftItems = []
  renderDraftItems()
  setMsg('purchaseMsg', '', true)
}

function onSupplierChange() {
  const sel = document.getElementById('supplierSelect')
  selectedSupplierId = sel.value ? parseInt(sel.value, 10) : null
  const purchaseSel = document.getElementById('purchaseSupplierSelect')
  if (purchaseSel) purchaseSel.value = sel.value
  refreshSupplier()
}

function onPurchaseSupplierChange() {
  const sel = document.getElementById('purchaseSupplierSelect')
  selectedSupplierId = sel.value ? parseInt(sel.value, 10) : null
  const topSel = document.getElementById('supplierSelect')
  if (topSel) topSel.value = sel.value
  refreshSupplier()
}

async function loadSuppliers() {
  suppliers = await fetchJson('/suppliers')
  renderSuppliers()
}

async function loadProducts() {
  products = await fetchJson('/products')
  renderProducts()
}

async function loadSummary() {
  if (!selectedSupplierId) return
  const s = await fetchJson(`/suppliers/${selectedSupplierId}/summary`)
  document.getElementById('sumPurchases').innerText = money(s.totalPurchases)
  document.getElementById('sumPaid').innerText = money(s.totalPaid)
  document.getElementById('sumRemaining').innerText = money(s.remaining)
  const remEl = document.getElementById('payRemaining')
  if (remEl) remEl.value = money(s.remaining)
}

async function loadPurchases() {
  allPurchasesMode = false
  clearPurchasesPaginationUi()
  if (!selectedSupplierId) {
    document.getElementById('purchasesBody').innerHTML = ''
    const paySel = document.getElementById('payPurchaseSelect')
    if (paySel) paySel.innerHTML = ''
    return
  }
  const rows = await fetchJson(`/suppliers/${selectedSupplierId}/purchases`)
  lastPurchases = rows || []
  const body = document.getElementById('purchasesBody')
  body.innerHTML = ''
  if (!rows || rows.length === 0) {
    body.innerHTML = `<tr><td colspan="5">لا توجد فواتير</td></tr>`
    return
  }
  rows.forEach(p => {
    const date = p.invoice_date || (p.created_at ? new Date(p.created_at).toLocaleDateString('ar') : '')
    const tr = document.createElement('tr')
    tr.innerHTML = `
      <td>${suppliers.find(s => s.id === p.supplier_id)?.name || ''}</td>
      <td>${p.invoice_number || p.id}</td>
      <td>${date}</td>
      <td>${money(p.total)}</td>
      <td><button type="button" class="btnPrimary" style="padding:6px 10px;border-radius:8px" onclick="viewPurchase(${p.id})">عرض</button></td>
    `
    body.appendChild(tr)
  })

  renderPayPurchaseSelect()
}

async function loadAllPurchases(page) {
  try {
    allPurchasesMode = true
    allPurchasesPage = page || 1
    const q = (document.getElementById('allPurchasesSearch')?.value || '').trim()
    const data = await fetchJson(`/suppliers/purchases?page=${allPurchasesPage}&limit=${ALL_PURCHASES_LIMIT}&q=${encodeURIComponent(q)}`)
    const rows = data.rows || []
    const body = document.getElementById('purchasesBody')
    body.innerHTML = ''
    if (!rows || rows.length === 0) {
      body.innerHTML = `<tr><td colspan="5">لا توجد فواتير</td></tr>`
      const info = document.getElementById('allPurchasesPageInfo')
      if (info) info.innerText = ''
      return
    }
    rows.forEach(p => {
      const date = p.invoice_date || (p.created_at ? new Date(p.created_at).toLocaleDateString('ar') : '')
      const tr = document.createElement('tr')
      tr.innerHTML = `
        <td>${p.supplier_name || ''}</td>
        <td>${p.invoice_number || p.id}</td>
        <td>${date}</td>
        <td>${money(p.total)}</td>
        <td><button type="button" class="btnPrimary" style="padding:6px 10px;border-radius:8px" onclick="viewPurchase(${p.id})">عرض</button></td>
      `
      body.appendChild(tr)
    })
    const totalPages = Math.max(Math.ceil((data.totalCount || 0) / ALL_PURCHASES_LIMIT), 1)
    const info = document.getElementById('allPurchasesPageInfo')
    if (info) info.innerText = `صفحة ${data.page} من ${totalPages} — إجمالي ${data.totalCount} فاتورة`
    setMsg('purchasesMsg', 'تم عرض كل فواتير الموردين', true)
  } catch (e) {
    setMsg('purchasesMsg', e.message, false)
  }
}

function searchAllPurchases() {
  if (!allPurchasesMode) return
  loadAllPurchases(1)
}

function prevAllPurchasesPage() {
  if (!allPurchasesMode) return
  if (allPurchasesPage <= 1) return
  loadAllPurchases(allPurchasesPage - 1)
}

function nextAllPurchasesPage() {
  if (!allPurchasesMode) return
  loadAllPurchases(allPurchasesPage + 1)
}

function renderPayPurchaseSelect() {
  const sel = document.getElementById('payPurchaseSelect')
  if (!sel) return
  sel.innerHTML = ''
  const opt0 = document.createElement('option')
  opt0.value = ''
  opt0.textContent = '(على الحساب)'
  sel.appendChild(opt0)
  lastPurchases.forEach(p => {
    const opt = document.createElement('option')
    opt.value = String(p.id)
    opt.textContent = `فاتورة ${p.invoice_number || p.id} — ${money(p.total)}`
    sel.appendChild(opt)
  })
  sel.value = ''
}

async function loadPayments() {
  const body = document.getElementById('paymentsBody')
  if (!body) return
  body.innerHTML = ''
  if (!selectedSupplierId) return
  const rows = await fetchJson(`/suppliers/${selectedSupplierId}/payments`)
  if (!rows || rows.length === 0) {
    body.innerHTML = `<tr><td colspan="4">لا توجد دفعات</td></tr>`
    return
  }
  rows.forEach(r => {
    const inv = r.invoice_number || r.purchase_id || '(على الحساب)'
    const dt = r.paid_at || r.created_at || ''
    const tr = document.createElement('tr')
    tr.innerHTML = `
      <td>${r.supplier_name}</td>
      <td>${inv}</td>
      <td>${money(r.amount)}</td>
      <td>${dt ? new Date(dt).toLocaleString('ar') : ''}</td>
    `
    body.appendChild(tr)
  })
}

async function viewPurchase(purchaseId) {
  try {
    const data = await fetchJson(`/suppliers/purchases/${purchaseId}`)
    document.getElementById('purchaseDetailsTitle').innerText =
      `فاتورة: ${data.purchase.invoice_number || data.purchase.id} — الإجمالي: ${money(data.purchase.total)}`

    const body = document.getElementById('purchaseDetailsBody')
    body.innerHTML = ''
    data.items.forEach(it => {
      const tr = document.createElement('tr')
      tr.innerHTML = `
        <td>${it.product_name}</td>
        <td>${it.quantity}</td>
        <td>${money(it.unit_cost)}</td>
        <td>${money(it.total)}</td>
      `
      body.appendChild(tr)
    })
  } catch (e) {
    document.getElementById('purchaseDetailsTitle').innerText = e.message
    document.getElementById('purchaseDetailsBody').innerHTML = ''
  }
}

async function createSupplier() {
  const name = (document.getElementById('newSupplierName').value || '').trim()
  const phone = (document.getElementById('newSupplierPhone').value || '').trim()
  const address = (document.getElementById('newSupplierAddress').value || '').trim()
  if (!name) { setMsg('supplierMsg', 'أدخل اسم المورد', false); return }

  try {
    await fetchJson('/suppliers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, address })
    })
    setMsg('supplierMsg', 'تمت إضافة المورد', true)
    document.getElementById('newSupplierName').value = ''
    document.getElementById('newSupplierPhone').value = ''
    document.getElementById('newSupplierAddress').value = ''
    await loadSuppliers()
    if (suppliers.length > 0) selectedSupplierId = suppliers[suppliers.length - 1].id
    renderSuppliers()
    await refreshSupplier()
  } catch (e) {
    setMsg('supplierMsg', e.message, false)
  }
}

function addItemToDraft() {
  const pid = parseInt(document.getElementById('productSelect').value, 10)
  const qty = parseInt(document.getElementById('itemQty').value, 10)
  const unitCost = parseFloat(document.getElementById('itemUnitCost').value)
  if (!pid || !qty || qty < 1 || !Number.isFinite(unitCost) || unitCost < 0) {
    setMsg('purchaseMsg', 'أدخل منتج + كمية + سعر شراء صحيح', false)
    return
  }
  const p = products.find(x => x.id === pid)
  draftItems.push({ product_id: pid, product_name: p ? p.name : String(pid), quantity: qty, unit_cost: unitCost })
  document.getElementById('itemQty').value = ''
  document.getElementById('itemUnitCost').value = ''
  setMsg('purchaseMsg', '', true)
  renderDraftItems()
}

async function savePurchase() {
  if (!selectedSupplierId) { setMsg('purchaseMsg', 'اختر مورد أولاً', false); return }
  if (draftItems.length === 0) { setMsg('purchaseMsg', 'أضف بنود الفاتورة أولاً', false); return }

  const invoice_number = (document.getElementById('purchaseInvoiceNo').value || '').trim()
  const invoice_date = (document.getElementById('purchaseInvoiceDate').value || '').trim()
  const notes = (document.getElementById('purchaseNotes').value || '').trim()

  try {
    await fetchJson('/suppliers/purchases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplier_id: selectedSupplierId,
        invoice_number,
        invoice_date,
        notes,
        items: draftItems.map(it => ({ product_id: it.product_id, quantity: it.quantity, unit_cost: it.unit_cost }))
      })
    })
    setMsg('purchaseMsg', 'تم حفظ الفاتورة وزيادة المخزون', true)
    clearDraft()
    document.getElementById('purchaseInvoiceNo').value = ''
    document.getElementById('purchaseInvoiceDate').value = ''
    document.getElementById('purchaseNotes').value = ''
    await loadProducts()
    await refreshSupplier()

    // تحديث نافذة التطبيق الرئيسية (إن كانت مفتوحة) لإظهار زيادة المخزون فوراً
    if (window.opener && typeof window.opener.loadProducts === 'function') {
      try { window.opener.loadProducts() } catch { /* ignore */ }
    }
  } catch (e) {
    setMsg('purchaseMsg', e.message, false)
  }
}

async function createPayment() {
  if (!selectedSupplierId) { setMsg('paymentMsg', 'اختر مورد أولاً', false); return }
  const purchaseIdRaw = (document.getElementById('payPurchaseSelect')?.value || '').trim()
  const purchase_id = purchaseIdRaw ? parseInt(purchaseIdRaw, 10) : null
  const amount = parseFloat(document.getElementById('payAmount').value)
  const method = (document.getElementById('payMethod').value || '').trim()
  const notes = (document.getElementById('payNotes').value || '').trim()
  if (!Number.isFinite(amount) || amount <= 0) { setMsg('paymentMsg', 'أدخل مبلغ صحيح', false); return }

  try {
    await fetchJson('/suppliers/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ supplier_id: selectedSupplierId, purchase_id, amount, method, notes })
    })
    setMsg('paymentMsg', 'تم تسجيل الدفعة', true)
    document.getElementById('payAmount').value = ''
    document.getElementById('payMethod').value = ''
    document.getElementById('payNotes').value = ''
    if (document.getElementById('payPurchaseSelect')) document.getElementById('payPurchaseSelect').value = ''
    await refreshSupplier()
  } catch (e) {
    setMsg('paymentMsg', e.message, false)
  }
}

async function refreshSupplier() {
  try {
    await loadSummary()
    await loadPurchases()
    await loadPayments()
  } catch (e) {
    setMsg('purchasesMsg', e.message, false)
  }
}

async function refreshAll() {
  await loadSuppliers()
  await loadProducts()
  await refreshSupplier()
}

async function exportSuppliersReport() {
  try {
    const data = await fetchJson('/suppliers/export-data')
    const now = new Date()
    const summaryRows = (data.suppliers || []).map(s => ({
      "المورد": s.name,
      "الهاتف": s.phone || '',
      "العنوان": s.address || '',
      "إجمالي المشتريات": s.totalPurchases,
      "إجمالي المدفوع": s.totalPaid,
      "المتبقي": s.remaining
    }))

    const purchaseRows = (data.purchases || []).map(p => ({
      "رقم": p.invoice_number || p.id,
      "المورد": (data.suppliers || []).find(s => s.id === p.supplier_id)?.name || '',
      "تاريخ الفاتورة": p.invoice_date || p.created_at || '',
      "الإجمالي": p.total,
      "ملاحظات": p.notes || '',
      "تاريخ الإدخال": p.created_at
    }))

    const itemsRows = (data.items || []).map(i => ({
      "شراءID": i.purchase_id,
      "المنتج": i.product_name || i.product_id,
      "الكمية": i.quantity,
      "سعر الوحدة": i.unit_cost,
      "الإجمالي": i.total
    }))

    const paymentsRows = (data.payments || []).map(p => ({
      "المورد": (data.suppliers || []).find(s => s.id === p.supplier_id)?.name || '',
      "شراءID": p.purchase_id || '',
      "المبلغ": p.amount,
      "الطريقة": p.method || '',
      "ملاحظات": p.notes || '',
      "تاريخ الدفع": p.paid_at || p.created_at || '',
      "تاريخ الإدخال": p.created_at || ''
    }))

    const wb = XLSX.utils.book_new()
    const metaRows = [{ "تاريخ التقرير": now.toLocaleDateString('ar'), "وقت التقرير": now.toLocaleTimeString('ar') }]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(metaRows), "بيانات التقرير")
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), "ملخص الموردين")
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(purchaseRows), "فواتير الموردين")
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(itemsRows), "بنود الفواتير")
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(paymentsRows), "الدفعات")
    XLSX.writeFile(wb, `حسابات-الموردين-${now.toLocaleDateString('ar')}.xlsx`)
  } catch (e) {
    alert(e.message || 'فشل التصدير')
  }
}

window.onload = async () => {
  const ok = await ensureSession()
  if (!ok) return
  await refreshAll()
  renderDraftItems()
}

