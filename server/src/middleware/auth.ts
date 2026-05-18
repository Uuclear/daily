import { Request, Response, NextFunction } from 'express';

const jwt = require('jsonwebtoken');

const JWT_SECRET: string = process.env.JWT_SECRET || 'dev-secret-change-me';

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({ error: 'Unauthorized', message: 'No token provided' });
    return;
  }

  if (!authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized', message: 'Invalid token format' });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      sub: string;
      role: string;
      username: string;
    };

    req.userId = decoded.sub;
    req.userRole = decoded.role;

    next();
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (err.name === 'TokenExpiredError') {
        res.status(401).json({ error: 'Unauthorized', message: 'Token expired' });
        return;
      }
      if (err.name === 'JsonWebTokenError') {
        res.status(401).json({ error: 'Unauthorized', message: 'Invalid token' });
        return;
      }
    }
    res.status(401).json({ error: 'Unauthorized', message: 'Token verification failed' });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.userRole !== 'admin') {
    res.status(403).json({ error: 'Forbidden', message: 'Admin access required' });
    return;
  }

  next();
}
