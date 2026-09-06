/**
 * THAYNARA AUTO VIDROS - GESTÃO PROFISSIONAL PRO 25.0
 * Módulo Principal: app.js
 */

// ==========================================
// 1. BANCO DE DADOS E PERSISTÊNCIA (LOCALSTORAGE)
// ==========================================
const safeLoad = (key, defaultVal) => {
  try {
    const item = JSON.parse(localStorage.getItem(key));
    return Array.isArray(item) ? item : defaultVal;
  } catch (e) {
    return defaultVal;
  }
};

let db = {
  clientes: safeLoad('th_cli_v25', []),
  funcionarios: safeLoad('th_func_v25', []),
  servicos: safeLoad('th_serv_v25', []),
  estoque: safeLoad('th_est_v25', []),
  ordens: safeLoad('th_ord_v25', []),
  vendas_pecas: safeLoad('th_vp_v25', []),
  usuarios: safeLoad('th_user_v25', [{ nome: "Admin", user: "admin", pass: "123" }])
};

let currentSection = 'dashboard';
let currentFilterStatus = 'TODOS';
let editIndex = null;
let chartInstances = {};

function saveDatabase() {
  localStorage.setItem('th_cli_v25', JSON.stringify(db.clientes));
  localStorage.setItem('th_func_v25', JSON.stringify(db.funcionarios));
  localStorage.setItem('th_serv_v25', JSON.stringify(db.servicos));
  localStorage.setItem('th_est_v25', JSON.stringify(db.estoque));
  localStorage.setItem('th_ord_v25', JSON.stringify(db.ordens));
  localStorage.setItem('th_vp_v25', JSON.stringify(db.vendas_pecas));
  localStorage.setItem('th_user_v25', JSON.stringify(db.usuarios));
}

// ==========================================
// 2. AUTENTICAÇÃO E SESSÃO
// ==========================================
function handleLogin() {
  const u = document.getElementById('loginUser').value.trim();
  const p = document.getElementById('loginPass').value.trim();
  const user = db.usuarios.find(x => x.user === u && x.pass === p);

  if (user) {
    document.getElementById('login-overlay').style.display = 'none';
    document.getElementById('welcomeName').innerText = user.nome;
    updateDashboard();
  } else {
    const err = document.getElementById('login-err');
    err.style.display = 'block';
    setTimeout(() => err.style.display = 'none', 2500);
  }
}

function handleLogout() {
  if (confirm("Deseja sair da sua sessão no sistema?")) {
    document.getElementById('loginUser').value = '';
    document.getElementById('loginPass').value = '';
    document.getElementById('login-overlay').style.display = 'flex';
  }
}

// ==========================================
// 3. NAVEGAÇÃO ENTRE MÓDULOS
// ==========================================
function showSection(sec, el) {
  currentSection = sec;
  currentFilterStatus = 'TODOS';
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
  if (el) el.classList.add('active');

  const titles = {
    dashboard: "Painel Geral e Indicadores",
    ordens: "Ordens de Serviço e Controle de Pedidos",
    vendas_pecas: "Vendas de Peças (Balcão)",
    clientes: "Gestão de Clientes",
    funcionarios: "Equipe e Mecânicos",
    servicos: "Catálogo de Serviços",
    estoque: "Controle de Estoque & Peças",
    usuarios: "Usuários e Segurança"
  };

  document.getElementById('page-title').innerHTML = titles[sec] || "Auto Vidros Pro";
  document.getElementById('sec-dashboard').classList.add('hidden');
  document.getElementById('sec-tabelas').classList.add('hidden');

  // Exibir ou ocultar filtros de status de OS
  const filterContainer = document.getElementById('filter-pills-container');
  if (filterContainer) {
    filterContainer.style.display = (sec === 'ordens') ? 'flex' : 'none';
  }

  if (sec === 'dashboard') {
    document.getElementById('sec-dashboard').classList.remove('hidden');
    updateDashboard();
  } else {
    document.getElementById('sec-tabelas').classList.remove('hidden');
    document.getElementById('mainSearch').value = '';
    renderTable();
  }
}

function setFilterStatus(status, btn) {
  currentFilterStatus = status;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderTable();
}

