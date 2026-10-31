import { prisma } from '../../db/prisma.js';
import { PaymentMethod, InvoiceStatus } from '@prisma/client';

export interface RecordPaymentInput {
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  paymentDate?: string | Date;
  note?: string;
}

export async function recordPayment(
  input: RecordPaymentInput,
  actor: { id: string; role: string }
) {
  const { invoiceId, amount, method, note } = input;
  const numAmount = Number(amount);

  if (isNaN(numAmount) || numAmount <= 0) {
    const err: any = new Error('Payment amount must be greater than 0');
    err.statusCode = 400;
    throw err;
  }

  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        customer: { select: { id: true, name: true, email: true } },
      },
    });

    if (!invoice) {
      const err: any = new Error('Invoice not found');
      err.statusCode = 404;
      throw err;
    }

    if (invoice.status === InvoiceStatus.CANCELLED) {
      const err: any = new Error('Cannot record payment against a cancelled invoice');
      err.statusCode = 400;
      throw err;
    }

    // Customer security: if customer role, must own the invoice
    if (actor.role === 'CUSTOMER' && invoice.customerId !== actor.id) {
      const err: any = new Error('Access denied: You can only pay your own invoices');
      err.statusCode = 403;
      throw err;
    }

    // Calculate outstanding balance
    const outstanding = Math.max(0, Math.round((invoice.total - invoice.amountPaid) * 100) / 100);

    // Overpayment validation
    if (numAmount > outstanding) {
      const err: any = new Error(
        `Payment amount ($${numAmount.toFixed(2)}) exceeds outstanding balance ($${outstanding.toFixed(2)})`
      );
      err.statusCode = 400;
      throw err;
    }

    const paymentDate = input.paymentDate ? new Date(input.paymentDate) : new Date();

    // 1. Create Payment record
    const payment = await tx.payment.create({
      data: {
        invoiceId,
        amount: numAmount,
        method: method || PaymentMethod.BANK_TRANSFER,
        paymentDate,
        note: note || null,
      },
    });

    // 2. Update Invoice amountPaid and mark PAID if fully settled
    const newAmountPaid = Math.round((invoice.amountPaid + numAmount) * 100) / 100;
    const isFullyPaid = newAmountPaid >= invoice.total;

    const updatedInvoice = await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        amountPaid: newAmountPaid,
        ...(isFullyPaid && { status: InvoiceStatus.PAID }),
      },
      include: {
        customer: { select: { id: true, name: true, email: true } },
        subscription: true,
      },
    });

    return {
      payment,
      invoice: updatedInvoice,
      isFullyPaid,
      remainingBalance: Math.max(0, Math.round((updatedInvoice.total - updatedInvoice.amountPaid) * 100) / 100),
    };
  });
}

