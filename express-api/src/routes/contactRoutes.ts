import { Router, Request, Response } from 'express';
import { Connection } from 'mysql2';
import authenticateToken from '../middleware/authMiddleware';

const contactRoutes = (db: Connection) => {
  const router = Router();

  // Handle errors
  function handleError(res: Response, errMsg: string): void {
    res.status(500).json({ error: errMsg });
  }

  // Protected route: Get all contact submissions
  router.get('/contacts', authenticateToken, (req: Request, res: Response) => {
    const query = "SELECT * FROM contacts ORDER BY created_at DESC";

    db.query(query, (err, results) => {
      if (err) {
        handleError(res, err.message);
        return;
      }

      const rows = results as any[];
      res.json(rows);
    });
  });

  // Public route: Store contact form data
  router.post('/contact', (req: Request, res: Response) => {
    const { firstName, lastName, email, comments } = req.body;

    // Validate that all fields are present
    if (!firstName || !lastName || !email || !comments) {
      res.status(400).json({ error: 'All fields are required' });
      return;
    }

    // Validate that comments do not exceed 500 characters
    if (comments.length > 500) {
      res.status(400).json({ error: 'Comments cannot exceed 500 characters' });
      return;
    }

    const query = `
      INSERT INTO contacts (firstName, lastName, email, comments)
      VALUES (?, ?, ?, ?)
    `;

    const values = [firstName, lastName, email, comments];

    db.query(query, values, (err, results) => {
      if (err) {
        handleError(res, err.message);
        return;
      }
      res.status(200).json({ success: true, message: 'Contact information saved successfully' });
    });
  });

  return router;
};

export default contactRoutes;
