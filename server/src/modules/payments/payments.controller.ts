import { Request, Response } from 'express';
import { prisma } from '../../db/prisma.js';
import { PaymentMethod } from '@prisma/client';
import { resolveCustomerIdScope } from '../../utils/customerScope.js';
import { recordPayment } from './payments.service.js';

export async function listPayments(req: Request, res: Response) {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string, 10) || 20));
    const invoiceId = req.query.invoiceId as string;
    const method = req.query.method as PaymentMethod;
    const requestedCustomerId = req.query.customerId as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    const scopedCustomerId = resolveCustomerIdScope(req.user as any, requestedCustomerId);

    const where: any = {};
    if (invoiceId) where.invoiceId = invoiceId;
    if (method) where.method = method;
    if (scopedCustomerId) {
      where.invoice = { customerId: scopedCustomerId };
    }
    if (startDate || endDate) {
      where.paymentDate = {};
      if (startDate) where.paymentDate.gte = new Date(startDate);
      if (endDate) where.paymentDate.lte = new Date(endDate);
    }

    const [total, payments] = await Promise.all([
      prisma.payment.count({ where }),
      prisma.payment.findMany({
        where,
        include: {
          invoice: {
            select: {
              id: true,
              number: true,
              total: true,
              amountPaid: true,
              status: true,
              customer: { select: { id: true, name: true, email: true } },
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { paymentDate: 'desc' },
      }),
    ]);

    res.json({
      items: payments,
      payments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    const status = error.statusCode || 500;
    res.status(status).json({ message: error.message || 'Failed to list payments' });
  }
}

export async function getPaymentById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        invoice: {
          include: {
            customer: { select: { id: true, name: true, email: true } },
            subscription: true,
          },
        },
      },
    });

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    // Customer security check
    resolveCustomerIdScope(req.user as any, payment.invoice.customerId);

    res.json({ payment });
  } catch (error: any) {
    const status = error.statusCode || 500;
    res.status(status).json({ message: error.message || 'Failed to fetch payment' });
  }
}

export async function handlePaymentCreation(req: Request, res: Response) {
  try {
    const { invoiceId, amount, method, paymentDate, note } = req.body;

    if (!invoiceId || amount === undefined) {
      return res.status(400).json({ message: 'invoiceId and amount are required' });
    }

    const result = await recordPayment(
      {
        invoiceId,
        amount,
        method: method || PaymentMethod.BANK_TRANSFER,
        paymentDate,
        note,
      },
      req.user as any
    );

    res.status(201).json({
      message: result.isFullyPaid
        ? 'Payment recorded successfully. Invoice marked as PAID.'
        : 'Payment recorded successfully.',
      ...result,
    });
  } catch (error: any) {
    const status = error.statusCode || 400;
    res.status(status).json({ message: error.message || 'Payment processing failed' });
  }
}
