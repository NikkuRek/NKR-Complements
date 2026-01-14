const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const pool = require('../db');

// POST /api/migrate - Run database migrations
router.post('/migrate', async (req, res) => {
    let connection;
    try {
        // Read migration file
        const sql = await fs.readFile('migrations/migrations.sql', 'utf-8');

        // Remove triggers and DELIMITER commands from SQL
        const sanitizedSql = sql.split('DELIMITER $$')[0];

        // Split into individual statements
        const statements = sanitizedSql
            .split(';')
            .filter(statement => statement.trim() !== '');

        // Get connection from pool
        connection = await pool.getConnection();

        // Execute each statement
        for (const statement of statements) {
            if (statement.trim()) {
                await connection.query(statement);
            }
        }

        // Explicitly check for target_amount column in transactions (since Create Table IF NOT EXISTS won't add it)
        const [columns] = await connection.query("SHOW COLUMNS FROM transactions LIKE 'target_amount'");
        if (columns.length === 0) {
            console.log('Adding target_amount column via migration...');
            await connection.query('ALTER TABLE transactions ADD COLUMN target_amount DECIMAL(15, 2) DEFAULT NULL');
        }

        res.json({
            success: true,
            message: 'Database migration completed successfully!'
        });
    } catch (error) {
        console.error('Migration error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

// GET /api/check-db - Check database connection status
router.get('/check-db', async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const [result] = await connection.query('SELECT DATABASE() as db');

        res.json({
            success: true,
            status: 'Connected',
            database: result[0].db
        });
    } catch (error) {
        console.error('Database check error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

module.exports = router;
