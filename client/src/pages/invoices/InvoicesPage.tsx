import React, { useState } from 'react';
import {
  FileText,
  Download,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  Filter,
  CreditCard,
  X,
  ExternalLink,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { useToast } from '../../context/ToastContext.js';

interface InvoiceItem {
  id: string;
  number: string;
  subscriptionNumber: string;
  planName: string;
  periodStart: string;
  periodEnd: string;
  issueDate: string;
  dueDate: string;
  status: 'PAID' | 'CONFIRMED' | 'DRAFT' | 'CANCELLED';
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  total: number;
  amountPaid: number;
  lines: {
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }[];
}

const INITIAL_INVOICES: InvoiceItem[] = [
  {
    id: 'inv-1',
    number: 'INV-2026-0041',
    subscriptionNumber: 'SUB-2026-0041',
    planName: 'Enterprise Cloud Suite',
    periodStart: '2026-10-01',
    periodEnd: '2026-10-31',
    issueDate: '2026-10-01',
    dueDate: '2026-10-31',
    status: 'PAID',
    subtotal: 299.0,
    taxTotal: 53.82,
    discountTotal: 0.0,
    total: 352.82,
    amountPaid: 352.82,
    lines: [
      { description: 'Cloud Dedicated Cluster (Odoo Brand)', quantity: 1, unitPrice: 200.0, amount: 200.0 },
      { description: 'Enterprise 24/7 SLA Support', quantity: 1, unitPrice: 99.0, amount: 99.0 },
    ],
  },
  {
    id: 'inv-2',
    number: 'INV-2026-0038',
    subscriptionNumber: 'SUB-2026-0018',
    planName: 'Professional Automation Plan',
    periodStart: '2026-01-15',
    periodEnd: '2027-01-14',
    issueDate: '2026-01-15',
    dueDate: '2026-02-15',
    status: 'PAID',
    subtotal: 180.0,
    taxTotal: 32.4,
    discountTotal: 18.0,
    total: 194.4,
    amountPaid: 194.4,
    lines: [
      { description: 'Document & Invoice Engine (Annual License)', quantity: 1, unitPrice: 180.0, amount: 180.0 },
    ],
  },
  {
    id: 'inv-3',
    number: 'INV-2026-0052',
    subscriptionNumber: 'SUB-2026-0041',
    planName: 'Enterprise Cloud Suite (Nov Period)',
    periodStart: '2026-11-01',
    periodEnd: '2026-11-30',
    issueDate: '2026-10-25',
    dueDate: '2026-11-10',
    status: 'CONFIRMED',
    subtotal: 299.0,
    taxTotal: 53.82,
    discountTotal: 29.9,
    total: 322.92,
    amountPaid: 0.0,
    lines: [
      { description: 'Cloud Dedicated Cluster (Odoo Brand)', quantity: 1, unitPrice: 200.0, amount: 200.0 },
      { description: 'Enterprise 24/7 SLA Support', quantity: 1, unitPrice: 99.0, amount: 99.0 },
    ],
  },
  {
    id: 'inv-4',
    number: 'INV-2026-0099',
    subscriptionNumber: 'SUB-2026-0099',
    planName: 'Developer Sandbox Draft',
    periodStart: '2026-11-01',
    periodEnd: '2026-11-30',
    issueDate: '2026-10-28',
    dueDate: '2026-11-28',
    status: 'DRAFT',
    subtotal: 49.0,
    taxTotal: 8.82,
    discountTotal: 0.0,
    total: 57.82,
    amountPaid: 0.0,
    lines: [
      { description: 'API Access Gateway (10k req/day)', quantity: 1, unitPrice: 49.0, amount: 49.0 },
    ],
  },
];

export const InvoicesPage: React.FC = () => {
  const { user, isCustomer } = useAuth();
  const { success } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceItem | null>(null);

  const filteredInvoices = INITIAL_INVOICES.filter((inv) => {
    const matchesSearch =
      inv.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.subscriptionNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.planName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalBilled = INITIAL_INVOICES.reduce((acc, inv) => acc + inv.total, 0);
  const totalPaid = INITIAL_INVOICES.filter((inv) => inv.status === 'PAID').reduce((acc, inv) => acc + inv.amountPaid, 0);
  const outstanding = INITIAL_INVOICES.filter((inv) => inv.status === 'CONFIRMED').reduce(
    (acc, inv) => acc + (inv.total - inv.amountPaid),
    0
  );

  const downloadInvoice = (invoice: InvoiceItem) => {
    const invoiceContent = `
======================================================
BRIGHTLOOP SOFTWARE - INVOICE STATEMENT
======================================================
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
======================================================
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
          </div>

          <button
            onClick={() => {
              INITIAL_INVOICES.forEach((inv) => downloadInvoice(inv));
              success('All statements downloaded.');
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-slate-900 font-bold rounded-xl text-xs hover:bg-slate-100 transition shadow-sm shrink-0"
          >
            <Download className="w-4 h-4 text-indigo-600" />
            Download All Statements
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Total Billed</span>
          <p className="text-2xl font-bold text-slate-900 mt-2">${totalBilled.toFixed(2)}</p>
          <span className="text-xs text-slate-500 font-medium mt-1 inline-block">Across all cycles</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Settled to Date</span>
          <p className="text-2xl font-bold text-emerald-600 mt-2">${totalPaid.toFixed(2)}</p>
          <span className="text-xs text-emerald-600 font-medium mt-1 inline-block">Successfully paid</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Outstanding Balance</span>
          <p className="text-2xl font-bold text-amber-600 mt-2">${outstanding.toFixed(2)}</p>
          <span className="text-xs text-amber-600 font-medium mt-1 inline-block">Due Nov 10, 2026</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Invoice Protection</span>
          <p className="text-2xl font-bold text-indigo-600 mt-2">Active</p>
          <span className="text-xs text-slate-500 font-medium mt-1 inline-block">No double-billing guarantee</span>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search invoice number, plan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {(['ALL', 'PAID', 'CONFIRMED', 'DRAFT'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition shrink-0 ${
                statusFilter === status
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Invoice #</th>
                <th className="py-3.5 px-4">Subscription Ref</th>
                <th className="py-3.5 px-4">Billing Period</th>
                <th className="py-3.5 px-4">Issue / Due Date</th>
                <th className="py-3.5 px-4 text-right">Total Amount</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No invoices match your search criteria.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {inv.number}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-800 block">{inv.planName}</span>
                      <span className="text-[11px] font-mono text-indigo-600">{inv.subscriptionNumber}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                      {inv.periodStart} <span className="text-slate-300">to</span> {inv.periodEnd}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="block font-medium text-slate-700">{inv.issueDate}</span>
                      <span className="text-[11px] text-slate-400">Due: {inv.dueDate}</span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="font-bold text-slate-900 text-sm">${inv.total.toFixed(2)}</span>
                      {inv.discountTotal > 0 && (
                        <span className="block text-[10px] text-emerald-600 font-semibold">
                          -${inv.discountTotal.toFixed(2)} discount
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {getStatusBadge(inv.status)}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1">
                      <button
                        onClick={() => setSelectedInvoice(inv)}
                        title="View Details"
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition inline-flex items-center"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => downloadInvoice(inv)}
                        title="Download Statement"
                        className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition inline-flex items-center"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      {inv.status === 'CONFIRMED' && (
                        <button
                          onClick={() => success(`Simulated payment processed for ${inv.number}!`)}
                          className="px-2.5 py-1 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition"
                        >
                          Pay
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{selectedInvoice.number}</h3>
                  <p className="text-xs text-slate-500">{selectedInvoice.planName}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-400 text-[11px] block">Subscription Ref</span>
                  <span className="font-mono font-bold text-indigo-600">{selectedInvoice.subscriptionNumber}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Invoice Status</span>
                  <div>{getStatusBadge(selectedInvoice.status)}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Billing Period</span>
                  <span className="font-medium text-slate-700">
                    {selectedInvoice.periodStart} to {selectedInvoice.periodEnd}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Due Date</span>
                  <span className="font-medium text-slate-700">{selectedInvoice.dueDate}</span>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 mb-2">Itemized Invoice Lines</h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[10px] uppercase font-semibold text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">Item Description</th>
                        <th className="p-2.5 text-center">Qty</th>
                        <th className="p-2.5 text-right">Price</th>
                        <th className="p-2.5 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedInvoice.lines.map((l, i) => (
                        <tr key={i}>
                          <td className="p-2.5 font-medium text-slate-800">{l.description}</td>
                          <td className="p-2.5 text-center text-slate-600">{l.quantity}</td>
                          <td className="p-2.5 text-right text-slate-600">${l.unitPrice.toFixed(2)}</td>
                          <td className="p-2.5 text-right font-semibold text-slate-900">${l.amount.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Breakdown */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-1.5 font-medium text-slate-600">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="text-slate-900">${selectedInvoice.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Taxes (GST 18%):</span>
                  <span className="text-slate-900">+${selectedInvoice.taxTotal.toFixed(2)}</span>
                </div>
                {selectedInvoice.discountTotal > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Discount Applied:</span>
                    <span>-${selectedInvoice.discountTotal.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-200">
                  <span>Total Amount:</span>
                  <span>${selectedInvoice.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => setSelectedInvoice(null)}
                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition"
              >
                Close
              </button>
              <button
                onClick={() => downloadInvoice(selectedInvoice)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition"
              >
                <Download className="w-3.5 h-3.5" />
                Download Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
