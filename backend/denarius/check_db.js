const pool = require('./db');

async function check() {
    try {
        const [tables] = await pool.query('SHOW TABLES');
        console.log('Tables:', tables);

        const [columns] = await pool.query('DESCRIBE transactions');
        console.log('Transactions columns:', columns);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        pool.end();
    }
}

check();
