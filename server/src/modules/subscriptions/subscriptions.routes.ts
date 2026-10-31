import { Router } from 'express';
import {
  listSubscriptions,
  getSubscriptionById,
  handleCreateSubscription,
  handleTransitionSubscription,
  handlePauseSubscription,
  handleResumeSubscription,
  handleRenewSubscription,
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
router.post('/:id/status', requireRole(Role.ADMIN, Role.STAFF), handleTransitionSubscription);
router.patch('/:id/status', requireRole(Role.ADMIN, Role.STAFF), handleTransitionSubscription);
router.post('/:id/pause', requireRole(Role.ADMIN, Role.STAFF), handlePauseSubscription);
router.post('/:id/resume', requireRole(Role.ADMIN, Role.STAFF), handleResumeSubscription);
router.post('/:id/renew', requireRole(Role.ADMIN, Role.STAFF), handleRenewSubscription);

export default router;
