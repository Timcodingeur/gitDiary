import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2";
import dotenv from "dotenv";
import cors from "cors";
import authRoutes from './src/routes/auth.mjs';
import timeRoute from './src/routes/time.mjs';

dotenv.config();

export const app = express();
const PORT = 8000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors({
  origin: 'https://gitdiary.ch',
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/', authRoutes);
app.use('/', timeRoute);

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
    console.error("Error connecting to the database:", err.message);
  } else {
    console.log("Connected to the MySQL database.");
  }
});

// Root route
app.get("/", (req, res) => {
  res.send("API is running");
});

// Catch-all route
app.all("*", (req, res) => {
  if (req.path === "/get-time/") {
    return res.status(400).json({ error: "Missing hash in params" });
  }
  res.redirect("/");
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Global error handler:", err.message);
  res.status(500).json({ error: err.message || "Internal server error" });
});

export const server = app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});