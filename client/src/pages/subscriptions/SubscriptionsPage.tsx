import React, { useState, useEffect, useCallback } from 'react';
import {
  CalendarDays,
  Plus,
  Search,
  CheckCircle,
  Clock,
  AlertTriangle,
  X,
  FileText,
  ChevronRight,
  User,
  ArrowRight,
  Layers,
  Trash2,
  Edit2,
  RefreshCw,
  Ban,
  ShieldCheck,
} from 'lucide-react';
import api from '../../api/axios.js';
import { useAuth } from '../../context/AuthContext.js';
import { useToast } from '../../context/ToastContext.js';

interface SubscriptionLine {
  id?: string;
  productId: string;
  variantId?: string | null;
  quantity: number;
  unitPrice: number;
  taxId?: string | null;
  amount: number;
  product?: { id: string; name: string };
  variant?: { id: string; name: string } | null;
  tax?: { id: string; name: string; rate: number } | null;
}

interface StatusHistoryItem {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  changedAt: string;
  reason?: string | null;
  changedBy?: { id: string; name: string; email: string; role: string } | null;
}

interface Subscription {
  id: string;
  number: string;
  customerId: string;
  planId: string;
  status: 'DRAFT' | 'QUOTATION' | 'CONFIRMED' | 'ACTIVE' | 'PAUSED' | 'CLOSED';
  renewedFromId?: string | null;
  renewedFrom?: { id: string; number: string; status: string } | null;
  startDate: string;
  expiryDate?: string | null;
  quotationExpiryDate?: string | null;
  paymentTerms: string;
  nextBillingDate?: string | null;
  createdAt: string;
  customer?: { id: string; name: string; email: string };
  plan: {
    id: string;
    name: string;
    price: number;
    billingPeriod: string;
    minQuantity: number;
    closable: boolean;
    autoClose: boolean;
  };
  lines: SubscriptionLine[];
  history: StatusHistoryItem[];
}

interface QuotationTemplate {
  id: string;
  name: string;
  planId: string;
  validityDays: number;
  plan?: { id: string; name: string; price: number };
  lines: Array<{
    id?: string;
    productId: string;
    variantId?: string | null;
    quantity: number;
    unitPrice?: number;
    product?: { id: string; name: string };
    variant?: { id: string; name: string } | null;
  }>;
}

interface PlanOption {
  id: string;
  name: string;
  price: number;
  billingPeriod: string;
  minQuantity: number;
}

interface ProductOption {
  id: string;
  name: string;
  price: number;
  taxId?: string | null;
  variants: Array<{ id: string; name: string; priceAdjustment: number }>;
}

interface CustomerOption {
  id: string;
  name: string;
  email: string;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; border: string; step: number }
