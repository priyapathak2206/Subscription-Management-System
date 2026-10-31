import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard,
  Search,
  Plus,
  RefreshCw,
  X,
  FileText,
  Calendar,
  AlertCircle,
  Filter,
  DollarSign,
  CheckCircle,
} from 'lucide-react';
import api from '../../api/axios.js';
import { useAuth } from '../../context/AuthContext.js';
import { useToast } from '../../context/ToastContext.js';

interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  method: 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'UPI' | 'CHEQUE' | 'OTHER';
  paymentDate: string;
  note?: string | null;
  createdAt: string;
  invoice: {
    id: string;
    number: string;
    total: number;
    amountPaid: number;
    status: string;
    customer?: { id: string; name: string; email: string };
  };
}

interface UnpaidInvoice {
  id: string;
  number: string;
  total: number;
  amountPaid: number;
  outstanding?: number;
  customer?: { id: string; name: string; email: string };
}

const METHOD_BADGES: Record<string, { bg: string; text: string; border: string }> = {
  CARD: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  UPI: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  BANK_TRANSFER: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  CASH: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  CHEQUE: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  OTHER: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
};

export const PaymentsPage: React.FC = () => {
  const { user, isAdmin, isStaff } = useAuth();
  const { success, error } = useToast();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [totalPayments, setTotalPayments] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Record Payment Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [unpaidInvoices, setUnpaidInvoices] = useState<UnpaidInvoice[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [method, setMethod] = useState<'CASH' | 'CARD' | 'BANK_TRANSFER' | 'UPI' | 'CHEQUE' | 'OTHER'>('CARD');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Payments List
  const fetchPayments = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: any = { page, limit };
      if (methodFilter !== 'ALL') params.method = methodFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await api.get('/payments', { params });
      setPayments(res.data.items || []);
      setTotalPayments(res.data.pagination?.total || 0);
    } catch {
      // Toast
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, methodFilter, startDate, endDate]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  // Load unpaid invoices for the modal
  const loadUnpaidInvoices = async () => {
    try {
      const res = await api.get('/invoices', {
        params: { status: 'CONFIRMED', limit: 100 },
      });
      const list = (res.data.items || []).filter((inv: any) => {
        const out =
          inv.outstanding !== undefined
            ? inv.outstanding
            : Math.max(0, inv.total - (inv.amountPaid || 0));
        return out > 0.001;
      });
      setUnpaidInvoices(list);
      if (list.length > 0) {
        setSelectedInvoiceId(list[0].id);
        const out =
          list[0].outstanding !== undefined
            ? list[0].outstanding
            : Math.max(0, list[0].total - (list[0].amountPaid || 0));
        setAmount(Math.round(out * 100) / 100);
      }
    } catch (err) {
      console.error('Failed to load eligible unpaid invoices', err);
    }
  };

  const handleOpenModal = () => {
    loadUnpaidInvoices();
    setNote('');
    setIsModalOpen(true);
  };

  const handleInvoiceChange = (invId: string) => {
    setSelectedInvoiceId(invId);
    const found = unpaidInvoices.find((i) => i.id === invId);
    if (found) {
      const out =
        found.outstanding !== undefined
          ? found.outstanding
          : Math.max(0, found.total - (found.amountPaid || 0));
      setAmount(Math.round(out * 100) / 100);
    }
  };

  // Submit Payment
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceId) {
      error('Please select an invoice to apply payment');
      return;
    }

    const currentInv = unpaidInvoices.find((i) => i.id === selectedInvoiceId);
    if (!currentInv) {
      error('Selected invoice could not be verified');
      return;
    }

    const outstanding =
      currentInv.outstanding !== undefined
        ? currentInv.outstanding
        : Math.max(0, currentInv.total - (currentInv.amountPaid || 0));

    if (amount <= 0) {
      error('Payment amount must be greater than zero');
      return;
    }

    if (amount > outstanding + 0.001) {
      error(`Overpayment rejected: payment amount ($${amount}) exceeds remaining balance of $${outstanding.toFixed(2)}`);
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/payments', {
        invoiceId: selectedInvoiceId,
        amount: Number(amount),
        method,
        note: note.trim() || undefined,
      });

      success('Payment recorded successfully');
      setIsModalOpen(false);
      fetchPayments();
    } catch (err) {
      // Toast
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalPages = Math.ceil(totalPayments / limit) || 1;
  const currentInv = unpaidInvoices.find((i) => i.id === selectedInvoiceId);
  const currentOutstanding = currentInv
    ? currentInv.outstanding !== undefined
      ? currentInv.outstanding
      : Math.max(0, currentInv.total - (currentInv.amountPaid || 0))
    : 0;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CreditCard className="w-7 h-7 text-indigo-600" />
            Payment Ledger & Transactions
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Record client receipts, validate against outstanding balances, and auto-settle paid invoices.
          </p>
        </div>

        <button
          onClick={handleOpenModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          Record New Payment
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
        {/* Method Filter */}
        <div className="flex flex-wrap items-center gap-1.5">
          {['ALL', 'CARD', 'UPI', 'BANK_TRANSFER', 'CASH', 'CHEQUE', 'OTHER'].map((m) => (
            <button
              key={m}
              onClick={() => {
                setMethodFilter(m);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl font-medium transition ${
                methodFilter === m
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {m === 'ALL' ? 'All Methods' : m.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Date Range Filters */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none"
            placeholder="From"
          />
          <span className="text-slate-400">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none"
            placeholder="To"
          />
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden text-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Note / Memo</th>
                <th className="py-3 px-4 text-right">Amount Received</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading payment records...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No payment transactions recorded for selected criteria.
                  </td>
                </tr>
              ) : (
                payments.map((p) => {
                  const badge = METHOD_BADGES[p.method] || METHOD_BADGES.OTHER;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-600">
                        {p.invoice?.number || '—'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">
                          {p.invoice?.customer?.name || 'Customer'}
                        </div>
                        <div className="text-slate-400 text-[11px]">
                          {p.invoice?.customer?.email}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}
                        >
                          {p.method.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {new Date(p.paymentDate).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                        {p.note || '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-600 text-sm">
                        +${p.amount.toFixed(2)}
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
            Showing {payments.length} of {totalPayments} payments
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

      {/* RECORD PAYMENT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-xs">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <CreditCard className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Record Invoice Payment</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Select Unpaid Invoice */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Select Unpaid / Open Invoice *
                </label>
                {unpaidInvoices.length === 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs">
                    No open confirmed invoices with outstanding balance found.
                  </div>
                ) : (
                  <select
                    value={selectedInvoiceId}
                    onChange={(e) => handleInvoiceChange(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    required
                  >
                    {unpaidInvoices.map((inv) => {
                      const out =
                        inv.outstanding !== undefined
                          ? inv.outstanding
                          : Math.max(0, inv.total - (inv.amountPaid || 0));
                      return (
                        <option key={inv.id} value={inv.id}>
                          {inv.number} - {inv.customer?.name} (Due: ${out.toFixed(2)})
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>

              {/* Outstanding Badge Preview */}
              {currentInv && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
                  <div className="flex justify-between text-slate-500">
                    <span>Total Amount:</span>
                    <span className="font-semibold text-slate-800">${currentInv.total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Previously Settled:</span>
                    <span className="font-semibold text-emerald-600">
                      ${(currentInv.amountPaid || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-1 font-bold">
                    <span className="text-slate-700">Remaining Balance:</span>
                    <span className="text-rose-600">${currentOutstanding.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {/* Payment Amount */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Payment Amount ($) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={currentOutstanding}
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold text-slate-900"
                  required
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Cannot exceed max outstanding balance (${currentOutstanding.toFixed(2)}).
                </span>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Method *</label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                >
                  <option value="CARD">Credit / Debit Card</option>
                  <option value="UPI">UPI Transfer</option>
                  <option value="BANK_TRANSFER">Bank Wire / ACH</option>
                  <option value="CASH">Cash</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              {/* Note */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Reference Note (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Wire confirmation #, slip number"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-semibold hover:bg-slate-50 text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || unpaidInvoices.length === 0}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-sm transition"
                >
                  {isSubmitting ? 'Recording...' : `Record Payment ($${amount})`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
