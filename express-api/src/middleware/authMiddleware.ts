import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';

interface CustomRequest extends Request {
  user?: string | JwtPayload;
}

const authenticateToken = (req: CustomRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.sendStatus(401);

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET as string, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user as string | JwtPayload;
        console.log('Token verified, user set:', req.user);  // Add this line
        next();
    });
};

export default authenticateToken;
