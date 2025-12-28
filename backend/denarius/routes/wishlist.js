const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/wishlist
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM wishlist ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching wishlist:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/wishlist
router.post('/', async (req, res) => {
  try {
    const { product_name, price, currency, details } = req.body;
    const [result] = await pool.query(
      'INSERT INTO wishlist (product_name, price, currency, details) VALUES (?, ?, ?, ?)',
      [product_name, price, currency, details]
    );
    res.status(201).json({ id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/wishlist/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM wishlist WHERE id = ?', [id]);
    res.json({ deleted: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