// ==========================================
// 4. RENDERIZAÇÃO DE TABELAS E STATUS
// ==========================================
function renderTable() {
  const head = document.getElementById('table-head');
  const body = document.getElementById('table-body');
  body.innerHTML = '';

  const tableConfigs = {
    clientes: {
      headers: ['Nome Completo', 'CPF', 'Telefone / WhatsApp', 'Endereço'],
      fields: ['nome', 'cpf', 'tel', 'endereco']
    },
    funcionarios: {
      headers: ['Nome', 'Cargo / Função', 'CPF', 'Telefone'],
      fields: ['nome', 'funcao', 'cpf', 'tel']
    },
    servicos: {
      headers: ['Descrição do Serviço', 'Preço Sugerido'],
      fields: ['nome', 'preco']
    },
    estoque: {
      headers: ['Marca', 'Modelo / Peça', 'Custo (R$)', 'Venda (R$)', 'Margem (%)', 'Saldo', 'Status'],
      fields: ['marca', 'modelo', 'custo', 'preco', 'margem', 'qtd', 'status']
    },
    ordens: {
      headers: ['Nº Pedido/OS', 'Data/Hora', 'Cliente', 'Veículo / Placa', 'Status da OS', 'Pagamento', 'Total (R$)'],
      fields: ['id', 'dataHora', 'cliente', 'veiculo', 'status', 'pagamento', 'total']
    },
    vendas_pecas: {
      headers: ['Nº Venda', 'Data/Hora', 'Cliente', 'Pagamento', 'Total (R$)'],
      fields: ['id', 'dataHora', 'cliente', 'pagamento', 'total']
    },
    usuarios: {
      headers: ['Nome do Usuário', 'Login de Acesso'],
      fields: ['nome', 'user']
    }
  };

  const cfg = tableConfigs[currentSection];
  if (!cfg) return;

  head.innerHTML = `<tr>${cfg.headers.map(h => `<th>${h}</th>`).join('')}<th style="text-align:center; width:160px;">Ações</th></tr>`;

  let lista = db[currentSection] || [];

  // Filtro por status para Ordens de Serviço
  if (currentSection === 'ordens' && currentFilterStatus !== 'TODOS') {
    lista = lista.filter(item => (item.status || 'Orçamento') === currentFilterStatus);
  }

  if (lista.length === 0) {
    body.innerHTML = `<tr><td colspan="${cfg.headers.length + 1}" style="text-align:center; padding:35px; color:#94a3b8;">Nenhum registro encontrado nesta visualização.</td></tr>`;
    return;
  }

  lista.forEach((item, i) => {
    const tr = document.createElement('tr');

    let colsHtml = cfg.fields.map(f => {
      let val = item[f] || '-';

      if (f === 'preco' || f === 'custo' || f === 'total') {
        val = `R$ ${parseFloat(val || 0).toFixed(2)}`;
      }

      if (f === 'margem') {
        const custo = parseFloat(item.custo) || 0;
        const venda = parseFloat(item.preco) || 0;
        const mg = custo > 0 ? (((venda - custo) / custo) * 100).toFixed(1) : '100.0';
        val = `<span style="font-weight:700; color:#15803d;">+${mg}%</span>`;
      }

      if (f === 'status' && currentSection === 'estoque') {
        const min = parseInt(item.minimo) || 2;
        const qtd = parseInt(item.qtd) || 0;
        val = qtd <= min
          ? `<span class="status-pill status-cancelado"><i class="fas fa-triangle-exclamation"></i> Baixo (${qtd})</span>`
          : `<span class="status-pill status-concluido"><i class="fas fa-check"></i> Normal (${qtd})</span>`;
      }

      // Ciclo de Vida da OS com Select Direto na Tabela
      if (f === 'status' && currentSection === 'ordens') {
        const st = item.status || 'Orçamento';
        const cssMap = {
          'Orçamento': 'status-orcamento',
          'Em Andamento': 'status-andamento',
          'Aguardando Peça': 'status-aguardando',
          'Concluído': 'status-concluido',
          'Cancelado': 'status-cancelado'
        };
        val = `
          <select class="status-pill ${cssMap[st] || 'status-andamento'}" style="border:none; cursor:pointer; outline:none;" onchange="alterarStatusOS(${i}, this.value)">
            <option value="Orçamento" ${st==='Orçamento'?'selected':''}>Orçamento</option>
            <option value="Em Andamento" ${st==='Em Andamento'?'selected':''}>Em Andamento</option>
            <option value="Aguardando Peça" ${st==='Aguardando Peça'?'selected':''}>Aguardando Peça</option>
            <option value="Concluído" ${st==='Concluído'?'selected':''}>Concluído</option>
            <option value="Cancelado" ${st==='Cancelado'?'selected':''}>Cancelado</option>
          </select>
        `;
      }

      return `<td>${val}</td>`;
    }).join('');

    let acoes = `<div style="display:flex; gap:5px; justify-content:center;">`;
    if (['ordens', 'vendas_pecas'].includes(currentSection)) {
      acoes += `<button class="btn-action btn-wpp" onclick="enviarWhatsApp(${i})" title="Enviar Orçamento / Recibo via WhatsApp"><i class="fab fa-whatsapp"></i></button>`;
      acoes += `<button class="btn-action btn-light-ui" onclick="gerarPDF(${i})" title="Imprimir Recibo PDF"><i class="fas fa-file-pdf"></i></button>`;
    }
    acoes += `<button class="btn-action btn-light-ui" onclick="openModal(${i})" title="Editar"><i class="fas fa-edit text-primary"></i></button>`;
    acoes += `<button class="btn-action btn-danger-ui" onclick="deleteItem(${i})" title="Excluir"><i class="fas fa-trash"></i></button>`;
    acoes += `</div>`;

    tr.innerHTML = colsHtml + `<td>${acoes}</td>`;
    body.appendChild(tr);
  });
}

