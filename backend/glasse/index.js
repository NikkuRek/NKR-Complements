const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

const cakesRoutes = require('./routes/cakes');
const historyRoutes = require('./routes/history');

app.use(cors());
app.use(express.json());

app.use('/api/cakes', cakesRoutes);
app.use('/api/history', historyRoutes);

app.get('/', (req, res) => {
  res.send('Hello from Glasse Backend!');
});

app.listen(port, () => {
  console.log(`Glasse Server listening at http://localhost:${port}`);
});
