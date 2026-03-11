function gerarRelatorio(){

const { jsPDF } = window.jspdf

let doc = new jsPDF()

doc.text("Relatório Financeiro",10,10)

doc.save("relatorio.pdf")

}