// ==========================================
// 5. ALTERAÇÃO RÁPIDA DE STATUS DA OS
// ==========================================
function alterarStatusOS(index, novoStatus) {
  const os = db.ordens[index];
  if (!os) return;

  const statusAnterior = os.status || 'Orçamento';
  if (statusAnterior === novoStatus) return;

  // Se estava como Orçamento e passou para Em Andamento ou Concluído -> Baixa no estoque
  if (statusAnterior === 'Orçamento' && (novoStatus === 'Em Andamento' || novoStatus === 'Concluído')) {
    (os.itens || []).forEach(it => {
      if (it.brand) {
        const target = db.estoque.find(e => e.modelo === it.nome && e.marca === it.brand);
        if (target) target.qtd = Math.max(0, target.qtd - it.qtd);
      }
    });
  }

  // Se estava em andamento/concluído e foi Cancelado -> Devolve ao estoque
  if ((statusAnterior === 'Em Andamento' || statusAnterior === 'Concluído') && novoStatus === 'Cancelado') {
    (os.itens || []).forEach(it => {
      if (it.brand) {
        const target = db.estoque.find(e => e.modelo === it.nome && e.marca === it.brand);
        if (target) target.qtd += parseInt(it.qtd) || 0;
      }
    });
  }

  os.status = novoStatus;
  saveDatabase();
  renderTable();
  updateDashboard();
}

