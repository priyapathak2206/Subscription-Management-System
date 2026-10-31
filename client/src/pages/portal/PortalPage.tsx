import React, { useState, useEffect, useCallback } from 'react';
import {
  UserCheck,
  CalendarDays,
  FileText,
  CreditCard,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Printer,
  ChevronRight,
  RefreshCw,
  Clock,
  X,
} from 'lucide-react';
import api from '../../api/axios.js';
import { useAuth } from '../../context/AuthContext.js';
import { useToast } from '../../context/ToastContext.js';

interface MySubscription {
  id: string;
  number: string;
  status: string;
  startDate: string;
  nextBillingDate?: string | null;
  paymentTerms: string;
  plan: {
    name: string;
    price: number;
    billingPeriod: string;
  };
}

interface MyInvoice {
  id: string;
  number: string;
  status: string;
  issueDate: string;
  dueDate: string;
  total: number;
  amountPaid: number;
  outstanding?: number;
  isOverdue?: boolean;
}

export const PortalPage: React.FC = () => {
  const { user } = useAuth();
  const { success, error } = useToast();

  const [subscriptions, setSubscriptions] = useState<MySubscription[]>([]);
  const [invoices, setInvoices] = useState<MyInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Pay Modal State
  const [payInvoice, setPayInvoice] = useState<MyInvoice | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<'CARD' | 'UPI' | 'BANK_TRANSFER'>('CARD');
  const [isPaying, setIsPaying] = useState(false);

  const fetchPortalData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [subRes, invRes] = await Promise.all([
        api.get('/subscriptions', { params: { limit: 50 } }),
        api.get('/invoices', { params: { limit: 50 } }),
      ]);

      setSubscriptions(subRes.data.items || []);
      setInvoices(invRes.data.items || []);
    } catch {
      // Toast interceptor catches
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPortalData();
  }, [fetchPortalData]);

  // Derived Totals
  const activeSubs = subscriptions.filter((s) => s.status === 'ACTIVE');
  const totalInvoiced = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
  const totalOutstanding = invoices.reduce((sum, inv) => {
    if (inv.status === 'CANCELLED') return sum;
    const out =
      inv.outstanding !== undefined
        ? inv.outstanding
        : Math.max(0, inv.total - (inv.amountPaid || 0));
    return sum + out;
  }, 0);

  const handleOpenPay = (inv: MyInvoice) => {
    const out =
      inv.outstanding !== undefined
        ? inv.outstanding
        : Math.max(0, inv.total - (inv.amountPaid || 0));
    setPayInvoice(inv);
    setPayAmount(Math.round(out * 100) / 100);
    setPayMethod('CARD');
  };

  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payInvoice) return;

    const out =
      payInvoice.outstanding !== undefined
        ? payInvoice.outstanding
        : Math.max(0, payInvoice.total - (payInvoice.amountPaid || 0));

    if (payAmount <= 0) {
      error('Amount must be greater than zero');
      return;
    }
    if (payAmount > out + 0.001) {
      error(`Cannot pay more than remaining balance ($${out.toFixed(2)})`);
      return;
    }

    setIsPaying(true);
    try {
      await api.post('/payments', {
        invoiceId: payInvoice.id,
        amount: Number(payAmount),
        method: payMethod,
        note: `Self-service portal settlement via ${payMethod}`,
      });

      success('Payment received successfully! Your invoice is updated.');
      setPayInvoice(null);
      fetchPortalData();
    } catch (err) {
      // Toast
    } finally {
      setIsPaying(false);
    }
  };

  const handlePrint = (invoiceId: string) => {
    window.open(`/api/invoices/${invoiceId}/print`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-700 text-white rounded-3xl p-6 sm:p-8 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold mb-3">
              <UserCheck className="w-3.5 h-3.5" />
              Customer Self-Service Portal
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Hello, {user?.name || 'Valued Customer'}!
            </h1>
            <p className="text-indigo-100 text-xs sm:text-sm mt-1 max-w-xl">
              Track your active subscriptions, review upcoming billing cycles, download official receipts,
              and settle invoices directly.
            </p>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 border-white/20 pt-3 sm:pt-0">
            <div className="text-xs text-indigo-200">Current Balance Due</div>
            <div className="text-2xl sm:text-3xl font-black">
              ${totalOutstanding.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Plans</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <CalendarDays className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{activeSubs.length}</div>
          <p className="text-xs text-slate-400 mt-1">Subscriptions in good standing</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Invoiced</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">${totalInvoiced.toFixed(2)}</div>
          <p className="text-xs text-slate-400 mt-1">Cumulative billed services</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Outstanding</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-600">${totalOutstanding.toFixed(2)}</div>
          <p className="text-xs text-slate-400 mt-1">Pending payments across all cycles</p>
        </div>
      </div>

      {/* My Subscriptions Section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-indigo-600" />
            My Active & Past Subscriptions
          </h2>
          <span className="text-xs text-slate-400">{subscriptions.length} total</span>
        </div>

        {isLoading ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-500" />
            Loading subscription details...
          </div>
        ) : subscriptions.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            You do not have any registered subscriptions yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {subscriptions.map((sub) => (
              <div
                key={sub.id}
                className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-xs font-bold text-indigo-600">
                      {sub.number}
                    </span>
                    <h3 className="font-bold text-slate-900 text-sm mt-0.5">{sub.plan?.name}</h3>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                      sub.status === 'ACTIVE'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-slate-200 text-slate-700 border-slate-300'
                    }`}
                  >
                    {sub.status}
                  </span>
                </div>

                <div className="text-xs space-y-1 text-slate-600">
                  <div className="flex justify-between">
                    <span>Plan Rate:</span>
                    <span className="font-semibold text-slate-900">
                      ${sub.plan?.price} / {sub.plan?.billingPeriod?.toLowerCase()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Next Billing Date:</span>
                    <span className="font-semibold text-indigo-600">
                      {sub.nextBillingDate
                        ? new Date(sub.nextBillingDate).toLocaleDateString()
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Payment Terms:</span>
                    <span className="text-slate-700">{sub.paymentTerms}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* My Invoices Section */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden text-xs">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            Billing & Invoices History
          </h2>
          <span className="text-xs text-slate-400">{invoices.length} total</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Issue Date</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4 text-right">Balance Due</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading billing history...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No billing invoices generated yet.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  const out =
                    inv.outstanding !== undefined
                      ? inv.outstanding
                      : Math.max(0, inv.total - (inv.amountPaid || 0));
                  const isOverdue =
                    inv.isOverdue ||
                    (inv.status !== 'PAID' &&
                      inv.status !== 'CANCELLED' &&
                      new Date(inv.dueDate) < new Date());

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-600">
                        {inv.number}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {new Date(inv.issueDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {new Date(inv.dueDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        ${inv.total.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold">
                        {out > 0 ? (
                          <span className="text-rose-600 font-bold">${out.toFixed(2)}</span>
                        ) : (
                          <span className="text-emerald-600">$0.00</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex flex-col items-center gap-0.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                              inv.status === 'PAID'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {inv.status}
                          </span>
                          {isOverdue && (
                            <span className="text-[9px] font-bold text-rose-600 animate-pulse">
                              OVERDUE
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <button
                            onClick={() => handlePrint(inv.id)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
                            title="Print / View Receipt"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          {out > 0 && inv.status !== 'CANCELLED' && (
                            <button
                              onClick={() => handleOpenPay(inv)}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-sm transition flex items-center gap-1"
                            >
                              <CreditCard className="w-3 h-3" /> Pay Now
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
      </div>

      {/* PAY MODAL */}
      {payInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-xs">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <CreditCard className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Pay Outstanding Invoice</h3>
              </div>
              <button
                onClick={() => setPayInvoice(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Invoice:</span>
                <span className="font-mono font-bold text-indigo-600">{payInvoice.number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount Due:</span>
                <span className="font-bold text-rose-600">
                  $
                  {(
                    payInvoice.outstanding !== undefined
                      ? payInvoice.outstanding
                      : Math.max(0, payInvoice.total - (payInvoice.amountPaid || 0))
                  ).toFixed(2)}
                </span>
              </div>
            </div>

            <form onSubmit={handleConfirmPayment} className="space-y-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="CARD">Credit / Debit Card</option>
                  <option value="UPI">UPI Instant Pay</option>
                  <option value="BANK_TRANSFER">Bank Wire Transfer</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Amount to Pay ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={
                    payInvoice.outstanding !== undefined
                      ? payInvoice.outstanding
                      : Math.max(0, payInvoice.total - (payInvoice.amountPaid || 0))
                  }
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPayInvoice(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-semibold hover:bg-slate-50 text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPaying}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-sm transition"
                >
                  {isPaying ? 'Processing...' : `Pay $${payAmount}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
