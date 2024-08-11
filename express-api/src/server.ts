import express from 'express';
import mysql from 'mysql2/promise'; // Use the promise-based API for pooling
import dotenv from 'dotenv';
import blogRoutes from './routes/blogRoutes';
import authRoutes from './routes/authRoutes';
import contactRoutes from './routes/contactRoutes';

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 3000;

// Middleware to parse JSON
app.use(express.json());

// MySQL connection pool setup
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Public routes
app.use('/api/auth', authRoutes(pool));
app.use('/api', blogRoutes(pool));
app.use('/api', contactRoutes(pool));

// Start the server
const server = app.listen(port, '0.0.0.0', () => {
  // logMessage(`Server is running on http://0.0.0.0:${port}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  // logMessage('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    // logMessage('HTTP server closed');
    pool.end().then(() => {
      // logMessage('MySQL connection pool closed');
      process.exit(0);
    }).catch(err => {
      // logMessage('Error closing MySQL connection pool:', err);
      process.exit(1);
    });
  });
});

process.on('SIGINT', () => {
  // logMessage('SIGINT signal received: closing HTTP server');
  server.close(() => {
    // logMessage('HTTP server closed');
    pool.end().then(() => {
      // logMessage('MySQL connection pool closed');
      process.exit(0);
    }).catch(err => {
      // logMessage('Error closing MySQL connection pool:', err);
      process.exit(1);
    });
  });
});
