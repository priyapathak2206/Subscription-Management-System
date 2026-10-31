import { Router } from 'express';
import {
  getSummaryReport,
  getOverdueReport,
  getCustomerSummaryReport,
} from './reports.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requireRole } from '../../middleware/requireRole.js';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

// Global Executive Reports (ADMIN & STAFF only - CUSTOMER gets 403)
router.get('/summary', requireRole(Role.ADMIN, Role.STAFF), getSummaryReport);
router.get('/overdue', requireRole(Role.ADMIN, Role.STAFF), getOverdueReport);

// Customer Scoped Summary (CUSTOMER, ADMIN, STAFF)
router.get('/customer-summary', requireRole(Role.CUSTOMER, Role.ADMIN, Role.STAFF), getCustomerSummaryReport);
router.get('/my-summary', requireRole(Role.CUSTOMER, Role.ADMIN, Role.STAFF), getCustomerSummaryReport);

export default router;
