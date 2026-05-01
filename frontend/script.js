let products=[]
let cart=[]

async function loadProducts(){

const res = await fetch("/products")
products = await res.json()

renderProducts()

}

function renderProducts(){

const table=document.getElementById("productsTable")
table.innerHTML=""

products.forEach(p=>{

table.innerHTML+=`
<tr>
<td>${p.name}</td>
<td>${p.category}</td>
<td>${p.cost_price}</td>
<td>${p.price}</td>
<td>${p.stock}</td>
<td>
<button onclick="addToCart(${p.id})">بيع</button>
</td>
</tr>
`

})

}

function addToCart(id){

const product = products.find(p=>p.id==id)

cart.push({
id:product.id,
name:product.name,
price:product.price,
qty:1
})

renderCart()

}

function renderCart(){

const table=document.getElementById("cartTable")
table.innerHTML=""

let total=0

cart.forEach(i=>{

let sum=i.price*i.qty
total+=sum

table.innerHTML+=`
<tr>
<td>${i.name}</td>
<td>${i.qty}</td>
<td>${i.price}</td>
<td>${sum}</td>
</tr>
`

})

document.getElementById("total").innerText=total

}

async function checkout(){

for(const item of cart){

await fetch("/sales",{
method:"POST",
headers:{'Content-Type':'application/json'},
body:JSON.stringify({
product_id:item.id,
quantity:item.qty
})
})

}

alert("تم البيع")

cart=[]
renderCart()
loadProducts()

}

async function logout(){

await fetch("/logout",{method:"POST"})
location.href="/login.html"

}

async function loadSalesHistory(){

const res = await fetch("/sales/history")
const rows = await res.json()

const table=document.getElementById("salesHistoryTable")

table.innerHTML=""

rows.forEach(r=>{

table.innerHTML+=`
<tr>
<td>${r.product}</td>
<td>${r.quantity}</td>
<td>${r.cost_price}</td>
<td>${r.sell_price}</td>
<td>${r.profit}</td>
<td>${r.created_at}</td>
</tr>
`

})

}

async function addProduct(){

const name=document.getElementById("name").value
const category=document.getElementById("category").value
const price=document.getElementById("price").value
const cost_price=document.getElementById("cost_price").value
const stock=document.getElementById("stock").value

const res = await fetch("/products",{
method:"POST",
headers:{'Content-Type':'application/json'},
body:JSON.stringify({
name,
category,
price,
cost_price,
stock
})
})

const data=await res.json()

document.getElementById("formMessage").innerText=data.message

loadProducts()

}

loadProducts()
loadSalesHistory()