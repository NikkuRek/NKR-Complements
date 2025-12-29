const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

const accountsRoutes = require('./routes/accounts');
const bucketsRoutes = require('./routes/buckets');
const transactionsRoutes = require('./routes/transactions');
const syncRoutes = require('./routes/sync');
const wishlistRoutes = require('./routes/wishlist');
const migrationsRoutes = require('./routes/migrations');

// HTTP request logger
app.use(morgan('dev'));

app.use(cors());
app.use(express.json());

// Serve static files (migrations UI)
app.use(express.static('public'));

// Swagger UI configuration
const swaggerOptions = {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Denarius API Documentation',
};

// Swagger documentation endpoint
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerOptions));

app.use('/api/accounts', accountsRoutes);
app.use('/api/buckets', bucketsRoutes);
app.use('/api/transactions', transactionsRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api', migrationsRoutes);

app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Denarius Backend</title>
        <style>
          body {
            font-family: 'Inter', -apple-system, sans-serif;
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            color: #f1f5f9;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0;
          }
          .container {
            text-align: center;
            background: rgba(30, 41, 59, 0.7);
            backdrop-filter: blur(16px);
            padding: 48px;
            border-radius: 24px;
            border: 1px solid rgba(255, 255, 255, 0.08);
          }
          h1 {
            font-size: 48px;
            margin-bottom: 16px;
            background: linear-gradient(135deg, #818cf8 0%, #6366f1 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }
          p {
            color: #94a3b8;
            margin-bottom: 32px;
          }
          a {
            display: inline-block;
            margin: 8px;
            padding: 12px 24px;
            background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
            color: white;
            text-decoration: none;
            border-radius: 12px;
            font-weight: 600;
            transition: transform 0.2s;
          }
          a:hover {
            transform: translateY(-2px);
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🚀 Denarius Backend</h1>
          <p>Sistema de gestión financiera - API REST</p>
          <div>
            <a href="/api-docs">📚 API Documentation (Swagger)</a>
            <a href="/migrations.html">🗄️ Migrations Panel</a>
          </div>
        </div>
      </body>
    </html>
  `);
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
  console.log(`API Docs available at http://localhost:${port}/api-docs`);
  console.log(`Migrations panel at http://localhost:${port}/migrations.html`);
});
