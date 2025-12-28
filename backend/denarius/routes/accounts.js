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
// PUT /api/accounts/:acc_id
router.put('/:acc_id', async (req, res) => {
  try {
    const { acc_id } = req.params;
    const { name, type, currency, balance, startDate, start_date, dueDate, due_date } = req.body;

    // Normalize date fields (prefer snake_case from DB schema, fallback to camelCase from JS)
    const f_start = start_date !== undefined ? start_date : startDate;
    const f_due = due_date !== undefined ? due_date : dueDate;

    const fields = [];
    const values = [];

    if (name !== undefined) { fields.push('name = ?'); values.push(name); }
    if (type !== undefined) { fields.push('type = ?'); values.push(type); }
    if (currency !== undefined) { fields.push('currency = ?'); values.push(currency); }
    if (balance !== undefined) { fields.push('balance = ?'); values.push(balance); }
    if (f_start !== undefined) { fields.push('start_date = ?'); values.push(f_start); }
    if (f_due !== undefined) { fields.push('due_date = ?'); values.push(f_due); }

    if (fields.length === 0) {
      return res.json({ updated: false, message: 'No fields provided for update' });
    }

    values.push(acc_id);
    const sql = `UPDATE accounts SET ${fields.join(', ')} WHERE id = ?`;

    await pool.query(sql, values);
    res.json({ updated: true });
  } catch (error) {
    console.error('Update Account Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/accounts/:acc_id
router.delete('/:acc_id', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { acc_id } = req.params;
    await connection.beginTransaction();

    // Get all transactions for this account to update buckets if necessary used in those transactions
    const [transactions] = await connection.query('SELECT * FROM transactions WHERE account_id = ?', [acc_id]);

    for (const tx of transactions) {
      if (tx.bucket_id) {
        if (tx.type === 'income' || tx.type === 'bucket_move') {
          await connection.query('UPDATE buckets SET balance = balance - ? WHERE id = ?', [tx.amount, tx.bucket_id]);
        } else if (tx.type === 'expense') {
          await connection.query('UPDATE buckets SET balance = balance + ? WHERE id = ?', [tx.amount, tx.bucket_id]);
        }
      }
      if (tx.source_bucket_id && tx.type === 'bucket_move') {
        await connection.query('UPDATE buckets SET balance = balance + ? WHERE id = ?', [tx.amount, tx.source_bucket_id]);
      }
    }

    // Delete associated transactions
    await connection.query('DELETE FROM transactions WHERE account_id = ?', [acc_id]);

    // Delete the account
    await connection.query('DELETE FROM accounts WHERE id = ?', [acc_id]);

    await connection.commit();
    res.json({ deleted: true });
  } catch (error) {
    await connection.rollback();
    console.error('Delete Account Error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

module.exports = router;
