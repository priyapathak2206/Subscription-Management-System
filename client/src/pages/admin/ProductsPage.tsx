import React, { useState, useEffect, useCallback } from 'react';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronUp,
  Tag,
  DollarSign,
  AlertCircle,
  X,
  Layers,
} from 'lucide-react';
import api from '../../api/axios.js';
import { useAuth } from '../../context/AuthContext.js';
import { useToast } from '../../context/ToastContext.js';

interface Variant {
  id?: string;
  attribute: string;
  value: string;
  extraPrice: number;
  finalPrice?: number;
}

interface Product {
  id: string;
  name: string;
  type: string;
  salesPrice: number;
  costPrice: number;
  notes?: string | null;
  isActive: boolean;
  createdAt: string;
  variants: Variant[];
}

export const ProductsPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const { success, error } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [type, setType] = useState('SOFTWARE');
  const [salesPrice, setSalesPrice] = useState<number>(0);
  const [costPrice, setCostPrice] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [variants, setVariants] = useState<Variant[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/products', {
        params: { page, limit: 10, search: search.trim() || undefined },
      });
      setProducts(response.data?.items || []);
      setTotal(response.data?.pagination?.total || 0);
    } catch {
      // Axios interceptor shows error
    } finally {
      setIsLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setName('');
    setType('SOFTWARE');
    setSalesPrice(100);
    setCostPrice(50);
    setNotes('');
    setVariants([
      { attribute: 'Brand', value: 'Standard', extraPrice: 0 },
    ]);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (prod: Product) => {
    setEditingProduct(prod);
    setName(prod.name);
    setType(prod.type);
    setSalesPrice(prod.salesPrice);
    setCostPrice(prod.costPrice);
    setNotes(prod.notes || '');
    setVariants(prod.variants.map((v) => ({
      id: v.id,
      attribute: v.attribute,
      value: v.value,
      extraPrice: v.extraPrice,
    })));
    setIsModalOpen(true);
  };

  const handleAddVariantRow = () => {
    setVariants((prev) => [
      ...prev,
      { attribute: 'Option', value: 'New Variant', extraPrice: 0 },
    ]);
  };

  const handleRemoveVariantRow = (idx: number) => {
    setVariants((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleVariantChange = (idx: number, field: keyof Variant, val: any) => {
    setVariants((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      error('Product name is required');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name,
        type,
        salesPrice: Number(salesPrice),
        costPrice: Number(costPrice),
        notes: notes.trim() || null,
        variants: variants.map((v) => ({
          attribute: v.attribute,
          value: v.value,
          extraPrice: Number(v.extraPrice) || 0,
        })),
      };

      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}`, payload);
        success('Product and variants updated successfully!');
      } else {
        await api.post('/products', payload);
        success('Product created successfully!');
      }

      setIsModalOpen(false);
      fetchProducts();
    } catch {
      // Axios interceptor shows error
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeactivate = async (id: string, currentActive: boolean) => {
    if (!window.confirm(`Are you sure you want to ${currentActive ? 'deactivate' : 'activate'} this product?`)) {
      return;
    }
    try {
      if (currentActive) {
        await api.delete(`/products/${id}`);
        success('Product deactivated.');
      } else {
        await api.put(`/products/${id}`, { isActive: true });
        success('Product activated.');
      }
      fetchProducts();
    } catch {
      // Axios interceptor shows error
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-indigo-600" />
            Products & Variants
          </h1>
          <p className="text-sm text-slate-500">
            Manage billable items, software subscriptions, and variant-based pricing models.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Add New Product
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search products by name or notes..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
          />
        </div>

        <div className="text-xs text-slate-500">
          Showing <span className="font-semibold">{products.length}</span> of <span className="font-semibold">{total}</span> total
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/75 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500 tracking-wider">
              <tr>
                <th className="py-3.5 px-4 w-10"></th>
                <th className="py-3.5 px-4">Product Name</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Base Sales Price</th>
                <th className="py-3.5 px-4">Cost Price</th>
                <th className="py-3.5 px-4">Variants</th>
                <th className="py-3.5 px-4">Status</th>
                {isAdmin && <th className="py-3.5 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading product catalog...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    No products found matching criteria.
                  </td>
                </tr>
              ) : (
                products.map((product) => {
                  const isExpanded = expandedRow === product.id;
                  return (
                    <React.Fragment key={product.id}>
                      <tr className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <button
                            onClick={() => setExpandedRow(isExpanded ? null : product.id)}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                            title="Toggle variants breakdown"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-900">
                          <div>{product.name}</div>
                          {product.notes && (
                            <div className="text-xs text-slate-400 font-normal truncate max-w-xs">
                              {product.notes}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                            <Tag className="w-3 h-3 text-slate-400" />
                            {product.type}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-900">
                          ${product.salesPrice.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">
                          ${product.costPrice.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700">
                            <Layers className="w-3 h-3" />
                            {product.variants.length} variant{product.variants.length === 1 ? '' : 's'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                              product.isActive
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {product.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        {isAdmin && (
                          <td className="py-3.5 px-4 text-right space-x-2">
                            <button
                              onClick={() => handleOpenEdit(product)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                              title="Edit product"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeactivate(product.id, product.isActive)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title={product.isActive ? 'Deactivate' : 'Activate'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>

                      {/* Expanded Variants Row */}
                      {isExpanded && (
                        <tr className="bg-slate-50/50">
                          <td colSpan={8} className="p-4 pl-12 border-b border-slate-200">
                            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                  Variants & Final Price Calculation Formula
                                </h3>
                                <span className="text-xs text-slate-400 italic">
                                  Formula: Final Price = Base Sales Price (${product.salesPrice.toFixed(2)}) + Extra Price
                                </span>
                              </div>

                              {product.variants.length === 0 ? (
                                <p className="text-xs text-slate-400">No variants defined for this product.</p>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                  {product.variants.map((v, vIdx) => {
                                    const finalP = v.finalPrice ?? product.salesPrice + v.extraPrice;
                                    return (
                                      <div
                                        key={vIdx}
                                        className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 flex flex-col justify-between"
                                      >
                                        <div className="flex items-start justify-between">
                                          <div>
                                            <span className="text-[10px] uppercase font-bold text-slate-400 block">
                                              {v.attribute}
                                            </span>
                                            <span className="text-sm font-bold text-slate-900">{v.value}</span>
                                          </div>
                                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                                            ${finalP.toFixed(2)}
                                          </span>
                                        </div>

                                        <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-500">
                                          <span>Base: ${product.salesPrice.toFixed(2)}</span>
                                          <span>Extra: +${v.extraPrice.toFixed(2)}</span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > 10 && (
          <div className="p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <span>
              Page {page} of {Math.ceil(total / 10)}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={page >= Math.ceil(total / 10)}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="font-bold text-slate-900 text-lg">
                {editingProduct ? 'Edit Product & Variants' : 'Add New Product'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Enterprise ERP Suite"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Product Type *
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                  >
                    <option value="SOFTWARE">SOFTWARE</option>
                    <option value="SERVICE">SERVICE</option>
                    <option value="INFRASTRUCTURE">INFRASTRUCTURE</option>
                    <option value="SUPPORT">SUPPORT</option>
                    <option value="HARDWARE">HARDWARE</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Base Sales Price ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={salesPrice}
                    onChange={(e) => setSalesPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Cost Price ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={costPrice}
                    onChange={(e) => setCostPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Notes
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional description or SKU info"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Variants Dynamic Editor */}
              <div className="border-t border-slate-200 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Product Variants
                    </h3>
                    <p className="text-xs text-slate-400">
                      e.g. Attribute: "Brand", Value: "Odoo", Extra Price: +$560.00
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddVariantRow}
                    className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1 transition"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Variant
                  </button>
                </div>

                {variants.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">
                    No variants added. Product will have standard base price only.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {variants.map((v, idx) => {
                      const finalPreview = (Number(salesPrice) || 0) + (Number(v.extraPrice) || 0);
                      return (
                        <div
                          key={idx}
                          className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                        >
                          <div className="w-1/3">
                            <input
                              type="text"
                              required
                              placeholder="Attribute (e.g. Brand)"
                              value={v.attribute}
                              onChange={(e) => handleVariantChange(idx, 'attribute', e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                            />
                          </div>
                          <div className="w-1/3">
                            <input
                              type="text"
                              required
                              placeholder="Value (e.g. Odoo)"
                              value={v.value}
                              onChange={(e) => handleVariantChange(idx, 'value', e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                            />
                          </div>
                          <div className="w-1/4">
                            <div className="relative">
                              <span className="absolute left-2 top-1.5 text-slate-400">+$</span>
                              <input
                                type="number"
                                step="0.01"
                                placeholder="Extra"
                                value={v.extraPrice}
                                onChange={(e) => handleVariantChange(idx, 'extraPrice', parseFloat(e.target.value) || 0)}
                                className="w-full pl-6 pr-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                              />
                            </div>
                          </div>

                          <div className="text-[11px] font-bold text-emerald-700 shrink-0 w-16 text-right">
                            =${finalPreview.toFixed(2)}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveVariantRow(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded"
                            title="Remove variant"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
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
                  {isSaving ? 'Saving...' : editingProduct ? 'Update Product' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

