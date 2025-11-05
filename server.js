const express = require('express');
const cors = require('cors');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = 8000;

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, 
    maxAge: 24 * 60 * 60 * 1000 
  }
}));

const db = new sqlite3.Database('./database.sqlite', (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
  }
});

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS search_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    ip_address TEXT NOT NULL,
    geo_data TEXT NOT NULL,
    searched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);
});

const requireAuth = (req, res, next) => {
  if (req.session && req.session.userId) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

// Routes

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    req.session.userId = user.id;
    req.session.userEmail = user.email;

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email
      }
    });
  });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ message: 'Logout successful' });
  });
});

app.get('/api/check-auth', (req, res) => {
  if (req.session.userId) {
    res.json({
      authenticated: true,
      user: {
        id: req.session.userId,
        email: req.session.userEmail
      }
    });
  } else {
    res.json({ authenticated: false });
  }
});

app.get('/api/geo', requireAuth, async (req, res) => {
  try {
    let ip = req.query.ip;
    
    if (!ip) {
      ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
      ip = ip.replace('::ffff:', '');
    }

    const response = await axios.get(`https://ipinfo.io/${ip}/geo`);
    const geoData = response.data;

    if (ip !== req.headers['x-forwarded-for']?.replace('::ffff:', '') && 
        ip !== req.connection.remoteAddress?.replace('::ffff:', '')) {
      db.run(
        'INSERT INTO search_history (user_id, ip_address, geo_data) VALUES (?, ?, ?)',
        [req.session.userId, ip, JSON.stringify(geoData)]
      );
    }

    res.json(geoData);
  } catch (error) {
    if (error.response?.status === 404) {
      res.status(400).json({ error: 'Invalid IP address' });
    } else {
      res.status(500).json({ error: 'Failed to fetch geo information' });
    }
  }
});

app.get('/api/history', requireAuth, (req, res) => {
  db.all(
    'SELECT * FROM search_history WHERE user_id = ? ORDER BY searched_at DESC',
    [req.session.userId],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      const history = rows.map(row => ({
        id: row.id,
        ip_address: row.ip_address,
        geo_data: JSON.parse(row.geo_data),
        searched_at: row.searched_at
      }));
      
      res.json(history);
    }
  );
});

app.delete('/api/history', requireAuth, (req, res) => {
  const { ids } = req.body;
  
  if (!ids || !Array.isArray(ids)) {
    return res.status(400).json({ error: 'Invalid history IDs' });
  }

  const placeholders = ids.map(() => '?').join(',');
  db.run(
    `DELETE FROM search_history WHERE id IN (${placeholders}) AND user_id = ?`,
    [...ids, req.session.userId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ message: 'History deleted successfully' });
    }
  );
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});