const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function runMigrations() {
  // First connect without database to create it
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });

  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');

  try {
    await conn.query(sql);
    console.log('✅ Migrations ran successfully');
  } catch (err) {
    console.error('❌ Migration error:', err.message);
    throw err;
  } finally {
    await conn.end();
  }
}

runMigrations().catch(process.exit.bind(process, 1));
