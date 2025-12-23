const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/accounts
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM accounts ORDER BY id ASC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/accounts
router.post('/', async (req, res) => {
  try {
    const { name, type, currency, balance, start_date, due_date } = req.body;
    const [result] = await pool.query(
      'INSERT INTO accounts (name, type, currency, balance, start_date, due_date) VALUES (?, ?, ?, ?, ?, ?)',
      [name, type, currency || 'USD', balance || 0, start_date, due_date]
    );
    res.status(201).json({ id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/accounts/:acc_id
router.put('/:acc_id', async (req, res) => {
  try {
    const { acc_id } = req.params;
    const { name, type, currency, balance, start_date, due_date } = req.body;
    await pool.query(
      'UPDATE accounts SET name = ?, type = ?, currency = ?, balance = ?, start_date = ?, due_date = ? WHERE id = ?',
      [name, type, currency, balance, start_date, due_date, acc_id]
    );
    res.json({ updated: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/accounts/:acc_id
router.delete('/:acc_id', async (req, res) => {
  try {
    const { acc_id } = req.params;
    await pool.query('DELETE FROM accounts WHERE id = ?', [acc_id]);
    res.json({ deleted: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
