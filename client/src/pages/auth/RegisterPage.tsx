import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, ArrowRight, Lock, Mail, User } from 'lucide-react';
import api from '../../api/axios.js';
import { useAuth } from '../../context/AuthContext.js';
import { useToast } from '../../context/ToastContext.js';
import { LivePasswordChecklist } from '../../components/common/LivePasswordChecklist.js';

export const RegisterPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();

  // Validate password locally before submit
  const isLengthValid = password.length >= 9;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const isFormValid = isLengthValid && hasUppercase && hasLowercase && hasSpecial && passwordsMatch && name.length >= 2 && email.includes('@');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isLengthValid) {
      error('Password must be more than 8 characters (minimum 9).');
      return;
    }
    if (!hasUppercase) {
      error('Password must contain at least one uppercase letter.');
      return;
    }
    if (!hasLowercase) {
      error('Password must contain at least one lowercase letter.');
      return;
    }
    if (!hasSpecial) {
      error('Password must contain at least one special character.');
      return;
    }
    if (!passwordsMatch) {
      error('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await api.post('/auth/register', {
        name,
        email,
        password,
      });

      const { token, user } = response.data;
      login(token, user);
      success('Account created successfully! Welcome to Brightloop.');
      navigate('/portal', { replace: true });
    } catch {
      // Axios interceptor handles error toast
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
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Create Customer Account</h2>
          <p className="text-sm text-slate-500">Sign up for Brightloop Subscription Services</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Full Name or Company
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Acme Corp or Jane Doe"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
              />
            </div>
          </div>

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
                placeholder="billing@company.com"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 9 characters, upper, lower, special"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Confirm Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
              />
            </div>
          </div>

          {/* Interactive Live Password Rule Checklist */}
          <LivePasswordChecklist password={password} confirmPassword={confirmPassword} />

          <button
            type="submit"
            disabled={isSubmitting || !isFormValid}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Register Account</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-slate-100">
          <p className="text-xs text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="text-indigo-600 font-semibold hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

