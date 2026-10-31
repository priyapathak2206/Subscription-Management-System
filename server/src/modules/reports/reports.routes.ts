import { Router } from 'express';
import { getSummaryReport, getOverdueReport } from './reports.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requireRole } from '../../middleware/requireRole.js';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/summary', requireRole(Role.ADMIN, Role.STAFF, Role.CUSTOMER), getSummaryReport);
router.get('/overdue', requireRole(Role.ADMIN, Role.STAFF), getOverdueReport);

export default router;
