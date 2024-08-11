import { Router, Request, Response } from 'express';
import { Pool } from 'mysql2/promise';
import { body, validationResult } from 'express-validator';
import axios from 'axios'; // To make HTTP requests
import authenticateToken from '../middleware/authMiddleware';

const contactRoutes = (db: Pool) => {
  const router = Router();

  // Handle errors
  function handleError(res: Response, errMsg: string): void {
    res.status(500).json({ error: errMsg });
  }

  // Protected route: Get all contact submissions
  router.get('/contacts', authenticateToken, async (req: Request, res: Response) => {
    const query = "SELECT * FROM contacts ORDER BY created_at DESC";

    try {
      const [rows] = await db.query(query);
      res.json(rows);
    } catch (err) {
      handleError(res, (err as Error).message);
    }
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
      body('g-recaptcha-response')
        .notEmpty().withMessage('reCAPTCHA is required') // Ensure reCAPTCHA token is present
    ],
    async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { firstName, lastName, email, comments, 'g-recaptcha-response': recaptchaToken } = req.body;

      try {
        // Verify the reCAPTCHA token with Google
        const recaptchaSecret = process.env.CAPTCHA_SECRET; // Replace with your secret key
        const recaptchaResponse = await axios.post(`https://www.google.com/recaptcha/api/siteverify`, null, {
          params: {
            secret: recaptchaSecret,
            response: recaptchaToken,
          },
        });

        const { success } = recaptchaResponse.data;

        if (!success) {
          return res.status(400).json({ error: 'Failed reCAPTCHA verification' });
        }

        const query = `
          INSERT INTO contacts (firstName, lastName, email, comments)
          VALUES (?, ?, ?, ?)
        `;

        const values = [firstName, lastName, email, comments];

        await db.query(query, values);
        res.status(200).json({ success: true, message: 'Contact information saved successfully' });
      } catch (error) {
        handleError(res, (error as Error).message);
      }
    }
  );

  return router;
};

export default contactRoutes;
