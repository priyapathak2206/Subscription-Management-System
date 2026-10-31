import React, { useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  AlertCircle,
  Layers,
  ArrowRight,
  ExternalLink,
  Shield,
  RefreshCw,
  X,
  CreditCard,
  FileText,
  Package,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';

interface SubscriptionTier {
  id: string;
  number: string;
  tierName: string;
  planName: string;
  billingPeriod: 'MONTHLY' | 'YEARLY' | 'WEEKLY' | 'DAILY';
  price: number;
  status: 'ACTIVE' | 'CONFIRMED' | 'QUOTATION' | 'DRAFT' | 'CLOSED';
  startDate: string;
  nextBillingDate: string;
  expiryDate?: string;
  paymentTerms: string;
  autoClose: boolean;
  closable: boolean;
  pausable: boolean;
  renewable: boolean;
  products: {
    name: string;
    variant?: string;
    extraPrice?: number;
    quantity: number;
  }[];
}

const INITIAL_SUBSCRIPTIONS: SubscriptionTier[] = [
  {
    id: 'sub-1',
    number: 'SUB-2026-0041',
    tierName: 'Enterprise Cloud Suite',
    planName: 'Enterprise Scale Tier',
    billingPeriod: 'MONTHLY',
    price: 299.0,
    status: 'ACTIVE',
    startDate: '2026-10-01',
    nextBillingDate: '2026-11-01',
    expiryDate: '2027-09-30',
    paymentTerms: 'Net 30 Days',
    autoClose: false,
    closable: true,
    pausable: true,
    renewable: true,
    products: [
      { name: 'Cloud Dedicated Cluster', variant: 'Brand: High-Performance Odoo', extraPrice: 560, quantity: 1 },
      { name: 'Enterprise 24/7 SLA Dedicated Support', quantity: 1 },
      { name: 'Workspace Member Access', quantity: 50 },
    ],
  },
  {
    id: 'sub-2',
    number: 'SUB-2026-0018',
    tierName: 'Professional Automation Plan',
    planName: 'Pro Workflow Yearly',
    billingPeriod: 'YEARLY',
    price: 180.0,
    status: 'ACTIVE',
    startDate: '2026-01-15',
    nextBillingDate: '2027-01-15',
    expiryDate: '2027-01-14',
    paymentTerms: 'Immediate Payment',
    autoClose: false,
    closable: true,
    pausable: false,
    renewable: true,
    products: [
      { name: 'Document & Invoice Engine License', quantity: 1 },
      { name: 'Staff Management Seats', quantity: 5 },
    ],
  },
  {
    id: 'sub-3',
    number: 'SUB-2026-0099',
    tierName: 'Starter Developer Sandbox',
    planName: 'Developer Sandbox Monthly',
    billingPeriod: 'MONTHLY',
    price: 49.0,
    status: 'QUOTATION',
    startDate: '2026-10-28',
    nextBillingDate: '2026-11-28',
    paymentTerms: 'Prepaid',
    autoClose: true,
    closable: true,
    pausable: false,
    renewable: true,
    products: [
      { name: 'API Access Gateway (10k req/day)', quantity: 1 },
    ],
  },
];

export const SubscriptionsPage: React.FC = () => {
  const { user, isCustomer } = useAuth();
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'QUOTATION' | 'CLOSED'>('ALL');
  const [selectedSub, setSelectedSub] = useState<SubscriptionTier | null>(null);

  const filteredSubscriptions = INITIAL_SUBSCRIPTIONS.filter((sub) => {
    if (filter === 'ALL') return true;
    if (filter === 'QUOTATION') return sub.status === 'QUOTATION' || sub.status === 'DRAFT';
    return sub.status === filter;
  });

  const activeCount = INITIAL_SUBSCRIPTIONS.filter((s) => s.status === 'ACTIVE').length;
  const totalMonthly = INITIAL_SUBSCRIPTIONS.filter((s) => s.status === 'ACTIVE').reduce((sum, s) => {
    return sum + (s.billingPeriod === 'YEARLY' ? s.price / 12 : s.price);
  }, 0);

  const getStatusBadge = (status: SubscriptionTier['status']) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Active
          </span>
        );
      case 'QUOTATION':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600" /> Quotation
          </span>
        );
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" /> Confirmed
          </span>
        );
      case 'CLOSED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <AlertCircle className="w-3.5 h-3.5 text-slate-500" /> Closed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-indigo-950/10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="max-w-2xl">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/20 text-indigo-100 backdrop-blur-md inline-block mb-3">
              Subscription Management
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {isCustomer ? 'My Subscription Tiers' : 'Customer Subscriptions'}
            </h1>
            <p className="text-indigo-100 text-sm leading-relaxed mt-1">
              Review your active subscription tiers, recurring billing intervals, plan capabilities, and lifecycle states.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/plans"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-indigo-900 font-bold rounded-xl text-xs hover:bg-indigo-50 transition shadow-sm shrink-0"
            >
              <Sparkles className="w-4 h-4 text-indigo-600" />
              Explore All Plans
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Tiers</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{activeCount} Tiers</p>
          <span className="text-xs text-emerald-600 font-medium mt-1 inline-block">All systems running</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Monthly Run-Rate</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">${totalMonthly.toFixed(2)}</p>
          <span className="text-xs text-slate-500 font-medium mt-1 inline-block">Estimated recurring fee</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Next Renewal</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <CalendarDays className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">Nov 01, 2026</p>
          <span className="text-xs text-slate-500 font-medium mt-1 inline-block">Enterprise Suite cycle</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Auto-Renewal</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <RefreshCw className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">Enabled</p>
          <span className="text-xs text-purple-600 font-medium mt-1 inline-block">Continuous billing active</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        {(['ALL', 'ACTIVE', 'QUOTATION', 'CLOSED'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filter === tab
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab === 'ALL'
              ? `All (${INITIAL_SUBSCRIPTIONS.length})`
              : tab === 'ACTIVE'
              ? `Active (${activeCount})`
              : tab === 'QUOTATION'
              ? 'Quotations (1)'
              : 'Closed (0)'}
          </button>
        ))}
      </div>

      {/* Subscription Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredSubscriptions.map((sub) => (
          <div
            key={sub.id}
            className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between"
          >
            <div>
              {/* Card Header */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                      {sub.number}
                    </span>
                    {getStatusBadge(sub.status)}
                  </div>
                  <h2 className="text-lg font-bold text-slate-900">{sub.tierName}</h2>
                  <p className="text-xs text-slate-500 font-medium">Plan: {sub.planName}</p>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-2xl font-black text-slate-900">${sub.price.toFixed(2)}</span>
                  <span className="text-xs text-slate-500 block">/{sub.billingPeriod.toLowerCase()}</span>
                </div>
              </div>

              {/* Products & Line Items */}
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100 mb-4 space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Included Services & Products
                </span>
                <div className="space-y-1.5">
                  {sub.products.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs text-slate-700">
                      <div className="flex items-center gap-2 min-w-0">
                        <Package className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate font-medium">{item.name}</span>
                        {item.variant && (
                          <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-200 shrink-0 font-mono">
                            {item.variant}
                          </span>
                        )}
                      </div>
                      <span className="text-slate-500 font-semibold shrink-0">
                        x{item.quantity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Subscription Timeline & Dates */}
              <div className="grid grid-cols-2 gap-3 text-xs mb-4 pt-3 border-t border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[11px]">Start Date</span>
                  <span className="font-semibold text-slate-700">{sub.startDate}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Next Billing Date</span>
                  <span className="font-semibold text-indigo-600">{sub.nextBillingDate}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Payment Terms</span>
                  <span className="font-semibold text-slate-700">{sub.paymentTerms}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Auto Renewal</span>
                  <span className="font-semibold text-emerald-700">{sub.renewable ? 'Yes (Active)' : 'Manual'}</span>
                </div>
              </div>
            </div>

            {/* Card Footer Actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                onClick={() => setSelectedSub(sub)}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 transition"
              >
                <span>View Full Details</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center gap-2">
                <Link
                  to="/invoices"
                  className="px-3 py-1.5 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold transition"
                >
                  View Invoices
                </Link>
                {sub.status === 'ACTIVE' && (
                  <button
                    onClick={() => setSelectedSub(sub)}
                    className="px-3 py-1.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-xs font-semibold transition shadow-sm"
                  >
                    Manage Plan
                  </button>
                )}
                {sub.status === 'QUOTATION' && (
                  <button
                    onClick={() => alert(`Quotation ${sub.number} confirmed!`)}
                    className="px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-xs font-semibold transition shadow-sm"
                  >
                    Confirm Order
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Subscription Detail Modal */}
      {selectedSub && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                  BL
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{selectedSub.tierName}</h3>
                  <p className="text-xs text-slate-500 font-mono">{selectedSub.number}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSub(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-4 rounded-xl space-y-2 border border-slate-200/60">
                <div className="flex justify-between">
                  <span className="text-slate-500">Lifecycle Status:</span>
                  <span>{getStatusBadge(selectedSub.status)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Plan Rate:</span>
                  <span className="font-bold text-slate-900">${selectedSub.price.toFixed(2)} / {selectedSub.billingPeriod.toLowerCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Billing Terms:</span>
                  <span className="font-semibold text-slate-800">{selectedSub.paymentTerms}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Start Date:</span>
                  <span className="font-semibold text-slate-800">{selectedSub.startDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Next Scheduled Invoice:</span>
                  <span className="font-semibold text-indigo-600">{selectedSub.nextBillingDate}</span>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 mb-2">Plan Lifecycle Rules</h4>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
                    <span className="text-slate-600">Auto-Close on Expiry:</span>
                    <span className="font-semibold">{selectedSub.autoClose ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
                    <span className="text-slate-600">Customer Closable:</span>
                    <span className="font-semibold">{selectedSub.closable ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
                    <span className="text-slate-600">Pausable:</span>
                    <span className="font-semibold">{selectedSub.pausable ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
                    <span className="text-slate-600">Auto-Renewable:</span>
                    <span className="font-semibold text-emerald-600">{selectedSub.renewable ? 'Yes' : 'No'}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 mb-2">Included Products & Add-ons</h4>
                <div className="space-y-2">
                  {selectedSub.products.map((p, i) => (
                    <div key={i} className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-slate-800 block">{p.name}</span>
                        {p.variant && <span className="text-[10px] text-indigo-600">{p.variant}</span>}
                      </div>
                      <span className="font-bold text-slate-700">Qty {p.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => setSelectedSub(null)}
                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition"
              >
                Close
              </button>
              <Link
                to="/invoices"
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition"
              >
                View Linked Invoices
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
