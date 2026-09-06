/**
 * THAYNARA AUTO VIDROS - SISTEMA DE GESTÃO AUTOMOTIVA PRO 25.0
 * Arquitetura Modular, Resiliente e Profissional
 */

// ============================================================================
// 1. STORAGE SERVICE (Camada de Persistência, Sanitização e Auto-Recuperação)
// ============================================================================
const StorageService = {
  KEYS: {
    CLIENTES: 'th_cli_v25',
    FUNCIONARIOS: 'th_func_v25',
    SERVICOS: 'th_serv_v25',
    ESTOQUE: 'th_est_v25',
    ORDENS: 'th_ord_v25',
    VENDAS: 'th_vp_v25',
    USUARIOS: 'th_user_v25'
  },

  safeLoad(key, defaultVal) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return defaultVal;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : defaultVal;
    } catch (e) {
      console.warn(`[StorageService] Falha ao ler chave ${key}, utilizando padrão.`, e);
      return defaultVal;
    }
  },

  save(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error(`[StorageService] Falha ao persistir chave ${key}:`, e);
      return false;
    }
  },

  // Sanitiza dados legados para evitar quebras por registros antigos
  sanitizeDatabase(database) {
    const db = database;
    db.clientes = Array.isArray(db.clientes) ? db.clientes : [];
    db.funcionarios = Array.isArray(db.funcionarios) ? db.funcionarios : [];
    db.servicos = Array.isArray(db.servicos) ? db.servicos : [];
    db.estoque = Array.isArray(db.estoque) ? db.estoque : [];
    db.ordens = Array.isArray(db.ordens) ? db.ordens : [];
    db.vendas_pecas = Array.isArray(db.vendas_pecas) ? db.vendas_pecas : [];
    db.usuarios = Array.isArray(db.usuarios) && db.usuarios.length > 0 ? db.usuarios : [
      { nome: "Admin", user: "admin", pass: "123" }
    ];

    // Corrige ordens antigas que possam ter campos em formato não padronizado
    db.ordens.forEach(o => {
      if (!o) return;
      if (!Array.isArray(o.itens)) o.itens = [];
      if (!o.status) o.status = "Concluído";
      if (!o.pagamento) o.pagamento = "PIX";
      if (!o.total) o.total = 0;
    });

    db.vendas_pecas.forEach(v => {
      if (!v) return;
      if (!Array.isArray(v.itens)) v.itens = [];
      if (!v.pagamento) v.pagamento = "PIX";
      if (!v.total) v.total = 0;
    });

    return db;
  }
};

// ============================================================================
// 2. STATE & DATABASE REPOSITORY
// ============================================================================
let db = StorageService.sanitizeDatabase({
  clientes: StorageService.safeLoad(StorageService.KEYS.CLIENTES, []),
  funcionarios: StorageService.safeLoad(StorageService.KEYS.FUNCIONARIOS, []),
  servicos: StorageService.safeLoad(StorageService.KEYS.SERVICOS, []),
  estoque: StorageService.safeLoad(StorageService.KEYS.ESTOQUE, []),
  ordens: StorageService.safeLoad(StorageService.KEYS.ORDENS, []),
  vendas_pecas: StorageService.safeLoad(StorageService.KEYS.VENDAS, []),
  usuarios: StorageService.safeLoad(StorageService.KEYS.USUARIOS, [
    { nome: "Admin", user: "admin", pass: "123" }
  ])
});

let currentSection = 'dashboard';
let currentFilterStatus = 'TODOS';
let editIndex = null;
let chartInstances = {};

function saveAll() {
  StorageService.save(StorageService.KEYS.CLIENTES, db.clientes);
  StorageService.save(StorageService.KEYS.FUNCIONARIOS, db.funcionarios);
  StorageService.save(StorageService.KEYS.SERVICOS, db.servicos);
  StorageService.save(StorageService.KEYS.ESTOQUE, db.estoque);
  StorageService.save(StorageService.KEYS.ORDENS, db.ordens);
  StorageService.save(StorageService.KEYS.VENDAS, db.vendas_pecas);
  StorageService.save(StorageService.KEYS.USUARIOS, db.usuarios);
}

// Normalizador de chaves: garante compatibilidade plena entre singular e plural
function normalizeSectionKey(sec) {
  if (sec === 'ordem' || sec === 'ordens') return 'ordens';
  if (sec === 'venda_pecas' || sec === 'vendas_pecas') return 'vendas_pecas';
  return sec;
}

// Utilitário para atualizar texto de forma segura sem estourar exceções
function setElementText(id, text) {
  const el = document.getElementById(id);
  if (el) el.innerText = text;
}

