const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/history - Get movement history
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT h.*, c.name as cake_name 
            FROM history h 
            LEFT JOIN cakes c ON h.cake_id = c.id 
            ORDER BY h.date DESC
        `);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /api/history - Add a movement
router.post('/', async (req, res) => {
    const { cake_id, type, amount, date, description, clientName } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO history (cake_id, type, amount, date, description, client_name) VALUES (?, ?, ?, ?, ?, ?)',
            [cake_id, type, amount || 1, date || new Date(), description, clientName || '-']
        );
        res.status(201).json({ id: result.insertId, ...req.body });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
