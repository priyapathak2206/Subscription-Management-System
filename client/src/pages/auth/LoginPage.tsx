import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Building2, ArrowRight, Lock, Mail } from 'lucide-react';
import api from '../../api/axios.js';
import { useAuth } from '../../context/AuthContext.js';
import { useToast } from '../../context/ToastContext.js';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const { success } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/products';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await api.post('/auth/login', {
        email,
        password,
      });

      const { token, user } = response.data;
      login(token, user);
      success(`Welcome back, ${user.name}!`);

      if (user.role === 'CUSTOMER') {
        navigate('/portal', { replace: true });
      } else {
        navigate(from === '/login' ? '/products' : from, { replace: true });
      }
    } catch {
      // Error is caught and surfaced via Axios interceptor toast
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200/80 p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-md shadow-indigo-600/30">
            <Building2 className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Sign in to Brightloop</h2>
          <p className="text-sm text-slate-500">Subscription & Billing Management System</p>
        </div>

        {/* Demo Credentials Helper Pill */}
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-xs text-indigo-900">
          <p className="font-semibold mb-1">Quick Demo Sign-in:</p>
          <div className="flex flex-wrap gap-2 text-[11px]">
            <button
              type="button"
              onClick={() => {
                setEmail('admin@brightloop.com');
                setPassword('Admin@1234');
              }}
              className="px-2 py-1 bg-white border border-indigo-200 rounded-md hover:bg-indigo-100 font-medium transition"
            >
              Admin Demo
            </button>
            <button
              type="button"
              onClick={() => {
                setEmail('staff@brightloop.com');
                setPassword('Staff@1234');
              }}
              className="px-2 py-1 bg-white border border-indigo-200 rounded-md hover:bg-indigo-100 font-medium transition"
            >
              Staff Demo
            </button>
            <button
              type="button"
              onClick={() => {
                setEmail('cust1@acmecorp.com');
                setPassword('Customer@1234');
              }}
              className="px-2 py-1 bg-white border border-indigo-200 rounded-md hover:bg-indigo-100 font-medium transition"
            >
              Customer Demo
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Password
              </label>
              <Link
                to="/forgot-password"
                className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Sign in</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-slate-100">
          <p className="text-xs text-slate-500">
            Don't have an account?{' '}
            <Link to="/register" className="text-indigo-600 font-semibold hover:underline">
              Register as Customer
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

