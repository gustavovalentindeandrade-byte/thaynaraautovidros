async function login(){

let login = document.getElementById("login").value
let senha = document.getElementById("senha").value

let user = await db.usuarios
.where("login")
.equals(login)
.first()

if(!user){

alert("Usuário não encontrado")
return

}

if(user.senha !== senha){

alert("Senha incorreta")
return

}

localStorage.setItem("usuario",user.nome)

window.location="dashboard.html"

}