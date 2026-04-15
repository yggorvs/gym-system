// public/js/app.js

const API = 'http://localhost:3000/api';

// ============================================================
// NAVEGAÇÃO
// ============================================================
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const page = link.dataset.page;

    // Atualiza links ativos
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    link.classList.add('active');

    // Mostra a página correta
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`page-${page}`).classList.add('active');

    // Carrega dados da página
    carregarPagina(page);
  });
});

function carregarPagina(page) {
  switch(page) {
    case 'dashboard': carregarDashboard(); break;
    case 'alunos': carregarAlunos(); break;
    case 'planos': carregarPlanos(); break;
    case 'presencas': carregarPresencas(); carregarSelectAlunos(); break;
    case 'pagamentos': carregarPagamentos(); carregarSelectAlunos(); break;
  }
}

// ============================================================
// MODAIS
// ============================================================
function openModal(id) {
  document.getElementById(id).classList.add('active');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
  // Limpa formulários
  const form = document.getElementById(id)?.querySelector('form');
  if (form) form.reset();
}

// Fecha modal ao clicar fora
document.querySelectorAll('.modal').forEach(modal => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('active');
    }
  });
});

// ============================================================
// TOAST NOTIFICATIONS
// ============================================================
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast toast-${type} show`;

  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// ============================================================
// FORMATAÇÃO
// ============================================================
function formatCurrency(value) {
  return `R$ ${parseFloat(value).toFixed(2).replace('.', ',')}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

function formatTime(timeStr) {
  if (!timeStr) return '-';
  return timeStr.substring(0, 5);
}

// ============================================================
// DASHBOARD
// ============================================================
async function carregarDashboard() {
  try {
    const res = await fetch(`${API}/dashboard`);
    const data = await res.json();

    document.getElementById('dash-total-alunos').textContent = data.totalAlunos;
    document.getElementById('dash-presencas-hoje').textContent = data.totalPresencasHoje;
    document.getElementById('dash-receita-mes').textContent = formatCurrency(data.receitaMes);

    // Média dos últimos 6 meses
    const media = data.faturamentoPorMes.length > 0
      ? data.faturamentoPorMes.reduce((acc, m) => acc + m.total, 0) / data.faturamentoPorMes.length
      : 0;
    document.getElementById('dash-media-mensal').textContent = formatCurrency(media);

    // Planos populares
    const planosContainer = document.getElementById('dash-planos-populares');
    const maxAlunos = Math.max(...data.planosPopulares.map(p => p.total), 1);

    planosContainer.innerHTML = data.planosPopulares.map(p => `
      <div class="popular-item">
        <span>${p.nome}</span>
        <div style="flex:1; margin: 0 12px; background:#e2e8f0; border-radius:4px; height:8px;">
          <div class="bar" style="width: ${(p.total / maxAlunos) * 100}%"></div>
        </div>
        <strong>${p.total}</strong>
      </div>
    `).join('');

    // Gráfico de faturamento
    const chartContainer = document.getElementById('dash-faturamento');
    const maxFaturamento = Math.max(...data.faturamentoPorMes.map(m => m.total), 1);

    chartContainer.innerHTML = `
      <div class="faturamento-chart">
        ${data.faturamentoPorMes.reverse().map(m => `
          <div class="chart-bar" style="height: ${(m.total / maxFaturamento) * 100}%">
            <span class="value">${formatCurrency(m.total)}</span>
            <span>${m.mes}</span>
          </div>
        `).join('')}
      </div>
    `;

  } catch (error) {
    console.error('Erro ao carregar dashboard:', error);
    showToast('Erro ao carregar dashboard', 'error');
  }
}

// ============================================================
// ALUNOS
// ============================================================
async function carregarAlunos() {
  try {
    const res = await fetch(`${API}/alunos`);
    const alunos = await res.json();
    renderizarAlunos(alunos);
  } catch (error) {
    console.error('Erro ao carregar alunos:', error);
  }
}

function renderizarAlunos(alunos) {
  const tbody = document.getElementById('tabela-alunos');

  if (alunos.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="loading">Nenhum aluno encontrado</td></tr>';
    return;
  }

  tbody.innerHTML = alunos.map(a => `
    <tr>
      <td><strong>${a.nome}</strong></td>
      <td>${a.email || '-'}</td>
      <td>${a.telefone || '-'}</td>
      <td>${a.plano_nome || 'Sem plano'}</td>
      <td>${formatDate(a.data_inicio)}</td>
      <td>${formatDate(a.data_fim)}</td>
      <td><span class="badge badge-${a.status}">${a.status}</span></td>
      <td>
        <button class="btn-icon" onclick="editarAluno(${a.id})" title="Editar">✏️</button>
        <button class="btn-icon" onclick="deletarAluno(${a.id})" title="Excluir">🗑️</button>
      </td>
    </tr>
  `).join('');
}

