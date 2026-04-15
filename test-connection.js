// test-connection.js
require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI;

console.log('🔄 Testando conexão com:', MONGO_URI.replace(/:[^:]+@/, ':****@'));

mongoose.connect(MONGO_URI, {
  serverSelectionTimeoutMS: 5000
})
.then(() => {
  console.log('✅ Conexão bem-sucedida!');
  return mongoose.connection.close();
})
.catch(err => {
  console.error('❌ Erro:', err.message);
  console.log('\n💡 Soluções:');
  console.log('1. Verifique se seu IP está na whitelist do Atlas');
  console.log('2. Confirme usuário e senha na connection string');
  console.log('3. Codifique caracteres especiais na senha (@ → %40)');
  process.exit(1);
});