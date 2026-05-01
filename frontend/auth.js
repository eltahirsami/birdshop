async function login(){

const username = document.getElementById("username").value
const password = document.getElementById("password").value

const res = await fetch('/login',{
method:"POST",
headers:{
'Content-Type':'application/json'
},
body:JSON.stringify({
username:username,
password:password
})
})

const data = await res.json()

if(!res.ok || data.error || data.success === false){

document.getElementById("msg").innerText = data.error || data.message || "Invalid login"
return

}

location.href="/"

}