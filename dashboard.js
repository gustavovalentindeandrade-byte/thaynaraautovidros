async function carregarDashboard(){

let servicos = await db.servicos.toArray()

let faturamento = servicos.reduce((t,s)=>t+s.total,0)

document.getElementById("faturamento").innerText =
"R$ "+faturamento

let ctx = document.getElementById("grafico")

new Chart(ctx,{

type:"line",

data:{

labels:["Jan","Fev","Mar","Abr","Mai"],

datasets:[{

label:"Faturamento",

data:[1200,1900,800,1600,900]

}]

}

})

}