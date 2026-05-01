let products=[]

function loadProducts(){

fetch('/products')
.then(res=>res.json())
.then(data=>{

products=data

const table=document.getElementById("adminProducts")
table.innerHTML=""

data.forEach(p=>{

table.innerHTML += `
<tr>

<td>${p.name}</td>
<td>${p.category}</td>
<td>${p.price}</td>
<td>${p.stock}</td>

<td>
<button onclick="editProduct(${p.id})">✏️</button>
</td>

<td>
<button onclick="deleteProduct(${p.id})">🗑</button>
</td>

</tr>
`

})

})

}

function deleteProduct(id){

if(!confirm("هل تريد حذف المنتج؟")) return

fetch('/products/'+id,{
method:'DELETE'
})
.then(()=>loadProducts())

}

function editProduct(id){

const p = products.find(x=>x.id===id)

const price = prompt("السعر الجديد",p.price)
const stock = prompt("المخزون الجديد",p.stock)

fetch('/products/'+id,{
method:'PUT',
headers:{'Content-Type':'application/json'},
body:JSON.stringify({
name:p.name,
category:p.category,
price:price,
cost_price:p.cost_price,
stock:stock
})
})
.then(()=>loadProducts())

}

loadProducts()