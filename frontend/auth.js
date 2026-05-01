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

if(data.error){

document.getElementById("msg").innerText = data.error
return

}

location.href="/"

}