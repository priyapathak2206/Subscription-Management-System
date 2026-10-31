import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export interface AppError extends Error {
  statusCode?: number;
  errors?: any;
}

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // 1. Zod Validation Errors
  if (err instanceof ZodError) {
    const formattedErrors: Record<string, string[]> = {};
    for (const issue of err.issues) {
      const field = issue.path.join('.') || 'general';
      if (!formattedErrors[field]) {
        formattedErrors[field] = [];
      }
      formattedErrors[field].push(issue.message);
    }

    res.status(400).json({
      message: 'Validation failed',
      errors: formattedErrors,
    });
    return;
  }

  // 2. Prisma Database Errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Unique constraint violation
    if (err.code === 'P2002') {
      const target = Array.isArray(err.meta?.target)
        ? (err.meta?.target as string[]).join(', ')
        : 'field';
      res.status(409).json({
        message: `Conflict: A record with this unique ${target} already exists.`,
      });
      return;
    }

    // Record to update not found
    if (err.code === 'P2025') {
      res.status(404).json({
        message: 'The requested resource was not found.',
      });
      return;
    }
  }

  // 3. Custom / Explicit Status Codes
  const statusCode = err.statusCode || (err.status >= 400 && err.status < 600 ? err.status : 500);
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    message,
    ...(err.errors ? { errors: err.errors } : {}),
  });
}

