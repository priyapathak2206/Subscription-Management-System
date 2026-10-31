import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Building2, ArrowRight, Lock, CheckCircle2 } from 'lucide-react';
import api from '../../api/axios.js';
import { useToast } from '../../context/ToastContext.js';
import { LivePasswordChecklist } from '../../components/common/LivePasswordChecklist.js';

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const emailParam = searchParams.get('email') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { success, error } = useToast();
  const navigate = useNavigate();

  const isLengthValid = password.length >= 9;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const isFormValid = isLengthValid && hasUppercase && hasLowercase && hasSpecial && passwordsMatch && !!token;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      error('Reset token is missing from the URL. Please re-open the link from your email.');
      return;
    }
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
      const response = await api.post('/auth/reset-password', {
        token,
        password,
      });

      success(response.data?.message || 'Password reset successful!');
      setIsSuccess(true);
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 3000);
    } catch {
      // Axios interceptor shows error
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200/80 p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-md shadow-indigo-600/30">
            <Building2 className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Set New Password</h2>
          <p className="text-sm text-slate-500">
            {emailParam ? `Resetting password for ${emailParam}` : 'Enter your new secure password'}
          </p>
        </div>

        {isSuccess ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
            <h3 className="font-bold text-emerald-900 text-base">Password Updated</h3>
            <p className="text-xs text-emerald-700">
              Your password has been changed successfully. Redirecting you to login...
            </p>
            <div className="pt-2">
              <Link
                to="/login"
                className="inline-block px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold"
              >
                Sign In Now
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {!token && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-3 rounded-xl font-medium">
                Warning: No reset token detected in the URL query params. Ensure you clicked the link directly from your email.
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                New Password
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
                  placeholder="Min 9 chars, upper, lower, special"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Confirm New Password
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

            {/* Live requirement checklist */}
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
                  <span>Reset Password</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <Link to="/login" className="text-xs text-indigo-600 font-semibold hover:underline">
                Back to Sign In
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

