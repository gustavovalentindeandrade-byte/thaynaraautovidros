const db = new Dexie("ERPOficina");

db.version(1).stores({

usuarios:"++id,nome,login,senha",

clientes:"++id,nome,telefone,endereco,cpf,rg,veiculo",

funcionarios:"++id,nome,funcao,documento",

pecas:"++id,nome,codigo,quantidade,valorCompra,valorVenda",

servicos:"++id,cliente,funcionario,descricao,total,data",

financeiro:"++id,tipo,valor,descricao,data"

});