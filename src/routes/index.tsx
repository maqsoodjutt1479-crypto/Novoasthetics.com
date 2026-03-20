import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout';
import { DashboardPage } from '../pages/Dashboard';
import { AppointmentsPage } from '../pages/Appointments';
import { PatientsPage } from '../pages/Patients';
import { ServicesClinicalPage } from '../pages/ServicesClinical';
import { ServicesPackagesPage } from '../pages/ServicesPackages';
import { ServicesMembershipPage } from '../pages/ServicesMembership';
import { ProductsPage } from '../pages/Products';
import { PaymentsPage } from '../pages/Payments';
import { ReportsPage } from '../pages/Reports';
import { SettingsPage } from '../pages/Settings';
import { PublicBookingPage } from '../pages/PublicBooking';
import { StaffPage } from '../pages/Staff';
import { LoginPage } from '../pages/Login';
import { useAuth } from '../components/AuthProvider';

const PrivateRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const RoleGuard: React.FC<{ allowed: Array<'admin' | 'doctor' | 'fdo'>; fallback?: string; children: React.ReactElement }> = ({
  allowed,
  fallback = '/appointments',
  children,
}) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!allowed.includes(user.role)) {
    return <Navigate to={fallback} replace />;
  }
  return children;
};

export const AppRoutes: React.FC = () => (
  <Routes>
    <Route path="/book" element={<PublicBookingPage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route
      path="/"
      element={
        <PrivateRoute>
          <RootRoute />
        </PrivateRoute>
      }
    />
    <Route
      path="/appointments"
      element={
        <PrivateRoute>
          <RoleGuard allowed={['admin', 'doctor', 'fdo']}>
            <AppLayout title="Appointments">
              <AppointmentsPage />
            </AppLayout>
          </RoleGuard>
        </PrivateRoute>
      }
    />
    <Route
      path="/patients"
      element={
        <PrivateRoute>
          <RoleGuard allowed={['admin', 'fdo']} fallback="/appointments">
            <AppLayout title="Patients / Treatment">
              <PatientsPage />
            </AppLayout>
          </RoleGuard>
        </PrivateRoute>
      }
    />
    <Route
      path="/services/clinical"
      element={
        <PrivateRoute>
          <RoleGuard allowed={['admin', 'fdo']} fallback="/appointments">
            <AppLayout title="Clinical Services">
              <ServicesClinicalPage />
            </AppLayout>
          </RoleGuard>
        </PrivateRoute>
      }
    />
    <Route
      path="/services/packages"
      element={
        <PrivateRoute>
          <RoleGuard allowed={['admin', 'fdo']} fallback="/appointments">
            <AppLayout title="Packages">
              <ServicesPackagesPage />
            </AppLayout>
          </RoleGuard>
        </PrivateRoute>
      }
    />
    <Route
      path="/services/membership"
      element={
        <PrivateRoute>
          <RoleGuard allowed={['admin', 'fdo']} fallback="/appointments">
            <AppLayout title="Membership">
              <ServicesMembershipPage />
            </AppLayout>
          </RoleGuard>
        </PrivateRoute>
      }
    />
    <Route
      path="/products"
      element={
        <PrivateRoute>
          <RoleGuard allowed={['admin']} fallback="/appointments">
            <AppLayout title="Products">
              <ProductsPage />
            </AppLayout>
          </RoleGuard>
        </PrivateRoute>
      }
    />
    <Route
      path="/payments"
      element={
        <PrivateRoute>
          <RoleGuard allowed={['admin']} fallback="/appointments">
            <AppLayout title="Payments & Revenue">
              <PaymentsPage />
            </AppLayout>
          </RoleGuard>
        </PrivateRoute>
      }
    />
    <Route
      path="/reports"
      element={
        <PrivateRoute>
          <RoleGuard allowed={['admin']} fallback="/appointments">
            <AppLayout title="Reports">
              <ReportsPage />
            </AppLayout>
          </RoleGuard>
        </PrivateRoute>
      }
    />
    <Route
      path="/settings"
      element={
        <PrivateRoute>
          <RoleGuard allowed={['admin', 'fdo']} fallback="/appointments">
            <AppLayout title="Settings">
              <SettingsPage />
            </AppLayout>
          </RoleGuard>
        </PrivateRoute>
      }
    />
    <Route
      path="/staff"
      element={
        <PrivateRoute>
          <RoleGuard allowed={['admin', 'fdo']} fallback="/appointments">
            <AppLayout title="Doctors & Staff">
              <StaffPage />
            </AppLayout>
          </RoleGuard>
        </PrivateRoute>
      }
    />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

const RootRoute: React.FC = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/appointments" replace />;
  return (
    <AppLayout title="Dashboard">
      <DashboardPage />
    </AppLayout>
  );
};
