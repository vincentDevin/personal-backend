import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { JwtPayload, VerifyErrors } from 'jsonwebtoken';
import { Connection, RowDataPacket } from 'mysql2';

const authRoutes = (db: Connection) => {
  const router = Router();

  router.post('/login', (req: Request, res: Response) => {
    const { username, password } = req.body;

    // Verify token
    router.post('/verify', (req: Request, res: Response) => {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({ valid: false, message: 'Token is required' });
      }

      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET as string, (err: VerifyErrors | null, decoded: JwtPayload | string | undefined) => {
        if (err) {
          return res.status(401).json({ valid: false, message: 'Invalid token' });
        }
        return res.status(200).json({ valid: true, user: decoded });
      });
    });

    const query = "SELECT password FROM users WHERE username = ?";
    db.query(query, [username], (err, results) => {
      if (err) {
        return res.status(500).json({ error: err.message });
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
          return res.status(500).json({ error: err.message });
        }

        if (!isMatch) {
          return res.status(401).json({ error: 'Invalid username or password' });
        }

        const token = jwt.sign({ username }, process.env.ACCESS_TOKEN_SECRET as string, { expiresIn: '1h' });
        return res.json({ token });
      });
    });
  });

  return router;
};

export default authRoutes;
