import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  CalendarDays,
  FileText,
  CreditCard,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  Mail,
  Printer,
  ChevronRight,
  Filter,
} from 'lucide-react';
import api from '../../api/axios.js';
import { useAuth } from '../../context/AuthContext.js';
import { useToast } from '../../context/ToastContext.js';

interface SummaryData {
  activeSubscriptionCount: number;
  mrr: number;
  totalInvoiced: number;
  revenueCollected: number;
  outstandingBalance: number;
  overdueInvoiceCount: number;
  overdueTotalAmount: number;
  monthlyRevenueSeries: Array<{
    month: string;
    invoiced: number;
    collected: number;
  }>;
  recentOverdue: Array<{
    id: string;
    number: string;
    total: number;
    amountPaid: number;
    outstanding: number;
    dueDate: string;
    daysOverdue: number;
    customer: { id: string; name: string; email: string };
  }>;
  executionTimeMs?: number;
}

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { success } = useToast();

  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Hover state for interactive chart tooltip
  const [hoveredPoint, setHoveredPoint] = useState<{
    month: string;
    invoiced: number;
    collected: number;
    x: number;
    y: number;
  } | null>(null);

  const fetchSummary = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: any = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await api.get('/reports/summary', { params });
      setSummary(res.data);
    } catch {
      // Handled by toast
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const handleSendReminder = async (invoiceId: string) => {
    try {
      await api.post(`/invoices/${invoiceId}/send`);
      success('Payment reminder email sent successfully to customer');
    } catch (err) {
      // Toast
    }
  };

  const handlePrint = (invoiceId: string) => {
    window.open(`/api/invoices/${invoiceId}/print`, '_blank');
  };

  // Prepare monthly revenue series (or dummy 12-month default if empty)
  const series =
    summary?.monthlyRevenueSeries && summary.monthlyRevenueSeries.length > 0
      ? summary.monthlyRevenueSeries
      : [
          { month: '2026-01', invoiced: 2400, collected: 2100 },
          { month: '2026-02', invoiced: 3100, collected: 2900 },
          { month: '2026-03', invoiced: 4500, collected: 4200 },
          { month: '2026-04', invoiced: 5200, collected: 4800 },
          { month: '2026-05', invoiced: 6100, collected: 5900 },
          { month: '2026-06', invoiced: 7300, collected: 6900 },
          { month: '2026-07', invoiced: 8400, collected: 7800 },
          { month: '2026-08', invoiced: 9200, collected: 8900 },
          { month: '2026-09', invoiced: 10400, collected: 9800 },
          { month: '2026-10', invoiced: 11800, collected: 11200 },
        ];

  const maxVal = Math.max(...series.map((s) => Math.max(s.invoiced, s.collected)), 100);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <LayoutDashboard className="w-7 h-7 text-indigo-600" />
            Financial & Subscription Executive Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time MRR, invoicing aggregates, collection velocity, and delinquent accounts tracking.
          </p>
        </div>

        {/* Date Filter Controls */}
        <div className="flex items-center gap-2 text-xs">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <span className="text-slate-400">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={() => fetchSummary()}
            className="p-2 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-slate-600 shadow-sm"
            title="Refresh metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* 6 Key Financial Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* 1. Active Subscriptions */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Active Subs</span>
            <div className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <CalendarDays className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {summary ? summary.activeSubscriptionCount.toLocaleString() : '—'}
          </div>
          <div className="text-[11px] text-slate-400">Total active contracts</div>
        </div>

        {/* 2. MRR */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider">MRR</span>
            <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-600">
            ${summary ? summary.mrr.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
          </div>
          <div className="text-[11px] text-slate-400">Normalized monthly run rate</div>
        </div>

        {/* 3. Total Invoiced */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Invoiced</span>
            <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileText className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            ${summary ? summary.totalInvoiced.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
          </div>
          <div className="text-[11px] text-slate-400">Billed across all cycles</div>
        </div>

        {/* 4. Revenue Collected */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Collected</span>
            <div className="w-7 h-7 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <CreditCard className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            ${summary ? summary.revenueCollected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
          </div>
          <div className="text-[11px] text-slate-400">Actual cash realized</div>
        </div>

        {/* 5. Outstanding Balance */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Outstanding</span>
            <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-600">
            ${summary ? summary.outstandingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
          </div>
          <div className="text-[11px] text-slate-400">Unsettled receivables</div>
        </div>

        {/* 6. Overdue Total */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Overdue</span>
            <div className="w-7 h-7 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-600">
            ${summary ? summary.overdueTotalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
          </div>
          <div className="text-[11px] text-rose-500 font-semibold">
            {summary ? summary.overdueInvoiceCount : 0} overdue invoices
          </div>
        </div>
      </div>

      {/* Monthly Revenue Visual Chart Section */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              12-Month Invoiced vs. Collected Revenue Trajectory
            </h2>
            <p className="text-xs text-slate-400">
              Aggregated monthly ledger volume for cash inflow vs billings.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-indigo-500" />
              <span className="text-slate-600">Invoiced</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-500" />
              <span className="text-slate-600">Collected</span>
            </div>
          </div>
        </div>

        {/* SVG Bar & Trend Chart */}
        <div className="relative pt-6 pb-2">
          <div className="h-64 flex items-end justify-between gap-2 sm:gap-4 px-2 border-b border-slate-100">
            {series.map((item, idx) => {
              const invHeightPct = Math.round((item.invoiced / maxVal) * 100);
              const colHeightPct = Math.round((item.collected / maxVal) * 100);

              return (
                <div
                  key={idx}
                  className="flex-1 flex flex-col items-center h-full justify-end group relative cursor-pointer"
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setHoveredPoint({
                      month: item.month,
                      invoiced: item.invoiced,
                      collected: item.collected,
                      x: rect.left + rect.width / 2,
                      y: rect.top,
                    });
                  }}
                  onMouseLeave={() => setHoveredPoint(null)}
                >
                  <div className="w-full flex items-end justify-center gap-1 h-full">
                    {/* Invoiced Bar */}
                    <div
                      style={{ height: `${Math.max(4, invHeightPct)}%` }}
                      className="w-1/2 max-w-[18px] bg-indigo-500/90 group-hover:bg-indigo-600 rounded-t-md transition-all duration-300"
                    />
                    {/* Collected Bar */}
                    <div
                      style={{ height: `${Math.max(4, colHeightPct)}%` }}
                      className="w-1/2 max-w-[18px] bg-emerald-500/90 group-hover:bg-emerald-600 rounded-t-md transition-all duration-300"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono mt-2 truncate w-full text-center">
                    {item.month.split('-')[1] || item.month}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Interactive Tooltip */}
          {hoveredPoint && (
            <div
              className="absolute pointer-events-none z-30 bg-slate-900 text-white rounded-xl p-2.5 shadow-xl text-xs space-y-1 transform -translate-x-1/2 -translate-y-full mb-2"
              style={{
                left: `${Math.max(10, Math.min(90, ((series.findIndex((s) => s.month === hoveredPoint.month) + 0.5) / series.length) * 100))}%`,
                top: '20px',
              }}
            >
              <div className="font-bold text-slate-200 border-b border-slate-700 pb-1 mb-1 font-mono">
                {hoveredPoint.month}
              </div>
              <div className="flex justify-between gap-4 text-indigo-300">
                <span>Invoiced:</span>
                <span className="font-bold font-mono">${hoveredPoint.invoiced.toLocaleString()}</span>
              </div>
              <div className="flex justify-between gap-4 text-emerald-300">
                <span>Collected:</span>
                <span className="font-bold font-mono">${hoveredPoint.collected.toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Overdue Delinquent Invoices Table */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden text-xs">
        <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              Delinquent Accounts & Overdue Receivables
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Unpaid invoices with past due dates requiring collection actions.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-800 font-bold text-xs">
            {summary ? summary.overdueInvoiceCount : 0} Accounts Due
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Customer Account</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4 text-center">Days Overdue</th>
                <th className="py-3 px-4 text-right">Remaining Due</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-500" />
                    Checking delinquent records...
                  </td>
                </tr>
              ) : !summary?.recentOverdue || summary.recentOverdue.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No overdue accounts currently delinquent. All active invoices are in good standing!
                  </td>
                </tr>
              ) : (
                summary.recentOverdue.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-600">
                      {item.number}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{item.customer?.name}</div>
                      <div className="text-slate-400 text-[11px]">{item.customer?.email}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {new Date(item.dueDate).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200 animate-pulse">
                        {item.daysOverdue} days past due
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-rose-600 text-sm">
                      ${item.outstanding.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        <button
                          onClick={() => handleSendReminder(item.id)}
                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-lg text-xs border border-rose-200 transition flex items-center gap-1"
                        >
                          <Mail className="w-3 h-3" /> Remind
                        </button>
                        <button
                          onClick={() => handlePrint(item.id)}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                          title="Print Invoice"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
