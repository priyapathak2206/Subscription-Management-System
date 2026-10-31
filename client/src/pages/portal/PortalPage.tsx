import React from 'react';
import {
  UserCheck,
  Shield,
  CheckCircle2,
  ArrowRight,
  CalendarDays,
  FileText,
  CreditCard,
  Clock,
  Sparkles,
  ExternalLink,
  Download,
  Package,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';

export const PortalPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      {/* Portal Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-indigo-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-emerald-950/10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/20 text-emerald-100 backdrop-blur-md inline-block mb-3">
              Customer Account Portal
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome back, {user?.name || 'Customer'}!
            </h1>
            <p className="text-emerald-100 text-sm leading-relaxed mt-1">
              Manage your company subscriptions, inspect upcoming invoice due dates, and access verified payment receipts in one unified place.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5 shrink-0">
            <Link
              to="/subscriptions"
              className="px-4 py-2.5 bg-white text-emerald-950 rounded-xl text-xs font-bold hover:bg-emerald-50 transition shadow-sm"
            >
              Manage Subscriptions
            </Link>
            <Link
              to="/invoices"
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold backdrop-blur-md transition border border-white/20"
            >
              View Invoices
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          to="/subscriptions"
          className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition block group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Tiers</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition">
              <CalendarDays className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">2 Tiers Active</p>
          <span className="text-xs text-indigo-600 font-semibold mt-1 flex items-center gap-1">
            Enterprise & Pro <ArrowRight className="w-3 h-3" />
          </span>
        </Link>

        <Link
          to="/invoices"
          className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition block group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Upcoming Invoice</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-amber-600 mt-2">$322.92</p>
          <span className="text-xs text-slate-500 font-medium mt-1 inline-block">Due Nov 10, 2026</span>
        </Link>

        <Link
          to="/payments"
          className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition block group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Settled to Date</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">$3,121.00</p>
          <span className="text-xs text-emerald-600 font-medium mt-1 inline-block">6 Transactions settled</span>
        </Link>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Security Scope</span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-teal-700 mt-2">Protected</p>
          <span className="text-xs text-slate-500 font-medium mt-1 inline-block">Strict tenant isolation</span>
        </div>
      </div>

      {/* Two-Column Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Active Tiers & Invoices Preview */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Subscriptions Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Current Active Subscriptions</h2>
                <p className="text-xs text-slate-500">Subscriptions attached to your customer account</p>
              </div>
              <Link
                to="/subscriptions"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-3">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono font-semibold text-indigo-600">SUB-2026-0041</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                      Active
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm">Enterprise Cloud Suite</h3>
                  <p className="text-xs text-slate-500">Renews monthly on Nov 01, 2026</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="font-bold text-slate-900 text-sm">$299.00</span>
                    <span className="text-[11px] text-slate-400 block">/month</span>
                  </div>
                  <Link
                    to="/subscriptions"
                    className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-700 transition"
                  >
                    Details
                  </Link>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono font-semibold text-indigo-600">SUB-2026-0018</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                      Active
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm">Professional Automation Plan</h3>
                  <p className="text-xs text-slate-500">Annual commitment through Jan 14, 2027</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="font-bold text-slate-900 text-sm">$180.00</span>
                    <span className="text-[11px] text-slate-400 block">/year</span>
                  </div>
                  <Link
                    to="/subscriptions"
                    className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-700 transition"
                  >
                    Details
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Invoices Preview */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Recent Billing Statements</h2>
                <p className="text-xs text-slate-500">Your latest invoice releases and payment records</p>
              </div>
              <Link
                to="/invoices"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition"
              >
                <span>All Invoices</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="divide-y divide-slate-100">
              <div className="py-3 flex items-center justify-between">
                <div>
                  <span className="font-mono font-bold text-slate-900 text-xs">INV-2026-0052</span>
                  <p className="text-xs text-slate-500">Enterprise Cloud Suite (Nov Period)</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">
                    Due Nov 10
                  </span>
                  <span className="font-bold text-slate-900 text-xs">$322.92</span>
                  <Link
                    to="/invoices"
                    className="text-xs text-indigo-600 font-semibold hover:underline"
                  >
                    View
                  </Link>
                </div>
              </div>

              <div className="py-3 flex items-center justify-between">
                <div>
                  <span className="font-mono font-bold text-slate-900 text-xs">INV-2026-0041</span>
                  <p className="text-xs text-slate-500">Enterprise Cloud Suite (Oct Period)</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                    Paid
                  </span>
                  <span className="font-bold text-slate-900 text-xs">$352.82</span>
                  <Link
                    to="/invoices"
                    className="text-xs text-indigo-600 font-semibold hover:underline"
                  >
                    View
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Security & Quick Links */}
        <div className="space-y-6">
          {/* Tenant Isolation Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3">
              <UserCheck className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Tenant Data Isolation</h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Your customer account ({user?.email}) is cryptographically isolated via backend role guards and query scoping. Only you can view your invoices and subscriptions.
            </p>
          </div>

          {/* Quick Hub Navigation Links */}
          <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md space-y-3">
            <h3 className="text-sm font-bold tracking-tight">Customer Quick Links</h3>
            <div className="space-y-2 text-xs">
              <Link
                to="/subscriptions"
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 transition"
              >
                <div className="flex items-center gap-2.5">
                  <CalendarDays className="w-4 h-4 text-indigo-400" />
                  <span>My Subscriptions</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </Link>

              <Link
                to="/invoices"
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 transition"
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  <span>Billing Statements</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </Link>

              <Link
                to="/payments"
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 transition"
              >
                <div className="flex items-center gap-2.5">
                  <CreditCard className="w-4 h-4 text-indigo-400" />
                  <span>Transaction Ledger</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
