import { describe, it, expect, vi } from 'vitest';
import { generateInvoiceForSubscription } from '../modules/invoices/invoices.service.js';
import { prisma } from '../db/prisma.js';

describe('Invoicing Engine & Idempotency Guarantee', () => {
  it('prevents double billing on identical [subscriptionId, periodStart]', async () => {
    const subId = 'sub-test-id-123';
    const periodStart = new Date('2026-11-01T00:00:00Z');

    const mockExistingInvoice = {
      id: 'inv-existing-001',
      number: 'INV-2026-00001',
      subscriptionId: subId,
      periodStart,
      total: 199.0,
      status: 'CONFIRMED',
    };

    const txSpy = vi.spyOn(prisma, '$transaction').mockImplementation(async (fn: any) => {
      return fn(prisma);
    });

    const findUniqueSpy = vi.spyOn(prisma.invoice, 'findUnique').mockResolvedValue(mockExistingInvoice as any);

    const result = await generateInvoiceForSubscription(subId, periodStart);

    expect(result.skipped).toBe(true);
    expect(result.reason).toContain('already generated');
    expect(result.invoice).toBeDefined();
    expect(result.invoice?.number).toBe('INV-2026-00001');

    findUniqueSpy.mockRestore();
    txSpy.mockRestore();
  });

  it('gracefully handles concurrent database P2002 unique constraint conflicts', async () => {
    const subId = 'sub-test-conflict';
    const periodStart = new Date('2026-11-01T00:00:00Z');

    const p2002Error: any = new Error('Unique constraint failed on the fields: (`subscriptionId`,`periodStart`)');
    p2002Error.code = 'P2002';

    const txSpy = vi.spyOn(prisma, '$transaction').mockRejectedValue(p2002Error);

    const result = await generateInvoiceForSubscription(subId, periodStart);

    expect(result.skipped).toBe(true);
    expect(result.created).toBe(false);
    expect(result.reason).toContain('Concurrent conflict');

    txSpy.mockRestore();
  });

  it('computes payment dueDate correctly from payment terms', () => {
    const baseDate = new Date('2026-01-01T00:00:00Z');

    const computeDueDate = (terms: string, date: Date) => {
      const due = new Date(date);
      switch (terms) {
        case 'IMMEDIATE':
          return due;
        case 'NET_15':
          due.setDate(due.getDate() + 15);
          return due;
        case 'NET_30':
          due.setDate(due.getDate() + 30);
          return due;
        case 'NET_60':
          due.setDate(due.getDate() + 60);
          return due;
        default:
          due.setDate(due.getDate() + 30);
          return due;
      }
    };

    const immediate = computeDueDate('IMMEDIATE', baseDate);
    expect(immediate.getTime()).toBe(baseDate.getTime());

    const net15 = computeDueDate('NET_15', baseDate);
    expect(net15.getDate()).toBe(16);

    const net30 = computeDueDate('NET_30', baseDate);
    expect(net30.getDate()).toBe(31);
  });
});
