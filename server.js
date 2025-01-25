import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import mysql from 'mysql2';

const CLIENT_ID = process.env.APP_CLIENT_ID;
const CLIENT_SECRET = process.env.APP_CLIENT_SECRET;

export const app = express();
const PORT = 8000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());

// --- Connexion DB ---
export const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

db.connect((err) => {
  if (err) {
    console.error('Error connecting to the database:', err.message);
  } else {
    console.log('Connected to the MySQL database.');
  }
});

// --- Routes ---
app.get('/', (req, res) => {
  return res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/callback', (req, res) => {
  return res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/oauth/github', async (req, res, next) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ error: 'Missing code parameter' });
  }

  const client_id = CLIENT_ID;
  const client_secret = CLIENT_SECRET;

  try {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ client_id, client_secret, code }),
    });

    if (!response.ok) {
      throw new Error(`GitHub OAuth failed with status ${response.status}`);
    }

    const data = await response.json();
    return res.json(data);
  } catch (error) {
    return next(error);
  }
});

app.post('/add-time', (req, res, next) => {
  const { hash, time } = req.body;
  if (!hash || time === undefined) {
    return res.status(400).json({ error: 'Missing hash or time in body' });
  }

  const querySelect = 'SELECT * FROM t_commits WHERE hash = ?';
  db.query(querySelect, [hash], (err, result) => {
    if (err) {
      return next(err);
    }
    if (result.length > 0) {
      const query = 'UPDATE t_commits SET time = ? WHERE hash = ?';
      db.query(query, [time, hash], (errUpdate) => {
        if (errUpdate) {
          return next(errUpdate);
        }
        return res.status(200).json({ message: 'Time updated' });
      });
    } else {
      const query = 'INSERT INTO t_commits (hash, time) VALUES (?, ?)';
      db.query(query, [hash, time], (errInsert) => {
        if (errInsert) {
          return next(errInsert);
        }
        return res.status(201).json({ message: 'Time added' });
      });
    }
  });
});

app.get('/get-time/:hash', (req, res, next) => {
  const { hash } = req.params;
  if (!hash) {
    return res.status(400).json({ error: 'Missing hash in params' });
  }

  const query = 'SELECT time FROM t_commits WHERE hash = ?';
  db.query(query, [hash], (err, result) => {
    if (err) {
      return next(err);
    }
    return res.json(result);
  });
});

app.all('*', (req, res) => {
  return res.redirect('/');
});

app.use((err, req, res, next) => {
  console.error('Global error handler:', err.message);
  return res.status(500).json({ error: err.message || 'Internal server error' });
});

export const server = app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
