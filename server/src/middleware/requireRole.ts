import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';

/**
 * RBAC authorization middleware.
 * Ensures the authenticated user possesses one of the allowed roles.
 *
 * @param roles Array of allowed Role enum values
 * @returns Express route handler
 */
export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        message: `Forbidden: Action requires one of [${roles.join(', ')}] role privileges.`,
      });
      return;
    }

    next();
  };
}

