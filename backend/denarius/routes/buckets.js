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
    const { name, balance, currency } = req.body;
    const [result] = await pool.query(
      'INSERT INTO buckets (name, balance, currency) VALUES (?, ?, ?)',
      [name, balance || 0, currency || 'USD']
    );
    res.status(201).json({ id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/buckets/:b_id
// PUT /api/buckets/:b_id
router.put('/:b_id', async (req, res) => {
  try {
    const { b_id } = req.params;
    const { name, balance, currency } = req.body;

    const fields = [];
    const values = [];

    if (name !== undefined) { fields.push('name = ?'); values.push(name); }
    if (balance !== undefined) { fields.push('balance = ?'); values.push(balance); }
    if (currency !== undefined) { fields.push('currency = ?'); values.push(currency); }

    if (fields.length === 0) {
      return res.json({ updated: false, message: 'No fields provided' });
    }

    values.push(b_id);
    const sql = `UPDATE buckets SET ${fields.join(', ')} WHERE id = ?`;

    await pool.query(sql, values);
    res.json({ updated: true });
  } catch (error) {
    console.error('Update Bucket Error:', error);
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
