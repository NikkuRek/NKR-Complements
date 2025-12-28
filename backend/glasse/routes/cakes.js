const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/cakes - Get all cake types (inventory)
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM cakes ORDER BY name ASC');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /api/cakes - Add a new cake type
router.post('/', async (req, res) => {
    const { name, stock, price, imageColor, reservations, credits } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    try {
        const [result] = await db.query(
            'INSERT INTO cakes (name, stock, price, image_color, reservations, credits) VALUES (?, ?, ?, ?, ?, ?)',
            [
                name,
                stock || 0,
                price || 0,
                imageColor || 'bg-pink-500',
                JSON.stringify(reservations || []),
                JSON.stringify(credits || [])
            ]
        );
        res.status(201).json({ id: result.insertId, name, stock, price, imageColor, reservations, credits });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// PUT /api/cakes/:id - Update cake details
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, stock, price, imageColor, reservations, credits } = req.body;

    // Construct dynamic update query
    let fields = [];
    let values = [];

    if (name !== undefined) { fields.push('name = ?'); values.push(name); }
    if (stock !== undefined) { fields.push('stock = ?'); values.push(stock); }
    if (price !== undefined) { fields.push('price = ?'); values.push(price); }
    if (imageColor !== undefined) { fields.push('image_color = ?'); values.push(imageColor); }
    if (reservations !== undefined) { fields.push('reservations = ?'); values.push(JSON.stringify(reservations)); }
    if (credits !== undefined) { fields.push('credits = ?'); values.push(JSON.stringify(credits)); }

    if (fields.length === 0) return res.json({ message: 'No changes' });

    values.push(id);

    try {
        await db.query(`UPDATE cakes SET ${fields.join(', ')} WHERE id = ?`, values);
        // Fetch updated to return full object? Or just return what was sent?
        // Returning what was sent is faster for now.
        res.json({ id, ...req.body });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// DELETE /api/cakes/:id - Delete a cake type
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM cakes WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
