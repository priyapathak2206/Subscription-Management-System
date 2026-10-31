import { Router } from 'express';
import {
  register,
  login,
  me,
  forgotPassword,
  resetPassword,
} from './auth.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authRateLimiter } from '../../middleware/rateLimiter.js';

const router = Router();

// Public auth routes (rate limited)
router.post('/register', authRateLimiter, register);
router.post('/login', authRateLimiter, login);
router.post('/forgot-password', authRateLimiter, forgotPassword);
router.post('/reset-password', authRateLimiter, resetPassword);

// Authenticated session route
router.get('/me', authenticate, me);

export default router;

