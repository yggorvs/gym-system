// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const { query, insert, execute, testConnection } = require('./database/db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helpers de resposta
const ok = (res, data) => res.status(200).json(data);
const error = (res, msg, status = 500) => res.status(status).json({ error: msg });

// ============================================================
// ROTAS - PLANOS
// ============================================================

app.get('/api/planos', async (req, res) => {
  try {
    const planos = await query('SELECT * FROM planos ORDER BY nome');
    ok(res, planos);
  } catch (err) { error(res, err.message); }
});

app.post('/api/planos', async (req, res) => {
  try {
    const { nome, preco, duracao_dias, descricao } = req.body;
    const result = await insert(
      'INSERT INTO planos (nome, preco, duracao_dias, descricao) VALUES (?, ?, ?, ?)',
      [nome, preco, duracao_dias, descricao]
    );
    ok(res, { id: result.insertId, message: 'Plano criado!' });
  } catch (err) { error(res, err.message); }
});

app.put('/api/planos/:id', async (req, res) => {
  try {
    const { nome, preco, duracao_dias, descricao } = req.body;
    const result = await execute(
      'UPDATE planos SET nome=?, preco=?, duracao_dias=?, descricao=? WHERE id=?',
      [nome, preco, duracao_dias, descricao, req.params.id]
    );
    ok(res, { changes: result.affectedRows, message: 'Plano atualizado!' });
  } catch (err) { error(res, err.message); }
});

app.delete('/api/planos/:id', async (req, res) => {
  try {
    const result = await execute('DELETE FROM planos WHERE id = ?', [req.params.id]);
    ok(res, { changes: result.affectedRows, message: 'Plano deletado!' });
  } catch (err) { error(res, err.message); }
});

// ============================================================
// ROTAS - ALUNOS
// ============================================================

app.get('/api/alunos', async (req, res) => {
  try {
    const alunos = await query(`
      SELECT a.*, p.nome as plano_nome, p.preco as plano_preco
      FROM alunos a
      LEFT JOIN planos p ON a.plano_id = p.id
      ORDER BY a.nome
    `);
    ok(res, alunos);
  } catch (err) { error(res, err.message); }
});

app.get('/api/alunos/:id', async (req, res) => {
  try {
    const [aluno] = await query(`
      SELECT a.*, p.nome as plano_nome, p.preco as plano_preco
      FROM alunos a
      LEFT JOIN planos p ON a.plano_id = p.id
      WHERE a.id = ?
    `, [req.params.id]);
    
    if (!aluno) return error(res, 'Aluno não encontrado', 404);
    ok(res, aluno);
  } catch (err) { error(res, err.message); }
});

app.post('/api/alunos', async (req, res) => {
  try {
    const { nome, email, telefone, cpf, plano_id, data_inicio, data_fim } = req.body;
    const result = await insert(
      `INSERT INTO alunos (nome, email, telefone, cpf, plano_id, data_inicio, data_fim, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'ativo')`,
      [nome, email, telefone, cpf, plano_id, data_inicio, data_fim]
    );
    ok(res, { id: result.insertId, message: 'Aluno cadastrado!' });
  } catch (err) { error(res, err.message); }
});

app.put('/api/alunos/:id', async (req, res) => {
  try {
    const { nome, email, telefone, cpf, plano_id, data_inicio, data_fim, status } = req.body;
    const result = await execute(
      `UPDATE alunos SET nome=?, email=?, telefone=?, cpf=?, plano_id=?,
       data_inicio=?, data_fim=?, status=? WHERE id=?`,
      [nome, email, telefone, cpf, plano_id, data_inicio, data_fim, status, req.params.id]
    );
    ok(res, { changes: result.affectedRows, message: 'Aluno atualizado!' });
  } catch (err) { error(res, err.message); }
});

app.delete('/api/alunos/:id', async (req, res) => {
  try {
    const result = await execute('DELETE FROM alunos WHERE id = ?', [req.params.id]);
    ok(res, { changes: result.affectedRows, message: 'Aluno deletado!' });
  } catch (err) { error(res, err.message); }
});

// ============================================================
// ROTAS - PRESENÇAS
// ============================================================

app.get('/api/presencas', async (req, res) => {
  try {
    const presencas = await query(`
      SELECT p.*, a.nome as aluno_nome
      FROM presencas p
      LEFT JOIN alunos a ON p.aluno_id = a.id
      ORDER BY p.data DESC, p.hora_entrada DESC
    `);
    ok(res, presencas);
  } catch (err) { error(res, err.message); }
});

