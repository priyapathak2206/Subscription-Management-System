import { Router } from 'express';
import {
  listSubscriptions,
  getSubscriptionById,
  handleCreateSubscription,
  handleTransitionSubscription,
} from './subscriptions.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requireRole } from '../../middleware/requireRole.js';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/', listSubscriptions);
router.get('/:id', getSubscriptionById);
router.post('/', requireRole(Role.ADMIN, Role.STAFF, Role.CUSTOMER), handleCreateSubscription);
router.post('/:id/transition', requireRole(Role.ADMIN, Role.STAFF), handleTransitionSubscription);

export default router;
