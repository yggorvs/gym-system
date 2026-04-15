// server.js
require('dotenv').config(); // Carrega variáveis de ambiente
const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const { Plano, Aluno, Presenca, Pagamento, seedDefaults } = require('./database/db');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/gympro';

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper de resposta
const ok = (res, data) => res.status(200).json(data);
const error = (res, msg, status = 500) => res.status(status).json({ error: msg });

// ===================== ROTAS (Mesmas do anterior, resumidas para brevidade) =====================
// ... [MANTENHA TODAS AS SUAS ROTAS AQUI EXATAMENTE COMO ANTERIORMENTE] ...
// Dica: não altere a lógica das rotas, apenas mantenha-as aqui.

// ===================== INICIALIZAÇÃO SEGURA =====================
async function iniciarSistema() {
  try {
    console.log('🔄 Conectando ao MongoDB...');
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000, // Timeout mais rápido para feedback
      socketTimeoutMS: 45000
    });
    console.log('✅ Banco de dados conectado');

    // Só executa o seed DEPOIS da conexão estar pronta
    await seedDefaults();

    app.listen(PORT, () => {
      console.log(`\n🏋️  GymPro rodando em:`);
      console.log(`   http://localhost:${PORT}\n`);
    });
  } catch (err) {
    console.error('❌ Falha crítica ao iniciar:', err.message);
    console.log('💡 Verifique se o MongoDB está rodando localmente ou se a MONGO_URI está correta.');
    process.exit(1);
  }
}

iniciarSistema();