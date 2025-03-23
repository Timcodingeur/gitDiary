import dotenv from 'dotenv';
import mysql from 'mysql2';

// Initialize dotenv
dotenv.config();

// Vérification des variables d'environnement
console.log('Checking environment variables...');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);

if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_NAME) {
  throw new Error('Missing database environment variables. Please check your .env file and deployment configuration.');
}

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  connectTimeout: 10000, // 10 seconds
};

console.log('Attempting database connection with config:', {
  ...dbConfig,
  password: '********' // Masquer le mot de passe dans les logs
});

const connection = mysql.createConnection(dbConfig);

connection.connect((err) => {
  if (err) {
    console.error('Error connecting to the database:', {
      code: err.code,
      errno: err.errno,
      sqlState: err.sqlState,
      message: err.message
    });
    process.exit(1); // Arrêter l'application si la connexion échoue
  }
  console.log('Successfully connected to the database');
});

export default connection;