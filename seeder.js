const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

const db = new sqlite3.Database('./database.sqlite');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, function(err) {
    if (err) {
      console.error('Error creating users table:', err);
      return;
    }
    console.log('Users table created or already exists');
  });

  db.run(`CREATE TABLE IF NOT EXISTS search_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    ip_address TEXT NOT NULL,
    geo_data TEXT NOT NULL,
    searched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`, function(err) {
    if (err) {
      console.error('Error creating search_history table:', err);
      return;
    }
    console.log('Search history table created or already exists');
  });

  createUser();
});

async function createUser() {
  const email = 'test@example.com';
  const password = 'password123';
  const hashedPassword = await bcrypt.hash(password, 12);

  db.run(
    'INSERT OR IGNORE INTO users (email, password) VALUES (?, ?)',
    [email, hashedPassword],
    function(err) {
      if (err) {
        console.error('Error creating user:', err);
      } else {
        if (this.changes > 0) {
          console.log('User created successfully:');
          console.log('Email: test@example.com');
          console.log('Password: password123');
        } else {
          console.log('User already exists:');
          console.log('Email: test@example.com');
          console.log('Password: password123');
        }
      }
      
      db.close((closeErr) => {
        if (closeErr) {
          console.error('Error closing database:', closeErr);
        } else {
          console.log('Database connection closed');
        }
      });
    }
  );
}