// ==========================================
// 6. FORMULÁRIOS, MODAL E CALCULADORA DE PREÇO X CUSTO
// ==========================================
function openModal(index = null) {
  editIndex = index;
  const fields = document.getElementById('modal-fields');
  fields.innerHTML = '';
  document.getElementById('modal').style.display = 'flex';

  const d = index !== null ? db[currentSection][index] : {};
  document.getElementById('modal-title').innerText = index !== null ? `Editar Registro` : `Novo Cadastro`;

  if (currentSection === 'clientes') {
    fields.innerHTML = `
      <div class="form-group-ui"><label>Nome Completo do Cliente *</label><input id="f1" value="${d.nome || ''}"></div>
      <div style="display:flex; gap:10px;">
        <div class="form-group-ui" style="flex:1;"><label>CPF</label><input id="f2" placeholder="000.000.000-00" value="${d.cpf || ''}"></div>
        <div class="form-group-ui" style="flex:1;"><label>RG</label><input id="f3" value="${d.rg || ''}"></div>
      </div>
      <div class="form-group-ui"><label>Telefone / WhatsApp *</label><input id="f4" placeholder="(00) 00000-0000" value="${d.tel || ''}"></div>
      <div class="form-group-ui"><label>Endereço Completo</label><textarea id="f5" rows="2">${d.endereco || ''}</textarea></div>
    `;
  } else if (currentSection === 'funcionarios') {
    fields.innerHTML = `
      <div class="form-group-ui"><label>Nome do Funcionário *</label><input id="f1" value="${d.nome || ''}"></div>
      <div class="form-group-ui"><label>Função / Especialidade *</label><input id="f2" placeholder="Ex: Mecânico Instalador de Parabrisas" value="${d.funcao || ''}"></div>
      <div style="display:flex; gap:10px;">
        <div class="form-group-ui" style="flex:1;"><label>CPF</label><input id="f3" value="${d.cpf || ''}"></div>
        <div class="form-group-ui" style="flex:1;"><label>Telefone</label><input id="f4" value="${d.tel || ''}"></div>
      </div>
    `;
  } else if (currentSection === 'estoque') {
    // MODAL COM CALCULADORA DE PREÇO X CUSTO INTEGRADA
    const custoIni = d.custo || '';
    const precoIni = d.preco || '';
    fields.innerHTML = `
      <div style="display:flex; gap:10px;">
        <div class="form-group-ui" style="flex:1;"><label>Marca / Fabricante *</label><input id="fMarca" placeholder="Ex: Pilkington, Sekurit, AGC" value="${d.marca || ''}"></div>
        <div class="form-group-ui" style="flex:2;"><label>Modelo / Vidro / Descrição *</label><input id="fModelo" placeholder="Ex: Parabrisa Dianteiro Onix 2020/2023" value="${d.modelo || ''}"></div>
      </div>
      
      <div class="calc-card">
        <h4><i class="fas fa-calculator text-primary"></i> Calculadora de Preço de Venda x Custo</h4>
        <div style="display:flex; gap:10px;">
          <div class="form-group-ui" style="flex:1;">
            <label>Preço de Custo (R$) *</label>
            <input id="calcCusto" type="number" step="0.01" placeholder="0.00" value="${custoIni}" oninput="calcularPorMargem()">
          </div>
          <div class="form-group-ui" style="flex:1;">
            <label>Margem Desejada (%)</label>
            <input id="calcMargem" type="number" step="1" placeholder="Ex: 50" value="50" oninput="calcularPorMargem()">
          </div>
          <div class="form-group-ui" style="flex:1;">
            <label>Preço Venda Final (R$) *</label>
            <input id="fPrecoVenda" type="number" step="0.01" placeholder="0.00" value="${precoIni}" oninput="calcularPorPrecoVenda()">
          </div>
        </div>
        <div class="lucro-display">
          <span>Lucro Bruto Estimado por Unidade:</span>
          <span id="displayLucroUnitario">R$ 0,00</span>
        </div>
      </div>

      <div style="display:flex; gap:10px; margin-top:10px;">
        <div class="form-group-ui" style="flex:1;"><label>Quantidade em Estoque *</label><input id="fQtd" type="number" min="0" value="${d.qtd !== undefined ? d.qtd : ''}"></div>
        <div class="form-group-ui" style="flex:1;"><label>Estoque Mínimo (Alerta)</label><input id="fMinimo" type="number" value="${d.minimo || '2'}"></div>
      </div>
    `;
    setTimeout(calcularPorPrecoVenda, 50);

  } else if (currentSection === 'servicos') {
    fields.innerHTML = `
      <div class="form-group-ui"><label>Descrição do Serviço *</label><input id="f1" placeholder="Ex: Instalação Parabrisa com Cola PU" value="${d.nome || ''}"></div>
      <div class="form-group-ui"><label>Preço Sugerido de Mão de Obra (R$) *</label><input id="f2" type="number" step="0.01" value="${d.preco || ''}"></div>
    `;
  } else if (currentSection === 'usuarios') {
    fields.innerHTML = `
      <div class="form-group-ui"><label>Nome do Colaborador *</label><input id="f1" value="${d.nome || ''}"></div>
      <div class="form-group-ui"><label>Login de Acesso *</label><input id="f2" value="${d.user || ''}"></div>
      <div class="form-group-ui"><label>Senha *</label><input id="f3" type="password" value="${d.pass || ''}"></div>
    `;
  } else if (currentSection === 'vendas_pecas') {
    const cliOpts = db.clientes.map(c => `<option value="${c.nome}" ${d.cliente === c.nome ? 'selected' : ''}>${c.nome}</option>`).join('');
    fields.innerHTML = `
      <div style="display:flex; gap:10px;">
        <div class="form-group-ui" style="flex:2;"><label>Cliente</label><select id="f1"><option value="Consumidor Final">Consumidor Final</option>${cliOpts}</select></div>
        <div class="form-group-ui" style="flex:1;"><label>Forma de Pagamento</label>
          <select id="fPag">
            <option value="PIX" ${d.pagamento==='PIX'?'selected':''}>PIX</option>
            <option value="Cartão de Crédito" ${d.pagamento==='Cartão de Crédito'?'selected':''}>Cartão de Crédito</option>
            <option value="Cartão de Débito" ${d.pagamento==='Cartão de Débito'?'selected':''}>Cartão de Débito</option>
            <option value="Dinheiro" ${d.pagamento==='Dinheiro'?'selected':''}>Dinheiro</option>
            <option value="A Prazo / Boleto" ${d.pagamento==='A Prazo / Boleto'?'selected':''}>A Prazo / Boleto</option>
          </select>
        </div>
      </div>
      <div class="item-group-box">
        <h4 style="font-size:13px; font-weight:700; margin-bottom:10px;"><i class="fas fa-boxes-stacked text-primary"></i> Peças Vendidas</h4>
        <div id="venda-rows"></div>
        <button type="button" class="btn-ui btn-light-ui btn-action mt-2" onclick="addItemRow('venda-rows', true)"><i class="fas fa-plus"></i> Adicionar Peça</button>
      </div>
      <h3 style="margin-top:20px; font-size:16px; color:var(--primary);">Total da Venda: R$ <span id="displayTotal">0.00</span></h3>
      <input type="hidden" id="fTotal" value="0">
    `;
    if (index === null || !d.itens) addItemRow('venda-rows', true);
    else d.itens.forEach(it => addItemRow('venda-rows', true, it));

  } else if (currentSection === 'ordens') {
    const cliOpts = db.clientes.map(c => `<option value="${c.nome}" ${d.cliente === c.nome ? 'selected' : ''}>${c.nome}</option>`).join('');
    const mecOpts = db.funcionarios.map(f => `<option value="${f.nome}" ${d.mecanico === f.nome ? 'selected' : ''}>${f.nome}</option>`).join('');
    fields.innerHTML = `
      <div style="display:flex; gap:10px;">
        <div class="form-group-ui" style="flex:2;"><label>Cliente *</label><select id="f1"><option value="">Selecione o Cliente...</option>${cliOpts}</select></div>
        <div class="form-group-ui" style="flex:1;"><label>Mecânico Responsável</label><select id="fMec"><option value="Não informado">Selecione...</option>${mecOpts}</select></div>
      </div>
      <div style="display:flex; gap:10px;">
        <div class="form-group-ui" style="flex:1.5;"><label>Veículo / Modelo / Placa *</label><input id="f2" placeholder="Ex: Gol G5 2012 - ABC-1234" value="${d.veiculo || ''}"></div>
        <div class="form-group-ui" style="flex:1;"><label>KM Atual</label><input id="fKm" placeholder="Ex: 85.000" value="${d.km || ''}"></div>
        <div class="form-group-ui" style="flex:1;"><label>Status do Pedido/OS *</label>
          <select id="fStatus">
            <option value="Orçamento" ${d.status==='Orçamento'?'selected':''}>Orçamento</option>
            <option value="Em Andamento" ${(!d.status || d.status==='Em Andamento')?'selected':''}>Em Andamento</option>
            <option value="Aguardando Peça" ${d.status==='Aguardando Peça'?'selected':''}>Aguardando Peça</option>
            <option value="Concluído" ${d.status==='Concluído'?'selected':''}>Concluído</option>
            <option value="Cancelado" ${d.status==='Cancelado'?'selected':''}>Cancelado</option>
          </select>
        </div>
        <div class="form-group-ui" style="flex:1;"><label>Forma de Pagamento</label>
          <select id="fPag">
            <option value="PIX" ${d.pagamento==='PIX'?'selected':''}>PIX</option>
            <option value="Cartão de Crédito" ${d.pagamento==='Cartão de Crédito'?'selected':''}>Cartão de Crédito</option>
            <option value="Cartão de Débito" ${d.pagamento==='Cartão de Débito'?'selected':''}>Cartão de Débito</option>
            <option value="Dinheiro" ${d.pagamento==='Dinheiro'?'selected':''}>Dinheiro</option>
            <option value="A Prazo / Boleto" ${d.pagamento==='A Prazo / Boleto'?'selected':''}>A Prazo / Boleto</option>
          </select>
        </div>
      </div>
      
      <div class="item-group-box">
        <h4 style="font-size:13px; font-weight:700; margin-bottom:10px;"><i class="fas fa-tools text-primary"></i> Serviços de Mão de Obra</h4>
        <div id="serv-rows"></div>
        <button type="button" class="btn-ui btn-light-ui btn-action mt-2" onclick="addItemRow('serv-rows', false)"><i class="fas fa-plus"></i> Adicionar Serviço</button>
      </div>

      <div class="item-group-box mt-3">
        <h4 style="font-size:13px; font-weight:700; margin-bottom:10px;"><i class="fas fa-boxes-stacked text-warning"></i> Peças, Vidros e Acessórios</h4>
        <div id="peca-rows"></div>
        <button type="button" class="btn-ui btn-light-ui btn-action mt-2" onclick="addItemRow('peca-rows', true)"><i class="fas fa-plus"></i> Adicionar Peça</button>
      </div>

      <h3 style="margin-top:20px; font-size:16px; color:var(--primary);">Total Geral da OS: R$ <span id="displayTotal">0.00</span></h3>
      <input type="hidden" id="fTotal" value="0">
    `;
    if (index === null || !d.itens) {
      addItemRow('serv-rows', false);
      addItemRow('peca-rows', true);
    } else {
      d.itens.filter(i => !i.brand).forEach(it => addItemRow('serv-rows', false, it));
      d.itens.filter(i => i.brand).forEach(it => addItemRow('peca-rows', true, it));
    }
  }
  calcTotal();
}

