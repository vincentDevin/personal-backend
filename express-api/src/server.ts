import express from 'express';
import mysql from 'mysql2';
import dotenv from 'dotenv';
import blogRoutes from './routes/blogRoutes';
import authRoutes from './routes/authRoutes';
import contactRoutes from './routes/contactRoutes';

dotenv.config();

const app = express();
const port = 3000;

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
    return;
  }
  console.log('Connected to MySQL');
});

// Public routes
app.use('/api/auth', authRoutes(db));
app.use('/api', blogRoutes(db)); // Public routes for viewing pages
// Contact routes
app.use('/api', contactRoutes(db));


// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
