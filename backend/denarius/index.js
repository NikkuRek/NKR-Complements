const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

const accountsRoutes = require('./routes/accounts');
const bucketsRoutes = require('./routes/buckets');
const transactionsRoutes = require('./routes/transactions');
const syncRoutes = require('./routes/sync');
const wishlistRoutes = require('./routes/wishlist');

app.use(cors());
app.use(express.json());

app.use('/api/accounts', accountsRoutes);
app.use('/api/buckets', bucketsRoutes);
app.use('/api/transactions', transactionsRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/wishlist', wishlistRoutes);

app.get('/', (req, res) => {
  res.send('Backend is running!');
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