// Funções da Calculadora de Preço x Custo
function calcularPorMargem() {
  const custo = parseFloat(document.getElementById('calcCusto').value) || 0;
  const margem = parseFloat(document.getElementById('calcMargem').value) || 0;
  const venda = custo * (1 + margem / 100);
  const lucro = venda - custo;

  document.getElementById('fPrecoVenda').value = venda.toFixed(2);
  document.getElementById('displayLucroUnitario').innerText = `R$ ${lucro.toFixed(2)} (+${margem.toFixed(1)}%)`;
}

function calcularPorPrecoVenda() {
  const custo = parseFloat(document.getElementById('calcCusto').value) || 0;
  const venda = parseFloat(document.getElementById('fPrecoVenda').value) || 0;
  const lucro = venda - custo;
  const margem = custo > 0 ? ((lucro / custo) * 100) : 0;

  const display = document.getElementById('displayLucroUnitario');
  if (display) {
    display.innerText = `R$ ${lucro.toFixed(2)} (+${margem.toFixed(1)}%)`;
  }
}

function addItemRow(containerId, isPart, data = null) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const div = document.createElement('div');
  div.className = 'item-row-ui';

  let opts = isPart
    ? db.estoque.map(e => `<option value="${e.preco}" data-name="${e.modelo}" data-brand="${e.marca}" ${data && data.nome === e.modelo ? 'selected' : ''}>${e.modelo} (${e.marca}) - Saldo: ${e.qtd} un - R$ ${parseFloat(e.preco).toFixed(2)}</option>`).join('')
    : db.servicos.map(s => `<option value="${s.preco}" data-name="${s.nome}" ${data && data.nome === s.nome ? 'selected' : ''}>${s.nome} - R$ ${parseFloat(s.preco).toFixed(2)}</option>`).join('');

  div.innerHTML = `
    <select class="item-select" onchange="calcTotal()">
      <option value="0">Selecione o ${isPart ? 'Produto/Peça' : 'Serviço'}...</option>
      ${opts}
    </select>
    <input type="number" class="item-qty" value="${data ? data.qtd : 1}" min="1" onchange="calcTotal()">
    <input type="text" class="item-price" readonly value="0.00">
    <button type="button" class="btn-ui btn-danger-ui btn-action" onclick="this.parentElement.remove(); calcTotal();"><i class="fas fa-times"></i></button>
  `;
  container.appendChild(div);
  calcTotal();
}

function calcTotal() {
  let total = 0;
  document.querySelectorAll('.item-row-ui').forEach(row => {
    const sel = row.querySelector('.item-select');
    const qty = parseInt(row.querySelector('.item-qty').value) || 1;
    const price = parseFloat(sel.value) || 0;
    const sub = price * qty;
    row.querySelector('.item-price').value = sub.toFixed(2);
    total += sub;
  });

  const d = document.getElementById('displayTotal');
  if (d) d.innerText = total.toFixed(2);
  const f = document.getElementById('fTotal');
  if (f) f.value = total.toFixed(2);
}

