BRIGHTLOOP SOFTWARE - INVOICE STATEMENT
Invoice Number: ${invoice.number}
Subscription Ref: ${invoice.subscriptionNumber}
Plan Name: ${invoice.planName}
Billing Period: ${invoice.periodStart} to ${invoice.periodEnd}
Issue Date: ${invoice.issueDate}
Due Date: ${invoice.dueDate}
Status: ${invoice.status}
------------------------------------------------------
LINE ITEMS:
${invoice.lines
  .map(
    (l) =>
      `- ${l.description.padEnd(40)} Qty: ${l.quantity}  Unit: $${l.unitPrice.toFixed(2)}  Amount: $${l.amount.toFixed(2)}`
  )
  .join('\n')}
------------------------------------------------------
Subtotal:        $${invoice.subtotal.toFixed(2)}
Tax Total:       $${invoice.taxTotal.toFixed(2)}
Discount Total: -$${invoice.discountTotal.toFixed(2)}
------------------------------------------------------
TOTAL AMOUNT:    $${invoice.total.toFixed(2)}
Amount Paid:     $${invoice.amountPaid.toFixed(2)}
Balance Due:     $${(invoice.total - invoice.amountPaid).toFixed(2)}
Thank you for subscribing with Brightloop Software!
    `.trim();

    const blob = new Blob([invoiceContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${invoice.number}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    success(`Invoice ${invoice.number} downloaded successfully.`);
  };

  const getStatusBadge = (status: InvoiceItem['status']) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Paid
          </span>
        );
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600" /> Payment Due
          </span>
        );
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <FileText className="w-3.5 h-3.5 text-slate-500" /> Draft
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" /> Cancelled
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-slate-950/10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="max-w-2xl">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/20 text-slate-200 backdrop-blur-md inline-block mb-3">
              Billing & Invoices
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {isCustomer ? 'My Invoices & Statements' : 'Invoices & Billing Ledger'}
            </h1>
            <p className="text-slate-300 text-sm leading-relaxed mt-1">
              Track issued subscription invoices, verify tax breakdowns, and download official billing statements.
            </p>
import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Search,
  CheckCircle,
  Clock,
  AlertTriangle,
  X,
  Printer,
  Mail,
  Ban,
  CreditCard,
  Play,
  RefreshCw,
  Calendar,
  DollarSign,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import api from '../../api/axios.js';
import { useAuth } from '../../context/AuthContext.js';
import { useToast } from '../../context/ToastContext.js';

interface InvoiceLine {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  taxAmount: number;
  amount: number;
}

interface Invoice {
  id: string;
  number: string;
  subscriptionId?: string | null;
  customerId: string;
  status: 'DRAFT' | 'CONFIRMED' | 'PAID' | 'CANCELLED';
  issueDate: string;
  dueDate: string;
  periodStart?: string | null;
  periodEnd?: string | null;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  amountPaid: number;
  outstanding?: number;
  isOverdue?: boolean;
  sentAt?: string | null;
  subscription?: { id: string; number: string; plan?: { name: string } } | null;
  customer?: { id: string; name: string; email: string } | null;
  lines: InvoiceLine[];
}

interface RunBillingResult {
  message: string;
  totalProcessed: number;
  created: number;
  skipped: number;
  failed: number;
  generatedInvoices?: Array<{ subscriptionId: string; invoiceNumber: string; total: number }>;
}

const INVOICE_STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  DRAFT: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
  CONFIRMED: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
  PAID: { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300' },
  CANCELLED: { bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-300' },
};

export const InvoicesPage: React.FC = () => {
  const { user, isAdmin, isStaff } = useAuth();
  const { success, error } = useToast();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [totalInvoices, setTotalInvoices] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Detail Modal
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Run Billing Batch Modal State
  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);
  const [isRunningBilling, setIsRunningBilling] = useState(false);
  const [billingResult, setBillingResult] = useState<RunBillingResult | null>(null);

  // Record Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState('CARD');
  const [paymentNote, setPaymentNote] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Fetch Invoices
  const fetchInvoices = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: any = { page, limit };
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (search.trim()) params.search = search.trim();

      const res = await api.get('/invoices', { params });
      setInvoices(res.data.items || []);
      setTotalInvoices(res.data.pagination?.total || 0);
    } catch {
      // Axios toast handler
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, statusFilter, search]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // Invoice Actions: Confirm, Cancel, Send, Print
  const handleConfirmInvoice = async (invoiceId: string) => {
    setIsActionLoading(true);
    try {
      await api.post(`/invoices/${invoiceId}/confirm`);
      success('Invoice confirmed successfully');
      fetchInvoices();
      if (selectedInvoice && selectedInvoice.id === invoiceId) {
        setSelectedInvoice({ ...selectedInvoice, status: 'CONFIRMED' });
      }
    } catch (err) {
      // Toast
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCancelInvoice = async (invoiceId: string) => {
    if (!confirm('Are you sure you want to cancel this invoice? This cannot be undone.')) return;
    setIsActionLoading(true);
    try {
      await api.post(`/invoices/${invoiceId}/cancel`);
      success('Invoice cancelled');
      fetchInvoices();
      if (selectedInvoice && selectedInvoice.id === invoiceId) {
        setSelectedInvoice({ ...selectedInvoice, status: 'CANCELLED' });
      }
    } catch (err) {
      // Toast
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSendInvoice = async (invoiceId: string) => {
    setIsActionLoading(true);
    try {
      const res = await api.post(`/invoices/${invoiceId}/send`);
      success(res.data?.message || 'Invoice sent to customer email successfully');
      if (res.data?.previewUrl) {
        window.open(res.data.previewUrl, '_blank');
      }
      fetchInvoices();
    } catch (err) {
      // Toast
    } finally {
      setIsActionLoading(false);
    }
  };

  const handlePrintInvoice = (invoiceId: string) => {
    window.open(`/api/invoices/${invoiceId}/print`, '_blank');
  };

  // Run Billing Batch
  const handleRunBillingBatch = async () => {
    setIsRunningBilling(true);
    try {
      const res = await api.post('/invoices/run-billing');
      setBillingResult(res.data);
      success(`Billing batch finished: ${res.data.created} invoices created`);
      fetchInvoices();
    } catch (err) {
      // Toast
    } finally {
      setIsRunningBilling(false);
    }
  };

  // Open Payment Modal
  const handleOpenPayment = (inv: Invoice) => {
    const outstanding =
      inv.outstanding !== undefined
        ? inv.outstanding
        : Math.max(0, inv.total - (inv.amountPaid || 0));
    setPaymentInvoice(inv);
    setPaymentAmount(Math.round(outstanding * 100) / 100);
    setPaymentMethod('CARD');
    setPaymentNote('');
    setIsPaymentModalOpen(true);
  };

  // Submit Payment
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentInvoice) return;

    const outstanding =
      paymentInvoice.outstanding !== undefined
        ? paymentInvoice.outstanding
        : Math.max(0, paymentInvoice.total - (paymentInvoice.amountPaid || 0));

    if (paymentAmount <= 0) {
      error('Payment amount must be greater than zero');
      return;
    }

    if (paymentAmount > outstanding + 0.001) {
      error(`Payment amount ($${paymentAmount}) cannot exceed outstanding balance ($${outstanding.toFixed(2)})`);
      return;
    }

    setIsSubmittingPayment(true);
    try {
      await api.post('/payments', {
        invoiceId: paymentInvoice.id,
        amount: Number(paymentAmount),
        method: paymentMethod,
        note: paymentNote.trim() || undefined,
      });

      success('Payment recorded successfully');
      setIsPaymentModalOpen(false);
      setIsDetailOpen(false);
      fetchInvoices();
    } catch (err) {
      // Toast
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const totalPages = Math.ceil(totalInvoices / limit) || 1;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-7 h-7 text-indigo-600" />
            Invoices & Billing Engine
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Deterministic, idempotent invoice generation with automatic tax computation and eligible discount engine.
          </p>
        </div>

        {(isAdmin || isStaff) && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setBillingResult(null);
                setIsBillingModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 shadow-sm transition"
            >
              <Play className="w-4 h-4 fill-current" />
              Run Billing Batch
            </button>
          </div>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {['ALL', 'DRAFT', 'CONFIRMED', 'PAID', 'CANCELLED'].map((st) => (
            <button
              key={st}
              onClick={() => {
                setStatusFilter(st);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                statusFilter === st
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {st === 'ALL' ? 'All Invoices' : st}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search invoice # or customer..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition"
          />
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Subscription</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Issue / Due Date</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4 text-right">Outstanding</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading invoices...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No invoices found matching criteria.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  const outstanding =
                    inv.outstanding !== undefined
                      ? inv.outstanding
                      : Math.max(0, inv.total - (inv.amountPaid || 0));
                  const isOverdue =
                    inv.isOverdue ||
                    (inv.status !== 'PAID' &&
                      inv.status !== 'CANCELLED' &&
                      new Date(inv.dueDate) < new Date());
                  const stStyle = INVOICE_STATUS_STYLES[inv.status] || INVOICE_STATUS_STYLES.DRAFT;

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-600">
                        {inv.number}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {inv.subscription?.number || '—'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{inv.customer?.name || 'Customer'}</div>
                        <div className="text-slate-400 text-[11px]">{inv.customer?.email}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-slate-700">{new Date(inv.issueDate).toLocaleDateString()}</div>
                        <div className="text-slate-400 text-[11px]">
                          Due: {new Date(inv.dueDate).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        ${inv.total.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold">
                        {outstanding > 0 ? (
                          <span className="text-rose-600 font-bold">${outstanding.toFixed(2)}</span>
                        ) : (
                          <span className="text-emerald-600 font-medium">$0.00</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex flex-col items-center gap-1">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${stStyle.bg} ${stStyle.text} ${stStyle.border}`}
                          >
                            {inv.status}
                          </span>
                          {isOverdue && (
                            <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-rose-600 text-white animate-pulse">
                              OVERDUE
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <button
                            onClick={() => {
                              setSelectedInvoice(inv);
                              setIsDetailOpen(true);
                            }}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition"
                          >
                            View
                          </button>
                          {outstanding > 0 && inv.status !== 'CANCELLED' && (
                            <button
                              onClick={() => handleOpenPayment(inv)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs shadow-sm transition flex items-center gap-1"
                            >
                              <CreditCard className="w-3 h-3" /> Pay
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing {invoices.length} of {totalInvoices} invoices
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition"
            >
              Previous
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* DETAIL MODAL */}
      {isDetailOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                    {selectedInvoice.number}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                      INVOICE_STATUS_STYLES[selectedInvoice.status]?.bg
                    } ${INVOICE_STATUS_STYLES[selectedInvoice.status]?.text} ${
                      INVOICE_STATUS_STYLES[selectedInvoice.status]?.border
                    }`}
                  >
                    {selectedInvoice.status}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-slate-900 mt-1">Invoice Overview</h2>
              </div>
              <button
                onClick={() => setIsDetailOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 text-xs">
              {/* Top Meta Details */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 rounded-2xl p-4">
                <div>
                  <div className="text-slate-400 uppercase tracking-wider text-[10px] font-semibold">
                    Customer
                  </div>
                  <div className="font-semibold text-slate-900 mt-0.5">
                    {selectedInvoice.customer?.name}
                  </div>
                  <div className="text-slate-500 font-mono text-[11px]">
                    {selectedInvoice.customer?.email}
                  </div>
                </div>

                <div>
                  <div className="text-slate-400 uppercase tracking-wider text-[10px] font-semibold">
                    Subscription #
                  </div>
                  <div className="font-mono font-semibold text-indigo-600 mt-0.5">
                    {selectedInvoice.subscription?.number || 'Ad-hoc'}
                  </div>
                </div>

                <div>
                  <div className="text-slate-400 uppercase tracking-wider text-[10px] font-semibold">
                    Issue Date
                  </div>
                  <div className="font-medium text-slate-800 mt-0.5">
                    {new Date(selectedInvoice.issueDate).toLocaleDateString()}
                  </div>
                </div>

                <div>
                  <div className="text-slate-400 uppercase tracking-wider text-[10px] font-semibold">
                    Due Date
                  </div>
                  <div className="font-medium text-slate-800 mt-0.5">
                    {new Date(selectedInvoice.dueDate).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {/* Line Items Table */}
              <div>
                <h4 className="font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Billed Items
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">Description</th>
                        <th className="py-2.5 px-3 text-right">Qty</th>
                        <th className="py-2.5 px-3 text-right">Unit Price</th>
                        <th className="py-2.5 px-3 text-right">Tax</th>
                        <th className="py-2.5 px-3 text-right">Line Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedInvoice.lines?.map((line, idx) => (
                        <tr key={idx}>
                          <td className="py-2.5 px-3 font-medium text-slate-900">{line.description}</td>
                          <td className="py-2.5 px-3 text-right">{line.quantity}</td>
                          <td className="py-2.5 px-3 text-right text-slate-600">${line.unitPrice}</td>
                          <td className="py-2.5 px-3 text-right text-slate-500">
                            ${(line.taxAmount || 0).toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-semibold text-slate-900">
                            ${(line.amount || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Totals Breakdown */}
              <div className="bg-slate-50 rounded-2xl p-4 flex flex-col items-end space-y-1.5 text-xs">
                <div className="w-64 flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-slate-900">
                    ${selectedInvoice.subtotal?.toFixed(2)}
                  </span>
                </div>
                {selectedInvoice.discountTotal > 0 && (
                  <div className="w-64 flex justify-between text-emerald-600">
                    <span>Discount Applied:</span>
                    <span className="font-semibold">-${selectedInvoice.discountTotal?.toFixed(2)}</span>
                  </div>
                )}
                <div className="w-64 flex justify-between text-slate-600">
                  <span>Tax Total:</span>
                  <span className="font-semibold text-slate-900">
                    ${selectedInvoice.taxTotal?.toFixed(2)}
                  </span>
                </div>
                <div className="w-64 flex justify-between text-slate-900 border-t border-slate-200 pt-2 text-sm font-bold">
                  <span>Grand Total:</span>
                  <span className="text-indigo-600">${selectedInvoice.total?.toFixed(2)}</span>
                </div>
                <div className="w-64 flex justify-between text-slate-600 text-xs">
                  <span>Amount Paid:</span>
                  <span className="font-semibold text-emerald-600">
                    ${(selectedInvoice.amountPaid || 0).toFixed(2)}
                  </span>
                </div>
                <div className="w-64 flex justify-between text-rose-600 text-xs font-bold pt-1 border-t border-slate-200">
                  <span>Outstanding Balance:</span>
                  <span>
                    $
                    {Math.max(
                      0,
                      selectedInvoice.total - (selectedInvoice.amountPaid || 0)
                    ).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Actions Toolbar */}
              <div className="border-t border-slate-100 pt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePrintInvoice(selectedInvoice.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition"
                  >
                    <Printer className="w-4 h-4" /> Print / View HTML
                  </button>

                  {(isAdmin || isStaff) && (
                    <button
                      disabled={isActionLoading}
                      onClick={() => handleSendInvoice(selectedInvoice.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition"
                    >
                      <Mail className="w-4 h-4" /> Send Email
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {(isAdmin || isStaff) && selectedInvoice.status === 'DRAFT' && (
                    <button
                      disabled={isActionLoading}
                      onClick={() => handleConfirmInvoice(selectedInvoice.id)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-sm transition"
                    >
                      Confirm Invoice
                    </button>
                  )}

                  {selectedInvoice.status !== 'PAID' &&
                    selectedInvoice.status !== 'CANCELLED' && (
                      <button
                        onClick={() => handleOpenPayment(selectedInvoice)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-sm transition flex items-center gap-1"
                      >
                        <CreditCard className="w-4 h-4" /> Record Payment
                      </button>
                    )}

                  {(isAdmin || isStaff) &&
                    selectedInvoice.status !== 'PAID' &&
                    selectedInvoice.status !== 'CANCELLED' && (
                      <button
                        disabled={isActionLoading}
                        onClick={() => handleCancelInvoice(selectedInvoice.id)}
                        className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-semibold transition"
                      >
                        Cancel Invoice
                      </button>
                    )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RUN BILLING BATCH MODAL */}
      {isBillingModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 text-xs">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Play className="w-4 h-4 fill-current" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Run Recurring Billing Engine</h3>
              </div>
              <button
                onClick={() => setIsBillingModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-slate-600 mb-4 leading-relaxed">
              This engine scans all <strong>ACTIVE</strong> subscriptions whose billing date is due
              (<code>nextBillingDate &le; Today</code>). For each due subscription, it generates an idempotent
              invoice in a database transaction, computes taxes and eligible discounts, and advances the subscription
              to its next period.
            </p>

            {billingResult && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-4 space-y-2">
                <h4 className="font-bold text-slate-800">Billing Run Results</h4>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl p-2 font-bold">
                    <div className="text-lg">{billingResult.created}</div>
                    <div className="text-[10px] uppercase font-semibold">Created</div>
                  </div>
                  <div className="bg-amber-50 text-amber-800 border border-amber-200 rounded-xl p-2 font-bold">
                    <div className="text-lg">{billingResult.skipped}</div>
                    <div className="text-[10px] uppercase font-semibold">Skipped (Current)</div>
                  </div>
                  <div className="bg-rose-50 text-rose-800 border border-rose-200 rounded-xl p-2 font-bold">
                    <div className="text-lg">{billingResult.failed}</div>
                    <div className="text-[10px] uppercase font-semibold">Failed</div>
                  </div>
                </div>

                {billingResult.generatedInvoices && billingResult.generatedInvoices.length > 0 && (
                  <div className="mt-2 text-[11px] text-slate-600 max-h-32 overflow-y-auto">
                    <div className="font-semibold mb-1">Generated Invoices:</div>
                    {billingResult.generatedInvoices.map((inv, idx) => (
                      <div key={idx} className="font-mono flex justify-between py-0.5">
                        <span>{inv.invoiceNumber}</span>
                        <span>${inv.total.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsBillingModalOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl font-semibold hover:bg-slate-50 text-slate-600"
              >
                Close
              </button>
              <button
                type="button"
                disabled={isRunningBilling}
                onClick={handleRunBillingBatch}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-sm transition flex items-center gap-1.5"
              >
                {isRunningBilling ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Processing Subscriptions...
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Start Billing Batch
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECORD PAYMENT MODAL */}
      {isPaymentModalOpen && paymentInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-xs">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <CreditCard className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Record Payment</h3>
              </div>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Invoice:</span>
                <span className="font-mono font-bold text-indigo-600">{paymentInvoice.number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Invoice Total:</span>
                <span className="font-semibold text-slate-900">${paymentInvoice.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Already Paid:</span>
                <span className="font-semibold text-emerald-600">
                  ${(paymentInvoice.amountPaid || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1 font-bold">
                <span className="text-slate-700">Outstanding Balance:</span>
                <span className="text-rose-600">
                  $
                  {(
                    paymentInvoice.outstanding !== undefined
                      ? paymentInvoice.outstanding
                      : Math.max(0, paymentInvoice.total - (paymentInvoice.amountPaid || 0))
                  ).toFixed(2)}
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmitPayment} className="space-y-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Payment Amount ($) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={
                    paymentInvoice.outstanding !== undefined
                      ? paymentInvoice.outstanding
                      : Math.max(0, paymentInvoice.total - (paymentInvoice.amountPaid || 0))
                  }
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Method *</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                >
                  <option value="CARD">Credit / Debit Card</option>
                  <option value="UPI">UPI</option>
                  <option value="BANK_TRANSFER">Bank Transfer / ACH</option>
                  <option value="CASH">Cash</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Reference Note (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Transaction ID, receipt #, or memo"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-semibold hover:bg-slate-50 text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPayment}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-sm transition"
                >
                  {isSubmittingPayment ? 'Processing...' : `Confirm Payment ($${paymentAmount})`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
