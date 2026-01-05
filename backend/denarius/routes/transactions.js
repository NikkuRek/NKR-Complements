const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/transactions
router.get('/', async (req, res) => {
  try {
    const { account_id, limit } = req.query;

    let query = 'SELECT * FROM transactions';
    const params = [];

    if (account_id) {
      query += ' WHERE account_id = ?';
      params.push(account_id);
    }

    query += ' ORDER BY date DESC';

    if (limit) {
      query += ' LIMIT ?';
      params.push(parseInt(String(limit), 10)); // Force int parsing
    }

    const [rows] = await pool.query(query, params);
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
    const { date, amount, type, account_id, bucket_id, source_bucket_id, description, target_amount } = req.body;
    const tx_date = date ? new Date(date) : new Date();

    // Determine quantities
    // If target_amount is provided (e.g. for cross-currency bucket moves), use it for the 'receiving' side.
    // Otherwise fallback to 'amount'.
    const finalTargetAmount = (target_amount !== undefined && target_amount !== null) ? target_amount : amount;

    // Special Handling for Cross-Currency Bucket Moves
    if (type === 'bucket_move' && source_bucket_id && bucket_id) {
      console.log('Processing bucket_move:', { source_bucket_id, bucket_id, amount, target_amount });

      const [buckets] = await connection.query('SELECT id, currency, name FROM buckets WHERE id IN (?, ?)', [source_bucket_id, bucket_id]);
      const sourceB = buckets.find(b => String(b.id) === String(source_bucket_id));
      const targetB = buckets.find(b => String(b.id) === String(bucket_id));

      if (sourceB && targetB) {
        console.log('Buckets found:', {
          source: { id: sourceB.id, currency: sourceB.currency },
          target: { id: targetB.id, currency: targetB.currency }
        });

        if (sourceB.currency.trim() !== targetB.currency.trim()) {
          console.log('Splitting cross-currency transfer');

          // Create 2 Separate Transactions

          // 1. Outgoing from Source
          const descriptionOut = description || `Transferencia a ${targetB.name}`;
          await connection.query(
            'INSERT INTO transactions (date, amount, type, bucket_id, description) VALUES (?, ?, ?, ?, ?)',
            [tx_date, amount, 'TRANSFER_OUT', source_bucket_id, descriptionOut]
          );
          await connection.query('UPDATE buckets SET balance = balance - ? WHERE id = ?', [amount, source_bucket_id]);

          // 2. Incoming to Target
          const descriptionIn = description || `Transferencia desde ${sourceB.name}`;
          await connection.query(
            'INSERT INTO transactions (date, amount, type, bucket_id, description) VALUES (?, ?, ?, ?, ?)',
            [tx_date, finalTargetAmount, 'TRANSFER_IN', bucket_id, descriptionIn]
          );
          await connection.query('UPDATE buckets SET balance = balance + ? WHERE id = ?', [finalTargetAmount, bucket_id]);

          await connection.commit();
          return res.status(201).json({ message: 'Transferencia multimoneda realizada' });
        }
      }
    }

    const [result] = await connection.query(
      'INSERT INTO transactions (date, amount, type, account_id, bucket_id, source_bucket_id, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [tx_date, amount, type, account_id, bucket_id, source_bucket_id, description]
    );

    const lowerCaseType = type.toLowerCase();

    if (account_id) {
      if (lowerCaseType === 'income' || lowerCaseType === 'transfer_in') {
        await connection.query('UPDATE accounts SET balance = balance + ? WHERE id = ?', [amount, account_id]);
      } else if (lowerCaseType === 'expense' || lowerCaseType === 'transfer_out') {
        await connection.query('UPDATE accounts SET balance = balance - ? WHERE id = ?', [amount, account_id]);
      }
    }

    if (bucket_id) {
      if (lowerCaseType === 'income' || lowerCaseType === 'transfer_in') {
        // Income to bucket: Generally matches source amount if same currency, or target_amount if different. 
        // Let's assume income into bucket uses finalTargetAmount too if provided (e.g. Income in VES -> Bucket in USD).
        await connection.query('UPDATE buckets SET balance = balance + ? WHERE id = ?', [finalTargetAmount, bucket_id]);
      } else if (lowerCaseType === 'bucket_move') {
        // Use finalTargetAmount for the receiving bucket
        await connection.query('UPDATE buckets SET balance = balance + ? WHERE id = ?', [finalTargetAmount, bucket_id]);
      } else if (lowerCaseType === 'expense' || lowerCaseType === 'transfer_out') {
        // Expense from bucket: Use finalTargetAmount (converted value) if provided, else amount
        await connection.query('UPDATE buckets SET balance = balance - ? WHERE id = ?', [finalTargetAmount, bucket_id]);
      }
    }

    if (source_bucket_id && lowerCaseType === 'bucket_move') {
      // Always remove 'amount' from source
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

    const oldType = oldTx.type.toLowerCase();

    // Revert old transaction logic (using oldTx values)
    if (oldTx.account_id) {
      if (oldType === 'income' || oldType === 'transfer_in') {
        await connection.query('UPDATE accounts SET balance = balance - ? WHERE id = ?', [oldTx.amount, oldTx.account_id]);
      } else if (oldType === 'expense' || oldType === 'transfer_out') {
        await connection.query('UPDATE accounts SET balance = balance + ? WHERE id = ?', [oldTx.amount, oldTx.account_id]);
      }
    }
    if (oldTx.bucket_id) {
      if (oldType === 'income' || oldType === 'bucket_move') {
        await connection.query('UPDATE buckets SET balance = balance - ? WHERE id = ?', [oldTx.amount, oldTx.bucket_id]);
      } else if (oldType === 'expense') {
        await connection.query('UPDATE buckets SET balance = balance + ? WHERE id = ?', [oldTx.amount, oldTx.bucket_id]);
      }
    }
    if (oldTx.source_bucket_id && oldType === 'bucket_move') {
      await connection.query('UPDATE buckets SET balance = balance + ? WHERE id = ?', [oldTx.amount, oldTx.source_bucket_id]);
    }

    // Update transaction record
    await connection.query(
      'UPDATE transactions SET date = ?, amount = ?, type = ?, account_id = ?, bucket_id = ?, source_bucket_id = ?, description = ? WHERE id = ?',
      [tx_date, amount, type, account_id, bucket_id, source_bucket_id, description, tx_id]
    );

    // Apply new transaction logic (using merged values)
    const newType = type.toLowerCase();

    if (account_id) {
      if (newType === 'income' || newType === 'transfer_in') {
        await connection.query('UPDATE accounts SET balance = balance + ? WHERE id = ?', [amount, account_id]);
      } else if (newType === 'expense' || newType === 'transfer_out') {
        await connection.query('UPDATE accounts SET balance = balance - ? WHERE id = ?', [amount, account_id]);
      }
    }
    if (bucket_id) {
      if (newType === 'income' || newType === 'bucket_move' || newType === 'transfer_in') {
        await connection.query('UPDATE buckets SET balance = balance + ? WHERE id = ?', [amount, bucket_id]);
      } else if (newType === 'expense' || newType === 'transfer_out') {
        await connection.query('UPDATE buckets SET balance = balance - ? WHERE id = ?', [amount, bucket_id]);
      }
    }
    if (source_bucket_id && newType === 'bucket_move') {
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

    const oldType = tx.type.toLowerCase();

    if (tx.account_id) {
      if (oldType === 'income' || oldType === 'transfer_in') {
        await connection.query('UPDATE accounts SET balance = balance - ? WHERE id = ?', [tx.amount, tx.account_id]);
      } else if (oldType === 'expense' || oldType === 'transfer_out') {
        await connection.query('UPDATE accounts SET balance = balance + ? WHERE id = ?', [tx.amount, tx.account_id]);
      }
    }

    if (tx.bucket_id) {
      if (oldType === 'income' || oldType === 'bucket_move' || oldType === 'transfer_in') {
        await connection.query('UPDATE buckets SET balance = balance - ? WHERE id = ?', [tx.amount, tx.bucket_id]);
      } else if (oldType === 'expense' || oldType === 'transfer_out') {
        await connection.query('UPDATE buckets SET balance = balance + ? WHERE id = ?', [tx.amount, tx.bucket_id]);
      }
    }

    if (tx.source_bucket_id && oldType === 'bucket_move') {
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
