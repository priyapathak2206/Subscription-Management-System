import React from 'react';
import { UserCheck, Shield, CheckCircle2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';

export const PortalPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-emerald-800 to-teal-700 rounded-3xl p-8 text-white shadow-xl shadow-emerald-950/10">
        <div className="max-w-2xl">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/20 text-emerald-100 backdrop-blur-md inline-block mb-3">
            Customer Self-Service Portal
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight mb-2">
            Welcome, {user?.name}!
          </h1>
          <p className="text-emerald-100 text-sm leading-relaxed mb-6">
            Manage your company subscriptions, view downloadable tax invoices, and track payment receipts securely.
          </p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Customer Data Isolation Guaranteed</h2>
            <p className="text-sm text-slate-600 mt-1">
              All backend endpoints enforce customer data isolation via the exported <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-xs">applyCustomerScope</code> utility, ensuring customer accounts can only view their own subscriptions and invoices.
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-slate-100">
          <Link
            to="/subscriptions"
            className="p-4 bg-slate-50 hover:bg-slate-100 transition rounded-xl border border-slate-200/60 block"
          >
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Subscriptions</span>
            <span className="text-sm font-bold text-slate-800 flex items-center justify-between mt-2">
              My Subscriptions <ArrowRight className="w-4 h-4 text-slate-400" />
            </span>
          </Link>

          <Link
            to="/invoices"
            className="p-4 bg-slate-50 hover:bg-slate-100 transition rounded-xl border border-slate-200/60 block"
          >
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Billing</span>
            <span className="text-sm font-bold text-slate-800 flex items-center justify-between mt-2">
              My Invoices <ArrowRight className="w-4 h-4 text-slate-400" />
            </span>
          </Link>

          <Link
            to="/payments"
            className="p-4 bg-slate-50 hover:bg-slate-100 transition rounded-xl border border-slate-200/60 block"
          >
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Receipts</span>
            <span className="text-sm font-bold text-slate-800 flex items-center justify-between mt-2">
              Payment History <ArrowRight className="w-4 h-4 text-slate-400" />
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
};

