const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/transactions
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM transactions ORDER BY date DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/transactions
router.post('/', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { date, amount, type, account_id, bucket_id, source_bucket_id, description } = req.body;
    const tx_date = date ? new Date(date) : new Date();

    const [result] = await connection.query(
      'INSERT INTO transactions (date, amount, type, account_id, bucket_id, source_bucket_id, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [tx_date, amount, type, account_id, bucket_id, source_bucket_id, description]
    );

    if (account_id) {
      if (type === 'income') {
        await connection.query('UPDATE accounts SET balance = balance + ? WHERE id = ?', [amount, account_id]);
      } else if (type === 'expense') {
        await connection.query('UPDATE accounts SET balance = balance - ? WHERE id = ?', [amount, account_id]);
      }
    }

    if (bucket_id) {
      if (type === 'income' || type === 'bucket_move') {
        await connection.query('UPDATE buckets SET balance = balance + ? WHERE id = ?', [amount, bucket_id]);
      } else if (type === 'expense') {
        await connection.query('UPDATE buckets SET balance = balance - ? WHERE id = ?', [amount, bucket_id]);
      }
    }

    if (source_bucket_id && type === 'bucket_move') {
      await connection.query('UPDATE buckets SET balance = balance - ? WHERE id = ?', [amount, source_bucket_id]);
    }

    await connection.commit();
    res.status(201).json({ message: 'Transacción guardada', id: result.insertId });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// PUT /api/transactions/:tx_id
// PUT /api/transactions/:tx_id
router.put('/:tx_id', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { tx_id } = req.params;
    const body = req.body;

    const [rows] = await connection.query('SELECT * FROM transactions WHERE id = ?', [tx_id]);
    const oldTx = rows[0];

    if (!oldTx) {
      await connection.rollback();
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Merge old data with new data (handle partial updates)
    // Note: if body has explicit null, we accept it. If undefined, we keep old.
    const date = body.date !== undefined ? body.date : oldTx.date;
    const amount = body.amount !== undefined ? body.amount : oldTx.amount;
    const type = body.type !== undefined ? body.type : oldTx.type;
    const account_id = body.account_id !== undefined ? body.account_id : oldTx.account_id;
    const bucket_id = body.bucket_id !== undefined ? body.bucket_id : oldTx.bucket_id;
    const source_bucket_id = body.source_bucket_id !== undefined ? body.source_bucket_id : oldTx.source_bucket_id;
    const description = body.description !== undefined ? body.description : oldTx.description;

    const tx_date = date ? new Date(date) : new Date();

    // Revert old transaction logic (using oldTx values)
    if (oldTx.account_id) {
      if (oldTx.type === 'income') {
        await connection.query('UPDATE accounts SET balance = balance - ? WHERE id = ?', [oldTx.amount, oldTx.account_id]);
      } else if (oldTx.type === 'expense') {
        await connection.query('UPDATE accounts SET balance = balance + ? WHERE id = ?', [oldTx.amount, oldTx.account_id]);
      }
    }
    if (oldTx.bucket_id) {
      if (oldTx.type === 'income' || oldTx.type === 'bucket_move') {
        await connection.query('UPDATE buckets SET balance = balance - ? WHERE id = ?', [oldTx.amount, oldTx.bucket_id]);
      } else if (oldTx.type === 'expense') {
        await connection.query('UPDATE buckets SET balance = balance + ? WHERE id = ?', [oldTx.amount, oldTx.bucket_id]);
      }
    }
    if (oldTx.source_bucket_id && oldTx.type === 'bucket_move') {
      await connection.query('UPDATE buckets SET balance = balance + ? WHERE id = ?', [oldTx.amount, oldTx.source_bucket_id]);
    }

    // Update transaction record
    await connection.query(
      'UPDATE transactions SET date = ?, amount = ?, type = ?, account_id = ?, bucket_id = ?, source_bucket_id = ?, description = ? WHERE id = ?',
      [tx_date, amount, type, account_id, bucket_id, source_bucket_id, description, tx_id]
    );

    // Apply new transaction logic (using merged values)
    if (account_id) {
      if (type === 'income') {
        await connection.query('UPDATE accounts SET balance = balance + ? WHERE id = ?', [amount, account_id]);
      } else if (type === 'expense') {
        await connection.query('UPDATE accounts SET balance = balance - ? WHERE id = ?', [amount, account_id]);
      }
    }
    if (bucket_id) {
      if (type === 'income' || type === 'bucket_move') {
        await connection.query('UPDATE buckets SET balance = balance + ? WHERE id = ?', [amount, bucket_id]);
      } else if (type === 'expense') {
        await connection.query('UPDATE buckets SET balance = balance - ? WHERE id = ?', [amount, bucket_id]);
      }
    }
    if (source_bucket_id && type === 'bucket_move') {
      await connection.query('UPDATE buckets SET balance = balance - ? WHERE id = ?', [amount, source_bucket_id]);
    }

    await connection.commit();
    res.json({ updated: true });
  } catch (error) {
    await connection.rollback();
    console.error('Update Transaction Error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// DELETE /api/transactions/:tx_id
router.delete('/:tx_id', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { tx_id } = req.params;

    const [rows] = await connection.query('SELECT * FROM transactions WHERE id = ?', [tx_id]);
    const tx = rows[0];

    if (!tx) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    await connection.query('DELETE FROM transactions WHERE id = ?', [tx_id]);

    if (tx.account_id) {
      if (tx.type === 'income') {
        await connection.query('UPDATE accounts SET balance = balance - ? WHERE id = ?', [tx.amount, tx.account_id]);
      } else if (tx.type === 'expense') {
        await connection.query('UPDATE accounts SET balance = balance + ? WHERE id = ?', [tx.amount, tx.account_id]);
      }
    }

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

    await connection.commit();
    res.json({ deleted: true });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

module.exports = router;
