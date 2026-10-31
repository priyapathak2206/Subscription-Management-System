import { Router } from 'express';
import {
  listQuotationTemplates,
  getQuotationTemplateById,
  createQuotationTemplate,
  updateQuotationTemplate,
  deleteQuotationTemplate,
} from './templates.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requireRole } from '../../middleware/requireRole.js';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/', requireRole(Role.ADMIN, Role.STAFF), listQuotationTemplates);
router.get('/:id', requireRole(Role.ADMIN, Role.STAFF), getQuotationTemplateById);
router.post('/', requireRole(Role.ADMIN, Role.STAFF), createQuotationTemplate);
router.put('/:id', requireRole(Role.ADMIN, Role.STAFF), updateQuotationTemplate);
router.delete('/:id', requireRole(Role.ADMIN, Role.STAFF), deleteQuotationTemplate);

export default router;
