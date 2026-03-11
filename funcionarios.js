async function salvarFuncionario(){

let funcionario = {

nome:fnome.value,
funcao:ffuncao.value,
documento:fdoc.value

}

await db.funcionarios.add(funcionario)

listarFuncionarios()

}

async function listarFuncionarios(){

let funcionarios = await db.funcionarios.toArray()

listaFuncionarios.innerHTML=""

funcionarios.forEach(f=>{

listaFuncionarios.innerHTML+=
`<li>${f.nome} - ${f.funcao}</li>`

})

}

listarFuncionarios()