// ============================================================================
// 3. INVENTORY SERVICE (Controle de Estoque, Baixa, Estorno e Margens)
// ============================================================================
const InventoryService = {
  deductStock(items) {
    if (!Array.isArray(items)) return;
    items.forEach(it => {
      if (it && it.brand) {
        const itemEstoque = db.estoque.find(e => e.modelo === it.nome && e.marca === it.brand);
        if (itemEstoque) {
          const saldoAtual = parseInt(itemEstoque.qtd) || 0;
          const qtdVendida = parseInt(it.qtd) || 0;
          itemEstoque.qtd = Math.max(0, saldoAtual - qtdVendida);
        }
      }
    });
  },

  restoreStock(items) {
    if (!Array.isArray(items)) return;
    items.forEach(it => {
      if (it && it.brand) {
        const itemEstoque = db.estoque.find(e => e.modelo === it.nome && e.marca === it.brand);
        if (itemEstoque) {
          const saldoAtual = parseInt(itemEstoque.qtd) || 0;
          const qtdEstorno = parseInt(it.qtd) || 0;
          itemEstoque.qtd = saldoAtual + qtdEstorno;
        }
      }
    });
  },

  checkAvailability(items) {
    if (!Array.isArray(items)) return { available: true };
    for (const it of items) {
      if (it && it.brand) {
        const itemEstoque = db.estoque.find(e => e.modelo === it.nome && e.marca === it.brand);
        const qtdPedida = parseInt(it.qtd) || 0;
        if (itemEstoque && (parseInt(itemEstoque.qtd) || 0) < qtdPedida) {
          return {
            available: false,
            message: `Estoque insuficiente para "${it.nome} (${it.brand})". Saldo atual: ${itemEstoque.qtd}, Solicitado: ${qtdPedida}.`
          };
        }
      }
    }
    return { available: true };
  }
};

// ============================================================================
// 4. AUTENTICAÇÃO E CONTROLE DE ACESSO
// ============================================================================
function handleLogin() {
  const uInput = document.getElementById('loginUser');
  const pInput = document.getElementById('loginPass');
  const u = uInput ? uInput.value.trim() : '';
  const p = pInput ? pInput.value.trim() : '';

  const user = db.usuarios.find(x => x.user === u && x.pass === p);

  if (user) {
    const overlay = document.getElementById('login-overlay');
    if (overlay) overlay.style.display = 'none';
    setElementText('welcomeName', user.nome);
    updateDashboard();
  } else {
    const err = document.getElementById('login-err');
    if (err) {
      err.style.display = 'block';
      setTimeout(() => err.style.display = 'none', 2500);
    }
  }
}

function handleLogout() {
  if (confirm("Deseja realmente sair da sua sessão?")) {
    const uInput = document.getElementById('loginUser');
    const pInput = document.getElementById('loginPass');
    if (uInput) uInput.value = '';
    if (pInput) pInput.value = '';
    const overlay = document.getElementById('login-overlay');
    if (overlay) overlay.style.display = 'flex';
  }
}

// ============================================================================
// 5. NAVEGAÇÃO ENTRE MÓDULOS E FILTRAGEM
// ============================================================================
function showSection(sec, el) {
  currentSection = sec;
  currentFilterStatus = 'TODOS';
  document.querySelectorAll('.nav-item, .menu-item').forEach(item => item.classList.remove('active'));
  if (el) el.classList.add('active');

  const titles = {
    dashboard: "Painel Geral e Indicadores",
    ordem: "Ordens de Serviço e Pedidos",
    ordens: "Ordens de Serviço e Pedidos",
    venda_pecas: "Vendas de Peças (Balcão)",
    vendas_pecas: "Vendas de Peças (Balcão)",
    clientes: "Gestão de Clientes",
    funcionarios: "Equipe e Mecânicos",
    servicos: "Catálogo de Serviços",
    estoque: "Controle de Estoque & Peças",
    usuarios: "Usuários e Segurança"
  };

  setElementText('page-title', titles[sec] || "Auto Vidros Pro");

  const secDash = document.getElementById('sec-dashboard');
  const secTab = document.getElementById('sec-tabelas');
  if (secDash) secDash.classList.add('hidden');
  if (secTab) secTab.classList.add('hidden');

  const filterContainer = document.getElementById('filter-pills-container');
  if (filterContainer) {
    filterContainer.style.display = (sec === 'ordens' || sec === 'ordem') ? 'flex' : 'none';
  }

  if (sec === 'dashboard') {
    if (secDash) secDash.classList.remove('hidden');
    updateDashboard();
  } else {
    if (secTab) secTab.classList.remove('hidden');
    const search = document.getElementById('mainSearch');
    if (search) search.value = '';
    renderTable();
  }
}

function setFilterStatus(status, btn) {
  currentFilterStatus = status;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderTable();
}

