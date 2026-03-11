async function salvarServico(){

let total = parseFloat(valorServico.value)

let servico = {

cliente:scliente.value,
funcionario:sfuncionario.value,
descricao:sdesc.value,
total:total,
data:new Date()

}

await db.servicos.add(servico)

await db.financeiro.add({

tipo:"entrada",
valor:total,
descricao:"Serviço",
data:new Date()

})

}