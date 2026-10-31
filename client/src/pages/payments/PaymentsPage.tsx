import React, { useState } from 'react';
import {
  CreditCard,
  Download,
  Search,
  CheckCircle2,
  Clock,
  ExternalLink,
  ShieldCheck,
  Receipt,
  X,
  Printer,
  Building,
  Smartphone,
  Banknote,
  ArrowUpRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { useToast } from '../../context/ToastContext.js';

interface PaymentRecord {
  id: string;
  transactionRef: string;
  invoiceNumber: string;
  method: 'CARD' | 'UPI' | 'BANK_TRANSFER' | 'CASH' | 'OTHER';
  methodDetail: string;
  amount: number;
  paymentDate: string;
  status: 'COMPLETED' | 'PROCESSING' | 'FAILED';
  note?: string;
  customer?: { id: string; name: string; email: string };
}

const INITIAL_PAYMENTS: PaymentRecord[] = [
  {
    id: 'pay-1',
    transactionRef: 'TXN-984210-BL',
    invoiceNumber: 'INV-2026-0041',
    method: 'CARD',
    methodDetail: 'Visa ending in •••• 4242',
    amount: 352.82,
    paymentDate: '2026-10-02 14:22:15',
    status: 'COMPLETED',
    note: 'Automated recurring billing settlement',
  },
  {
    id: 'pay-2',
    transactionRef: 'TXN-872911-BL',
    invoiceNumber: 'INV-2026-0038',
    method: 'BANK_TRANSFER',
    methodDetail: 'HDFC Corporate Wire #9921',
    amount: 194.4,
    paymentDate: '2026-01-16 11:05:40',
    status: 'COMPLETED',
    note: 'Annual enterprise subscription fee',
  },
  {
    id: 'pay-3',
    transactionRef: 'TXN-761204-BL',
    invoiceNumber: 'INV-2025-0812',
    method: 'UPI',
    methodDetail: 'brightloop@okaxis',
    amount: 299.0,
    paymentDate: '2025-12-01 09:12:33',
    status: 'COMPLETED',
    note: 'Monthly cloud cluster renewal',
  },
  {
    id: 'pay-4',
    transactionRef: 'TXN-650192-BL',
    invoiceNumber: 'INV-2025-0720',
    method: 'CARD',
    methodDetail: 'Mastercard ending in •••• 8819',
    amount: 299.0,
    paymentDate: '2025-11-01 10:45:00',
    status: 'COMPLETED',
    note: 'Monthly cloud cluster renewal',
  },
];

const METHOD_BADGES: Record<string, { bg: string; text: string; border: string }> = {
  CARD: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  UPI: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  BANK_TRANSFER: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  CASH: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  CHEQUE: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  OTHER: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
};

export const PaymentsPage: React.FC = () => {
  const { user, isCustomer } = useAuth();
  const { success } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('ALL');
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);

  const filteredPayments = INITIAL_PAYMENTS.filter((p) => {
    const matchesSearch =
      p.transactionRef.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.methodDetail.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMethod = methodFilter === 'ALL' || p.method === methodFilter;
    return matchesSearch && matchesMethod;
  });

  const totalSettled = INITIAL_PAYMENTS.filter((p) => p.status === 'COMPLETED').reduce(
    (acc, p) => acc + p.amount,
    0
  );

  const getMethodBadge = (method: PaymentRecord['method'], detail: string) => {
    switch (method) {
      case 'CARD':
        return (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <CreditCard className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="font-semibold text-slate-800 block text-xs">Credit Card</span>
              <span className="text-[11px] text-slate-400">{detail}</span>
            </div>
          </div>
        );
      case 'BANK_TRANSFER':
        return (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Building className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="font-semibold text-slate-800 block text-xs">Bank Transfer</span>
              <span className="text-[11px] text-slate-400">{detail}</span>
            </div>
          </div>
        );
      case 'UPI':
        return (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Smartphone className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="font-semibold text-slate-800 block text-xs">UPI Payment</span>
              <span className="text-[11px] text-slate-400">{detail}</span>
            </div>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
              <Banknote className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="font-semibold text-slate-800 block text-xs">{method}</span>
              <span className="text-[11px] text-slate-400">{detail}</span>
            </div>
          </div>
        );
    }
  };

  const exportCSV = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['Transaction ID,Invoice Number,Payment Method,Amount,Date,Status']
        .concat(
          INITIAL_PAYMENTS.map(
            (p) => `${p.transactionRef},${p.invoiceNumber},${p.method},${p.amount},${p.paymentDate},${p.status}`
          )
        )
        .join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'payment_ledger.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    success('Payment ledger exported to CSV successfully.');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-emerald-950/10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="max-w-2xl">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/20 text-emerald-200 backdrop-blur-md inline-block mb-3">
              Payments & Ledger
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {isCustomer ? 'My Payment History' : 'Payment Reconciliation & Ledger'}
            </h1>
            <p className="text-emerald-100 text-sm leading-relaxed mt-1">
              Verify transaction timestamps, payment method authorizations, and generate official payment receipts.
            </p>
          </div>

          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-emerald-950 font-bold rounded-xl text-xs hover:bg-emerald-50 transition shadow-sm shrink-0"
          >
            <Download className="w-4 h-4 text-emerald-700" />
            Export Ledger CSV
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Total Settled</span>
          <p className="text-2xl font-bold text-slate-900 mt-2">${totalSettled.toFixed(2)}</p>
          <span className="text-xs text-emerald-600 font-medium mt-1 inline-block">100% Cleared payments</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Transactions</span>
          <p className="text-2xl font-bold text-slate-900 mt-2">{INITIAL_PAYMENTS.length} Logs</p>
          <span className="text-xs text-slate-500 font-medium mt-1 inline-block">Fully reconciled</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Default Method</span>
          <p className="text-2xl font-bold text-indigo-600 mt-2">Visa •••• 4242</p>
          <span className="text-xs text-slate-500 font-medium mt-1 inline-block">Auto-charge enabled</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Security Protocol</span>
          <p className="text-2xl font-bold text-emerald-600 mt-2">PCI Compliant</p>
          <span className="text-xs text-slate-500 font-medium mt-1 inline-block">End-to-end encrypted</span>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search transaction ID, invoice..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {(['ALL', 'CARD', 'BANK_TRANSFER', 'UPI'] as const).map((method) => (
            <button
              key={method}
              onClick={() => setMethodFilter(method)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition shrink-0 ${
                methodFilter === method
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {method === 'BANK_TRANSFER' ? 'Bank Transfer' : method}
            </button>
          ))}
        </div>
      </div>

      {/* Payments History Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Transaction ID</th>
                <th className="py-3.5 px-4">Invoice Ref</th>
                <th className="py-3.5 px-4">Payment Method</th>
                <th className="py-3.5 px-4">Date & Time</th>
                <th className="py-3.5 px-4 text-right">Amount</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No transactions match your search criteria.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {p.transactionRef}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-semibold text-indigo-600 block">{p.invoiceNumber}</span>
                      {p.note && <span className="text-[11px] text-slate-400 truncate block max-w-xs">{p.note}</span>}
                    </td>
                    <td className="py-3.5 px-4">
                      {getMethodBadge(p.method, p.methodDetail)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {p.paymentDate}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900 text-sm">
                      ${p.amount.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Settled
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedPayment(p)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-700 transition"
                      >
                        <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                        Receipt
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Receipt Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Payment Receipt</h3>
                  <p className="text-xs text-slate-500 font-mono">{selectedPayment.transactionRef}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPayment(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Receipt Card */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4 text-xs">
              <div className="text-center pb-3 border-b border-slate-200">
                <h4 className="font-extrabold text-sm text-slate-900 tracking-tight">Brightloop Software</h4>
                <p className="text-[11px] text-slate-500">Official Electronic Receipt</p>
                <div className="mt-2 text-2xl font-black text-slate-900">${selectedPayment.amount.toFixed(2)}</div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 mt-1 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Payment Confirmed
                </span>
              </div>

              <div className="space-y-2 text-slate-600">
                <div className="flex justify-between">
                  <span>Transaction ID:</span>
                  <span className="font-mono font-semibold text-slate-900">{selectedPayment.transactionRef}</span>
                </div>
                <div className="flex justify-between">
                  <span>Invoice Number:</span>
                  <span className="font-mono font-semibold text-indigo-600">{selectedPayment.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment Method:</span>
                  <span className="font-medium text-slate-900">{selectedPayment.methodDetail}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date & Timestamp:</span>
                  <span className="font-medium text-slate-900">{selectedPayment.paymentDate}</span>
                </div>
                {selectedPayment.note && (
                  <div className="flex justify-between">
                    <span>Description:</span>
                    <span className="font-medium text-slate-900">{selectedPayment.note}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => setSelectedPayment(null)}
                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition"
              >
                Close
              </button>
              <button
                onClick={() => {
                  window.print();
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 transition"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};