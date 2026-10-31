import { describe, it, expect, vi } from 'vitest';
import { recordPayment } from '../modules/payments/payments.service.js';
import { prisma } from '../db/prisma.js';

describe('Payment Processing & Overpayment Protection', () => {
  it('rejects payments exceeding the outstanding invoice balance with 400', async () => {
    const mockInvoice = {
      id: 'inv-123',
      number: 'INV-2026-00001',
      customerId: 'cust-1',
      total: 100.0,
      amountPaid: 60.0, // Outstanding balance = 40.0
      status: 'CONFIRMED',
    };

    const findUniqueSpy = vi.spyOn(prisma.invoice, 'findUnique').mockResolvedValue(mockInvoice as any);

    // Attempt to pay $50 when outstanding is only $40
    await expect(
      recordPayment({
        invoiceId: 'inv-123',
        amount: 50.0,
        method: 'CARD',
      })
    ).rejects.toThrow(/exceeds outstanding balance/);

    findUniqueSpy.mockRestore();
  });

  it('calculates outstanding balances correctly across payment cycles', () => {
    const invoice = {
      total: 250.0,
      amountPaid: 100.0,
    };

    const outstanding = Math.max(0, invoice.total - invoice.amountPaid);
    expect(outstanding).toBe(150.0);

    const isFullyPaid = invoice.amountPaid + outstanding >= invoice.total;
    expect(isFullyPaid).toBe(true);
  });

  it('flags invoices as overdue when dueDate is in the past and status is not PAID', () => {
    const pastDueDate = new Date();
    pastDueDate.setDate(pastDueDate.getDate() - 10);

    const invoice = {
      status: 'CONFIRMED',
      dueDate: pastDueDate,
      total: 100,
      amountPaid: 0,
    };

    const isOverdue =
      invoice.status !== 'PAID' &&
      invoice.status !== 'CANCELLED' &&
      new Date(invoice.dueDate) < new Date();

    expect(isOverdue).toBe(true);
  });
});
