// database/db.js
const mysql = require('mysql2/promise');
require('dotenv').config();

// Configuração do Pool de Conexões
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'gympro',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Testar conexão ao iniciar
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Conectado ao MySQL');
    connection.release();
    return true;
  } catch (err) {
    console.error('❌ Erro ao conectar ao MySQL:', err.message);
    return false;
  }
}

// Helper para queries seguras
const query = async (sql, params = []) => {
  const [rows] = await pool.execute(sql, params);
  return rows;
};

// Helper para insert com retorno do ID
const insert = async (sql, params = []) => {
  const [result] = await pool.execute(sql, params);
  return { insertId: result.insertId, affectedRows: result.affectedRows };
};

// Helper para update/delete
const execute = async (sql, params = []) => {
  const [result] = await pool.execute(sql, params);
  return { affectedRows: result.affectedRows };
};

module.exports = { pool, query, insert, execute, testConnection };