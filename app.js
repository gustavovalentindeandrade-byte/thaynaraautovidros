let clientes=JSON.parse(localStorage.getItem("clientes")||"[]")
let funcionarios=JSON.parse(localStorage.getItem("funcionarios")||"[]")
let pecas=JSON.parse(localStorage.getItem("pecas")||"[]")
let servicos=JSON.parse(localStorage.getItem("servicos")||"[]")
let financeiro=JSON.parse(localStorage.getItem("financeiro")||"[]")

function salvar(){

localStorage.setItem("clientes",JSON.stringify(clientes))
localStorage.setItem("funcionarios",JSON.stringify(funcionarios))
localStorage.setItem("pecas",JSON.stringify(pecas))
localStorage.setItem("servicos",JSON.stringify(servicos))
localStorage.setItem("financeiro",JSON.stringify(financeiro))

}

function criarUsuario(){

let users=JSON.parse(localStorage.getItem("users")||"[]")

users.push({
nome:novoNome.value,
user:novoUser.value,
pass:novoPass.value
})

localStorage.setItem("users",JSON.stringify(users))

alert("Usuário criado")

}

function login(){

let users=JSON.parse(localStorage.getItem("users")||"[]")

let ok=users.find(x=>x.user===loginUser.value && x.pass===loginPass.value)

if(!ok){
alert("Login inválido")
return
}

loginTela.style.display="none"
sistema.style.display="block"

boasvindas.innerText="Bem vindo "+ok.nome

abrir("dashboard")

listar()
atualizarDashboard()

}

function logout(){

sistema.style.display="none"
loginTela.style.display="flex"

}

function abrir(id){

document.querySelectorAll(".tela").forEach(t=>t.style.display="none")

document.getElementById(id).style.display="block"

popularSelects()

}

function salvarCliente(){

clientes.push({
nome:cNome.value,
tel:cTel.value,
veiculo:cVeiculo.value
})

salvar()
listar()

}

function buscarCliente(){

let termo=buscaCliente.value.toLowerCase()

listaClientes.innerHTML=""

clientes
.filter(c=>c.nome.toLowerCase().includes(termo))
.forEach(c=>{

listaClientes.innerHTML+=`<li>${c.nome}</li>`

})

}

function salvarFuncionario(){

funcionarios.push({
nome:fNome.value,
funcao:fFuncao.value
})

salvar()
listar()

}

function salvarPeca(){

pecas.push({
nome:pNome.value,
qtd:parseInt(pQtd.value),
compra:pCompra.value,
venda:pVenda.value
})

salvar()
listar()
atualizarDashboard()

}

function salvarServico(){

let valor=parseFloat(sValor.value)

servicos.push({
cliente:sCliente.value,
funcionario:sFuncionario.value,
descricao:sDescricao.value,
valor:valor
})

financeiro.push({
tipo:"entrada",
valor:valor
})

salvar()
listar()
atualizarDashboard()

}

function salvarMov(){

financeiro.push({
tipo:finTipo.value,
valor:parseFloat(finValor.value)
})

salvar()
listar()
atualizarDashboard()

}

function listar(){

listaClientes.innerHTML=""
clientes.forEach(c=>listaClientes.innerHTML+=`<li>${c.nome}</li>`)

listaFuncionarios.innerHTML=""
funcionarios.forEach(f=>listaFuncionarios.innerHTML+=`<li>${f.nome}</li>`)

listaPecas.innerHTML=""
pecas.forEach(p=>listaPecas.innerHTML+=`<li>${p.nome} - ${p.qtd}</li>`)

listaServicos.innerHTML=""
servicos.forEach(s=>listaServicos.innerHTML+=`<li>${s.cliente} - R$${s.valor}</li>`)

listaFinanceiro.innerHTML=""
financeiro.forEach(f=>listaFinanceiro.innerHTML+=`<li>${f.tipo} - R$${f.valor}</li>`)

}

function popularSelects(){

sCliente.innerHTML=""
clientes.forEach(c=>sCliente.innerHTML+=`<option>${c.nome}</option>`)

sFuncionario.innerHTML=""
funcionarios.forEach(f=>sFuncionario.innerHTML+=`<option>${f.nome}</option>`)

}

function atualizarDashboard(){

let entradas=0
let saidas=0

financeiro.forEach(f=>{

if(f.tipo=="entrada") entradas+=f.valor
else saidas+=f.valor

})

let lucro=entradas-saidas

fatTotal.innerText="R$ "+entradas
lucroTotal.innerText="R$ "+lucro
servTotal.innerText=servicos.length

let baixo=pecas.filter(p=>p.qtd<3).length

estoqueBaixo.innerText=baixo

criarGrafico(entradas,saidas)

}

function criarGrafico(ent,sai){

let ctx=document.getElementById("graficoFinanceiro")

new Chart(ctx,{
type:"bar",
data:{
labels:["Entradas","Saídas"],
datasets:[{data:[ent,sai]}]
}
})

}

function relatorioFinanceiro(){

let total=financeiro
.filter(f=>f.tipo=="entrada")
.reduce((a,b)=>a+b.valor,0)

alert("Total faturado: R$ "+total)

}

function backupSistema(){

let dados={clientes,funcionarios,pecas,servicos,financeiro}

let dataStr="data:text/json;charset=utf-8,"+encodeURIComponent(JSON.stringify(dados))

let dl=document.createElement("a")

dl.setAttribute("href",dataStr)
dl.setAttribute("download","backup_sistema.json")

dl.click()

}

listar()