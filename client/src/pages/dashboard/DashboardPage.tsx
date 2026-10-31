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
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  AlertCircle,
  ArrowUpRight,
  CheckCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../api/axios.js';
import { useAuth } from '../../context/AuthContext.js';
import { useToast } from '../../context/ToastContext.js';

interface SummaryData {
  activeSubscriptionCount: number;
  mrr: number;
  totalInvoiced: number;
  revenueCollected: number;
  outstandingBalance: number;
  outstandingAmount?: number;
  overdueInvoiceCount: number;
  overdueTotalAmount: number;
  monthlyRevenueSeries?: Array<{
    month: string;
    invoiced: number;
    collected: number;
  }>;
  recentOverdue?: Array<{
    id: string;
    number: string;
    total: number;
    amountPaid: number;
    outstanding: number;
    outstandingBalance?: number;
    dueDate: string;
    daysOverdue: number;
    customer?: { id: string; name: string; email: string };
    planName?: string;
  }>;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface CustomerSummaryData {
  activeSubscriptionCount: number;
  totalInvoiced: number;
  revenueCollected: number;
  totalPaid: number;
  outstandingBalance: number;
  overdueInvoiceCount: number;
  overdueTotalAmount: number;
  recentInvoices: Array<{
    id: string;
    number: string;
    issueDate: string;
    dueDate: string;
    total: number;
    amountPaid: number;
    outstanding: number;
    status: string;
    planName?: string;
  }>;
  recentSubscriptions: Array<{
    id: string;
    number: string;
    planName: string;
    price: number;
    billingPeriod: string;
    status: string;
    startDate: string;
    nextBillingDate?: string;
  }>;
}

interface CustomerOption {
  id: string;
  name: string;
  email: string;
}

interface PlanOption {
  id: string;
  name: string;
}

export const DashboardPage: React.FC = () => {
  const { user, isAdmin, isStaff } = useAuth();
  const { success, error: toastError } = useToast();

  // Admin / Staff State
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [plans, setPlans] = useState<PlanOption[]>([]);

  // Filter Bar State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [overduePage, setOverduePage] = useState(1);
  const [overdueLimit] = useState(5);

  // Customer Summary State
  const [customerSummary, setCustomerSummary] = useState<CustomerSummaryData | null>(null);

  // UI Status
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Interactive Chart Tooltip
  const [hoveredPoint, setHoveredPoint] = useState<{
    month: string;
    invoiced: number;
    collected: number;
  } | null>(null);

  // Load Filter Options (Admin/Staff only)
  useEffect(() => {
    if (isAdmin || isStaff) {
      Promise.all([
        api.get('/users/customers').catch(() => ({ data: [] })),
        api.get('/plans', { params: { limit: 100 } }).catch(() => ({ data: { items: [] } })),
      ]).then(([custRes, plansRes]) => {
        setCustomers(Array.isArray(custRes.data) ? custRes.data : custRes.data?.items || []);
        setPlans(plansRes.data?.items || (Array.isArray(plansRes.data) ? plansRes.data : []));
      });
    }
  }, [isAdmin, isStaff]);

  // Fetch Dashboard Data
  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);

