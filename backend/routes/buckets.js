const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/buckets
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM buckets ORDER BY id ASC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/buckets
router.post('/', async (req, res) => {
  try {
    const { name, balance } = req.body;
    const [result] = await pool.query(
      'INSERT INTO buckets (name, balance) VALUES (?, ?)',
      [name, balance || 0]
    );
    res.status(201).json({ id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/buckets/:b_id
router.put('/:b_id', async (req, res) => {
  try {
    const { b_id } = req.params;
    const { name, balance } = req.body;
    await pool.query(
      'UPDATE buckets SET name = ?, balance = ? WHERE id = ?',
      [name, balance, b_id]
    );
    res.json({ updated: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/buckets/:b_id
router.delete('/:b_id', async (req, res) => {
  try {
    const { b_id } = req.params;
    await pool.query('DELETE FROM buckets WHERE id = ?', [b_id]);
    res.json({ deleted: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
