import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { JwtPayload, VerifyErrors } from 'jsonwebtoken';
import { Pool, RowDataPacket } from 'mysql2/promise';
import { body, validationResult } from 'express-validator';
import axios from 'axios';

const authRoutes = (db: Pool) => {
  const router = Router();

  // Handle errors
  function handleError(res: Response, errMsg: string): void {
    res.status(500).json({ error: errMsg });
  }

  // POST /login - User login route
  router.post(
    '/login',
    [
      body('username').trim().notEmpty().withMessage('Username is required'),
      body('password').trim().notEmpty().withMessage('Password is required'),
      body('g-recaptcha-response').notEmpty().withMessage('reCAPTCHA is required')
    ],
    async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { username, password, 'g-recaptcha-response': recaptchaToken } = req.body;

      try {
        // Verify the reCAPTCHA token with Google
        const recaptchaSecret = process.env.CAPTCHA_SECRET as string;
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

        const query = "SELECT password FROM users WHERE username = ?";
        const [rows] = await db.query<RowDataPacket[]>(query, [username]);

        if (rows.length === 0) {
          return res.status(401).json({ error: 'Invalid username or password' });
        }

        const user = rows[0];
        const hashedPassword = user.password;

        const isMatch = await bcrypt.compare(password, hashedPassword);
        if (!isMatch) {
          return res.status(401).json({ error: 'Invalid username or password' });
        }

        const token = jwt.sign({ username }, process.env.ACCESS_TOKEN_SECRET as string, { expiresIn: '1h' });
        return res.json({ token });

      } catch (error) {
        return handleError(res, 'Error verifying reCAPTCHA');
      }
    }
  );

  return router;
};

export default authRoutes;
