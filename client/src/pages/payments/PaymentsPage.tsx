import React from 'react';
import { CreditCard, Code, CheckCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const PaymentsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
        <div className="max-w-2xl">
          <div className="w-12 h-12 bg-indigo-100 text-indigo-700 rounded-2xl flex items-center justify-center mb-4">
            <CreditCard className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Payments & Ledger</h1>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            This module is reserved for the parallel billing and reporting implementation.
            The complete Payment Prisma model with payment methods (CASH, CARD, BANK_TRANSFER, UPI, CHEQUE, OTHER) is indexed and available.
          </p>

          <div className="mt-6 bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2 font-mono">
            <div className="font-semibold text-slate-700 flex items-center gap-1.5 font-sans">
              <Code className="w-4 h-4 text-indigo-600" /> Payment Model Schema:
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-600 pl-2">
              <li><code className="text-indigo-600">Payment</code> (id, invoiceId, method, amount, paymentDate, note)</li>
              <li>Indexed on <code className="text-indigo-600">invoiceId</code> for high performance payment reconciliation</li>
              <li>Foreign key link to <code className="text-indigo-600">Invoice</code> model with amountPaid tracker</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