app.post('/api/presencas/entrada', async (req, res) => {
  try {
    const { aluno_id } = req.body;
    const hoje = new Date().toISOString().split('T')[0];
    const agora = new Date().toISOString().split('T')[1].substring(0, 8);

    // Verificar se aluno existe e está ativo
    const [aluno] = await query('SELECT * FROM alunos WHERE id = ? AND status = ?', [aluno_id, 'ativo']);
    if (!aluno) return error(res, 'Aluno não encontrado ou inativo', 404);

    // Verificar se já tem entrada registrada hoje
    const [existente] = await query(
      'SELECT * FROM presencas WHERE aluno_id = ? AND data = ? AND hora_saida IS NULL',
      [aluno_id, hoje]
    );
    if (existente) return error(res, 'Entrada já registrada hoje para este aluno', 400);

    const result = await insert(
      'INSERT INTO presencas (aluno_id, data, hora_entrada) VALUES (?, ?, ?)',
      [aluno_id, hoje, agora]
    );
    ok(res, { id: result.insertId, aluno: aluno.nome, message: 'Entrada registrada!' });
  } catch (err) { error(res, err.message); }
});

app.post('/api/presencas/saida', async (req, res) => {
  try {
    const { aluno_id } = req.body;
    const hoje = new Date().toISOString().split('T')[0];
    const agora = new Date().toISOString().split('T')[1].substring(0, 8);

    const result = await execute(
      'UPDATE presencas SET hora_saida = ? WHERE aluno_id = ? AND data = ? AND hora_saida IS NULL',
      [agora, aluno_id, hoje]
    );
    
    if (result.affectedRows === 0) return error(res, 'Nenhuma entrada aberta encontrada', 404);
    ok(res, { message: 'Saída registrada!' });
  } catch (err) { error(res, err.message); }
});

// ============================================================
// ROTAS - PAGAMENTOS
// ============================================================

app.get('/api/pagamentos', async (req, res) => {
  try {
    const pagamentos = await query(`
      SELECT pg.*, a.nome as aluno_nome
      FROM pagamentos pg
      LEFT JOIN alunos a ON pg.aluno_id = a.id
      ORDER BY pg.data_pagamento DESC
    `);
    ok(res, pagamentos);
  } catch (err) { error(res, err.message); }
});

app.post('/api/pagamentos', async (req, res) => {
  try {
    const { aluno_id, valor, metodo } = req.body;
    const hoje = new Date().toISOString().split('T')[0];
    
    const result = await insert(
      'INSERT INTO pagamentos (aluno_id, valor, data_pagamento, metodo, status) VALUES (?, ?, ?, ?, ?)',
      [aluno_id, valor, hoje, metodo, 'pago']
    );
    ok(res, { id: result.insertId, message: 'Pagamento registrado!' });
  } catch (err) { error(res, err.message); }
});

// ============================================================
// ROTAS - DASHBOARD
// ============================================================

app.get('/api/dashboard', async (req, res) => {
  try {
    const hoje = new Date().toISOString().split('T')[0];
    const inicioMes = hoje.slice(0, 8) + '01';

    // Total de alunos ativos
    const [totalAlunos] = await query('SELECT COUNT(*) as total FROM alunos WHERE status = "ativo"');
    
    // Presenças hoje
    const [totalPresencas] = await query('SELECT COUNT(*) as total FROM presencas WHERE data = ?', [hoje]);
    
    // Receita do mês
    const [receita] = await query(
      `SELECT COALESCE(SUM(valor), 0) as total FROM pagamentos 
       WHERE data_pagamento BETWEEN ? AND ? AND status = 'pago'`,
      [inicioMes, hoje]
    );
    
    // Planos populares
    const planosPopulares = await query(`
      SELECT p.nome, COUNT(a.id) as total
      FROM planos p
      LEFT JOIN alunos a ON p.id = a.plano_id AND a.status = 'ativo'
      GROUP BY p.id, p.nome
      ORDER BY total DESC
    `);
    
    // Faturamento por mês (últimos 6)
    const faturamentoPorMes = await query(`
      SELECT DATE_FORMAT(data_pagamento, '%Y-%m') as mes, SUM(valor) as total
      FROM pagamentos
      WHERE status = 'pago'
      GROUP BY DATE_FORMAT(data_pagamento, '%Y-%m')
      ORDER BY mes DESC
      LIMIT 6
    `);

    ok(res, {
      totalAlunos: totalAlunos.total,
      totalPresencasHoje: totalPresencas.total,
      receitaMes: receita.total,
      planosPopulares,
      faturamentoPorMes
    });
  } catch (err) { error(res, err.message); }
});

// ============================================================
// INICIALIZAÇÃO
// ============================================================

async function iniciarSistema() {
  const conectado = await testConnection();
  if (!conectado) {
    console.log('💡 Dica: Verifique se o MySQL está rodando e as credenciais no .env');
    process.exit(1);
  }
  
  app.listen(PORT, () => {
    console.log(`\n🏋️  GymPro rodando em:`);
    console.log(`   http://localhost:${PORT}\n`);
  });
}

iniciarSistema();