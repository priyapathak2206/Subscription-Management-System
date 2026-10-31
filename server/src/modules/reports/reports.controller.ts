import { Request, Response } from 'express';
import { resolveCustomerIdScope } from '../../utils/customerScope.js';
import { getSummaryKPIs, getOverdueInvoicesList, getCustomerSummary } from './reports.service.js';

export async function getSummaryReport(req: Request, res: Response) {
  try {
    const requestedCustomerId = req.query.customerId as string;
    const scopedCustomerId = resolveCustomerIdScope(req.user as any, requestedCustomerId);

    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string, 10) || 10));

    const filters = {
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      customerId: scopedCustomerId,
      planId: req.query.planId as string,
      status: req.query.status as string,
    };

    const startTime = Date.now();
    const [summary, overdueList] = await Promise.all([
      getSummaryKPIs(filters),
      getOverdueInvoicesList(filters, page, limit),
    ]);
    const executionTimeMs = Date.now() - startTime;

    res.json({
      // Flattened KPI metrics for straightforward frontend consumption:
      activeSubscriptionCount: summary.kpis.activeSubscriptionCount,
      mrr: summary.kpis.mrr,
      totalInvoiced: summary.kpis.totalInvoiced,
      revenueCollected: summary.kpis.revenueCollected,
      totalPaid: summary.kpis.revenueCollected,
      outstandingAmount: summary.kpis.outstandingAmount,
      outstandingBalance: summary.kpis.outstandingAmount,
      overdueInvoiceCount: summary.kpis.overdueCount,
      overdueCount: summary.kpis.overdueCount,
      overdueTotalAmount: summary.kpis.overdueAmount,
      overdueAmount: summary.kpis.overdueAmount,
      totalInvoicesCount: summary.kpis.totalInvoicesCount,

      // Time-series chart series (provided under both common names):
      monthlyRevenueSeries: summary.revenueByMonth,
      revenueByMonth: summary.revenueByMonth,

      // Nested kpis object for backward compatibility:
      kpis: summary.kpis,

      // Overdue invoices list and pagination:
      recentOverdue: overdueList.overdueInvoices,
      overdueInvoices: overdueList.overdueInvoices,
      items: overdueList.overdueInvoices,
      pagination: overdueList.pagination,

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
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      customerId: scopedCustomerId,
      planId: req.query.planId as string,
      status: req.query.status as string,
    };

    const startTime = Date.now();
    const result = await getOverdueInvoicesList(filters, page, limit);
    const executionTimeMs = Date.now() - startTime;

    res.json({
      ...result,
      items: result.overdueInvoices,
      executionTimeMs,
    });
  } catch (error: any) {
    const status = error.statusCode || 500;
    res.status(status).json({ message: error.message || 'Failed to fetch overdue report' });
  }
}

export async function getCustomerSummaryReport(req: Request, res: Response) {
  try {
    const requestedCustomerId = req.query.customerId as string;
    const scopedCustomerId = resolveCustomerIdScope(req.user as any, requestedCustomerId);

    if (!scopedCustomerId) {
      return res.status(400).json({ message: 'Customer ID could not be identified' });
    }

    const summary = await getCustomerSummary(scopedCustomerId);
    res.json(summary);
  } catch (error: any) {
    const status = error.statusCode || 500;
    res.status(status).json({ message: error.message || 'Failed to fetch customer summary' });
  }
}