function filtrarAlunos() {
  const search = document.getElementById('search-alunos').value.toLowerCase();
  const status = document.getElementById('filter-status').value;

  fetch(`${API}/alunos`)
    .then(res => res.json())
    .then(alunos => {
      let filtrados = alunos;
      if (search) {
        filtrados = filtrados.filter(a =>
          a.nome.toLowerCase().includes(search) ||
          (a.email && a.email.toLowerCase().includes(search)) ||
          (a.cpf && a.cpf.includes(search))
        );
      }
      if (status) {
        filtrados = filtrados.filter(a => a.status === status);
      }
      renderizarAlunos(filtrados);
    });
}

async function salvarAluno(event) {
  event.preventDefault();

  const id = document.getElementById('aluno-id').value;
  const aluno = {
    nome: document.getElementById('aluno-nome').value,
    email: document.getElementById('aluno-email').value,
    telefone: document.getElementById('aluno-telefone').value,
    cpf: document.getElementById('aluno-cpf').value,
    plano_id: document.getElementById('aluno-plano').value,
    data_inicio: document.getElementById('aluno-data-inicio').value,
    data_fim: document.getElementById('aluno-data-fim').value,
    status: document.getElementById('aluno-status').value
  };

  try {
    const url = id ? `${API}/alunos/${id}` : `${API}/alunos`;
    const method = id ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(aluno)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    showToast(id ? 'Aluno atualizado!' : 'Aluno cadastrado!');
    closeModal('modal-aluno');
    carregarAlunos();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function editarAluno(id) {
  try {
    const res = await fetch(`${API}/alunos/${id}`);
    const aluno = await res.json();

    document.getElementById('aluno-id').value = aluno.id;
    document.getElementById('aluno-nome').value = aluno.nome;
    document.getElementById('aluno-email').value = aluno.email || '';
    document.getElementById('aluno-telefone').value = aluno.telefone || '';
    document.getElementById('aluno-cpf').value = aluno.cpf || '';
    document.getElementById('aluno-plano').value = aluno.plano_id || '';
    document.getElementById('aluno-data-inicio').value = aluno.data_inicio || '';
    document.getElementById('aluno-data-fim').value = aluno.data_fim || '';
    document.getElementById('aluno-status').value = aluno.status || 'ativo';
    document.getElementById('modal-aluno-titulo').textContent = 'Editar Aluno';

    openModal('modal-aluno');
  } catch (error) {
    showToast('Erro ao carregar aluno', 'error');
  }
}

async function deletarAluno(id) {
  if (!confirm('Tem certeza que deseja excluir este aluno?')) return;

  try {
    const res = await fetch(`${API}/alunos/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    showToast('Aluno excluído!');
    carregarAlunos();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// ============================================================
// PLANOS
// ============================================================
async function carregarPlanos() {
  try {
    const res = await fetch(`${API}/planos`);
    const planos = await res.json();
    renderizarPlanos(planos);
    carregarSelectPlanos();
  } catch (error) {
    console.error('Erro ao carregar planos:', error);
  }
}

function renderizarPlanos(planos) {
  const grid = document.getElementById('planos-grid');

  grid.innerHTML = planos.map(p => `
    <div class="plano-card">
      <h3>${p.nome}</h3>
      <p class="plano-preco">${formatCurrency(p.preco)} <span>/mês</span></p>
      <p class="plano-desc">${p.descricao || 'Sem descrição'}</p>
      <div style="display:flex; gap:8px; font-size:0.85rem; color:var(--gray); margin-bottom:12px;">
        <span>⏱️ ${p.duracao_dias} dias</span>
      </div>
      <div class="plano-meta">
        <span>ID: #${p.id}</span>
        <div>
          <button class="btn btn-sm btn-secondary" onclick="editarPlano(${p.id})">✏️ Editar</button>
          <button class="btn btn-sm btn-danger" onclick="deletarPlano(${p.id})">🗑️</button>
        </div>
      </div>
    </div>
  `).join('');
}

async function salvarPlano(event) {
  event.preventDefault();

  const id = document.getElementById('plano-id').value;
  const plano = {
    nome: document.getElementById('plano-nome').value,
    preco: document.getElementById('plano-preco').value,
    duracao_dias: document.getElementById('plano-duracao').value,
    descricao: document.getElementById('plano-descricao').value
  };

  try {
    const url = id ? `${API}/planos/${id}` : `${API}/planos`;
    const method = id ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(plano)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    showToast(id ? 'Plano atualizado!' : 'Plano criado!');
    closeModal('modal-plano');
    carregarPlanos();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function editarPlano(id) {
  try {
    const res = await fetch(`${API}/planos`);
    const planos = await res.json();
    const plano = planos.find(p => p.id === id);

    document.getElementById('plano-id').value = plano.id;
    document.getElementById('plano-nome').value = plano.nome;
    document.getElementById('plano-preco').value = plano.preco;
    document.getElementById('plano-duracao').value = plano.duracao_dias;
    document.getElementById('plano-descricao').value = plano.descricao || '';
    document.getElementById('modal-plano-titulo').textContent = 'Editar Plano';

    openModal('modal-plano');
  } catch (error) {
    showToast('Erro ao carregar plano', 'error');
  }
}

async function deletarPlano(id) {
  if (!confirm('Tem certeza que deseja excluir este plano?')) return;

  try {
    const res = await fetch(`${API}/planos/${id}`, { method: 'DELETE' });
    showToast('Plano excluído!');
    carregarPlanos();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// ============================================================
// SELECTS (Dropdowns)
// ============================================================
async function carregarSelectPlanos() {
  try {
    const res = await fetch(`${API}/planos`);
    const planos = await res.json();
    const select = document.getElementById('aluno-plano');

    select.innerHTML = '<option value="">Selecione um plano</option>' +
      planos.map(p => `<option value="${p.id}">${p.nome} - ${formatCurrency(p.preco)}</option>`).join('');
  } catch (error) {
    console.error('Erro ao carregar planos:', error);
  }
}

async function carregarSelectAlunos() {
  try {
    const res = await fetch(`${API}/alunos`);
    const alunos = await res.json();
    const ativos = alunos.filter(a => a.status === 'ativo');

    // Select de presenças
    const selectPresenca = document.getElementById('presenca-aluno');
    if (selectPresenca) {
      selectPresenca.innerHTML = '<option value="">-- Selecione --</option>' +
        ativos.map(a => `<option value="${a.id}">${a.nome}</option>`).join('');
    }

    // Select de pagamentos
    const selectPagamento = document.getElementById('pagamento-aluno');
    if (selectPagamento) {
      selectPagamento.innerHTML = '<option value="">Selecione um aluno</option>' +
        ativos.map(a => `<option value="${a.id}">${a.nome}</option>`).join('');
    }
  } catch (error) {
    console.error('Erro ao carregar alunos:', error);
  }
}

// ============================================================
// PRESENÇAS
// ============================================================
async function carregarPresencas() {
  try {
    const res = await fetch(`${API}/presencas`);
    const presencas = await res.json();
    renderizarPresencas(presencas);
  } catch (error) {
    console.error('Erro ao carregar presenças:', error);
  }
}

function renderizarPresencas(presencas) {
  const tbody = document.getElementById('tabela-presencas');

  if (presencas.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="loading">Nenhuma presença registrada</td></tr>';
    return;
  }

  tbody.innerHTML = presencas.map(p => {
    const status = p.hora_saida ? 'presente' : 'aberto';
    const statusText = p.hora_saida ? 'Concluído' : 'Na academia';

    return `
      <tr>
        <td><strong>${p.aluno_nome || 'Desconhecido'}</strong></td>
        <td>${formatDate(p.data)}</td>
        <td>${formatTime(p.hora_entrada)}</td>
        <td>${formatTime(p.hora_saida)}</td>
        <td><span class="badge badge-${status}">${statusText}</span></td>
      </tr>
    `;
  }).join('');
}

async function registrarEntrada() {
  const alunoId = document.getElementById('presenca-aluno').value;
  if (!alunoId) return showToast('Selecione um aluno!', 'warning');

  try {
    const res = await fetch(`${API}/presencas/entrada`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aluno_id: alunoId })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    showToast(`Entrada registrada - ${data.aluno}`);
    carregarPresencas();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function registrarSaida() {
  const alunoId = document.getElementById('presenca-aluno').value;
  if (!alunoId) return showToast('Selecione um aluno!', 'warning');

  try {
    const res = await fetch(`${API}/presencas/saida`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aluno_id: alunoId })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    showToast('Saída registrada!');
    carregarPresencas();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// ============================================================
// PAGAMENTOS
// ============================================================
async function carregarPagamentos() {
  try {
    const res = await fetch(`${API}/pagamentos`);
    const pagamentos = await res.json();
    renderizarPagamentos(pagamentos);
  } catch (error) {
    console.error('Erro ao carregar pagamentos:', error);
  }
}

function renderizarPagamentos(pagamentos) {
  const tbody = document.getElementById('tabela-pagamentos');

  if (pagamentos.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="loading">Nenhum pagamento registrado</td></tr>';
    return;
  }

  const metodos = {
    dinheiro: '💵 Dinheiro',
    cartao_credito: '💳 Crédito',
    cartao_debito: '💳 Débito',
    pix: '📱 PIX',
    boleto: '📄 Boleto'
  };

  tbody.innerHTML = pagamentos.map(p => `
    <tr>
      <td><strong>${p.aluno_nome || 'Desconhecido'}</strong></td>
      <td>${formatCurrency(p.valor)}</td>
      <td>${formatDate(p.data_pagamento)}</td>
      <td>${metodos[p.metodo] || p.metodo}</td>
      <td><span class="badge badge-${p.status}">${p.status}</span></td>
    </tr>
  `).join('');
}

async function salvarPagamento(event) {
  event.preventDefault();

  const pagamento = {
    aluno_id: document.getElementById('pagamento-aluno').value,
    valor: document.getElementById('pagamento-valor').value,
    metodo: document.getElementById('pagamento-metodo').value
  };

  try {
    const res = await fetch(`${API}/pagamentos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pagamento)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    showToast('Pagamento registrado!');
    closeModal('modal-pagamento');
    carregarPagamentos();
    carregarDashboard(); // Atualiza receita do dashboard
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// ============================================================
// INICIALIZAÇÃO
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  carregarDashboard();
  carregarPlanos(); // Carrega planos para popular selects
});