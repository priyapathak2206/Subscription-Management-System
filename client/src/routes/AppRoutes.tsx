import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { PublicRoute, ProtectedRoute } from '../components/guards/ProtectedRoute.js';
import { AppLayout } from '../components/layout/AppLayout.js';

// Auth Pages
import { LoginPage } from '../pages/auth/LoginPage.js';
import { RegisterPage } from '../pages/auth/RegisterPage.js';
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage.js';
import { ResetPasswordPage } from '../pages/auth/ResetPasswordPage.js';

// Admin & Catalog Pages
import { ProductsPage } from '../pages/admin/ProductsPage.js';
import { PlansPage } from '../pages/admin/PlansPage.js';
import { TaxesPage } from '../pages/admin/TaxesPage.js';
import { DiscountsPage } from '../pages/admin/DiscountsPage.js';
import { StaffPage } from '../pages/admin/StaffPage.js';

// Parallel Development Placeholder Pages
import { DashboardPage } from '../pages/dashboard/DashboardPage.js';
import { SubscriptionsPage } from '../pages/subscriptions/SubscriptionsPage.js';
import { InvoicesPage } from '../pages/invoices/InvoicesPage.js';
import { PaymentsPage } from '../pages/payments/PaymentsPage.js';
import { PortalPage } from '../pages/portal/PortalPage.js';

import { NotFoundPage } from '../pages/NotFoundPage.js';
import { useAuth } from '../context/AuthContext.js';

export const AppRoutes: React.FC = () => {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Root Redirection */}
      <Route
        path="/"
        element={
          user ? (
            <Navigate to={user.role === 'CUSTOMER' ? '/portal' : '/products'} replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Public Auth Routes */}
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Route>

      {/* Protected Routes inside AppLayout */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          {/* Admin & Staff Accessible */}
          <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'STAFF']} />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/plans" element={<PlansPage />} />
            <Route path="/taxes" element={<TaxesPage />} />
            <Route path="/discounts" element={<DiscountsPage />} />
          </Route>

          {/* Admin ONLY */}
          <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
            <Route path="/staff" element={<StaffPage />} />
          </Route>

          {/* Customer Portal */}
          <Route element={<ProtectedRoute allowedRoles={['CUSTOMER', 'ADMIN', 'STAFF']} />}>
            <Route path="/portal" element={<PortalPage />} />
            <Route path="/subscriptions" element={<SubscriptionsPage />} />
            <Route path="/invoices" element={<InvoicesPage />} />
            <Route path="/payments" element={<PaymentsPage />} />
          </Route>
        </Route>
      </Route>

      {/* 404 Route */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

