import React, { useState, useEffect, useCallback } from 'react';
import {
  Percent,
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertCircle,
  X,
  Package,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';
import api from '../../api/axios.js';
import { useAuth } from '../../context/AuthContext.js';
import { useToast } from '../../context/ToastContext.js';

interface ProductRef {
  id: string;
  name: string;
  salesPrice: number;
}

interface Discount {
  id: string;
  name: string;
  type: 'FIXED' | 'PERCENT';
  value: number;
  minPurchase?: number | null;
  minQuantity?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  usageLimit?: number | null;
  usedCount: number;
  appliesTo: 'PRODUCT' | 'SUBSCRIPTION';
  isActive: boolean;
  createdAt: string;
  discountProducts: Array<{
    productId: string;
    product: ProductRef;
  }>;
}

export const DiscountsPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const { success, error } = useToast();

  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Available products for selection in PRODUCT discount mode
  const [availableProducts, setAvailableProducts] = useState<ProductRef[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [type, setType] = useState<'FIXED' | 'PERCENT'>('PERCENT');
  const [value, setValue] = useState<number>(10);
  const [appliesTo, setAppliesTo] = useState<'PRODUCT' | 'SUBSCRIPTION'>('SUBSCRIPTION');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [minPurchase, setMinPurchase] = useState<string>('');
  const [minQuantity, setMinQuantity] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [usageLimit, setUsageLimit] = useState<string>('');
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchDiscounts = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/discounts', {
        params: { page, limit: 10, search: search.trim() || undefined },
      });
      setDiscounts(response.data?.items || []);
      setTotal(response.data?.pagination?.total || 0);
    } catch {
      // Axios interceptor shows error
    } finally {
      setIsLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchDiscounts();
  }, [fetchDiscounts]);

  // Load available products for selection dropdown
  useEffect(() => {
    api.get('/products?limit=100').then((res) => {
      setAvailableProducts(res.data?.items || []);
    }).catch(() => {});
  }, []);

  const handleOpenCreate = () => {
    setEditingDiscount(null);
    setName('');
    setType('PERCENT');
    setValue(15);
    setAppliesTo('SUBSCRIPTION');
    setSelectedProductIds([]);
    setMinPurchase('');
    setMinQuantity('');
    setStartDate('');
    setEndDate('');
    setUsageLimit('100');
    setIsActive(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (d: Discount) => {
    setEditingDiscount(d);
    setName(d.name);
    setType(d.type);
    setValue(d.value);
    setAppliesTo(d.appliesTo);
    setSelectedProductIds(d.discountProducts?.map((dp) => dp.productId) || []);
    setMinPurchase(d.minPurchase !== null && d.minPurchase !== undefined ? String(d.minPurchase) : '');
    setMinQuantity(d.minQuantity !== null && d.minQuantity !== undefined ? String(d.minQuantity) : '');
    setStartDate(d.startDate ? d.startDate.substring(0, 10) : '');
    setEndDate(d.endDate ? d.endDate.substring(0, 10) : '');
    setUsageLimit(d.usageLimit !== null && d.usageLimit !== undefined ? String(d.usageLimit) : '');
    setIsActive(d.isActive);
    setIsModalOpen(true);
  };

  const handleToggleProduct = (prodId: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(prodId) ? prev.filter((id) => id !== prodId) : [...prev, prodId]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      error('Discount name is required');
      return;
    }
    if (appliesTo === 'PRODUCT' && selectedProductIds.length === 0) {
      error('Please select at least one product when applying discount to specific products');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name,
        type,
        value: Number(value),
        appliesTo,
        productIds: appliesTo === 'PRODUCT' ? selectedProductIds : [],
        minPurchase: minPurchase ? Number(minPurchase) : null,
        minQuantity: minQuantity ? parseInt(minQuantity, 10) : null,
        startDate: startDate ? new Date(startDate).toISOString() : null,
        endDate: endDate ? new Date(endDate).toISOString() : null,
        usageLimit: usageLimit ? parseInt(usageLimit, 10) : null,
        isActive,
      };

      if (editingDiscount) {
        await api.put(`/discounts/${editingDiscount.id}`, payload);
        success('Discount updated successfully!');
      } else {
        await api.post('/discounts', payload);
        success('Discount created successfully!');
      }

      setIsModalOpen(false);
      fetchDiscounts();
    } catch {
      // Axios interceptor shows error
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeactivate = async (id: string, currentActive: boolean) => {
    if (!window.confirm(`Are you sure you want to ${currentActive ? 'deactivate' : 'activate'} this discount?`)) {
      return;
    }
    try {
      if (currentActive) {
        await api.delete(`/discounts/${id}`);
        success('Discount deactivated.');
      } else {
        await api.put(`/discounts/${id}`, { isActive: true });
        success('Discount activated.');
      }
      fetchDiscounts();
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
            <Percent className="w-6 h-6 text-indigo-600" />
            Discounts & Promo Engine
          </h1>
          <p className="text-sm text-slate-500">
            Configure percent/fixed price deductions, minimum purchases, usage limits, and product eligibility.
          </p>
        </div>

        {isAdmin ? (
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Create Discount
          </button>
        ) : (
          <div className="text-xs text-slate-400 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
            Read-only (Staff Mode)
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search promo codes and discount names..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
          />
        </div>

        <div className="text-xs text-slate-500">
          Total Discounts: <span className="font-semibold">{total}</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/75 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500 tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Name</th>
                <th className="py-3.5 px-4">Value</th>
                <th className="py-3.5 px-4">Applies To</th>
                <th className="py-3.5 px-4">Min Reqs</th>
                <th className="py-3.5 px-4">Usage Limit</th>
                <th className="py-3.5 px-4">Valid Period</th>
                <th className="py-3.5 px-4">Status</th>
                {isAdmin && <th className="py-3.5 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading discounts...
                  </td>
                </tr>
              ) : discounts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    No discounts found.
                  </td>
                </tr>
              ) : (
                discounts.map((discount) => {
                  const isExhausted = discount.usageLimit !== null && discount.usedCount >= discount.usageLimit;
                  return (
                    <tr key={discount.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {discount.name}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-indigo-600">
                          {discount.type === 'PERCENT' ? `${discount.value}%` : `$${discount.value.toFixed(2)}`}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold ${
                            discount.appliesTo === 'SUBSCRIPTION'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          {discount.appliesTo === 'SUBSCRIPTION' ? 'Subscription' : 'Products'}
                        </span>
                        {discount.appliesTo === 'PRODUCT' && discount.discountProducts?.length > 0 && (
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {discount.discountProducts.length} product{discount.discountProducts.length > 1 ? 's' : ''} linked
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {discount.minPurchase && <div>Min: ${discount.minPurchase.toFixed(2)}</div>}
                        {discount.minQuantity && <div>Qty: {discount.minQuantity}+</div>}
                        {!discount.minPurchase && !discount.minQuantity && <span className="text-slate-400">None</span>}
                      </td>
                      <td className="py-3.5 px-4">
                        {discount.usageLimit !== null ? (
                          <div className="space-y-1">
                            <span className="text-xs font-semibold text-slate-700">
                              {discount.usedCount} / {discount.usageLimit}
                            </span>
                            {isExhausted && (
                              <span className="text-[10px] font-bold text-rose-600 block">Exhausted</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Unlimited</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {discount.startDate ? new Date(discount.startDate).toLocaleDateString() : 'Now'}
                        {' - '}
                        {discount.endDate ? new Date(discount.endDate).toLocaleDateString() : 'Forever'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                            discount.isActive && !isExhausted
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {discount.isActive ? (isExhausted ? 'Exhausted' : 'Active') : 'Inactive'}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="py-3.5 px-4 text-right space-x-2">
                          <button
                            onClick={() => handleOpenEdit(discount)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                            title="Edit discount"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeactivate(discount.id, discount.isActive)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title={discount.isActive ? 'Deactivate' : 'Activate'}
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

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="font-bold text-slate-900 text-base">
                {editingDiscount ? 'Edit Discount Rule' : 'New Discount / Promo Code'}
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
                    Discount Name / Campaign *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Black Friday 20% or $50 Welcome Credit"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Discount Type *
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                  >
                    <option value="PERCENT">PERCENT (%)</option>
                    <option value="FIXED">FIXED AMOUNT ($)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Value {type === 'PERCENT' ? '(%)' : '($)'} *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={type === 'PERCENT' ? 100 : undefined}
                    required
                    value={value}
                    onChange={(e) => setValue(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Applies To Target *
                  </label>
                  <select
                    value={appliesTo}
                    onChange={(e) => setAppliesTo(e.target.value as any)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                  >
                    <option value="SUBSCRIPTION">Entire Subscription (All lines)</option>
                    <option value="PRODUCT">Specific Products Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Usage Limit (Max Uses)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Leave blank for unlimited"
                    value={usageLimit}
                    onChange={(e) => setUsageLimit(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Min Purchase ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Optional threshold"
                    value={minPurchase}
                    onChange={(e) => setMinPurchase(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Min Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Optional item count"
                    value={minQuantity}
                    onChange={(e) => setMinQuantity(e.target.value)}
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

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Product selector if appliesTo === 'PRODUCT' */}
              {appliesTo === 'PRODUCT' && (
                <div className="border border-indigo-100 bg-indigo-50/50 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
                      Select Eligible Products ({selectedProductIds.length} selected)
                    </span>
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                    {availableProducts.map((prod) => {
                      const isSelected = selectedProductIds.includes(prod.id);
                      return (
                        <label
                          key={prod.id}
                          className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs cursor-pointer border ${
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <span className="font-medium">{prod.name}</span>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleProduct(prod.id)}
                            className="hidden"
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-semibold text-slate-800">
                    Active (eligible for invoice calculation engine)
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
                  {isSaving ? 'Saving...' : editingDiscount ? 'Update Discount' : 'Create Discount'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