// ==========================================
// 7. SALVAR DADOS E ATUALIZAR ESTOQUE
// ==========================================
function handleSave() {
  const v = (id) => document.getElementById(id) ? document.getElementById(id).value.trim() : '';

  try {
    let obj = {};

    if (['ordens', 'vendas_pecas'].includes(currentSection)) {
      const items = [];
      let faltaEstoque = false;
      let msgEstoque = '';

      document.querySelectorAll('.item-row-ui').forEach(row => {
        const sel = row.querySelector('.item-select');
        if (sel && sel.selectedIndex > 0) {
          const opt = sel.options[sel.selectedIndex];
          const brand = opt.getAttribute('data-brand') || '';
          const name = opt.getAttribute('data-name');
          const qty = parseInt(row.querySelector('.item-qty').value) || 0;
          const preco = parseFloat(sel.value) || 0;

          if (qty > 0) {
            // Se for venda de peças ou OS confirmada, valida estoque
            const statusOS = v('fStatus') || 'Concluído';
            if (brand && editIndex === null && statusOS !== 'Orçamento') {
              const itemEstoque = db.estoque.find(e => e.modelo === name && e.marca === brand);
              if (itemEstoque && itemEstoque.qtd < qty) {
                faltaEstoque = true;
                msgEstoque = `Estoque insuficiente para "${name} (${brand})". Saldo atual: ${itemEstoque.qtd}, pedido: ${qty}.`;
              }
            }
            items.push({ nome, brand, qtd, preco });
          }
        }
      });

      if (faltaEstoque) return alert(msgEstoque);
      if (!v('f1')) return alert("Selecione o Cliente.");
      if (items.length === 0) return alert("Adicione pelo menos um item válido.");
      if (currentSection === 'ordens' && !v('f2')) return alert("Informe o Veículo / Placa.");

      const statusFinal = v('fStatus') || 'Concluído';

      // Baixa de estoque se não for Orçamento
      if (editIndex === null && statusFinal !== 'Orçamento') {
        items.forEach(it => {
          if (it.brand) {
            const target = db.estoque.find(e => e.modelo === it.nome && e.marca === it.brand);
            if (target) target.qtd = Math.max(0, target.qtd - it.qtd);
          }
        });
      }

      const agora = new Date();
      const dataHoraFmt = `${agora.toLocaleDateString('pt-BR')} ${agora.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}`;

      obj = {
        id: editIndex !== null ? db[currentSection][editIndex].id : ((currentSection==='ordens'?'OS-':'VP-') + Math.floor(1000 + Math.random() * 9000)),
        dataHora: editIndex !== null ? db[currentSection][editIndex].dataHora : dataHoraFmt,
        cliente: v('f1'),
        pagamento: v('fPag') || 'PIX',
        total: v('fTotal'),
        itens: items
      };

      if (currentSection === 'ordens') {
        obj.mecanico = v('fMec') || 'Não informado';
        obj.veiculo = v('f2');
        obj.km = v('fKm') || '-';
        obj.status = statusFinal;
      }

    } else if (currentSection === 'clientes') {
      if (!v('f1')) return alert("O Nome é obrigatório.");
      obj = { nome: v('f1'), cpf: v('f2'), rg: v('f3'), tel: v('f4'), endereco: v('f5') };

    } else if (currentSection === 'funcionarios') {
      if (!v('f1')) return alert("O Nome é obrigatório.");
      obj = { nome: v('f1'), funcao: v('f2'), cpf: v('f3'), tel: v('f4') };

    } else if (currentSection === 'estoque') {
      if (!v('fMarca') || !v('fModelo')) return alert("Marca e Modelo são obrigatórios.");
      const custo = parseFloat(v('calcCusto')) || 0;
      const preco = parseFloat(v('fPrecoVenda')) || 0;
      obj = {
        marca: v('fMarca'),
        modelo: v('fModelo'),
        custo: custo,
        preco: preco,
        qtd: parseInt(v('fQtd')) || 0,
        minimo: parseInt(v('fMinimo')) || 2
      };

    } else if (currentSection === 'servicos') {
      if (!v('f1')) return alert("A descrição é obrigatória.");
      obj = { nome: v('f1'), preco: parseFloat(v('f2')) || 0 };

    } else if (currentSection === 'usuarios') {
      if (!v('f1') || !v('f2') || !v('f3')) return alert("Preencha Nome, Login e Senha.");
      obj = { nome: v('f1'), user: v('f2'), pass: v('f3') };
    }

    if (editIndex !== null) db[currentSection][editIndex] = obj;
    else db[currentSection].push(obj);

    saveDatabase();
    closeModal();
    renderTable();
    updateDashboard();

  } catch (err) {
    console.error("Erro ao salvar:", err);
    alert("Ocorreu um erro ao salvar o registro.");
  }
}

function deleteItem(i) {
  const item = db[currentSection][i];
  if (!item) return;

  if (confirm("Deseja realmente excluir este registro?")) {
    if (['ordens', 'vendas_pecas'].includes(currentSection) && item.itens && item.itens.length > 0) {
      if (item.status !== 'Orçamento' && item.status !== 'Cancelado') {
        if (confirm("Deseja estornar a quantidade das peças excluídas de volta ao estoque?")) {
          item.itens.forEach(it => {
            if (it.brand) {
              const t = db.estoque.find(e => e.modelo === it.nome && e.marca === it.brand);
              if (t) t.qtd += parseInt(it.qtd) || 0;
            }
          });
        }
      }
    }
    db[currentSection].splice(i, 1);
    saveDatabase();
    renderTable();
    updateDashboard();
  }
}

function closeModal() {
  document.getElementById('modal').style.display = 'none';
}

