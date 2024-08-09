import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { JwtPayload, VerifyErrors } from 'jsonwebtoken';
import { Connection, RowDataPacket } from 'mysql2';
import { body, validationResult } from 'express-validator';

const authRoutes = (db: Connection) => {
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
    ],
    (req: Request, res: Response) => {
      // Handle validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { username, password } = req.body;

      const query = "SELECT password FROM users WHERE username = ?";
      db.query(query, [username], (err, results) => {
        if (err) {
          return handleError(res, err.message);
        }

        // Explicitly cast results to RowDataPacket[]
        const rows = results as RowDataPacket[];

        if (rows.length === 0) {
          return res.status(401).json({ error: 'Invalid username or password' });
        }

        const user = rows[0];
        const hashedPassword = user.password;

        bcrypt.compare(password, hashedPassword, (err, isMatch) => {
          if (err) {
            return handleError(res, err.message);
          }

          if (!isMatch) {
            return res.status(401).json({ error: 'Invalid username or password' });
          }

          const token = jwt.sign({ username }, process.env.ACCESS_TOKEN_SECRET as string, { expiresIn: '1h' });
          return res.json({ token });
        });
      });
    }
  );

  // POST /verify - Verify token route
  router.post(
    '/verify',
    [
      body('token').trim().notEmpty().withMessage('Token is required'),
    ],
    (req: Request, res: Response) => {
      // Handle validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { token } = req.body;

      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET as string, (err: VerifyErrors | null, decoded: JwtPayload | string | undefined) => {
        if (err) {
          return res.status(401).json({ valid: false, message: 'Invalid token' });
        }
        return res.status(200).json({ valid: true, user: decoded });
      });
    }
  );

  return router;
};

export default authRoutes;
