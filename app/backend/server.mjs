import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise"; // Notez le changement ici pour utiliser mysql2/promise
import dotenv from "dotenv";
import cors from "cors";
import authRoutes from "./src/routes/auth.mjs";
import timeRoute from "./src/routes/time.mjs";

dotenv.config();

export const app = express();
const PORT = 8000;

// Correction de la définition de __dirname pour ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration du pool de connexions
export const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "test",
  password: process.env.DB_PASSWORD || "test",
  database: process.env.DB_NAME || "test",
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10, // Nombre maximum de connexions dans le pool
  queueLimit: 0, // Nombre illimité de connexions en attente
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

// Vérification de la connexion du pool
async function testConnection() {
  if (process.env.NODE_ENV === "test") {
    console.log("Skipping database connection in test environment");
    return;
  }

  try {
    const connection = await pool.getConnection();
    console.log("Successfully connected to the MySQL database via pool.");
    connection.release();
  } catch (err) {
    console.error("Error connecting to the database:", err.message);
    // Ne pas quitter en mode test
    if (process.env.NODE_ENV !== "test") {
      process.exit(1);
    }
  }
}

// Test initial de la connexion
testConnection();

// AJOUT : Logs détaillés pour le démarrage
console.log("=== GitDiary Backend Starting ===");
console.log("Environment:", process.env.NODE_ENV || "production");
console.log("Database Host:", process.env.DB_HOST);
console.log("Database Name:", process.env.DB_NAME);
console.log("Server Port:", PORT);

app.use(
  cors({
    origin: "https://gitdiary.ch",
    credentials: true,
  })
);

// AJOUT : Log de toutes les requêtes
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

app.use(express.json());

// Routes
app.use("/", authRoutes);
app.use("/", timeRoute);

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

// Gestion propre de la fermeture du pool lors de l'arrêt de l'application
process.on("SIGINT", async () => {
  try {
    await pool.end();
    console.log("Pool connections closed.");
    process.exit(0);
  } catch (err) {
    console.error("Error closing pool connections:", err);
    process.exit(1);
  }
});