// ==========================================
// 8. DASHBOARD COM MÉTRICAS INTELIGENTES
// ==========================================
function updateDashboard() {
  // Faturamento Real (Apenas OS Concluídas + Vendas de Balcão)
  const fatOS = db.ordens.filter(o => o.status === 'Concluído').reduce((a, b) => a + (parseFloat(b.total) || 0), 0);
  const fatVP = db.vendas_pecas.reduce((a, b) => a + (parseFloat(b.total) || 0), 0);
  const totalOrcamentos = db.ordens.filter(o => o.status === 'Orçamento').reduce((a, b) => a + (parseFloat(b.total) || 0), 0);

  document.getElementById('dash-faturamento').innerText = `R$ ${fatOS.toFixed(2)}`;
  document.getElementById('dash-faturamento-pecas').innerText = `R$ ${fatVP.toFixed(2)}`;
  document.getElementById('dash-os-count').innerText = db.ordens.filter(o => o.status === 'Concluído').length;
  document.getElementById('dash-cli-count').innerText = db.clientes.length;

  const orcElem = document.getElementById('dash-orcamentos-total');
  if (orcElem) orcElem.innerText = `R$ ${totalOrcamentos.toFixed(2)}`;

  renderCharts();
}

function renderCharts() {
  const createChart = (id, dataObj, label, color) => {
    const ctx = document.getElementById(id);
    if (!ctx) return;
    if (chartInstances[id]) chartInstances[id].destroy();

    const labels = Object.keys(dataObj);
    const values = Object.values(dataObj);

    chartInstances[id] = new Chart(ctx.getContext('2d'), {
      type: 'bar',
      data: {
        labels: labels.length > 0 ? labels : ['Sem dados'],
        datasets: [{
          label: label,
          data: values.length > 0 ? values : [0],
          backgroundColor: color,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
      }
    });
  };

  const pMap = {}, sMap = {}, mMap = {};
  db.ordens.concat(db.vendas_pecas).forEach(o => {
    if (o.status !== 'Cancelado' && o.itens) {
      o.itens.forEach(it => {
        if (it.brand) pMap[it.nome] = (pMap[it.nome] || 0) + (parseInt(it.qtd) || 0);
        else sMap[it.nome] = (sMap[it.nome] || 0) + (parseInt(it.qtd) || 1);
      });
    }
    if (o.mecanico && o.mecanico !== 'Não informado') {
      mMap[o.mecanico] = (mMap[o.mecanico] || 0) + 1;
    }
  });

  createChart('chartPecas', pMap, 'Peças Vendidas', '#f59e0b');
  createChart('chartServicos', sMap, 'Serviços Prestados', '#2563eb');
  createChart('chartMecanicos', mMap, 'Atendimentos Realizados', '#10b981');
}

// ==========================================
// 9. DISPARO DE ORÇAMENTO E RECIBO VIA WHATSAPP
// ==========================================
function enviarWhatsApp(i) {
  const item = db[currentSection][i];
  if (!item) return;

  const cli = db.clientes.find(c => c.nome === item.cliente);
  let tel = cli ? cli.tel.replace(/\D/g, '') : '';

  if (!tel) {
    const inputTel = prompt("Informe o número de WhatsApp do cliente (com DDD):", "21");
    if (!inputTel) return;
    tel = inputTel.replace(/\D/g, '');
  }

  const isOS = currentSection === 'ordens';
  const tipoDoc = isOS && item.status === 'Orçamento' ? "ORÇAMENTO" : (isOS ? "ORDEM DE SERVIÇO" : "COMPROVANTE DE VENDA");

  let texto = `*THAYNARA AUTO VIDROS* 🚗🔧%0A`;
  texto += `Olá, *${item.cliente}*! Segue o detalhamento do seu *${tipoDoc}*:%0A%0A`;
  texto += `📋 *Identificador:* ${item.id}%0A`;
  texto += `📅 *Data/Hora:* ${item.dataHora || item.data}%0A`;
  if (item.veiculo) texto += `🚘 *Veículo / Placa:* ${item.veiculo}%0A`;
  if (item.km && item.km !== '-') texto += `📍 *KM Atual:* ${item.km}%0A`;
  if (item.status) texto += `⚡ *Status:* ${item.status}%0A`;
  if (item.mecanico && item.mecanico !== 'Não informado') texto += `👨‍🔧 *Mecânico Responsável:* ${item.mecanico}%0A`;

  texto += `%0A🛠 *Itens e Serviços:*%0A`;
  (item.itens || []).forEach(it => {
    texto += `• ${it.qtd}x ${it.nome} - R$ ${(it.qtd * it.preco).toFixed(2)}%0A`;
  });

  texto += `%0A💰 *VALOR TOTAL: R$ ${parseFloat(item.total).toFixed(2)}*%0A`;
  texto += `💳 *Forma de Pagamento:* ${item.pagamento || 'PIX'}%0A%0A`;
  texto += `Ficamos à disposição para qualquer dúvida ou confirmação! 👍`;

  const link = `https://wa.me/55${tel}?text=${texto}`;
  window.open(link, '_blank');
}

// ==========================================
// 10. IMPRESSÃO DE RECIBOS E RELATÓRIO PDF
// ==========================================
function gerarPDF(i) {
  if (!window.jspdf || !window.jspdf.jsPDF) return alert("Biblioteca jsPDF carregando...");
  const { jsPDF } = window.jspdf;
  const data = db[currentSection][i];
  if (!data) return;

  const doc = new jsPDF();
  doc.setFontSize(20);
  doc.text("THAYNARA AUTO VIDROS", 105, 20, { align: 'center' });
  doc.setFontSize(9);
  doc.text(`Emissão: ${new Date().toLocaleString('pt-BR')}`, 190, 10, { align: 'right' });
  doc.setFontSize(13);
  doc.text(currentSection === 'ordens' ? `ORDEM DE SERVIÇO (${data.status || 'Em Execução'})` : "COMPROVANTE DE VENDA", 105, 28, { align: 'center' });

  doc.setLineWidth(0.5);
  doc.line(15, 34, 195, 34);

  doc.setFontSize(10);
  doc.text(`Nº: ${data.id}  |  Data: ${data.dataHora || data.data}`, 15, 42);
  doc.text(`Cliente: ${data.cliente}  |  Pagamento: ${data.pagamento || 'PIX'}`, 15, 48);
  if (data.veiculo) doc.text(`Veículo: ${data.veiculo}  |  Mecânico: ${data.mecanico}  |  KM: ${data.km || '-'}`, 15, 54);

  const rows = (data.itens || []).map(it => [
    it.nome + (it.brand ? ` (${it.brand})` : ''),
    it.qtd,
    `R$ ${parseFloat(it.preco || 0).toFixed(2)}`,
    `R$ ${(it.qtd * it.preco).toFixed(2)}`
  ]);

  doc.autoTable({
    head: [['Item / Descrição', 'Qtd', 'Unitário', 'Subtotal']],
    body: rows,
    startY: data.veiculo ? 60 : 54,
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42] }
  });

  const finalY = doc.autoTable.previous.finalY || 120;
  doc.setFontSize(14);
  doc.text(`TOTAL: R$ ${parseFloat(data.total || 0).toFixed(2)}`, 190, finalY + 14, { align: 'right' });

  doc.save(`${data.id}_Thaynara_AutoVidros.pdf`);
}

