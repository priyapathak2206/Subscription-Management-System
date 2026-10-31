import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { config } from '../config/index.js';
import prisma from '../db/prisma.js';

export interface JwtPayload {
  userId: string;
  email: string;
  role: Role;
}

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Authentication required: Missing or invalid authorization token' });
    return;
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    res.status(401).json({ message: 'Authentication required: Token is empty' });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    if (!user) {
      res.status(401).json({ message: 'User account no longer exists' });
      return;
    }

    if (!user.isActive) {
      res.status(401).json({ message: 'Account is deactivated. Please contact support.' });
      return;
    }

    req.user = user;
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      res.status(401).json({ message: 'Session expired. Please log in again.' });
      return;
    }
    res.status(401).json({ message: 'Invalid or malformed authentication token' });
    return;
  }
}

