import { Request, Response } from 'express';
import { resolveCustomerIdScope } from '../../utils/customerScope.js';
import { getSummaryKPIs, getOverdueInvoicesList } from './reports.service.js';

export async function getSummaryReport(req: Request, res: Response) {
  try {
    const requestedCustomerId = req.query.customerId as string;
    const scopedCustomerId = resolveCustomerIdScope(req.user as any, requestedCustomerId);

    const filters = {
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      customerId: scopedCustomerId,
      planId: req.query.planId as string,
      status: req.query.status as string,
    };

    const startTime = Date.now();
    const summary = await getSummaryKPIs(filters);
    const overdueList = await getOverdueInvoicesList(filters, 1, 10);
    const executionTimeMs = Date.now() - startTime;

    res.json({
      ...summary,
      recentOverdue: overdueList.overdueInvoices,
      executionTimeMs,
    });
  } catch (error: any) {
    const status = error.statusCode || 500;
    res.status(status).json({ message: error.message || 'Failed to generate financial summary report' });
  }
}

export async function getOverdueReport(req: Request, res: Response) {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string, 10) || 20));
    const requestedCustomerId = req.query.customerId as string;
    const scopedCustomerId = resolveCustomerIdScope(req.user as any, requestedCustomerId);

    const filters = {
      customerId: scopedCustomerId,
    };

    const startTime = Date.now();
    const result = await getOverdueInvoicesList(filters, page, limit);
    const executionTimeMs = Date.now() - startTime;

    res.json({
      ...result,
      executionTimeMs,
    });
  } catch (error: any) {
    const status = error.statusCode || 500;
    res.status(status).json({ message: error.message || 'Failed to fetch overdue report' });
  }
}
