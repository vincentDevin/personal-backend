import express from 'express';
import mysql from 'mysql2';
import dotenv from 'dotenv';
import blogRoutes from './routes/blogRoutes';
import authRoutes from './routes/authRoutes';
import contactRoutes from './routes/contactRoutes';

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 3000;

// Middleware to parse JSON
app.use(express.json());

// MySQL connection setup
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    process.exit(1); // Exit the process if the database connection fails
  } else {
    console.log('Connected to MySQL');
  }
});

// Public routes
app.use('/api/auth', authRoutes(db));
app.use('/api', blogRoutes(db)); // Public routes for viewing pages
// Contact routes
app.use('/api', contactRoutes(db));

// Start the server
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${port}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    db.end((err) => {
      if (err) {
        console.error('Error closing MySQL connection:', err);
      } else {
        console.log('MySQL connection closed');
      }
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    db.end((err) => {
      if (err) {
        console.error('Error closing MySQL connection:', err);
      } else {
        console.log('MySQL connection closed');
      }
      process.exit(0);
    });
  });
});
