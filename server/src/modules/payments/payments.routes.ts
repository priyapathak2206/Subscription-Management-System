import { Router } from 'express';
import {
  listPayments,
  getPaymentById,
  handlePaymentCreation,
} from './payments.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requireRole } from '../../middleware/requireRole.js';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/', listPayments);
router.get('/:id', getPaymentById);
router.post('/', requireRole(Role.ADMIN, Role.STAFF, Role.CUSTOMER), handlePaymentCreation);

export default router;
