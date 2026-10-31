import { Request, Response, NextFunction } from 'express';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './auth.validation.js';
import * as authService from './auth.service.js';

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validatedData = registerSchema.parse(req.body);
    const result = await authService.registerCustomer(validatedData);
    res.status(201).json({
      message: 'Registration successful',
      ...result,
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validatedData = loginSchema.parse(req.body);
    const result = await authService.loginUser(validatedData);
    res.status(200).json({
      message: 'Login successful',
      ...result,
    });
  } catch (err) {
    next(err);
  }
}

export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }
    res.status(200).json({
      user: req.user,
    });
  } catch (err) {
    next(err);
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validatedData = forgotPasswordSchema.parse(req.body);
    const result = await authService.forgotPassword(validatedData.email);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validatedData = resetPasswordSchema.parse(req.body);
    const result = await authService.resetPassword(validatedData.token, validatedData.password);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

