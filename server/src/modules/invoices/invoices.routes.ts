import { Router } from 'express';
import {
  listInvoices,
  getInvoiceById,
  generateInvoice,
  runBilling,
  confirmInvoice,
  cancelInvoice,
  sendInvoice,
  printInvoice,
} from './invoices.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requireRole } from '../../middleware/requireRole.js';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/', listInvoices);
router.post('/generate', requireRole(Role.ADMIN, Role.STAFF), generateInvoice);
router.post('/run-billing', requireRole(Role.ADMIN, Role.STAFF), runBilling);
router.get('/:id', getInvoiceById);
router.get('/:id/print', printInvoice);
router.post('/:id/confirm', requireRole(Role.ADMIN, Role.STAFF), confirmInvoice);
router.patch('/:id/confirm', requireRole(Role.ADMIN, Role.STAFF), confirmInvoice);
router.post('/:id/cancel', requireRole(Role.ADMIN, Role.STAFF), cancelInvoice);
router.post('/:id/send', requireRole(Role.ADMIN, Role.STAFF), sendInvoice);

export default router;
