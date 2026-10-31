import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth, UserRole } from '../../context/AuthContext.js';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { user, token, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-600">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-md w-full text-center shadow-sm">
          <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center mx-auto mb-4 font-bold text-xl">
            !
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-sm text-slate-600 mb-6">
            Your role (<span className="font-semibold">{user.role}</span>) does not have permission to view this section.
          </p>
          <a
            href={user.role === 'CUSTOMER' ? '/portal' : '/products'}
            className="inline-block px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition"
          >
            Go to Allowed Area
          </a>
        </div>
      </div>
    );
  }

  return <Outlet />;
};

export const PublicRoute: React.FC = () => {
  const { token, user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (token && user) {
    return <Navigate to={user.role === 'CUSTOMER' ? '/portal' : '/products'} replace />;
  }

  return <Outlet />;
};

