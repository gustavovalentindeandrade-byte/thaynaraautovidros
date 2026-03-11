async function adicionarPeca(){

let peca = {

nome:pnome.value,
codigo:pcodigo.value,
quantidade:parseInt(pqtd.value),
valorCompra:parseFloat(pcompra.value),
valorVenda:parseFloat(pvenda.value)

}

await db.pecas.add(peca)

listarPecas()

}