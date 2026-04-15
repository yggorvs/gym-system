// database/db.js
const mongoose = require('mongoose');

// Configuração para _id virar id e remover __v do JSON
const toJSONConfig = {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
};

// ===================== SCHEMAS =====================
const PlanoSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  preco: { type: Number, required: true },
  duracao_dias: { type: Number, required: true },
  descricao: String
}, { toJSON: toJSONConfig, timestamps: true });

const AlunoSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  email: { type: String, unique: true, sparse: true },
  telefone: String,
  cpf: { type: String, unique: true, sparse: true },
  plano: { type: mongoose.Schema.Types.ObjectId, ref: 'Plano' },
  data_inicio: String,
  data_fim: String,
  status: { type: String, default: 'ativo', enum: ['ativo', 'inativo', 'pendente'] }
}, { toJSON: toJSONConfig, timestamps: true });

const PresencaSchema = new mongoose.Schema({
  aluno: { type: mongoose.Schema.Types.ObjectId, ref: 'Aluno' },
  data: String,
  hora_entrada: String,
  hora_saida: String
}, { toJSON: toJSONConfig, timestamps: true });

const PagamentoSchema = new mongoose.Schema({
  aluno: { type: mongoose.Schema.Types.ObjectId, ref: 'Aluno' },
  valor: { type: Number, required: true },
  data_pagamento: String,
  metodo: { type: String, enum: ['dinheiro', 'cartao_credito', 'cartao_debito', 'pix', 'boleto'] },
  status: { type: String, default: 'pago', enum: ['pago', 'pendente', 'cancelado'] }
}, { toJSON: toJSONConfig, timestamps: true });

// ===================== MODELS =====================
const Plano = mongoose.model('Plano', PlanoSchema);
const Aluno = mongoose.model('Aluno', AlunoSchema);
const Presenca = mongoose.model('Presenca', PresencaSchema);
const Pagamento = mongoose.model('Pagamento', PagamentoSchema);

// ===================== SEED =====================
async function seedDefaults() {
  try {
    const count = await Plano.countDocuments();
    if (count === 0) {
      await Plano.insertMany([
        { nome: 'Básico', preco: 89.90, duracao_dias: 30, descricao: 'Acesso à musculação' },
        { nome: 'Intermediário', preco: 129.90, duracao_dias: 30, descricao: 'Musculação + Aulas coletivas' },
        { nome: 'Premium', preco: 199.90, duracao_dias: 30, descricao: 'Acesso completo + Personal' },
        { nome: 'Trimestral', preco: 239.70, duracao_dias: 90, descricao: 'Plano Básico trimestral' }
      ]);
      console.log('✅ Planos padrão inseridos');
    }
  } catch (err) {
    console.error('❌ Erro ao inserir planos padrão:', err.message);
  }
}

module.exports = { Plano, Aluno, Presenca, Pagamento, seedDefaults };