const express = require('express');
const os = require('os');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 80;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

app.get('/', (req, res) => {
  res.send(`<h1>IBM-Aligned E-Commerce Platform</h1>
  <h2>Cloud Application Running Successfully</h2>
  <p>Application Server: ${os.hostname()}</p>
  <p>Database: Amazon RDS PostgreSQL</p>
  <p>Status: Healthy</p>`);
});

app.get('/products', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, price FROM products ORDER BY id');
    res.json(result.rows);
  } catch (error) {
    console.error('Database error:', error.message);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

app.get('/health', (req, res) => res.status(200).send('healthy'));


app.listen(PORT, '0.0.0.0', () => {
  console.log(`E-Commerce application running on port ${PORT}`);
});
