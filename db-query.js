require('dotenv').config();
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || `postgresql://postgres.${process.env.DB_ID}:${process.env.DB_SENHA}@aws-1-us-west-2.pooler.supabase.com:6543/postgres?sslmode=require&uselibpqcompat=true`;

const pool = new Pool({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

async function executeQuery(query) {
  try {
    const result = await pool.query(query);
    console.log('\n✅ Resultado:');
    console.table(result.rows);
    return result.rows;
  } catch (error) {
    console.error('\n❌ Erro na Query:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Executa a query passada como argumento
const query = process.argv[2];
if (!query) {
  console.error('❌ Uso: node db-query.js "SELECT * FROM usuarios"');
  process.exit(1);
}

executeQuery(query);