// ============================================================================
// 6. RENDERIZAÇÃO DE TABELAS (Design Resiliente)
// ============================================================================
function renderTable() {
  const head = document.getElementById('table-head');
  const body = document.getElementById('table-body');
  if (!head || !body || typeof body.appendChild !== 'function') return;
  body.innerHTML = '';

  const dbKey = normalizeSectionKey(currentSection);

  const configs = {
    clientes: {
      headers: ['Nome Completo', 'CPF', 'Telefone / WhatsApp', 'Endereço'],
      fields: ['nome', 'cpf', 'tel', 'endereco']
    },
    funcionarios: {
      headers: ['Nome', 'Cargo / Função', 'CPF', 'Telefone'],
      fields: ['nome', 'funcao', 'cpf', 'tel']
    },
    servicos: {
      headers: ['Descrição do Serviço', 'Preço Sugerido (R$)'],
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

  const cfg = configs[dbKey];
  if (!cfg) return;

  head.innerHTML = `<tr>${cfg.headers.map(h => `<th>${h}</th>`).join('')}<th style="text-align:center; width:160px;">Ações</th></tr>`;

  let lista = db[dbKey] || [];

  if (dbKey === 'ordens' && currentFilterStatus !== 'TODOS') {
    lista = lista.filter(item => (item.status || 'Orçamento') === currentFilterStatus);
  }

  if (lista.length === 0) {
    body.innerHTML = `<tr><td colspan="${cfg.headers.length + 1}" style="text-align:center; padding:35px; color:#94a3b8;">Nenhum registro encontrado nesta visualização.</td></tr>`;
    return;
  }

  lista.forEach((item, i) => {
    if (!item) return;
    const tr = document.createElement('tr');

    let colsHtml = cfg.fields.map(f => {
      let val = item[f] !== undefined && item[f] !== null ? item[f] : '-';

      if (f === 'preco' || f === 'custo' || f === 'total') {
        val = `R$ ${parseFloat(val || 0).toFixed(2)}`;
      }

      if (f === 'dataHora') {
        val = item.dataHora || item.data || '-';
      }

      if (f === 'margem') {
        const custo = parseFloat(item.custo) || 0;
        const venda = parseFloat(item.preco) || 0;
        const mg = custo > 0 ? (((venda - custo) / custo) * 100).toFixed(1) : '100.0';
        val = `<span style="font-weight:700; color:#15803d;">+${mg}%</span>`;
      }

      if (f === 'status' && dbKey === 'estoque') {
        const min = parseInt(item.minimo) || 2;
        const qtd = parseInt(item.qtd) || 0;
        val = qtd <= min
          ? `<span class="status-pill status-cancelado"><i class="fas fa-triangle-exclamation"></i> Baixo (${qtd})</span>`
          : `<span class="status-pill status-concluido"><i class="fas fa-check"></i> Normal (${qtd})</span>`;
      }

      if (f === 'status' && dbKey === 'ordens') {
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
    if (['ordens', 'vendas_pecas'].includes(dbKey)) {
      acoes += `<button class="btn-action btn-wpp" onclick="enviarWhatsApp(${i})" title="Enviar WhatsApp"><i class="fab fa-whatsapp"></i></button>`;
      acoes += `<button class="btn-action btn-light-ui" onclick="gerarPDF(${i})" title="Imprimir PDF"><i class="fas fa-file-pdf"></i></button>`;
    }
    acoes += `<button class="btn-action btn-light-ui" onclick="openModal(${i})" title="Editar"><i class="fas fa-edit text-primary"></i></button>`;
    acoes += `<button class="btn-action btn-danger-ui" onclick="deleteItem(${i})" title="Excluir"><i class="fas fa-trash"></i></button>`;
    acoes += `</div>`;

    tr.innerHTML = colsHtml + `<td>${acoes}</td>`;
    body.appendChild(tr);
  });
}

// ============================================================================
// 7. TRANSIÇÃO DE STATUS DA OS COM CONTROLE DE ESTOQUE
// ============================================================================
function alterarStatusOS(index, novoStatus) {
  const os = db.ordens[index];
  if (!os) return;

  const statusAnterior = os.status || 'Orçamento';
  if (statusAnterior === novoStatus) return;

  // Se estava em Orçamento e foi Aprovada (Em Andamento ou Concluído) -> Baixa estoque
  if (statusAnterior === 'Orçamento' && (novoStatus === 'Em Andamento' || novoStatus === 'Concluído')) {
    InventoryService.deductStock(os.itens);
  }

  // Se estava em execução/concluído e foi Cancelada -> Estorna estoque
  if ((statusAnterior === 'Em Andamento' || statusAnterior === 'Concluído') && novoStatus === 'Cancelado') {
    InventoryService.restoreStock(os.itens);
  }

  os.status = novoStatus;
  saveAll();
  try { renderTable(); } catch (e) { console.warn("[UI] Erro renderTable em alterarStatusOS:", e); }
  try { updateDashboard(); } catch (e) { console.warn("[UI] Erro updateDashboard em alterarStatusOS:", e); }
}

// ============================================================================
// 8. MODAL DINÂMICO E CALCULADORA DE PREÇO X CUSTO
// ============================================================================
function openModal(index = null) {
  editIndex = index;
  const fields = document.getElementById('modal-fields');
  const modal = document.getElementById('modal');
  if (!fields || !modal) return;
  fields.innerHTML = '';
  modal.style.display = 'flex';

  const dbKey = normalizeSectionKey(currentSection);
  const d = index !== null ? (db[dbKey] || [])[index] : {};
  setElementText('modal-title', index !== null ? `Editar Registro` : `Novo Cadastro`);

  if (dbKey === 'clientes') {
    fields.innerHTML = `
      <div class="form-group-ui"><label>Nome Completo do Cliente *</label><input id="f1" value="${d.nome || ''}"></div>
      <div style="display:flex; gap:10px;">
        <div class="form-group-ui" style="flex:1;"><label>CPF</label><input id="f2" placeholder="000.000.000-00" value="${d.cpf || ''}"></div>
        <div class="form-group-ui" style="flex:1;"><label>RG</label><input id="f3" value="${d.rg || ''}"></div>
      </div>
      <div class="form-group-ui"><label>Telefone / WhatsApp *</label><input id="f4" placeholder="(21) 90000-0000" value="${d.tel || ''}"></div>
      <div class="form-group-ui"><label>Endereço Completo</label><textarea id="f5" rows="2">${d.endereco || ''}</textarea></div>
    `;
  } else if (dbKey === 'funcionarios') {
    fields.innerHTML = `
      <div class="form-group-ui"><label>Nome do Funcionário *</label><input id="f1" value="${d.nome || ''}"></div>
      <div class="form-group-ui"><label>Função / Especialidade *</label><input id="f2" placeholder="Ex: Mecânico Instalador" value="${d.funcao || ''}"></div>
      <div style="display:flex; gap:10px;">
        <div class="form-group-ui" style="flex:1;"><label>CPF</label><input id="f3" value="${d.cpf || ''}"></div>
        <div class="form-group-ui" style="flex:1;"><label>Telefone</label><input id="f4" value="${d.tel || ''}"></div>
      </div>
    `;
  } else if (dbKey === 'estoque') {
    const custoIni = d.custo !== undefined ? d.custo : '';
    const precoIni = d.preco !== undefined ? d.preco : '';
    fields.innerHTML = `
      <div style="display:flex; gap:10px;">
        <div class="form-group-ui" style="flex:1;"><label>Marca / Fabricante *</label><input id="fMarca" placeholder="Ex: Pilkington, Sekurit, AGC" value="${d.marca || ''}"></div>
        <div class="form-group-ui" style="flex:2;"><label>Modelo / Descrição *</label><input id="fModelo" placeholder="Ex: Parabrisa Dianteiro Onix 2020/2023" value="${d.modelo || ''}"></div>
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

  } else if (dbKey === 'servicos') {
    fields.innerHTML = `
      <div class="form-group-ui"><label>Descrição do Serviço *</label><input id="f1" placeholder="Ex: Instalação Parabrisa com Cola PU" value="${d.nome || ''}"></div>
      <div class="form-group-ui"><label>Preço Sugerido (R$) *</label><input id="f2" type="number" step="0.01" value="${d.preco || ''}"></div>
    `;
  } else if (dbKey === 'usuarios') {
    fields.innerHTML = `
      <div class="form-group-ui"><label>Nome do Colaborador *</label><input id="f1" value="${d.nome || ''}"></div>
      <div class="form-group-ui"><label>Login de Acesso *</label><input id="f2" value="${d.user || ''}"></div>
      <div class="form-group-ui"><label>Senha *</label><input id="f3" type="password" value="${d.pass || ''}"></div>
    `;
  } else if (dbKey === 'vendas_pecas') {
    // Datalist de Clientes para permitir selecionar ou digitar novo
    const datalistOptions = db.clientes.map(c => `<option value="${c.nome}">`).join('');
    fields.innerHTML = `
      <datalist id="clientes-list">${datalistOptions}</datalist>
      <div style="display:flex; gap:10px;">
        <div class="form-group-ui" style="flex:2;">
          <label>Cliente (Selecione ou digite um novo)</label>
          <input id="f1" list="clientes-list" placeholder="Consumidor Final" value="${d.cliente || 'Consumidor Final'}">
        </div>
        <div class="form-group-ui" style="flex:1;">
          <label>Forma de Pagamento</label>
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
        <h4 style="font-size:13px; font-weight:700; margin-bottom:10px;"><i class="fas fa-boxes-stacked text-primary"></i> Peças da Venda</h4>
        <div id="venda-rows"></div>
        <button type="button" class="btn-ui btn-light-ui btn-action mt-2" onclick="addItemRow('venda-rows', true)"><i class="fas fa-plus"></i> Adicionar Peça</button>
      </div>
      <h3 style="margin-top:20px; font-size:16px; color:var(--primary);">Total da Venda: R$ <span id="displayTotal">0.00</span></h3>
      <input type="hidden" id="fTotal" value="0">
    `;
    if (index === null || !Array.isArray(d.itens) || d.itens.length === 0) addItemRow('venda-rows', true);
    else d.itens.forEach(it => addItemRow('venda-rows', true, it));

  } else if (dbKey === 'ordens') {
    // Datalists para Cliente e Mecânico
    const cliDatalist = db.clientes.map(c => `<option value="${c.nome}">`).join('');
    const mecOptions = db.funcionarios.map(f => `<option value="${f.nome}" ${d.mecanico === f.nome ? 'selected' : ''}>${f.nome}</option>`).join('');

    fields.innerHTML = `
      <datalist id="clientes-list">${cliDatalist}</datalist>
      <div style="display:flex; gap:10px;">
        <div class="form-group-ui" style="flex:2;">
          <label>Cliente (Selecione ou digite um novo) *</label>
          <input id="f1" list="clientes-list" placeholder="Consumidor Final" value="${d.cliente || 'Consumidor Final'}">
        </div>
        <div class="form-group-ui" style="flex:1;">
          <label>Mecânico Responsável</label>
          <select id="fMec">
            <option value="Geral / Oficina">Geral / Oficina</option>
            ${mecOptions}
          </select>
        </div>
      </div>

      <div style="display:flex; gap:10px;">
        <div class="form-group-ui" style="flex:1.5;"><label>Veículo / Modelo / Placa *</label><input id="f2" placeholder="Ex: Onix 2021 - ABC-1234" value="${d.veiculo || ''}"></div>
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
        <div class="form-group-ui" style="flex:1;"><label>Forma Pagamento</label>
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
        <h4 style="font-size:13px; font-weight:700; margin-bottom:10px;"><i class="fas fa-tools text-primary"></i> Itens, Serviços e Peças</h4>
        <div id="os-rows"></div>
        <div style="display:flex; gap:8px; margin-top:8px;">
          <button type="button" class="btn-ui btn-light-ui btn-action" onclick="addItemRow('os-rows', false)"><i class="fas fa-wrench"></i> + Serviço</button>
          <button type="button" class="btn-ui btn-light-ui btn-action" onclick="addItemRow('os-rows', true)"><i class="fas fa-box"></i> + Peça</button>
        </div>
      </div>

      <h3 style="margin-top:20px; font-size:16px; color:var(--primary);">Total Geral: R$ <span id="displayTotal">0.00</span></h3>
      <input type="hidden" id="fTotal" value="0">
    `;

    if (index === null || !Array.isArray(d.itens) || d.itens.length === 0) {
      addItemRow('os-rows', false); // Adiciona 1 serviço por padrão
    } else {
      d.itens.forEach(it => addItemRow('os-rows', !!it.brand, it));
    }
  }
  calcTotal();
}

// Funções da Calculadora de Preço x Custo
function calcularPorMargem() {
  const cEl = document.getElementById('calcCusto');
  const mEl = document.getElementById('calcMargem');
  const vEl = document.getElementById('fPrecoVenda');
  const dEl = document.getElementById('displayLucroUnitario');
  if (!cEl || !mEl || !vEl) return;

  const custo = parseFloat(cEl.value) || 0;
  const margem = parseFloat(mEl.value) || 0;
  const venda = custo * (1 + margem / 100);
  const lucro = venda - custo;

  vEl.value = venda.toFixed(2);
  if (dEl) dEl.innerText = `R$ ${lucro.toFixed(2)} (+${margem.toFixed(1)}%)`;
}

function calcularPorPrecoVenda() {
  const cEl = document.getElementById('calcCusto');
  const mEl = document.getElementById('calcMargem');
  const vEl = document.getElementById('fPrecoVenda');
  const dEl = document.getElementById('displayLucroUnitario');
  if (!cEl || !vEl) return;

  const custo = parseFloat(cEl.value) || 0;
  const venda = parseFloat(vEl.value) || 0;
  const lucro = venda - custo;
  const margem = custo > 0 ? ((lucro / custo) * 100) : 0;

  if (mEl && custo > 0) mEl.value = Math.round(margem);
  if (dEl) dEl.innerText = `R$ ${lucro.toFixed(2)} (+${margem.toFixed(1)}%)`;
}

// Inclusão de Linhas de Item com suporte a catálogo E digitação livre
function addItemRow(containerId, isPart, data = null) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const div = document.createElement('div');
  div.className = 'item-row-ui';

  const catalogo = isPart ? db.estoque : db.servicos;
  let datalistId = 'dl_' + Math.random().toString(36).substring(7);

  let datalistOptions = '';
  if (isPart) {
    datalistOptions = catalogo.map(e => `<option value="${e.modelo}">${e.modelo} (${e.marca}) - R$ ${parseFloat(e.preco).toFixed(2)}</option>`).join('');
  } else {
    datalistOptions = catalogo.map(s => `<option value="${s.nome}">${s.nome} - R$ ${parseFloat(s.preco).toFixed(2)}</option>`).join('');
  }

  const nomeInicial = data ? data.nome : (isPart ? 'Parabrisa / Peça' : 'Mão de Obra / Serviço');
  const precoInicial = data ? parseFloat(data.preco).toFixed(2) : (isPart ? '150.00' : '80.00');
  const qtdInicial = data ? data.qtd : 1;
  const brandVal = data ? (data.brand || '') : (isPart ? 'Geral' : '');

  div.innerHTML = `
    <datalist id="${datalistId}">${datalistOptions}</datalist>
    <div style="position:relative;">
      <input type="text" class="item-name" list="${datalistId}" placeholder="${isPart ? 'Nome da Peça / Vidro' : 'Descrição do Serviço'}" value="${nomeInicial}" onchange="onItemNameChange(this, ${isPart})">
      <input type="hidden" class="item-brand" value="${brandVal}">
    </div>
    <input type="number" class="item-qty" value="${qtdInicial}" min="1" oninput="calcTotal()" placeholder="Qtd">
    <input type="number" step="0.01" class="item-price" value="${precoInicial}" oninput="calcTotal()" placeholder="Preço (R$)">
    <button type="button" class="btn-ui btn-danger-ui btn-action" onclick="this.closest('.item-row-ui').remove(); calcTotal();"><i class="fas fa-times"></i></button>
  `;
  container.appendChild(div);
  calcTotal();
}

function onItemNameChange(input, isPart) {
  const row = input.closest('.item-row-ui');
  if (!row) return;
  const val = input.value.trim();
  const priceInput = row.querySelector('.item-price');
  const brandInput = row.querySelector('.item-brand');

  if (isPart) {
    const itemEstoque = db.estoque.find(e => e.modelo.toLowerCase() === val.toLowerCase());
    if (itemEstoque) {
      if (priceInput) priceInput.value = parseFloat(itemEstoque.preco).toFixed(2);
      if (brandInput) brandInput.value = itemEstoque.marca || '';
    }
  } else {
    const itemServ = db.servicos.find(s => s.nome.toLowerCase() === val.toLowerCase());
    if (itemServ && priceInput) {
      priceInput.value = parseFloat(itemServ.preco).toFixed(2);
    }
  }
  calcTotal();
}

function calcTotal() {
  let total = 0;
  document.querySelectorAll('.item-row-ui, .item-row').forEach(row => {
    const qtyInput = row.querySelector('.item-qty');
    const priceInput = row.querySelector('.item-price');
    const qtd = parseInt(qtyInput ? qtyInput.value : 1) || 1;
    const price = parseFloat(priceInput ? priceInput.value : 0) || 0;
    total += (price * qtd);
  });

  setElementText('displayTotal', total.toFixed(2));
  const f = document.getElementById('fTotal');
  if (f) f.value = total.toFixed(2);
}

// ============================================================================
// 9. TRANSAÇÃO DE SALVAMENTO BLINDADA (Senior Backend-Level)
// ============================================================================
function handleSave() {
  const getVal = (id) => {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
  };

  const dbKey = normalizeSectionKey(currentSection);
  db[dbKey] = Array.isArray(db[dbKey]) ? db[dbKey] : [];

  let obj = {};

  // --- TRATAMENTO PARA ORDENS DE SERVIÇO E VENDAS ---
  if (dbKey === 'ordens' || dbKey === 'vendas_pecas') {
    const items = [];
    const rows = document.querySelectorAll('.item-row-ui, .item-row');

    rows.forEach(row => {
      const nameInput = row.querySelector('.item-name');
      const selectElem = row.querySelector('.item-select');
      const brandInput = row.querySelector('.item-brand');
      const qtyInput = row.querySelector('.item-qty');
      const priceInput = row.querySelector('.item-price');

      const qtd = parseInt(qtyInput ? qtyInput.value : 0) || 0;
      const preco = parseFloat(priceInput ? priceInput.value : 0) || 0;

      let nome = '';
      let brand = brandInput ? brandInput.value : '';

      if (nameInput && nameInput.value.trim()) {
        nome = nameInput.value.trim();
      } else if (selectElem && selectElem.selectedIndex > 0 && selectElem.options[selectElem.selectedIndex]) {
        const opt = selectElem.options[selectElem.selectedIndex];
        nome = opt.getAttribute('data-name') || opt.text || 'Item';
        brand = opt.getAttribute('data-brand') || brand;
      } else {
        nome = dbKey === 'ordens' ? "Serviço Prestado" : "Peça Avulsa";
      }

      // Se possui quantidade e valor positivo, adiciona
      if (qtd > 0 && preco >= 0) {
        items.push({ nome, brand, qtd, preco });
      }
    });

    if (items.length === 0) {
      alert("Por favor, informe pelo menos um serviço ou peça com quantidade e preço.");
      return;
    }

    // Validação de estoque para peças
    const statusFinal = getVal('fStatus') || 'Concluído';
    if (editIndex === null && statusFinal !== 'Orçamento') {
      const stockCheck = InventoryService.checkAvailability(items);
      if (!stockCheck.available) {
        alert(stockCheck.message);
        return;
      }
      InventoryService.deductStock(items);
    }

    const clienteNome = getVal('f1') || "Consumidor Final";
    const veiculoVal = getVal('f2') || (dbKey === 'ordens' ? "Veículo Geral" : "");

    const agora = new Date();
    const dataHoraFmt = `${agora.toLocaleDateString('pt-BR')} ${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

    obj = {
      id: editIndex !== null ? db[dbKey][editIndex].id : ((dbKey === 'ordens' ? 'OS-' : 'VP-') + Math.floor(1000 + Math.random() * 9000)),
      dataHora: editIndex !== null ? (db[dbKey][editIndex].dataHora || db[dbKey][editIndex].data) : dataHoraFmt,
      cliente: clienteNome,
      pagamento: getVal('fPag') || 'PIX',
      total: parseFloat(getVal('fTotal')) || 0,
      itens: items
    };

    if (dbKey === 'ordens') {
      obj.mecanico = getVal('fMec') || 'Geral / Oficina';
      obj.veiculo = veiculoVal;
      obj.km = getVal('fKm') || '-';
      obj.status = statusFinal;
    }

    // Auto-cadastro de cliente se ainda não existir
    if (clienteNome && clienteNome !== "Consumidor Final" && !db.clientes.some(c => c.nome.toLowerCase() === clienteNome.toLowerCase())) {
      db.clientes.push({ nome: clienteNome, tel: "", cpf: "", endereco: "" });
    }

  // --- TRATAMENTO PARA DEMAIS CADASTROS ---
  } else if (dbKey === 'clientes') {
    if (!getVal('f1')) return alert("O Nome do cliente é obrigatório.");
    obj = { nome: getVal('f1'), cpf: getVal('f2'), rg: getVal('f3'), tel: getVal('f4'), endereco: getVal('f5') };

  } else if (dbKey === 'funcionarios') {
    if (!getVal('f1')) return alert("O Nome do funcionário é obrigatório.");
    obj = { nome: getVal('f1'), funcao: getVal('f2'), cpf: getVal('f3'), tel: getVal('f4') };

  } else if (dbKey === 'estoque') {
    if (!getVal('fMarca') || !getVal('fModelo')) return alert("Marca e Modelo são obrigatórios.");
    obj = {
      marca: getVal('fMarca'),
      modelo: getVal('fModelo'),
      custo: parseFloat(getVal('calcCusto')) || 0,
      preco: parseFloat(getVal('fPrecoVenda')) || 0,
      qtd: parseInt(getVal('fQtd')) || 0,
      minimo: parseInt(getVal('fMinimo')) || 2
    };

  } else if (dbKey === 'servicos') {
    if (!getVal('f1')) return alert("A descrição do serviço é obrigatória.");
    obj = { nome: getVal('f1'), preco: parseFloat(getVal('f2')) || 0 };

  } else if (dbKey === 'usuarios') {
    if (!getVal('f1') || !getVal('f2') || !getVal('f3')) return alert("Preencha Nome, Login e Senha.");
    obj = { nome: getVal('f1'), user: getVal('f2'), pass: getVal('f3') };
  }

  // Persiste a alteração no repositório de dados
  if (editIndex !== null) {
    db[dbKey][editIndex] = obj;
  } else {
    db[dbKey].push(obj);
  }

  saveAll();
  closeModal();
  alert(dbKey === 'ordens' ? 'Ordem de Serviço salva com sucesso!' : 'Registro salvo com sucesso!');

  // Atualizações de tela isoladas contra falhas de renderização
  try { renderTable(); } catch (e) { console.warn("[UI] Erro renderTable:", e); }
  try { updateDashboard(); } catch (e) { console.warn("[UI] Erro updateDashboard:", e); }
}

function deleteItem(i) {
  const dbKey = normalizeSectionKey(currentSection);
  const item = (db[dbKey] || [])[i];
  if (!item) return;

  if (confirm("Deseja realmente excluir este registro?")) {
    if (['ordens', 'vendas_pecas'].includes(dbKey) && item.itens && item.itens.length > 0) {
      if (item.status !== 'Orçamento' && item.status !== 'Cancelado') {
        if (confirm("Deseja devolver a quantidade das peças excluídas de volta ao estoque?")) {
          InventoryService.restoreStock(item.itens);
        }
      }
    }
    db[dbKey].splice(i, 1);
    saveAll();
    renderTable();
    updateDashboard();
  }
}

function closeModal() {
  const modal = document.getElementById('modal');
  if (modal) modal.style.display = 'none';
}

// ============================================================================
// 10. DASHBOARD E PAINEL DE INDICADORES
// ============================================================================
function updateDashboard() {
  const ordens = Array.isArray(db.ordens) ? db.ordens : [];
  const vendas = Array.isArray(db.vendas_pecas) ? db.vendas_pecas : [];
  const clientes = Array.isArray(db.clientes) ? db.clientes : [];

  const fatOS = ordens.filter(o => o && o.status === 'Concluído').reduce((a, b) => a + (parseFloat(b.total) || 0), 0);
  const fatVP = vendas.reduce((a, b) => a + (parseFloat(b.total) || 0), 0);
  const totalOrcamentos = ordens.filter(o => o && o.status === 'Orçamento').reduce((a, b) => a + (parseFloat(b.total) || 0), 0);

  setElementText('dash-faturamento', `R$ ${fatOS.toFixed(2)}`);
  setElementText('dash-faturamento-pecas', `R$ ${fatVP.toFixed(2)}`);
  setElementText('dash-os-count', ordens.filter(o => o && o.status === 'Concluído').length);
  setElementText('dash-cli-count', clientes.length);
  setElementText('dash-orcamentos-total', `R$ ${totalOrcamentos.toFixed(2)}`);

  renderCharts();
}

function renderCharts() {
  const createBarChart = (id, dataObj, label, color) => {
    try {
      const ctx = document.getElementById(id);
      if (!ctx || !window.Chart) return;

      if (chartInstances[id] && typeof chartInstances[id].destroy === 'function') {
        chartInstances[id].destroy();
      }

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
    } catch (e) {
      console.warn(`[Chart.js] Falha ao renderizar ${id}:`, e);
    }
  };

  const pMap = {}, sMap = {}, mMap = {};
  (db.ordens || []).concat(db.vendas_pecas || []).forEach(o => {
    if (o && o.status !== 'Cancelado' && Array.isArray(o.itens)) {
      o.itens.forEach(it => {
        if (it && typeof it === 'object') {
          const nomeItem = it.nome || 'Item';
          if (it.brand) pMap[nomeItem] = (pMap[nomeItem] || 0) + (parseInt(it.qtd) || 0);
          else sMap[nomeItem] = (sMap[nomeItem] || 0) + (parseInt(it.qtd) || 1);
        }
      });
    }
    if (o && o.mecanico && o.mecanico !== 'Geral / Oficina') {
      mMap[o.mecanico] = (mMap[o.mecanico] || 0) + 1;
    }
  });

  createBarChart('chartPecas', pMap, 'Peças Vendidas', '#f59e0b');
  createBarChart('chartServicos', sMap, 'Serviços Prestados', '#2563eb');
  createBarChart('chartMecanicos', mMap, 'Atendimentos Realizados', '#10b981');
}

// ============================================================================
// 11. COMUNICAÇÃO WHATSAPP & IMPRESSÃO DE RECIBOS PDF
// ============================================================================
function enviarWhatsApp(i) {
  const dbKey = normalizeSectionKey(currentSection);
  const item = (db[dbKey] || [])[i];
  if (!item) return;

  const cli = db.clientes.find(c => c.nome === item.cliente);
  let tel = cli ? cli.tel.replace(/\D/g, '') : '';

  if (!tel) {
    const inputTel = prompt("Informe o número de WhatsApp do cliente (com DDD):", "21");
    if (!inputTel) return;
    tel = inputTel.replace(/\D/g, '');
  }

  const isOS = dbKey === 'ordens';
  const tipoDoc = isOS && item.status === 'Orçamento' ? "ORÇAMENTO" : (isOS ? "ORDEM DE SERVIÇO" : "COMPROVANTE DE VENDA");

  let texto = `*THAYNARA AUTO VIDROS* 🚗🔧%0A`;
  texto += `Olá, *${item.cliente}*! Segue o detalhamento do seu *${tipoDoc}*:%0A%0A`;
  texto += `📋 *Identificador:* ${item.id}%0A`;
  texto += `📅 *Data/Hora:* ${item.dataHora || item.data}%0A`;
  if (item.veiculo) texto += `🚘 *Veículo / Placa:* ${item.veiculo}%0A`;
  if (item.km && item.km !== '-') texto += `📍 *KM Atual:* ${item.km}%0A`;
  if (item.status) texto += `⚡ *Status:* ${item.status}%0A`;
  if (item.mecanico && item.mecanico !== 'Geral / Oficina') texto += `👨‍🔧 *Mecânico Responsável:* ${item.mecanico}%0A`;

  texto += `%0A🛠 *Itens e Serviços:*%0A`;
  (item.itens || []).forEach(it => {
    texto += `• ${it.qtd}x ${it.nome} - R$ ${(it.qtd * it.preco).toFixed(2)}%0A`;
  });

  texto += `%0A💰 *VALOR TOTAL: R$ ${parseFloat(item.total || 0).toFixed(2)}*%0A`;
  texto += `💳 *Forma de Pagamento:* ${item.pagamento || 'PIX'}%0A%0A`;
  texto += `Ficamos à disposição para qualquer dúvida ou confirmação! 👍`;

  const link = `https://wa.me/55${tel}?text=${texto}`;
  window.open(link, '_blank');
}

function gerarPDF(i) {
  if (!window.jspdf || !window.jspdf.jsPDF) return alert("Biblioteca jsPDF carregando...");
  const { jsPDF } = window.jspdf;
  const dbKey = normalizeSectionKey(currentSection);
  const data = (db[dbKey] || [])[i];
  if (!data) return;

  const doc = new jsPDF();
  doc.setFontSize(20);
  doc.text("THAYNARA AUTO VIDROS", 105, 20, { align: 'center' });
  doc.setFontSize(9);
  doc.text(`Emissão: ${new Date().toLocaleString('pt-BR')}`, 190, 10, { align: 'right' });
  doc.setFontSize(13);
  doc.text(dbKey === 'ordens' ? `ORDEM DE SERVIÇO (${data.status || 'Em Execução'})` : "COMPROVANTE DE VENDA", 105, 28, { align: 'center' });

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
  const dbKey = normalizeSectionKey(currentSection);
  const lista = db[dbKey] || [];

  doc.setFontSize(14);
  doc.text(`Relatório de ${dbKey.toUpperCase()} - ${new Date().toLocaleDateString('pt-BR')}`, 14, 15);

  if (lista.length === 0) {
    doc.setFontSize(10);
    doc.text("Nenhum dado registrado para esta seção.", 14, 25);
  } else {
    let headers = [];
    let rows = [];

    if (dbKey === 'clientes') {
      headers = ['Nome', 'CPF', 'Telefone', 'Endereço'];
      rows = lista.map(c => [c.nome, c.cpf, c.tel, c.endereco]);
    } else if (dbKey === 'estoque') {
      headers = ['Marca', 'Modelo', 'Custo (R$)', 'Venda (R$)', 'Saldo'];
      rows = lista.map(e => [e.marca, e.modelo, `R$ ${parseFloat(e.custo||0).toFixed(2)}`, `R$ ${parseFloat(e.preco).toFixed(2)}`, e.qtd]);
    } else if (dbKey === 'ordens') {
      headers = ['Nº OS', 'Data', 'Cliente', 'Veículo', 'Status', 'Pagamento', 'Total'];
      rows = lista.map(o => [o.id, o.dataHora || o.data, o.cliente, o.veiculo, o.status || 'Orçamento', o.pagamento || 'PIX', `R$ ${parseFloat(o.total).toFixed(2)}`]);
    } else if (dbKey === 'vendas_pecas') {
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

  doc.save(`Relatorio_${dbKey}.pdf`);
}

function filtrarTabela() {
  const termo = document.getElementById('mainSearch').value.toLowerCase();
  document.querySelectorAll('#table-body tr').forEach(tr => {
    tr.style.display = tr.innerText.toLowerCase().includes(termo) ? '' : 'none';
  });
}

// ============================================================================
// 12. BACKUP E RESTAURAÇÃO DE DADOS
// ============================================================================
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
          db = StorageService.sanitizeDatabase(imported);
          saveAll();
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

window.db = db;
window.StorageService = StorageService;
window.InventoryService = InventoryService;
