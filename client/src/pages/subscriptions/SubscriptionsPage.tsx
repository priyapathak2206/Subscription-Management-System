import React from 'react';
import { CalendarDays, Code, CheckCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const SubscriptionsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
        <div className="max-w-2xl">
          <div className="w-12 h-12 bg-indigo-100 text-indigo-700 rounded-2xl flex items-center justify-center mb-4">
            <CalendarDays className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Subscriptions Management</h1>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            This module is reserved for the parallel billing and reporting implementation.
            The complete Prisma models, indexes, and relations are pre-configured and ready in the database.
          </p>

          <div className="mt-6 bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2 font-mono">
            <div className="font-semibold text-slate-700 flex items-center gap-1.5 font-sans">
              <Code className="w-4 h-4 text-indigo-600" /> Pre-built Foundation Database Tables:
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-600 pl-2">
              <li><code className="text-indigo-600">Subscription</code> (number UNIQUE, status DRAFT/QUOTATION/CONFIRMED/ACTIVE/CLOSED, nextBillingDate, indexes on status & customerId)</li>
              <li><code className="text-indigo-600">SubscriptionLine</code> (productId, variantId?, quantity, unitPrice, taxId?, amount)</li>
              <li><code className="text-indigo-600">SubscriptionStatusHistory</code> (fromStatus?, toStatus, changedAt, reason)</li>
              <li><code className="text-indigo-600">QuotationTemplate</code> & <code className="text-indigo-600">QuotationTemplateLine</code></li>
            </ul>
          </div>

          <div className="mt-6 flex gap-3">
            <Link
              to="/plans"
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition"
            >
              Browse Active Plans
            </Link>
            <Link
              to="/products"
              className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition"
            >
              Browse Products
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

