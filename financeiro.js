async function salvarMovimento(){

let movimento = {

descricao:fdesc.value,
valor:parseFloat(fvalor.value),
tipo:ftipo.value,
data:new Date()

}

await db.financeiro.add(movimento)

listarFinanceiro()

}

async function listarFinanceiro(){

let dados = await db.financeiro.toArray()

listaFinanceiro.innerHTML=""

dados.forEach(m=>{

listaFinanceiro.innerHTML+=
`<li>${m.tipo} - R$ ${m.valor} - ${m.descricao}</li>`

})

}

listarFinanceiro()