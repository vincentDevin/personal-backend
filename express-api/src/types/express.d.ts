import { JwtPayload } from 'jsonwebtoken';

declare module 'express-serve-static-core' {
    interface Request {
        user?: string | JwtPayload; // Adjust this type based on your use case
    }
}
