import React, { useState, useEffect, useCallback } from 'react';
import {
  Receipt,
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertCircle,
  X,
  Percent,
} from 'lucide-react';
import api from '../../api/axios.js';
import { useAuth } from '../../context/AuthContext.js';
import { useToast } from '../../context/ToastContext.js';

interface Tax {
  id: string;
  name: string;
  ratePercent: number;
  active: boolean;
  createdAt: string;
}

export const TaxesPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const { success, error } = useToast();

  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTax, setEditingTax] = useState<Tax | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [ratePercent, setRatePercent] = useState<number>(18);
  const [active, setActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Interactive Tax Test Calculator
  const [testAmount, setTestAmount] = useState<number>(100);

  const fetchTaxes = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/taxes', {
        params: { search: search.trim() || undefined },
      });
      setTaxes(response.data?.items || []);
      setTotal(response.data?.pagination?.total || 0);
    } catch {
      // Axios interceptor shows error
    } finally {
      setIsLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchTaxes();
  }, [fetchTaxes]);

  const handleOpenCreate = () => {
    setEditingTax(null);
    setName('');
    setRatePercent(18);
    setActive(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (tax: Tax) => {
    setEditingTax(tax);
    setName(tax.name);
    setRatePercent(tax.ratePercent);
    setActive(tax.active);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      error('Tax rate name is required');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name,
        ratePercent: Number(ratePercent),
        active,
      };

      if (editingTax) {
        await api.put(`/taxes/${editingTax.id}`, payload);
        success('Tax rate updated successfully!');
      } else {
        await api.post('/taxes', payload);
        success('Tax rate created successfully!');
      }

      setIsModalOpen(false);
      fetchTaxes();
    } catch {
      // Axios interceptor handles toast
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeactivate = async (id: string, currentActive: boolean) => {
    if (!window.confirm(`Are you sure you want to ${currentActive ? 'deactivate' : 'activate'} this tax rate?`)) {
      return;
    }
    try {
      if (currentActive) {
        await api.delete(`/taxes/${id}`);
        success('Tax rate deactivated.');
      } else {
        await api.put(`/taxes/${id}`, { active: true });
        success('Tax rate activated.');
      }
      fetchTaxes();
    } catch {
      // Axios interceptor handles toast
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Receipt className="w-6 h-6 text-indigo-600" />
            Tax Rates & Rules
          </h1>
          <p className="text-sm text-slate-500">
            Define applicable VAT, GST, and sales taxes with shared precision rounding calculations.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Add Tax Rate
          </button>
        )}
      </div>

      {/* Calculator Sandbox & Search Widget */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search tax rules by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
            />
          </div>
        </div>

        {/* Live Tax Simulator */}
        <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider block">
              Calculate Preview
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-xs text-slate-500">Base: $</span>
              <input
                type="number"
                min="0"
                value={testAmount}
                onChange={(e) => setTestAmount(parseFloat(e.target.value) || 0)}
                className="w-20 px-2 py-0.5 text-xs bg-white border border-indigo-200 rounded font-semibold text-indigo-900"
              />
            </div>
          </div>
          <div className="text-right text-xs text-indigo-700">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Applied Tax Example</span>
            <span className="font-bold text-sm text-indigo-950">
              ${(testAmount * 0.18).toFixed(2)} @ 18%
            </span>
          </div>
        </div>
      </div>

      {/* Taxes Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/75 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500 tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Tax Name</th>
                <th className="py-3.5 px-4">Rate Percentage</th>
                <th className="py-3.5 px-4">Sample Tax on $100</th>
                <th className="py-3.5 px-4">Status</th>
                {isAdmin && <th className="py-3.5 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading tax rates...
                  </td>
                </tr>
              ) : taxes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    No tax rates configured.
                  </td>
                </tr>
              ) : (
                taxes.map((tax) => {
                  const sampleTax = tax.active ? (testAmount * tax.ratePercent) / 100 : 0;
                  return (
                    <tr key={tax.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {tax.name}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-indigo-600">
                        {tax.ratePercent.toFixed(2)}%
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-700">
                        ${sampleTax.toFixed(2)} {testAmount !== 100 ? `(on $${testAmount})` : ''}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                            tax.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {tax.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="py-3.5 px-4 text-right space-x-2">
                          <button
                            onClick={() => handleOpenEdit(tax)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                            title="Edit tax"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeactivate(tax.id, tax.active)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title={tax.active ? 'Deactivate' : 'Activate'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Tax Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="font-bold text-slate-900 text-base">
                {editingTax ? 'Edit Tax Rate' : 'New Tax Rate'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Tax Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Standard GST / VAT"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Rate Percentage (%) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    required
                    value={ratePercent}
                    onChange={(e) => setRatePercent(parseFloat(e.target.value) || 0)}
                    className="w-full pl-3.5 pr-8 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  <Percent className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-semibold text-slate-800">
                    Active (applicable to new invoices)
                  </span>
                </label>
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
                  {isSaving ? 'Saving...' : editingTax ? 'Update Tax' : 'Create Tax'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

