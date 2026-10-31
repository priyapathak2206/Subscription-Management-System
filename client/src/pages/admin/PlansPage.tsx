import React, { useState, useEffect, useCallback } from 'react';
import {
  Layers,
  Plus,
  Search,
  Edit2,
  Trash2,
  Calendar,
  AlertCircle,
  X,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import api from '../../api/axios.js';
import { useAuth } from '../../context/AuthContext.js';
import { useToast } from '../../context/ToastContext.js';

interface Plan {
  id: string;
  name: string;
  price: number;
  billingPeriod: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  minQuantity: number;
  startDate?: string | null;
  endDate?: string | null;
  autoClose: boolean;
  closable: boolean;
  pausable: boolean;
  renewable: boolean;
  isActive: boolean;
  createdAt: string;
}

export const PlansPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const { success, error } = useToast();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [price, setPrice] = useState<number>(99);
  const [billingPeriod, setBillingPeriod] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [minQuantity, setMinQuantity] = useState<number>(1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [autoClose, setAutoClose] = useState(false);
  const [closable, setClosable] = useState(true);
  const [pausable, setPausable] = useState(true);
  const [renewable, setRenewable] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchPlans = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/plans', {
        params: { page, limit: 10, search: search.trim() || undefined },
      });
      setPlans(response.data?.items || []);
      setTotal(response.data?.pagination?.total || 0);
    } catch {
      // Axios interceptor shows error
    } finally {
      setIsLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const handleOpenCreate = () => {
    setEditingPlan(null);
    setName('');
    setPrice(99);
    setBillingPeriod('MONTHLY');
    setMinQuantity(1);
    setStartDate('');
    setEndDate('');
    setAutoClose(false);
    setClosable(true);
    setPausable(true);
    setRenewable(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setName(plan.name);
    setPrice(plan.price);
    setBillingPeriod(plan.billingPeriod);
    setMinQuantity(plan.minQuantity);
    setStartDate(plan.startDate ? plan.startDate.substring(0, 10) : '');
    setEndDate(plan.endDate ? plan.endDate.substring(0, 10) : '');
    setAutoClose(plan.autoClose);
    setClosable(plan.closable);
    setPausable(plan.pausable);
    setRenewable(plan.renewable);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      error('Plan name is required');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name,
        price: Number(price),
        billingPeriod,
        minQuantity: Number(minQuantity) || 1,
        startDate: startDate ? new Date(startDate).toISOString() : null,
        endDate: endDate ? new Date(endDate).toISOString() : null,
        autoClose,
        closable,
        pausable,
        renewable,
      };

      if (editingPlan) {
        await api.put(`/plans/${editingPlan.id}`, payload);
        success('Subscription plan updated successfully!');
      } else {
        await api.post('/plans', payload);
        success('Subscription plan created successfully!');
      }

      setIsModalOpen(false);
      fetchPlans();
    } catch {
      // Axios interceptor handles toast
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeactivate = async (id: string, currentActive: boolean) => {
    if (!window.confirm(`Are you sure you want to ${currentActive ? 'deactivate' : 'activate'} this plan?`)) {
      return;
    }
    try {
      if (currentActive) {
        await api.delete(`/plans/${id}`);
        success('Plan deactivated.');
      } else {
        await api.put(`/plans/${id}`, { isActive: true });
        success('Plan activated.');
      }
      fetchPlans();
    } catch {
      // Axios interceptor handles toast
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="w-6 h-6 text-indigo-600" />
            Subscription Plans
          </h1>
          <p className="text-sm text-slate-500">
            Define recurring billing periods, minimum quantities, and lifecycle rules (auto-close, pausable, renewable).
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Create Plan
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search plans by name..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
          />
        </div>

        <div className="text-xs text-slate-500">
          Total Plans: <span className="font-semibold">{total}</span>
        </div>
      </div>

      {/* Plans Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/75 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500 tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Plan Name</th>
                <th className="py-3.5 px-4">Price</th>
                <th className="py-3.5 px-4">Billing Period</th>
                <th className="py-3.5 px-4">Min Qty</th>
                <th className="py-3.5 px-4">Lifecycle Rules</th>
                <th className="py-3.5 px-4">Availability</th>
                <th className="py-3.5 px-4">Status</th>
                {isAdmin && <th className="py-3.5 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading plans...
                  </td>
                </tr>
              ) : plans.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    No subscription plans found.
                  </td>
                </tr>
              ) : (
                plans.map((plan) => (
                  <tr key={plan.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {plan.name}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-indigo-600">
                      ${plan.price.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {plan.billingPeriod}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-700">
                      {plan.minQuantity} unit{plan.minQuantity > 1 ? 's' : ''}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1 text-[11px]">
                        <span
                          className={`px-1.5 py-0.5 rounded font-medium border ${
                            plan.closable ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-400 border-slate-200'
                          }`}
                        >
                          Closable
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded font-medium border ${
                            plan.pausable ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-400 border-slate-200'
                          }`}
                        >
                          Pausable
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded font-medium border ${
                            plan.renewable ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-400 border-slate-200'
                          }`}
                        >
                          Renewable
                        </span>
                        {plan.autoClose && (
                          <span className="px-1.5 py-0.5 rounded font-medium bg-amber-50 text-amber-700 border border-amber-200">
                            AutoClose
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500">
                      {plan.startDate ? new Date(plan.startDate).toLocaleDateString() : 'Immediate'}
                      {' - '}
                      {plan.endDate ? new Date(plan.endDate).toLocaleDateString() : 'Indefinite'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          plan.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {plan.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button
                          onClick={() => handleOpenEdit(plan)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                          title="Edit plan"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeactivate(plan.id, plan.isActive)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title={plan.isActive ? 'Deactivate' : 'Activate'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Plan Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="font-bold text-slate-900 text-lg">
                {editingPlan ? 'Edit Subscription Plan' : 'Create New Plan'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Plan Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Growth Pro Annual"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Price ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={price}
                    onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Billing Period *
                  </label>
                  <select
                    value={billingPeriod}
                    onChange={(e) => setBillingPeriod(e.target.value as any)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                  >
                    <option value="DAILY">DAILY</option>
                    <option value="WEEKLY">WEEKLY</option>
                    <option value="MONTHLY">MONTHLY</option>
                    <option value="YEARLY">YEARLY</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Min Quantity (Units) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={minQuantity}
                    onChange={(e) => setMinQuantity(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    End Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Per-Plan Boolean Flags */}
              <div className="border-t border-slate-200 pt-4 space-y-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Plan Lifecycle & Control Flags
                </h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <label className="flex items-center gap-2 p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={closable}
                      onChange={(e) => setClosable(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <span className="font-semibold text-slate-900 block">Closable</span>
                      <span className="text-slate-500 text-[11px]">Can be cancelled by user</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pausable}
                      onChange={(e) => setPausable(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <span className="font-semibold text-slate-900 block">Pausable</span>
                      <span className="text-slate-500 text-[11px]">Subscription can pause</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={renewable}
                      onChange={(e) => setRenewable(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <span className="font-semibold text-slate-900 block">Renewable</span>
                      <span className="text-slate-500 text-[11px]">Auto or manual renewal</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoClose}
                      onChange={(e) => setAutoClose(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <span className="font-semibold text-slate-900 block">Auto-Close</span>
                      <span className="text-slate-500 text-[11px]">Terminates at end date</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : editingPlan ? 'Update Plan' : 'Save Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