> = {
  DRAFT: { label: 'Draft', bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300', step: 1 },
  QUOTATION: { label: 'Quotation', bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300', step: 2 },
  CONFIRMED: { label: 'Confirmed', bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300', step: 3 },
  ACTIVE: { label: 'Active', bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300', step: 4 },
  CLOSED: { label: 'Closed', bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-300', step: 5 },
};

export const SubscriptionsPage: React.FC = () => {
  const { user, isAdmin, isStaff } = useAuth();
  const { success, error } = useToast();

  const [activeTab, setActiveTab] = useState<'subscriptions' | 'templates'>('subscriptions');

  // Subscriptions List State
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [totalSubs, setTotalSubs] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Selected Detail Modal
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [transitionReason, setTransitionReason] = useState('');

  // Create Subscription Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createMode, setCreateMode] = useState<'scratch' | 'template'>('scratch');
  const [templates, setTemplates] = useState<QuotationTemplate[]>([]);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);

  // Create Form fields
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [expiryDate, setExpiryDate] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('NET_30');
  const [formLines, setFormLines] = useState<
    Array<{
      productId: string;
      variantId?: string;
      quantity: number;
      unitPrice: number;
      taxRate: number;
    }>
  >([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Templates Management State
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templatePlanId, setTemplatePlanId] = useState('');
  const [templateValidityDays, setTemplateValidityDays] = useState(30);
  const [templateLines, setTemplateLines] = useState<
    Array<{ productId: string; variantId?: string; quantity: number; unitPrice: number }>
  >([]);

  // Fetch Subscriptions
  const fetchSubscriptions = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: any = { page, limit };
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (search.trim()) params.search = search.trim();

      const res = await api.get('/subscriptions', { params });
      const items = res.data.items || res.data.subscriptions || [];
      setSubscriptions(items);
      setTotalSubs(res.data.pagination?.total ?? items.length);
    } catch {
      // Axios interceptor shows error toast
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, statusFilter, search]);

  // Fetch Auxiliary Data (Plans, Products, Customers, Templates)
  const fetchAuxData = useCallback(async () => {
    if (!isAdmin && !isStaff) {
      return;
    }
    try {
      const [pRes, prodRes, tmplRes] = await Promise.all([
        api.get('/plans', { params: { limit: 100 } }),
        api.get('/products', { params: { limit: 100 } }),
        api.get('/quotation-templates'),
      ]);

      setPlans(pRes.data.items || []);
      setProducts(prodRes.data.items || []);
      setTemplates(tmplRes.data.items || []);

      if (isAdmin || isStaff) {
        const cRes = await api.get('/users/customers');
        setCustomers(cRes.data || []);
      }
    } catch (err) {
      console.error('Failed to load auxiliary data', err);
    }
  }, [isAdmin, isStaff]);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  useEffect(() => {
    fetchAuxData();
  }, [fetchAuxData]);

  // Handle Template Selection in Create Form
  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) return;

    const tmpl = templates.find((t) => t.id === templateId);
    if (!tmpl) return;

    setSelectedPlanId(tmpl.planId);
    if (tmpl.lines && tmpl.lines.length > 0) {
      setFormLines(
        tmpl.lines.map((l) => ({
          productId: l.productId,
          variantId: l.variantId || undefined,
          quantity: l.quantity,
          unitPrice: l.unitPrice || 0,
          taxRate: 0,
        }))
      );
    }
  };

  // Add line to subscription form
  const handleAddFormLine = () => {
    if (products.length === 0) return;
    const defaultProd = products[0];
    setFormLines([
      ...formLines,
      {
        productId: defaultProd.id,
        quantity: 1,
        unitPrice: defaultProd.price,
        taxRate: 0,
      },
    ]);
  };

  const handleRemoveFormLine = (index: number) => {
    setFormLines(formLines.filter((_, i) => i !== index));
  };

  // Handle Subscription Creation
  const handleCreateSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanId) {
      error('Please select a subscription plan');
      return;
    }

    const plan = plans.find((p) => p.id === selectedPlanId);
    const totalQty = formLines.reduce((sum, l) => sum + (Number(l.quantity) || 0), 0);
    if (plan && plan.minQuantity > 1 && totalQty < plan.minQuantity) {
      error(`Plan "${plan.name}" requires minimum quantity of ${plan.minQuantity}. Currently: ${totalQty}`);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        customerId: (isAdmin || isStaff) ? selectedCustomer : user?.id,
        planId: selectedPlanId,
        startDate,
        expiryDate: expiryDate || undefined,
        paymentTerms,
        templateId: createMode === 'template' && selectedTemplateId ? selectedTemplateId : undefined,
        lines: formLines.map((l) => ({
          productId: l.productId,
          variantId: l.variantId || null,
          quantity: Number(l.quantity) || 1,
          unitPrice: Number(l.unitPrice) || 0,
        })),
      };

      await api.post('/subscriptions', payload);
      success('Subscription created successfully');
      setIsCreateOpen(false);
      resetForm();
      fetchSubscriptions();
    } catch (err: any) {
      // Toast interceptor catches message
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedCustomer('');
    setSelectedPlanId('');
    setSelectedTemplateId('');
    setStartDate(new Date().toISOString().split('T')[0]);
    setExpiryDate('');
    setPaymentTerms('NET_30');
    setFormLines([]);
  };

  // State Transition Execution
  const handleTransition = async (targetStatus: string) => {
    if (!selectedSub) return;
    setTransitioning(true);
    try {
      const res = await api.patch(`/subscriptions/${selectedSub.id}/status`, {
        status: targetStatus,
        reason: transitionReason.trim() || undefined,
      });
      success(`Subscription moved to ${targetStatus}`);
      setSelectedSub(res.data.subscription);
      setTransitionReason('');
      fetchSubscriptions();
    } catch (err: any) {
      // Handled by axios toast
    } finally {
      setTransitioning(false);
    }
  };

  // Template Creation
  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName || !templatePlanId) {
      error('Template name and plan are required');
      return;
    }

    try {
      await api.post('/quotation-templates', {
        name: templateName,
        planId: templatePlanId,
        validityDays: Number(templateValidityDays) || 30,
        lines: templateLines.map((l) => ({
          productId: l.productId,
          variantId: l.variantId || null,
          quantity: Number(l.quantity) || 1,
          unitPrice: Number(l.unitPrice) || 0,
        })),
      });

      success('Quotation template created');
      setIsTemplateModalOpen(false);
      setTemplateName('');
      setTemplatePlanId('');
      setTemplateLines([]);
      fetchAuxData();
    } catch (err) {
      // Toast
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    try {
      await api.delete(`/quotation-templates/${id}`);
      success('Template deleted');
      fetchAuxData();
    } catch (err) {
      // Toast
    }
  };

  const totalPages = Math.ceil(totalSubs / limit) || 1;

  // Live total computation for create form
  const computedSubtotal = formLines.reduce(
    (sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarDays className="w-7 h-7 text-indigo-600" />
            {isAdmin || isStaff ? 'Subscription Lifecycle Management' : 'My Subscriptions'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isAdmin || isStaff
              ? 'Manage quotation templates, strict state transitions, customer contracts, and automated renewals.'
              : 'View your plans, billing dates and renewal status.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Tab Pill Switcher */}
          {(isAdmin || isStaff) && (
            <div className="bg-slate-100 p-1 rounded-xl flex items-center text-xs font-semibold text-slate-600">
              <button
                onClick={() => setActiveTab('subscriptions')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeTab === 'subscriptions' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'
                }`}
              >
                Subscriptions
              </button>
              <button
                onClick={() => setActiveTab('templates')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeTab === 'templates' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'
                }`}
              >
                Quotation Templates ({templates.length})
              </button>
            </div>
          )}

          {(isAdmin || isStaff) && (
            <button
              onClick={() => {
                resetForm();
                setIsCreateOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              New Subscription
            </button>
          )}
        </div>
      </div>

      {activeTab === 'subscriptions' ? (
        <>
          {/* Filter Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Status Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
              {(isAdmin || isStaff
                ? ['ALL', 'DRAFT', 'QUOTATION', 'CONFIRMED', 'ACTIVE', 'CLOSED']
                : ['ALL', 'CONFIRMED', 'ACTIVE', 'CLOSED']
              ).map((st) => (
                <button
                  key={st}
                  onClick={() => {
                    setStatusFilter(st);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                    statusFilter === st
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {st === 'ALL' ? 'All Subscriptions' : STATUS_CONFIG[st]?.label || st}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={
                  isAdmin || isStaff
                    ? 'Search number or customer...'
                    : 'Search by subscription number'
                }
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition"
              />
            </div>
          </div>

          {/* Subscriptions Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Subscription #</th>
                    {(isAdmin || isStaff) && <th className="py-3 px-4">Customer</th>}
                    <th className="py-3 px-4">Plan & Billing</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Next Billing Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                        Loading subscriptions...
                      </td>
                    </tr>
                  ) : subscriptions.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin || isStaff ? 6 : 5} className="py-16 text-center text-slate-400">
                        <div className="max-w-sm mx-auto space-y-3">
                          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto">
                            <CalendarDays className="w-6 h-6" />
                          </div>
                          <h3 className="text-base font-bold text-slate-800">No subscriptions found</h3>
                          <p className="text-xs text-slate-500 leading-relaxed">
                            {isAdmin || isStaff
                              ? 'No subscriptions match your current filters. Create a new subscription or adjust your search.'
                              : 'You do not have any active subscriptions yet.'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    subscriptions.map((sub) => {
                      const cfg = STATUS_CONFIG[sub.status] || STATUS_CONFIG.DRAFT;
                      return (
                        <tr key={sub.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 px-4 font-mono font-semibold text-indigo-600">
                            {sub.number}
                          </td>
                          {(isAdmin || isStaff) && (
                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-900">{sub.customer?.name || 'N/A'}</div>
                              <div className="text-slate-400 text-[11px]">{sub.customer?.email}</div>
                            </td>
                          )}
                          <td className="py-3 px-4">
                            <div className="font-medium text-slate-800">{sub.plan?.name}</div>
                            <div className="text-slate-400 text-[11px]">
                              ${sub.plan?.price} / {sub.plan?.billingPeriod?.toLowerCase()}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-current" />
                              {cfg.label}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            {sub.nextBillingDate
                              ? new Date(sub.nextBillingDate).toLocaleDateString()
                              : '—'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => {
                                setSelectedSub(sub);
                                setIsDetailOpen(true);
                              }}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <div>
                Showing {subscriptions.length} of {totalSubs} subscriptions
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition"
                >
                  Previous
                </button>
                <span>
                  Page {page} of {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Quotation Templates View */
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Quotation Templates</h2>
              <p className="text-xs text-slate-500">Pre-built quotes with configured plans and product lines.</p>
            </div>
            <button
              onClick={() => setIsTemplateModalOpen(true)}
              className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition"
            >
              <Plus className="w-4 h-4" />
              Create Template
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((tmpl) => (
              <div
                key={tmpl.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3 relative group"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{tmpl.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Plan: <span className="font-semibold text-slate-700">{tmpl.plan?.name}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteTemplate(tmpl.id)}
                    className="text-slate-400 hover:text-rose-600 transition p-1"
                    title="Delete template"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 text-xs space-y-1">
                  <div className="text-slate-600 flex justify-between">
                    <span>Quotation Validity:</span>
                    <span className="font-semibold text-slate-900">{tmpl.validityDays} days</span>
                  </div>
                  <div className="text-slate-600 flex justify-between">
                    <span>Configured Lines:</span>
                    <span className="font-semibold text-slate-900">{tmpl.lines?.length || 0} items</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setCreateMode('template');
                    handleSelectTemplate(tmpl.id);
                    setIsCreateOpen(true);
                  }}
                  className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5"
                >
                  Create Subscription from this
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DETAIL DRAWER / MODAL */}
      {isDetailOpen && selectedSub && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                    {selectedSub.number}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                      STATUS_CONFIG[selectedSub.status]?.bg
                    } ${STATUS_CONFIG[selectedSub.status]?.text} ${
                      STATUS_CONFIG[selectedSub.status]?.border
                    }`}
                  >
                    {STATUS_CONFIG[selectedSub.status]?.label}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-slate-900 mt-1">
                  Subscription Details
                </h2>
              </div>
              <button
                onClick={() => setIsDetailOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* State Machine Stepper */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
                  Lifecycle State Machine
                </h4>
                <div className="grid grid-cols-5 gap-2 text-center text-xs">
                  {['DRAFT', 'QUOTATION', 'CONFIRMED', 'ACTIVE', 'CLOSED'].map((step, idx) => {
                    const currentStepIdx = ['DRAFT', 'QUOTATION', 'CONFIRMED', 'ACTIVE', 'CLOSED'].indexOf(
                      selectedSub.status
                    );
                    const isDone = idx < currentStepIdx;
                    const isCurrent = idx === currentStepIdx;

                    return (
                      <div key={step} className="flex flex-col items-center">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs mb-1.5 transition ${
                            isCurrent
                              ? 'bg-indigo-600 text-white ring-4 ring-indigo-100'
                              : isDone
                              ? 'bg-emerald-500 text-white'
                              : 'bg-slate-200 text-slate-500'
                          }`}
                        >
                          {isDone ? <CheckCircle className="w-4 h-4" /> : idx + 1}
                        </div>
                        <span
                          className={`font-semibold ${
                            isCurrent ? 'text-indigo-600' : isDone ? 'text-emerald-700' : 'text-slate-400'
                          }`}
                        >
                          {STATUS_CONFIG[step]?.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-2xl p-4 text-xs space-y-2">
                  <h4 className="font-semibold text-slate-700">Contract & Plan</h4>
                  <div className="flex justify-between text-slate-600">
                    <span>Customer:</span>
                    <span className="font-semibold text-slate-900">{selectedSub.customer?.name}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Email:</span>
                    <span className="font-mono text-slate-900">{selectedSub.customer?.email}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Plan:</span>
                    <span className="font-semibold text-slate-900">{selectedSub.plan?.name}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Billing Interval:</span>
                    <span className="font-semibold text-slate-900">{selectedSub.plan?.billingPeriod}</span>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-2xl p-4 text-xs space-y-2">
                  <h4 className="font-semibold text-slate-700">Dates & Terms</h4>
                  <div className="flex justify-between text-slate-600">
                    <span>Start Date:</span>
                    <span className="font-semibold text-slate-900">
                      {new Date(selectedSub.startDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Payment Terms:</span>
                    <span className="font-semibold text-slate-900">{selectedSub.paymentTerms}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Next Billing Date:</span>
                    <span className="font-semibold text-indigo-600">
                      {selectedSub.nextBillingDate
                        ? new Date(selectedSub.nextBillingDate).toLocaleDateString()
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Plan Auto-Close:</span>
                    <span className="font-semibold text-slate-900">
                      {selectedSub.plan?.autoClose ? 'Yes (At Expiry)' : 'No'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Line Items */}
              <div>
                <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Subscription Line Items
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">Product</th>
                        <th className="py-2.5 px-3">Variant</th>
                        <th className="py-2.5 px-3 text-right">Quantity</th>
                        <th className="py-2.5 px-3 text-right">Unit Price</th>
                        <th className="py-2.5 px-3 text-right">Line Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedSub.lines?.map((line, idx) => (
                        <tr key={idx}>
                          <td className="py-2.5 px-3 font-medium text-slate-900">
                            {line.product?.name || line.productId}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500">{line.variant?.name || '—'}</td>
                          <td className="py-2.5 px-3 text-right font-semibold">{line.quantity}</td>
                          <td className="py-2.5 px-3 text-right text-slate-600">${line.unitPrice}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                            ${line.amount?.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Status Transition Action Bar (ADMIN / STAFF) */}
              {(isAdmin || isStaff) && selectedSub.status !== 'CLOSED' && (
                <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-4 space-y-3">
                  <h4 className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    Available State Transitions
                  </h4>

                  <input
                    type="text"
                    placeholder="Optional transition reason / notes..."
                    value={transitionReason}
                    onChange={(e) => setTransitionReason(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />

                  <div className="flex flex-wrap gap-2 pt-1">
                    {selectedSub.status === 'DRAFT' && (
                      <button
                        disabled={transitioning}
                        onClick={() => handleTransition('QUOTATION')}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
                      >
                        Send as Quotation
                      </button>
                    )}

                    {selectedSub.status === 'QUOTATION' && (
                      <button
                        disabled={transitioning}
                        onClick={() => handleTransition('CONFIRMED')}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
                      >
                        Confirm Quotation
                      </button>
                    )}

                    {selectedSub.status === 'CONFIRMED' && (
                      <button
                        disabled={transitioning}
                        onClick={() => handleTransition('ACTIVE')}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
                      >
                        Activate Subscription
                      </button>
                    )}

                    <button
                      disabled={transitioning}
                      onClick={() => handleTransition('CLOSED')}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
                    >
                      Close Subscription
                    </button>
                  </div>
                </div>
              )}

              {/* Status Audit History */}
              <div>
                <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Status Transition Audit History
                </h4>
                <div className="space-y-2">
                  {selectedSub.history?.map((h) => (
                    <div
                      key={h.id}
                      className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs flex items-start justify-between"
                    >
                      <div>
                        <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                          <span>{h.fromStatus ? STATUS_CONFIG[h.fromStatus]?.label : 'Creation'}</span>
                          <ArrowRight className="w-3 h-3 text-slate-400" />
                          <span className="text-indigo-600 font-bold">
                            {STATUS_CONFIG[h.toStatus]?.label || h.toStatus}
                          </span>
                        </div>
                        {h.reason && <p className="text-slate-500 text-[11px] mt-0.5">{h.reason}</p>}
                      </div>
                      <div className="text-right text-[11px] text-slate-400">
                        <div>{new Date(h.changedAt).toLocaleString()}</div>
                        <div className="text-slate-600 font-medium">By: {h.changedBy?.name || 'System'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE SUBSCRIPTION MODAL */}
      {isCreateOpen && (isAdmin || isStaff) && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Create Subscription</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Start from scratch or initialize from a pre-configured quotation template.
                </p>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubscription} className="p-6 space-y-4 text-xs">
              {/* Mode Toggle */}
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setCreateMode('scratch')}
                  className={`flex-1 py-1.5 font-semibold rounded-lg transition ${
                    createMode === 'scratch' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  Custom (From Scratch)
                </button>
                <button
                  type="button"
                  onClick={() => setCreateMode('template')}
                  className={`flex-1 py-1.5 font-semibold rounded-lg transition ${
                    createMode === 'template' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  Start from Quotation Template
                </button>
              </div>

              {/* Template Picker */}
              {createMode === 'template' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Select Quotation Template *
                  </label>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => handleSelectTemplate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    required
                  >
                    <option value="">-- Choose a template --</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} (Valid {t.validityDays}d) - Plan: {t.plan?.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Customer Selector (for Admin/Staff) */}
              {(isAdmin || isStaff) && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Customer Account *
                  </label>
                  <select
                    value={selectedCustomer}
                    onChange={(e) => setSelectedCustomer(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    required
                  >
                    <option value="">-- Select Customer --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Plan Selector */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Subscription Plan *</label>
                <select
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                >
                  <option value="">-- Select Subscription Plan --</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} - ${p.price}/{p.billingPeriod.toLowerCase()} (Min Qty: {p.minQuantity})
                    </option>
                  ))}
                </select>
              </div>

              {/* Dates & Payment Terms */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Expiry Date (Optional)</label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Terms</label>
                  <select
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="IMMEDIATE">Immediate</option>
                    <option value="NET_15">Net 15 Days</option>
                    <option value="NET_30">Net 30 Days</option>
                    <option value="NET_60">Net 60 Days</option>
                  </select>
                </div>
              </div>

              {/* Line Items Editor */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="font-semibold text-slate-700">Contract Line Items</label>
                  <button
                    type="button"
                    onClick={handleAddFormLine}
                    className="text-indigo-600 font-semibold hover:text-indigo-700 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Product Line
                  </button>
                </div>

                <div className="space-y-2">
                  {formLines.map((line, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-50 border border-slate-200 rounded-xl p-3 grid grid-cols-12 gap-2 items-center"
                    >
                      <div className="col-span-5">
                        <select
                          value={line.productId}
                          onChange={(e) => {
                            const p = products.find((prod) => prod.id === e.target.value);
                            const updated = [...formLines];
                            updated[idx].productId = e.target.value;
                            if (p) updated[idx].unitPrice = p.price;
                            setFormLines(updated);
                          }}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded-lg bg-white"
                        >
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} (${p.price})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-3">
                        <input
                          type="number"
                          min="1"
                          placeholder="Qty"
                          value={line.quantity}
                          onChange={(e) => {
                            const updated = [...formLines];
                            updated[idx].quantity = Number(e.target.value);
                            setFormLines(updated);
                          }}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded-lg bg-white"
                        />
                      </div>

                      <div className="col-span-3 font-semibold text-right text-slate-800">
                        ${((Number(line.quantity) || 0) * (Number(line.unitPrice) || 0)).toFixed(2)}
                      </div>

                      <div className="col-span-1 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveFormLine(idx)}
                          className="text-slate-400 hover:text-rose-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {formLines.length === 0 && (
                    <div className="text-center py-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-slate-400">
                      No additional product lines added (Plan base price will apply).
                    </div>
                  )}
                </div>

                {formLines.length > 0 && (
                  <div className="text-right pt-2 font-bold text-slate-900">
                    Estimated Line Total: ${computedSubtotal.toFixed(2)}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-semibold hover:bg-slate-50 text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-sm transition"
                >
                  {isSubmitting ? 'Creating...' : 'Create Subscription'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE TEMPLATE MODAL */}
      {isTemplateModalOpen && (isAdmin || isStaff) && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-900">New Quotation Template</h3>
              <button
                onClick={() => setIsTemplateModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTemplate} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Template Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Standard SaaS 30-Day Quote"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Associated Plan *</label>
                <select
                  value={templatePlanId}
                  onChange={(e) => setTemplatePlanId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                >
                  <option value="">-- Select Plan --</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (${p.price})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Validity Period (Days) *</label>
                <input
                  type="number"
                  min="1"
                  value={templateValidityDays}
                  onChange={(e) => setTemplateValidityDays(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-semibold hover:bg-slate-50 text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold"
                >
                  Save Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
