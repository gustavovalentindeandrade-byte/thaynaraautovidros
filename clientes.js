async function salvarCliente(){

let cliente = {

nome:cnome.value,
telefone:ctel.value,
endereco:cend.value,
cpf:ccpf.value,
rg:crg.value,
veiculo:cveiculo.value

}

await db.clientes.add(cliente)

listarClientes()

}

async function listarClientes(){

let clientes = await db.clientes.toArray()

listaClientes.innerHTML=""

clientes.forEach(c=>{

listaClientes.innerHTML+=
`<li>${c.nome} - ${c.veiculo}</li>`

})

}