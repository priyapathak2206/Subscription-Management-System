import { Request, Response } from 'express';
import { prisma } from '../../db/prisma.js';
import { InvoiceStatus } from '@prisma/client';
import { resolveCustomerIdScope } from '../../utils/customerScope.js';
import {
  generateInvoiceForSubscription,
  runRecurringBillingBatch,
} from './invoices.service.js';
import { sendEmail } from '../../utils/mailer.js';

export async function listInvoices(req: Request, res: Response) {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string, 10) || 20));
    const status = req.query.status as InvoiceStatus;
    const subscriptionId = req.query.subscriptionId as string;
    const search = req.query.search as string;
    const requestedCustomerId = req.query.customerId as string;

    // Apply strict customer isolation scoping (throws 403 if customer accesses other accounts)
    const scopedCustomerId = resolveCustomerIdScope(req.user as any, requestedCustomerId);

    const where: any = {};
    if (status) where.status = status;
    if (subscriptionId) where.subscriptionId = subscriptionId;
    if (scopedCustomerId) where.customerId = scopedCustomerId;
    if (search) {
      where.OR = [
        { number: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
        { customer: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const today = new Date();

    const [total, rawInvoices] = await Promise.all([
      prisma.invoice.count({ where }),
      prisma.invoice.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, email: true } },
          subscription: { select: { id: true, number: true, status: true } },
          payments: {
            orderBy: { paymentDate: 'desc' },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Attach derived fields: outstanding and isOverdue
    const invoices = rawInvoices.map((inv) => {
      const outstanding = Math.max(0, Math.round((inv.total - inv.amountPaid) * 100) / 100);
      const isOverdue =
        inv.status !== InvoiceStatus.PAID &&
        inv.status !== InvoiceStatus.CANCELLED &&
        new Date(inv.dueDate) < today;

      return {
        ...inv,
        outstanding,
        isOverdue,
      };
    });

    res.json({
      items: invoices,
      invoices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    const status = error.statusCode || 500;
    res.status(status).json({ message: error.message || 'Failed to list invoices' });
  }
}

export async function getInvoiceById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true, email: true } },
        subscription: {
          include: { plan: true },
        },
        lines: {
          include: {
            product: true,
            variant: true,
            tax: true,
          },
        },
        payments: {
          orderBy: { paymentDate: 'desc' },
        },
      },
    });

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    // Customer scoping check
    resolveCustomerIdScope(req.user as any, invoice.customerId);

    const today = new Date();
    const outstanding = Math.max(0, Math.round((invoice.total - invoice.amountPaid) * 100) / 100);
    const isOverdue =
      invoice.status !== InvoiceStatus.PAID &&
      invoice.status !== InvoiceStatus.CANCELLED &&
      new Date(invoice.dueDate) < today;

    res.json({
      invoice: {
        ...invoice,
        outstanding,
        isOverdue,
      },
    });
  } catch (error: any) {
    const status = error.statusCode || 500;
    res.status(status).json({ message: error.message || 'Failed to fetch invoice' });
  }
}

export async function generateInvoice(req: Request, res: Response) {
  try {
    const { subscriptionId, periodStart } = req.body;
    if (!subscriptionId) {
      return res.status(400).json({ message: 'subscriptionId is required' });
    }

    const start = periodStart ? new Date(periodStart) : new Date();
    const result = await generateInvoiceForSubscription(subscriptionId, start);

    if (result.skipped) {
      return res.status(200).json({
        message: result.reason || 'Invoice skipped (already exists)',
        invoice: result.invoice,
        skipped: true,
      });
    }

    res.status(201).json({
      message: 'Invoice generated successfully',
      invoice: result.invoice,
      created: true,
    });
  } catch (error: any) {
    const status = error.statusCode || 400;
    res.status(status).json({ message: error.message || 'Invoice generation failed' });
  }
}

