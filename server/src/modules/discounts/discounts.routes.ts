import { Router } from 'express';
import { Role } from '@prisma/client';
import {
  createDiscount,
  listDiscounts,
  getDiscount,
  updateDiscount,
  deleteDiscount,
} from './discounts.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requireRole } from '../../middleware/requireRole.js';

const router = Router();

router.use(authenticate);

// Reads: ADMIN and STAFF
router.get('/', requireRole(Role.ADMIN, Role.STAFF), listDiscounts);
router.get('/:id', requireRole(Role.ADMIN, Role.STAFF), getDiscount);

// Writes: ADMIN ONLY (403 for anyone else)
router.post('/', requireRole(Role.ADMIN), createDiscount);
router.put('/:id', requireRole(Role.ADMIN), updateDiscount);
router.patch('/:id', requireRole(Role.ADMIN), updateDiscount);
router.delete('/:id', requireRole(Role.ADMIN), deleteDiscount);

export default router;

