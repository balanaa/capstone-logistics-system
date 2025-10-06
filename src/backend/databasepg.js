const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: process.env.PG_USER || 'postgres',
  host: process.env.PG_HOST || 'localhost',
  database: process.env.PG_NAME || 'sampleshippingdb',
  password: process.env.PG_PASSWORD || 'postgresql999',
  port: process.env.PG_PORT || 5432
});

app.get('/api/billoflading', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM billoflading');
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/invoice', async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM invoice');
      res.json(result.rows);
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  
  app.get('/api/packinglist', async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM packinglist');
      res.json(result.rows);
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  
  app.get('/api/deliveryorder', async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM deliveryorder');
      res.json(result.rows);
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  
  app.get('/api/importeradvice', async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM importeradvice');
      res.json(result.rows);
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  
  app.get('/api/equipmentinterchange', async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM equipmentinterchange');
      res.json(result.rows);
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  
  app.get('/api/billinginvoices', async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM billinginvoices');
      res.json(result.rows);
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});


// Bill of Lading Stats
app.get('/api/billoflading/stats', async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE complete = TRUE) AS completed,
          COUNT(*) FILTER (WHERE complete = FALSE OR complete IS NULL) AS ongoing
        FROM billoflading
      `);
      res.json(result.rows[0]);
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  
  // Equipment Interchange Stats
  app.get('/api/equipmentinterchange/stats', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                COUNT(*) FILTER (WHERE complete::boolean = TRUE) AS completed,
                COUNT(*) FILTER (WHERE complete::boolean = FALSE OR complete IS NULL) AS ongoing
            FROM equipmentinterchange
        `);
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

  // Billing Invoices Stats
  app.get('/api/billinginvoices/stats', async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE complete = TRUE) AS completed,
          COUNT(*) FILTER (WHERE complete = FALSE OR complete IS NULL) AS ongoing
        FROM billinginvoices
      `);
      res.json(result.rows[0]);
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  