export async function runBilling(req: Request, res: Response) {
  try {
    const summary = await runRecurringBillingBatch();
    res.json({
      message: 'Recurring billing job finished',
      summary: {
        created: summary.created,
        skipped: summary.skipped,
        failed: summary.failed,
      },
      errors: summary.errors,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Batch billing run failed' });
  }
}

export async function confirmInvoice(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const existing = await prisma.invoice.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    if (existing.status === InvoiceStatus.CANCELLED) {
      return res.status(400).json({ message: 'Cannot confirm a cancelled invoice' });
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data: { status: InvoiceStatus.CONFIRMED },
      include: {
        customer: true,
        lines: true,
      },
    });

    res.json({ invoice: updated });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to confirm invoice' });
  }
}

export async function cancelInvoice(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const existing = await prisma.invoice.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    // Must reject cancellation if already paid
    if (existing.status === InvoiceStatus.PAID || existing.amountPaid > 0) {
      return res.status(400).json({
        message: 'Cannot cancel an invoice that has registered payments or is marked PAID',
      });
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data: { status: InvoiceStatus.CANCELLED },
    });

    res.json({ invoice: updated });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to cancel invoice' });
  }
}

export async function sendInvoice(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
        lines: { include: { product: true } },
      },
    });

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #4f46e5; margin-bottom: 8px;">Brightloop Software - Invoice ${invoice.number}</h2>
        <p style="color: #64748b; font-size: 14px;">Billed to: <strong>${invoice.customer.name}</strong> (${invoice.customer.email})</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <thead>
            <tr style="background: #f8fafc; text-align: left;">
              <th style="padding: 8px;">Product</th>
              <th style="padding: 8px; text-align: center;">Qty</th>
              <th style="padding: 8px; text-align: right;">Unit Price</th>
              <th style="padding: 8px; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${invoice.lines
              .map(
                (l) => `
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px;">${l.product.name}</td>
                <td style="padding: 8px; text-align: center;">${l.quantity}</td>
                <td style="padding: 8px; text-align: right;">$${l.unitPrice}</td>
                <td style="padding: 8px; text-align: right;">$${l.amount}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
        <div style="margin-top: 20px; text-align: right; font-size: 15px;">
          <p style="margin: 4px 0;">Subtotal: <strong>$${invoice.subtotal.toFixed(2)}</strong></p>
          ${invoice.discountTotal > 0 ? `<p style="margin: 4px 0; color: #16a34a;">Discount: <strong>-$${invoice.discountTotal.toFixed(2)}</strong></p>` : ''}
          <p style="margin: 4px 0;">Tax: <strong>$${invoice.taxTotal.toFixed(2)}</strong></p>
          <h3 style="margin: 8px 0; font-size: 18px; color: #1e293b;">Total Due: $${invoice.total.toFixed(2)}</h3>
          <p style="color: #64748b; font-size: 13px;">Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}</p>
        </div>
      </div>
    `;

    const emailResult = await sendEmail({
      to: invoice.customer.email,
      subject: `Invoice ${invoice.number} from Brightloop Software`,
      text: `Your invoice ${invoice.number} for $${invoice.total.toFixed(2)} is ready. Due date: ${new Date(invoice.dueDate).toLocaleDateString()}.`,
      html,
    });

    const updated = await prisma.invoice.update({
      where: { id },
      data: { sentAt: new Date() },
    });

    res.json({
      message: `Invoice ${invoice.number} emailed successfully`,
      previewUrl: emailResult.previewUrl,
      invoice: updated,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to send invoice email' });
  }
}

export async function printInvoice(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
        subscription: { include: { plan: true } },
        lines: {
          include: {
            product: true,
            variant: true,
            tax: true,
          },
        },
        payments: { orderBy: { paymentDate: 'desc' } },
      },
    });

    if (!invoice) {
      return res.status(404).send('<h1>Invoice Not Found</h1>');
    }

    resolveCustomerIdScope(req.user as any, invoice.customerId);

    const outstanding = Math.max(0, Math.round((invoice.total - invoice.amountPaid) * 100) / 100);

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice ${invoice.number}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; padding: 40px; max-width: 800px; margin: 0 auto; background: #fff; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; }
    .logo { font-size: 26px; font-weight: 800; color: #4f46e5; }
    .invoice-title { font-size: 22px; font-weight: 700; color: #334155; }
    .meta { display: flex; justify-content: space-between; margin-top: 24px; font-size: 14px; }
    .meta div { line-height: 1.6; }
    table { width: 100%; border-collapse: collapse; margin-top: 32px; font-size: 14px; }
    th { background: #f8fafc; border-bottom: 2px solid #cbd5e1; padding: 12px; text-align: left; font-weight: 600; color: #475569; }
    td { padding: 12px; border-bottom: 1px solid #e2e8f0; }
    .totals { margin-top: 24px; float: right; width: 300px; font-size: 14px; }
    .totals div { display: flex; justify-content: space-between; padding: 6px 0; }
    .grand-total { font-size: 18px; font-weight: 700; border-top: 2px solid #1e293b; margin-top: 8px; padding-top: 8px; color: #0f172a; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 700; text-transform: uppercase; }
    .badge-paid { background: #dcfce7; color: #15803d; }
    .badge-confirmed { background: #e0e7ff; color: #4338ca; }
    .badge-draft { background: #f1f5f9; color: #475569; }
    .badge-cancelled { background: #fee2e2; color: #b91c1c; }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 20px;">
    <button onclick="window.print()" style="padding: 10px 18px; background: #4f46e5; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;">
      Print / Save as PDF
    </button>
  </div>

  <div class="header">
    <div>
      <div class="logo">Brightloop Software</div>
      <p style="margin: 4px 0; font-size: 13px; color: #64748b;">Enterprise Recurring Billing & Subscriptions</p>
    </div>
    <div style="text-align: right;">
      <div class="invoice-title">INVOICE</div>
      <p style="margin: 4px 0; font-weight: 600;">${invoice.number}</p>
      <span class="badge badge-${invoice.status.toLowerCase()}">${invoice.status}</span>
    </div>
  </div>

  <div class="meta">
    <div>
      <strong>Billed To:</strong><br />
      ${invoice.customer.name}<br />
      ${invoice.customer.email}<br />
      Subscription: ${invoice.subscription.number} (${invoice.subscription.plan.name})
    </div>
    <div style="text-align: right;">
      <strong>Issue Date:</strong> ${new Date(invoice.issueDate).toLocaleDateString()}<br />
      <strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString()}<br />
      <strong>Billing Period:</strong> ${new Date(invoice.periodStart).toLocaleDateString()} - ${new Date(invoice.periodEnd).toLocaleDateString()}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Item & Description</th>
        <th style="text-align: center;">Qty</th>
        <th style="text-align: right;">Unit Price</th>
        <th style="text-align: right;">Tax Rate</th>
        <th style="text-align: right;">Line Total</th>
      </tr>
    </thead>
    <tbody>
      ${invoice.lines
        .map(
          (l) => `
        <tr>
          <td>
            <strong>${l.product.name}</strong>
            ${l.variant ? `<br /><small style="color: #64748b;">Variant: ${l.variant.attribute} - ${l.variant.value}</small>` : ''}
          </td>
          <td style="text-align: center;">${l.quantity}</td>
          <td style="text-align: right;">$${l.unitPrice.toFixed(2)}</td>
          <td style="text-align: right;">${l.tax ? `${l.tax.ratePercent}%` : '0%'}</td>
          <td style="text-align: right;">$${l.amount.toFixed(2)}</td>
        </tr>
      `
        )
        .join('')}
    </tbody>
  </table>

  <div class="totals">
    <div><span>Subtotal:</span><span>$${invoice.subtotal.toFixed(2)}</span></div>
    ${invoice.discountTotal > 0 ? `<div style="color: #16a34a;"><span>Discounts Applied:</span><span>-$${invoice.discountTotal.toFixed(2)}</span></div>` : ''}
    <div><span>Tax:</span><span>$${invoice.taxTotal.toFixed(2)}</span></div>
    <div class="grand-total"><span>Total:</span><span>$${invoice.total.toFixed(2)}</span></div>
    <div style="color: #15803d; font-weight: 600;"><span>Amount Paid:</span><span>$${invoice.amountPaid.toFixed(2)}</span></div>
    <div style="font-weight: 700; color: #dc2626;"><span>Outstanding Balance:</span><span>$${outstanding.toFixed(2)}</span></div>
  </div>
</body>
</html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error: any) {
    const status = error.statusCode || 500;
    res.status(status).send(`<h1>Error generating printable invoice: ${error.message}</h1>`);
  }
}
