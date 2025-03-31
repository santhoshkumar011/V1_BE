// server.js - Main entry point for the Express API
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { Pool } = require('pg');
require('dotenv').config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());

// PostgreSQL connection pool
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: process.env.DB_PORT || 5432
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err.stack);
  } else {
    console.log('Database connected successfully');
  }
});

// Routes
// Get all enquiries with filtering and sorting
app.get('/api/admin/enquiries', async (req, res) => {
  try {
    const { sort = 'created_at', direction = 'desc', status, search } = req.query;
    
    // Build the SQL query with potential filters
    let query = `
      SELECT * FROM enquiries
      WHERE 1 = 1
    `;
    
    const queryParams = [];
    let paramIndex = 1;
    
    // Add status filter if provided
    if (status && status !== 'all') {
      query += ` AND status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }
    
    // Add search filter if provided
    if (search) {
      query += ` AND (
        uname ILIKE $${paramIndex} OR
        email ILIKE $${paramIndex} OR
        mobile ILIKE $${paramIndex}
      )`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }
    
    // Add sorting
    const allowedSortFields = ['uname', 'email', 'mobile', 'created_at', 'status', 'submission_datetime'];
    const allowedDirections = ['asc', 'desc'];
    
    const sortField = allowedSortFields.includes(sort) ? sort : 'created_at';
    const sortDirection = allowedDirections.includes(direction) ? direction : 'desc';
    
    query += ` ORDER BY ${sortField} ${sortDirection}`;
    
    const result = await pool.query(query, queryParams);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching enquiries:', error);
    res.status(500).json({ error: 'Failed to fetch enquiries' });
  }
});

// Get a single enquiry by ID
app.get('/api/admin/enquiries/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM enquiries WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Enquiry not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching enquiry:', error);
    res.status(500).json({ error: 'Failed to fetch enquiry' });
  }
});

// Update an entire enquiry (PUT)
app.put('/api/admin/enquiries/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { uname, email, mobile, contacted, followup_date, notes, status } = req.body;
    
    // Validate required fields
    if (!uname || !email || !mobile) {
      return res.status(400).json({ error: 'Name, email, and mobile are required fields' });
    }
    
    const result = await pool.query(
      `UPDATE enquiries SET
        uname = $1,
        email = $2,
        mobile = $3,
        contacted = $4,
        followup_date = $5,
        notes = $6,
        status = $7,
        updated_at = NOW()
      WHERE id = $8
      RETURNING *`,
      [uname, email, mobile, contacted, followup_date, notes, status, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Enquiry not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating enquiry:', error);
    res.status(500).json({ error: 'Failed to update enquiry' });
  }
});

// Update specific fields of an enquiry (PATCH)
app.patch('/api/admin/enquiries/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Build dynamic SET clause for the SQL query
    const keys = Object.keys(updates);
    if (keys.length === 0) {
      return res.status(400).json({ error: 'No fields provided for update' });
    }
    
    const setClause = keys
      .map((key, index) => `${key} = $${index + 1}`)
      .join(', ');
    
    const values = keys.map(key => updates[key]);
    values.push(id);
    
    const query = `
      UPDATE enquiries SET
        ${setClause},
        updated_at = NOW()
      WHERE id = $${values.length}
      RETURNING *
    `;
    
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Enquiry not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating enquiry fields:', error);
    res.status(500).json({ error: 'Failed to update enquiry' });
  }
});

// Delete an enquiry
app.delete('/api/admin/enquiries/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM enquiries WHERE id = $1 RETURNING id',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Enquiry not found' });
    }
    
    res.json({ message: 'Enquiry deleted successfully', id: result.rows[0].id });
  } catch (error) {
    console.error('Error deleting enquiry:', error);
    res.status(500).json({ error: 'Failed to delete enquiry' });
  }
});

// Form submission endpoint (from frontend user form)
app.post('/api/enquire', async (req, res) => {
  try {
    const { uname, email, mobile } = req.body;
    
    // Validate required fields
    if (!uname || !email || !mobile) {
      return res.status(400).json({ error: 'Name, email, and mobile are required fields' });
    }
    
    // Get current timestamp
    const now = new Date();
    
    // Insert new enquiry with submission date and time
    const result = await pool.query(
      `INSERT INTO enquiries (
        uname, email, mobile, status, created_at, updated_at, submission_datetime
      ) VALUES ($1, $2, $3, 'new', NOW(), NOW(), $4)
      RETURNING *`,
      [uname, email, mobile, now]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating enquiry:', error);
    res.status(500).json({ error: 'Failed to create enquiry' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});