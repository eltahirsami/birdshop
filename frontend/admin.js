let products = []
let categories = []

async function loadCategories() {
  const res = await fetch('/categories', { credentials: 'include' })
  categories = await res.json()
  renderCategoryDropdown()
}

function renderCategoryDropdown(selectedName) {
  const sel = document.getElementById('editCategory')
  if (!sel) return
  const val = selectedName !== undefined ? selectedName : sel.value
  sel.innerHTML = '<option value="">-- اختر التصنيف --</option>'
  categories.forEach(c => {
    const opt = document.createElement('option')
    opt.value = c.name
    opt.textContent = c.name
    if (c.name === val) opt.selected = true
    sel.appendChild(opt)
  })
}

async function addCategoryAdmin() {
  const input = document.getElementById('newCategoryAdmin')
  const name = input.value.trim()
  if (!name) return
  const res = await fetch('/categories', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  })
  if (res.ok) {
    input.value = ''
    await loadCategories()
    renderCategoryDropdown(name)
  } else {
    const data = await res.json()
    alert(data.message || 'فشل إضافة التصنيف')
  }
}

async function loadProducts() {
  const res = await fetch('/products', { credentials: 'include' })
  const data = await res.json()
  products = data

  const table = document.getElementById("adminProducts")
  table.innerHTML = ""

  data.forEach(p => {
    table.innerHTML += `
      <tr>
        <td>${p.name}</td>
        <td>${p.category}</td>
        <td>${p.price}</td>
        <td>${p.stock}</td>
        <td><button onclick="editProduct(${p.id})">✏️ تعديل</button></td>
        <td><button onclick="deleteProduct(${p.id})">🗑 حذف</button></td>
      </tr>
    `
  })
}

async function deleteProduct(id) {
  if (!confirm("هل تريد حذف المنتج؟")) return
  await fetch('/products/' + id, { method: 'DELETE', credentials: 'include' })
  loadProducts()
}

function editProduct(id) {
  const p = products.find(x => x.id === id)
  if (!p) return
  document.getElementById('editId').value = p.id
  document.getElementById('editName').value = p.name
  renderCategoryDropdown(p.category)
  document.getElementById('editPrice').value = p.price
  document.getElementById('editCostPrice').value = p.cost_price ?? 0
  document.getElementById('editStock').value = p.stock
  document.getElementById('editBarcode').value = p.barcode ?? ''
  document.getElementById('editMsg').innerText = ''
  document.getElementById('editForm').style.display = 'block'
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function cancelEdit() {
  document.getElementById('editForm').style.display = 'none'
}

async function saveEdit() {
  const id = document.getElementById('editId').value
  const name = document.getElementById('editName').value.trim()
  const category = document.getElementById('editCategory').value.trim()
  const price = parseFloat(document.getElementById('editPrice').value)
  const cost_price = parseFloat(document.getElementById('editCostPrice').value) || 0
  const stock = parseInt(document.getElementById('editStock').value) || 0
  const barcode = document.getElementById('editBarcode').value.trim() || null

  if (!name || !category || isNaN(price)) {
    document.getElementById('editMsg').innerText = '⚠️ يرجى تعبئة الاسم والتصنيف والسعر'
    return
  }

  const res = await fetch('/products/' + id, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, category, price, cost_price, stock, barcode })
  })

  if (res.ok) {
    document.getElementById('editForm').style.display = 'none'
    loadProducts()
  } else {
    const data = await res.json()
    document.getElementById('editMsg').innerText = '❌ ' + (data.message || 'فشل التعديل')
  }
}

loadCategories()
loadProducts()
