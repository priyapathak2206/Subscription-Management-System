import { Router } from 'express';
import { Role } from '@prisma/client';
import {
  createStaff,
  listStaff,
  updateStaffStatus,
  listCustomers,
} from './users.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requireRole } from '../../middleware/requireRole.js';

const router = Router();

// All user management routes require authentication
router.use(authenticate);

// Staff management (ADMIN ONLY)
router.post('/staff', requireRole(Role.ADMIN), createStaff);
router.get('/staff', requireRole(Role.ADMIN), listStaff);
router.patch('/staff/:id/status', requireRole(Role.ADMIN), updateStaffStatus);

// Customer listing for admin & staff (e.g. for customer selection dropdowns)
router.get('/customers', requireRole(Role.ADMIN, Role.STAFF), listCustomers);

export default router;

