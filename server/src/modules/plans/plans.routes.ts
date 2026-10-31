import { Router } from 'express';
import { Role } from '@prisma/client';
import {
  createPlan,
  listPlans,
  getPlan,
  updatePlan,
  deletePlan,
} from './plans.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requireRole } from '../../middleware/requireRole.js';

const router = Router();

router.use(authenticate);

// Reads: ADMIN and STAFF
router.get('/', requireRole(Role.ADMIN, Role.STAFF), listPlans);
router.get('/:id', requireRole(Role.ADMIN, Role.STAFF), getPlan);

// Writes: ADMIN ONLY
router.post('/', requireRole(Role.ADMIN), createPlan);
router.put('/:id', requireRole(Role.ADMIN), updatePlan);
router.patch('/:id', requireRole(Role.ADMIN), updatePlan);
router.delete('/:id', requireRole(Role.ADMIN), deletePlan);

export default router;