function exportarListaPDF() {
  if (!window.jspdf || !window.jspdf.jsPDF) return alert("jsPDF indisponível.");
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const lista = db[currentSection] || [];

  doc.setFontSize(14);
  doc.text(`Relatório de ${currentSection.toUpperCase()} - ${new Date().toLocaleDateString('pt-BR')}`, 14, 15);

  if (lista.length === 0) {
    doc.setFontSize(10);
    doc.text("Nenhum dado registrado para esta seção.", 14, 25);
  } else {
    let headers = [];
    let rows = [];

    if (currentSection === 'clientes') {
      headers = ['Nome', 'CPF', 'Telefone', 'Endereço'];
      rows = lista.map(c => [c.nome, c.cpf, c.tel, c.endereco]);
    } else if (currentSection === 'estoque') {
      headers = ['Marca', 'Modelo', 'Custo (R$)', 'Venda (R$)', 'Saldo'];
      rows = lista.map(e => [e.marca, e.modelo, `R$ ${parseFloat(e.custo||0).toFixed(2)}`, `R$ ${parseFloat(e.preco).toFixed(2)}`, e.qtd]);
    } else if (currentSection === 'ordens') {
      headers = ['Nº OS', 'Data', 'Cliente', 'Veículo', 'Status', 'Pagamento', 'Total'];
      rows = lista.map(o => [o.id, o.dataHora || o.data, o.cliente, o.veiculo, o.status || 'Orçamento', o.pagamento || 'PIX', `R$ ${parseFloat(o.total).toFixed(2)}`]);
    } else if (currentSection === 'vendas_pecas') {
      headers = ['Nº Venda', 'Data', 'Cliente', 'Pagamento', 'Total'];
      rows = lista.map(v => [v.id, v.dataHora || v.data, v.cliente, v.pagamento || 'PIX', `R$ ${parseFloat(v.total).toFixed(2)}`]);
    } else {
      headers = Object.keys(lista[0]).filter(k => k !== 'itens' && k !== 'pass');
      rows = lista.map(item => headers.map(h => item[h]));
    }

    doc.autoTable({
      head: [headers],
      body: rows,
      startY: 22,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235] }
    });
  }

  doc.save(`Relatorio_${currentSection}.pdf`);
}

function filtrarTabela() {
  const termo = document.getElementById('mainSearch').value.toLowerCase();
  document.querySelectorAll('#table-body tr').forEach(tr => {
    tr.style.display = tr.innerText.toLowerCase().includes(termo) ? '' : 'none';
  });
}

// ==========================================
// 11. MÓDULO DE BACKUP E RESTAURAÇÃO DE DADOS
// ==========================================
function exportarBackupJSON() {
  const jsonStr = JSON.stringify(db, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Backup_ThaynaraAutoVidros_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importarBackupJSON(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const imported = JSON.parse(e.target.result);
      if (imported.clientes && imported.estoque && imported.ordens) {
        if (confirm("Deseja realmente restaurar este backup? Todos os dados atuais deste navegador serão substituídos.")) {
          db = imported;
          saveDatabase();
          renderTable();
          updateDashboard();
          alert("Backup restaurado com sucesso!");
        }
      } else {
        alert("Arquivo de backup inválido.");
      }
    } catch (err) {
      alert("Erro ao ler o arquivo JSON.");
    }
  };
  reader.readAsText(file);
}

window.onload = () => {
  updateDashboard();
};
