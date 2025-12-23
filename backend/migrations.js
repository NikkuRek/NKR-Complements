const fs = require('fs').promises;
const pool = require('./db');

async function migrate() {
  try {
    const sql = await fs.readFile('migrations.sql', 'utf-8');
    // Remove triggers and DELIMITER commands from SQL
    const sanitizedSql = sql.split('DELIMITER $$')[0];
    
    // Split into individual statements
    const statements = sanitizedSql.split(';').filter(statement => statement.trim() !== '');

    const connection = await pool.getConnection();

    for (const statement of statements) {
      if (statement.trim()) {
        await connection.query(statement);
      }
    }

    console.log('Database migration successful!');
    connection.release();
  } catch (error) {
    console.error('Error migrating database:', error);
  } finally {
    pool.end();
  }
}

migrate();
