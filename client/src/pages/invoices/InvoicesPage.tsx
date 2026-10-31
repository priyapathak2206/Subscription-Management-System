import React from 'react';
import { FileText, Code, CheckCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const InvoicesPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
        <div className="max-w-2xl">
          <div className="w-12 h-12 bg-indigo-100 text-indigo-700 rounded-2xl flex items-center justify-center mb-4">
            <FileText className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Invoices & Billing Engine</h1>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            This module is reserved for the parallel billing and reporting implementation.
            The complete Prisma models, indexes, double-billing constraints, and shared calculation utilities are ready.
          </p>

          <div className="mt-6 bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2">
            <div className="font-semibold text-slate-700 flex items-center gap-1.5 font-sans">
              <Code className="w-4 h-4 text-indigo-600" /> Exported Utilities for Invoice Engine:
            </div>
            <ul className="list-disc list-inside space-y-1.5 text-slate-600 pl-2 font-mono text-[11px]">
              <li>
                <span className="font-semibold text-slate-800 font-sans">calculateTax(amount, tax)</span>: Precision rounding tax calculation utility.
              </li>
              <li>
                <span className="font-semibold text-slate-800 font-sans">getEligibleDiscounts(lines, context)</span>: Evaluates date window, usage limit, min purchase, min quantity, and product match.
              </li>
              <li>
                <span className="font-semibold text-slate-800 font-sans">applyDiscount(amount, discount)</span>: Computes percent / fixed discounts with zero-floor safety.
              </li>
              <li>
                <span className="font-semibold text-slate-800 font-sans">UNIQUE(subscriptionId, periodStart)</span>: Database constraint preventing accidental double billing.
              </li>
            </ul>
          </div>

          <div className="mt-6 flex gap-3">
            <Link
              to="/discounts"
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition"
            >
              View Active Discounts
            </Link>
            <Link
              to="/taxes"
              className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition"
            >
              View Tax Rates
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

