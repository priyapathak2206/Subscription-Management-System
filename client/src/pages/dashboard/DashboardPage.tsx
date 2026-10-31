import React from 'react';
import { LayoutDashboard, ArrowRight, CheckCircle2, ShieldCheck, Database } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-indigo-900 to-indigo-700 rounded-3xl p-8 text-white shadow-xl shadow-indigo-950/10">
        <div className="max-w-2xl">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/20 text-indigo-100 backdrop-blur-md inline-block mb-3">
            Brightloop Operations
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight mb-2">
            Welcome, {user?.name || 'Teammate'}!
          </h1>
          <p className="text-indigo-100 text-sm leading-relaxed mb-6">
            The foundation & catalog subsystem is active. Use the links below to manage catalog items or integrate billing/reporting logic.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/products"
              className="px-4 py-2 bg-white text-indigo-900 rounded-xl text-xs font-bold hover:bg-indigo-50 transition shadow-sm"
            >
              Browse Products & Variants
            </Link>
            <Link
              to="/plans"
              className="px-4 py-2 bg-indigo-600/60 border border-white/20 text-white rounded-xl text-xs font-bold hover:bg-indigo-600 transition"
            >
              Subscription Plans
            </Link>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <LayoutDashboard className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Dashboard Metrics & KPIs</h2>
            <p className="text-sm text-slate-500 mt-1">
              Maintained under <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded font-mono">client/src/pages/dashboard</code> by the parallel billing and reporting engineer.
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-slate-100">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Foundation Layer</span>
            <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5 mt-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Complete Prisma Schema & Auth
            </span>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Security & RBAC</span>
            <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5 mt-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> Customer Scoping & Role Guards
            </span>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Catalog Engine</span>
            <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5 mt-1">
              <Database className="w-4 h-4 text-emerald-600" /> Products, Plans, Taxes & Discounts
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

