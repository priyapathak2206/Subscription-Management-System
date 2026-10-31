import { Router } from 'express';
import { Role } from '@prisma/client';
import {
  createProduct,
  listProducts,
  getProduct,
  updateProduct,
  deleteProduct,
  addVariant,
  deleteVariant,
} from './products.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requireRole } from '../../middleware/requireRole.js';

const router = Router();

router.use(authenticate);

// Reads: ADMIN and STAFF can read
router.get('/', requireRole(Role.ADMIN, Role.STAFF), listProducts);
router.get('/:id', requireRole(Role.ADMIN, Role.STAFF), getProduct);

// Writes: ADMIN ONLY
router.post('/', requireRole(Role.ADMIN), createProduct);
router.put('/:id', requireRole(Role.ADMIN), updateProduct);
router.patch('/:id', requireRole(Role.ADMIN), updateProduct);
router.delete('/:id', requireRole(Role.ADMIN), deleteProduct);

// Variant endpoints (ADMIN ONLY)
router.post('/:id/variants', requireRole(Role.ADMIN), addVariant);
router.delete('/:id/variants/:variantId', requireRole(Role.ADMIN), deleteVariant);

export default router;

