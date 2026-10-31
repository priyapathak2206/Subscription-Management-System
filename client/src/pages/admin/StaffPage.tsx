import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  AlertCircle,
  X,
  Mail,
  User as UserIcon,
  Lock,
} from 'lucide-react';
import api from '../../api/axios.js';
import { useAuth } from '../../context/AuthContext.js';
import { useToast } from '../../context/ToastContext.js';
import { LivePasswordChecklist } from '../../components/common/LivePasswordChecklist.js';

interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: 'STAFF';
  isActive: boolean;
  createdAt: string;
}

export const StaffPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const { success, error } = useToast();

  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fetchStaff = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/users/staff', {
        params: { page, limit: 10, search: search.trim() || undefined },
      });
      setStaffList(response.data?.items || []);
      setTotal(response.data?.pagination?.total || 0);
    } catch {
      // Axios interceptor shows error
    } finally {
      setIsLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const handleOpenCreate = () => {
    setName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setIsModalOpen(true);
  };

  const isLengthValid = password.length >= 9;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const isFormValid = isLengthValid && hasUppercase && hasLowercase && hasSpecial && passwordsMatch && name.length >= 2 && email.includes('@');

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) {
      error('Please satisfy all password rules and form requirements.');
      return;
    }

    setIsSaving(true);
    try {
      await api.post('/users/staff', {
        name,
        email,
        password,
      });

      success(`Staff member ${name} created successfully!`);
      setIsModalOpen(false);
      fetchStaff();
    } catch {
      // Axios interceptor shows error
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (staff: StaffUser) => {
    const newStatus = !staff.isActive;
    const confirmMsg = `Are you sure you want to ${newStatus ? 'activate' : 'deactivate'} staff member "${staff.name}"?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await api.patch(`/users/staff/${staff.id}/status`, {
        isActive: newStatus,
      });
      success(`Staff member "${staff.name}" ${newStatus ? 'activated' : 'deactivated'}.`);
      fetchStaff();
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
            <Users className="w-6 h-6 text-indigo-600" />
            Staff Management
          </h1>
          <p className="text-sm text-slate-500">
            Create internal staff accounts, monitor operational access, and activate or deactivate accounts.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Add Staff Member
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search staff by name or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
          />
        </div>

        <div className="text-xs text-slate-500">
          Staff Members: <span className="font-semibold">{total}</span>
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/75 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500 tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Staff Member</th>
                <th className="py-3.5 px-4">Email</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Member Since</th>
                <th className="py-3.5 px-4">Status</th>
                {isAdmin && <th className="py-3.5 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading staff members...
                  </td>
                </tr>
              ) : staffList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    No staff members found matching query.
                  </td>
                </tr>
              ) : (
                staffList.map((staff) => (
                  <tr key={staff.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs shrink-0">
                          {staff.name.charAt(0).toUpperCase()}
                        </div>
                        <span>{staff.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-600">
                      {staff.email}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        {staff.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500">
                      {new Date(staff.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          staff.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {staff.isActive ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleToggleStatus(staff)}
                          className={`text-xs px-3 py-1 rounded-lg font-semibold border transition ${
                            staff.isActive
                              ? 'border-rose-200 text-rose-700 hover:bg-rose-50'
                              : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                          }`}
                        >
                          {staff.isActive ? 'Deactivate' : 'Activate'}
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

      {/* Create Staff Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="font-bold text-slate-900 text-base">
                Create New Staff Account
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Full Name *
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Staff Full Name"
                    className="w-full pl-9 pr-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="staff@brightloop.com"
                    className="w-full pl-9 pr-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Temporary Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 9 chars, upper, lower, special"
                    className="w-full pl-9 pr-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Confirm Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full pl-9 pr-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Password checklist */}
              <LivePasswordChecklist password={password} confirmPassword={confirmPassword} />

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
                  disabled={isSaving || !isFormValid}
                  className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition disabled:opacity-50"
                >
                  {isSaving ? 'Creating...' : 'Create Staff User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

