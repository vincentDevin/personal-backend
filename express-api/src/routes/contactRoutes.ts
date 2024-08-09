import { Router, Request, Response } from 'express';
import { Connection } from 'mysql2';
import { body, validationResult } from 'express-validator';
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

  // Public route: Store contact form data with validation
  router.post(
    '/contact',
    [
      // Validation and sanitization
      body('firstName')
        .trim()
        .notEmpty().withMessage('First name is required')
        .isLength({ max: 50 }).withMessage('First name cannot exceed 50 characters'),
      body('lastName')
        .trim()
        .notEmpty().withMessage('Last name is required')
        .isLength({ max: 50 }).withMessage('Last name cannot exceed 50 characters'),
      body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Invalid email format'),
      body('comments')
        .trim()
        .notEmpty().withMessage('Comments are required')
        .isLength({ max: 500 }).withMessage('Comments cannot exceed 500 characters'),
    ],
    (req: Request, res: Response) => {
      // Handle validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { firstName, lastName, email, comments } = req.body;

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
    }
  );

  return router;
};

export default contactRoutes;
