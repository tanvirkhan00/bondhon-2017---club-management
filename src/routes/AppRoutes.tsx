import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { PublicLayout } from '../layouts/PublicLayout';
import { MemberLayout } from '../layouts/MemberLayout';
import { AdminLayout } from '../layouts/AdminLayout';
import { ProtectedRoute } from './ProtectedRoute';

// Public Pages
import { Home } from '../pages/public/Home';
import { About } from '../pages/public/About';
import { PublicMembers } from '../pages/public/PublicMembers';
import { Constitution } from '../pages/public/Constitution';
import { Login } from '../pages/public/Login';

// Member Portal Pages
import { MemberProfile } from '../pages/member/MemberProfile';
import { MemberPaymentHistory } from '../pages/member/MemberPaymentHistory';

// Admin Pages
import { AdminDashboard } from '../pages/admin/AdminDashboard';
import { AdminMembers } from '../pages/admin/AdminMembers';
import { AdminPayments } from '../pages/admin/AdminPayments';
import { AdminFines } from '../pages/admin/AdminFines';
import { AdminPaymentHistory } from '../pages/admin/AdminPaymentHistory';
import { AdminReports } from '../pages/admin/AdminReports';
import { AdminSettings } from '../pages/admin/AdminSettings';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* 1. Public Club Website Routes */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/members" element={<PublicMembers />} />
        <Route path="/constitution" element={<Constitution />} />
        <Route path="/policy" element={<Navigate to="/constitution" replace />} />
        <Route path="/login" element={<Login />} />
      </Route>

      {/* 2. Private Member Portal Routes (Authenticated: Member & Admin) */}
      <Route
        path="/member"
        element={
          <ProtectedRoute allowedRoles={['member', 'admin']}>
            <MemberLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/member/profile" replace />} />
        <Route path="profile" element={<MemberProfile />} />
        <Route path="payment-history" element={<MemberPaymentHistory />} />
      </Route>

      {/* 3. Admin Dashboard Routes (Authenticated: Admin Only) */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="members" element={<AdminMembers />} />
        <Route path="payments" element={<AdminPayments />} />
        <Route path="fines" element={<AdminFines />} />
        <Route path="payment-history" element={<AdminPaymentHistory />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>

      {/* Fallback to Home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
