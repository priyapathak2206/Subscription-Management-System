import { Router } from 'express';
import { Role } from '@prisma/client';
import {
  createTax,
  listTaxes,
  getTax,
  updateTax,
  deleteTax,
} from './taxes.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requireRole } from '../../middleware/requireRole.js';

const router = Router();

router.use(authenticate);

// Reads: ADMIN and STAFF
router.get('/', requireRole(Role.ADMIN, Role.STAFF), listTaxes);
router.get('/:id', requireRole(Role.ADMIN, Role.STAFF), getTax);

// Writes: ADMIN ONLY
router.post('/', requireRole(Role.ADMIN), createTax);
router.put('/:id', requireRole(Role.ADMIN), updateTax);
router.patch('/:id', requireRole(Role.ADMIN), updateTax);
router.delete('/:id', requireRole(Role.ADMIN), deleteTax);

export default router;