    try {
      if (isAdmin || isStaff) {
        const params: any = {
          page: overduePage,
          limit: overdueLimit,
        };
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
        if (selectedCustomerId) params.customerId = selectedCustomerId;
        if (selectedPlanId) params.planId = selectedPlanId;
        if (selectedStatus) params.status = selectedStatus;

        const res = await api.get('/reports/summary', { params });
        setSummary(res.data);
      } else {
        // Customer view: Call scoped customer summary endpoint
        const res = await api.get('/reports/customer-summary');
        setCustomerSummary(res.data);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to load dashboard metrics. Please try again.';
      setFetchError(msg);
      toastError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin, isStaff, overduePage, overdueLimit, startDate, endDate, selectedCustomerId, selectedPlanId, selectedStatus, toastError]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleClearFilters = () => {
    setStartDate('');
    setEndDate('');
    setSelectedCustomerId('');
    setSelectedPlanId('');
    setSelectedStatus('');
    setOverduePage(1);
  };

  const handleSendReminder = async (invoiceId: string) => {
    try {
      await api.post(`/invoices/${invoiceId}/send`);
      success('Payment reminder email dispatched successfully.');
    } catch (err: any) {
      toastError(err.response?.data?.message || 'Failed to send payment reminder.');
    }
  };

  const handlePrint = (invoiceId: string) => {
    window.open(`/api/invoices/${invoiceId}/print`, '_blank');
  };

  // ==========================================
  // CUSTOMER DASHBOARD VIEW
  // ==========================================
  if (!isAdmin && !isStaff) {
    return (
      <div className="space-y-6">
        {/* Customer Header */}
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/30 text-indigo-200 border border-indigo-400/20 mb-3">
              Customer Self-Service
            </span>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Welcome back, {user?.name || 'Customer'}
            </h1>
            <p className="text-xs md:text-sm text-indigo-200 mt-1 max-w-xl">
              Track your active subscriptions, review billing history, and pay outstanding statements.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/subscriptions"
              className="px-4 py-2 bg-white text-indigo-900 font-semibold rounded-xl text-xs hover:bg-indigo-50 transition shadow-sm"
            >
              My Subscriptions
            </Link>
            <Link
              to="/invoices"
              className="px-4 py-2 bg-indigo-700/80 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs border border-indigo-500/40 transition"
            >
              Billing & Invoices
            </Link>
          </div>
        </div>

        {/* Error State */}
        {fetchError && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs text-rose-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{fetchError}</span>
            </div>
            <button
              onClick={() => fetchDashboardData()}
              className="px-3 py-1 bg-rose-600 text-white font-semibold rounded-lg hover:bg-rose-700 transition"
            >
              Retry
            </button>
          </div>
        )}

        {/* Customer Metrics */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-slate-100 rounded-2xl border border-slate-200" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Active Plans</span>
                <div className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <CalendarDays className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900">
                {customerSummary?.activeSubscriptionCount ?? 0}
              </div>
              <div className="text-[11px] text-slate-400">Current contracted plans</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Total Billed</span>
                <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <FileText className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900">
                ${(customerSummary?.totalInvoiced ?? 0).toFixed(2)}
              </div>
              <div className="text-[11px] text-slate-400">Invoiced across all cycles</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Total Paid</span>
                <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CreditCard className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-2xl font-bold text-emerald-600">
                ${(customerSummary?.totalPaid ?? customerSummary?.revenueCollected ?? 0).toFixed(2)}
              </div>
              <div className="text-[11px] text-slate-400">Settled receipts</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Outstanding Balance</span>
                <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <DollarSign className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-2xl font-bold text-amber-600">
                ${(customerSummary?.outstandingBalance ?? 0).toFixed(2)}
              </div>
              <div className="text-[11px] text-slate-400">Due for payment</div>
            </div>
          </div>
        )}

        {/* Customer Quick Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active Subscriptions List */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-indigo-600" />
                Your Subscriptions
              </h3>
              <Link to="/subscriptions" className="text-xs text-indigo-600 font-semibold hover:underline flex items-center gap-1">
                View all <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {isLoading ? (
              <div className="space-y-2 animate-pulse">
                <div className="h-12 bg-slate-100 rounded-xl" />
                <div className="h-12 bg-slate-100 rounded-xl" />
              </div>
            ) : !customerSummary?.recentSubscriptions || customerSummary.recentSubscriptions.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No active subscriptions currently on record.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {customerSummary.recentSubscriptions.map((sub) => (
                  <div key={sub.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-slate-800">{sub.planName}</div>
                      <div className="text-slate-400 font-mono text-[11px]">{sub.number}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-900">
                        ${sub.price.toFixed(2)} / {sub.billingPeriod.toLowerCase()}
                      </div>
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {sub.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Invoices List */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                Recent Invoices
              </h3>
              <Link to="/invoices" className="text-xs text-indigo-600 font-semibold hover:underline flex items-center gap-1">
                View all <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {isLoading ? (
              <div className="space-y-2 animate-pulse">
                <div className="h-12 bg-slate-100 rounded-xl" />
                <div className="h-12 bg-slate-100 rounded-xl" />
              </div>
            ) : !customerSummary?.recentInvoices || customerSummary.recentInvoices.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No billing statements or invoices issued yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {customerSummary.recentInvoices.map((inv) => (
                  <div key={inv.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-mono font-bold text-indigo-600">{inv.number}</div>
                      <div className="text-slate-400 text-[11px]">Due: {new Date(inv.dueDate).toLocaleDateString()}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-900">${inv.total.toFixed(2)}</div>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        inv.status === 'PAID'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {inv.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // ADMIN & STAFF EXECUTIVE DASHBOARD VIEW
  // ==========================================
  const rawSeries = summary?.monthlyRevenueSeries || [];
  const maxVal = Math.max(...rawSeries.map((s) => Math.max(s.invoiced, s.collected)), 100);

  const overdueList = summary?.recentOverdue || [];
  const totalOverdueItems = summary?.pagination?.total ?? overdueList.length;
  const totalOverduePages = summary?.pagination?.totalPages ?? 1;

  const hasActiveFilters =
    Boolean(startDate || endDate || selectedCustomerId || selectedPlanId || selectedStatus);

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

        <button
          onClick={() => fetchDashboardData()}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-3.5 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-sm transition disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
          Refresh Metrics
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span className="font-semibold flex items-center gap-1.5 text-slate-700">
            <Filter className="w-3.5 h-3.5 text-indigo-600" />
            Analytics Filters
          </span>
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Clear Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
          {/* Start Date */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Issue Date From</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setOverduePage(1);
              }}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Issue Date To</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setOverduePage(1);
              }}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Customer Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Customer</label>
            <select
              value={selectedCustomerId}
              onChange={(e) => {
                setSelectedCustomerId(e.target.value);
                setOverduePage(1);
              }}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Customers</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.email})
                </option>
              ))}
            </select>
          </div>

          {/* Plan Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Subscription Plan</label>
            <select
              value={selectedPlanId}
              onChange={(e) => {
                setSelectedPlanId(e.target.value);
                setOverduePage(1);
              }}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Plans</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setOverduePage(1);
              }}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">ACTIVE (Contract)</option>
              <option value="CONFIRMED">CONFIRMED (Invoice/Sub)</option>
              <option value="DRAFT">DRAFT</option>
              <option value="PAID">PAID (Invoice)</option>
              <option value="CANCELLED">CANCELLED (Invoice)</option>
              <option value="CLOSED">CLOSED (Contract)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error Banner with Retry */}
      {fetchError && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs text-rose-800 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <div>
              <p className="font-bold">Error loading financial metrics</p>
              <p className="text-rose-600 text-[11px] mt-0.5">{fetchError}</p>
            </div>
          </div>
          <button
            onClick={() => fetchDashboardData()}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-xs transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* 6 Key Financial Metric Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-28 bg-slate-100 rounded-2xl border border-slate-200" />
          ))}
        </div>
      ) : (
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
              {summary?.activeSubscriptionCount ?? 0}
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
              ${(summary?.mrr ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
              ${(summary?.totalInvoiced ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
              ${(summary?.revenueCollected ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
              ${(summary?.outstandingBalance ?? summary?.outstandingAmount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
              ${(summary?.overdueTotalAmount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-rose-500 font-semibold">
              {summary?.overdueInvoiceCount ?? 0} overdue invoices
            </div>
          </div>
        </div>
      )}

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
        {isLoading ? (
          <div className="h-64 bg-slate-50 rounded-2xl flex items-center justify-center animate-pulse">
            <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin" />
          </div>
        ) : rawSeries.length === 0 ? (
          <div className="h-64 bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 text-xs space-y-2">
            <TrendingUp className="w-8 h-8 text-slate-300" />
            <p className="font-semibold text-slate-600">No monthly revenue activity recorded</p>
            <p className="text-[11px] text-slate-400">Invoiced cycles and receipts will chart automatically once created.</p>
          </div>
        ) : (
          <div className="relative pt-6 pb-2">
            <div className="h-64 flex items-end justify-between gap-2 sm:gap-4 px-2 border-b border-slate-100">
              {rawSeries.map((item, idx) => {
                const invHeightPct = Math.round((item.invoiced / maxVal) * 100);
                const colHeightPct = Math.round((item.collected / maxVal) * 100);

                return (
                  <div
                    key={idx}
                    className="flex-1 flex flex-col items-center h-full justify-end group relative cursor-pointer"
                    onMouseEnter={() => {
                      setHoveredPoint({
                        month: item.month,
                        invoiced: item.invoiced,
                        collected: item.collected,
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
              <div className="absolute top-2 right-4 bg-slate-900 text-white rounded-xl p-3 shadow-xl text-xs space-y-1">
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
        )}
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
          <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-800 font-bold text-xs self-start sm:self-auto">
            {summary?.overdueInvoiceCount ?? 0} Accounts Due
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Customer Account</th>
                <th className="py-3 px-4">Plan / Contract</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4 text-center">Days Overdue</th>
                <th className="py-3 px-4 text-right">Remaining Due</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-500" />
                    Checking delinquent records...
                  </td>
                </tr>
              ) : overdueList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="max-w-sm mx-auto space-y-2">
                      <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
                        <CheckCircle className="w-5 h-5" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-800">All Accounts in Good Standing</h4>
                      <p className="text-xs text-slate-500">
                        No invoices currently past due. All client payments are up to date!
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                overdueList.map((item) => {
                  const remainingDue =
                    typeof item.outstanding === 'number'
                      ? item.outstanding
                      : typeof item.outstandingBalance === 'number'
                      ? item.outstandingBalance
                      : Math.max(0, item.total - (item.amountPaid || 0));

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-600">
                        {item.number}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{item.customer?.name || 'Customer'}</div>
                        <div className="text-slate-400 text-[11px]">{item.customer?.email}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {item.planName || 'Standard Subscription'}
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
                        ${remainingDue.toFixed(2)}
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Server-Side Pagination Footer */}
        {totalOverdueItems > overdueLimit && (
          <div className="p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <div>
              Showing {overdueList.length} of {totalOverdueItems} overdue accounts
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={overduePage <= 1 || isLoading}
                onClick={() => setOverduePage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Previous
              </button>
              <span>
                Page {overduePage} of {totalOverduePages}
              </span>
              <button
                disabled={overduePage >= totalOverduePages || isLoading}
                onClick={() => setOverduePage((p) => p + 1)}
                className="px-3 py-1 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition flex items-center gap-1"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
