const express = require('express');
const router = express.Router();
const pool = require('../db');

// POST /api/sync
router.post('/', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { accounts, buckets, transactions } = req.body;
    await connection.beginTransaction();

    await connection.query('SET FOREIGN_KEY_CHECKS=0');
    await connection.query('DELETE FROM transactions');
    await connection.query('DELETE FROM buckets');
    await connection.query('DELETE FROM accounts');

    if (accounts) {
      for (const acc of accounts) {
        await connection.query(
          'INSERT INTO accounts (id, name, type, currency, balance, start_date, due_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [acc.id, acc.name, acc.type, acc.currency, acc.balance || 0, acc.startDate, acc.dueDate]
        );
      }
    }

    if (buckets) {
      for (const b of buckets) {
        await connection.query(
          'INSERT INTO buckets (id, name, balance) VALUES (?, ?, ?)',
          [b.id, b.name, b.balance || 0]
        );
      }
    }

    if (transactions) {
      for (const t of transactions) {
        await connection.query(
          'INSERT INTO transactions (id, date, amount, type, account_id, bucket_id, source_bucket_id, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [t.id, t.date, t.amount, t.type, t.accountId, t.bucketId, t.sourceBucketId, t.description]
        );
      }
    }

    await connection.query('SET FOREIGN_KEY_CHECKS=1');
    await connection.commit();
    res.json({ synced: true });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

module.exports = router;
