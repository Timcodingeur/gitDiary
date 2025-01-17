import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import mysql from 'mysql2';
const CLIENT_ID = process.env.APP_CLIENT_ID;
const CLIENT_SECRET = process.env.APP_CLIENT_SECRET;

const app = express();
const PORT = 8000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
})

db.connect((err) => {
    if (err) {
        console.error('Error connecting to the database:', err);
        return;
    }
    console.log('Connected to the MySQL database.');
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/callback', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/oauth/github', async (req, res) => {
    const { code } = req.body;
    const client_id = CLIENT_ID;
    const client_secret = CLIENT_SECRET;

    try {
        const response = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                client_id,
                client_secret,
                code
            })
        });

        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch access token' });
    }
});

app.post('/add-time', (req, res) => {
    const { hash, time } = req.body;

    const querySelect = 'SELECT * FROM t_commits WHERE hash = ?';
    db.query(querySelect, [hash], (err, result) => {
        if (err) {
            res.status(500).json({ error: 'Failed to check if time exists' });
            return;
        }
        if (result.length > 0) {
            const query = 'UPDATE t_commits SET time = ? WHERE hash = ?';
            db.query(query, [time, hash], (err, result) => {
                if (err) {
                    res.status(500).json({ error: 'Failed to update time' });
                    return;
                }
                console.log("Time updated successfully");
            });
        } else {
            const query = 'INSERT INTO t_commits (hash, time) VALUES (?, ?)';
            db.query(query, [hash, time], (err, result) => {
                if (err) {
                    res.status(500).json({ error: 'Failed to add time' });
                    return;
                }
                console.log("Time added successfully");
            }); 
        }
    });
});

app.get('/get-time/:hash', (req, res) => {
    const { hash } = req.params;

    const query = "SELECT time FROM t_commits WHERE hash = ?";
    db.query(query, [hash], (err, result) => {
        if (err) {
            console.log(err)
            res.status(500).json({ error: 'Failed to get time' });
            return;
        }
        return res.json(result);
    });
})

app.all('*', (req, res) => {
    res.redirect('/');
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
