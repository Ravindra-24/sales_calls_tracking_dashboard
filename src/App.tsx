import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { useAuth } from './context/auth';
import { FeedbackProvider } from './context/FeedbackProvider';
import type { DashboardRole } from './context/auth';

const Layout = React.lazy(() => import('./components/Layout').then((module) => ({ default: module.Layout })));
const Login = React.lazy(() => import('./pages/Login').then((module) => ({ default: module.Login })));
const Dashboard = React.lazy(() => import('./pages/Dashboard').then((module) => ({ default: module.Dashboard })));
const CallHistory = React.lazy(() => import('./pages/CallHistory').then((module) => ({ default: module.CallHistory })));
const Team = React.lazy(() => import('./pages/Team').then((module) => ({ default: module.Team })));
const Platform = React.lazy(() => import('./pages/Platform').then((module) => ({ default: module.Platform })));
const ClaimAccount = React.lazy(() => import('./pages/ClaimAccount').then((module) => ({ default: module.ClaimAccount })));
const ResetPassword = React.lazy(() => import('./pages/ResetPassword').then((module) => ({ default: module.ResetPassword })));
const Settings = React.lazy(() => import('./pages/Settings').then((module) => ({ default: module.Settings })));
const Notifications = React.lazy(() => import('./pages/Notifications').then((module) => ({ default: module.Notifications })));
const ProductPage = React.lazy(() => import('./pages/ProductPage').then((module) => ({ default: module.ProductPage })));
const Integrations = React.lazy(() => import('./pages/Integrations').then((module) => ({ default: module.Integrations })));
const IntegrationDocs = React.lazy(() => import('./pages/IntegrationDocs').then((module) => ({ default: module.IntegrationDocs })));
const Signup = React.lazy(() => import('./pages/Signup').then((module) => ({ default: module.Signup })));
const Billing = React.lazy(() => import('./pages/Billing').then((module) => ({ default: module.Billing })));
const BillingOperations = React.lazy(() => import('./pages/BillingOperations').then((module) => ({ default: module.BillingOperations })));
const BillingCatalog = React.lazy(() => import('./pages/BillingCatalog').then((module) => ({ default: module.BillingCatalog })));
const BillingPolicy = React.lazy(() => import('./pages/BillingPolicy').then((module) => ({ default: module.BillingPolicy })));
const PrivacyPolicy = React.lazy(() => import('./pages/PrivacyPolicy').then((module) => ({ default: module.PrivacyPolicy })));

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, claims } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!claims.role) return <Navigate to={`/signup?plan=${localStorage.getItem('leadwatch.selectedBillingPlan') || 'lite'}`} replace />;
  return <>{children}</>;
};

const RoleRoute = ({ allowed, children }: { allowed: DashboardRole[]; children: React.ReactNode }) => {
  const { claims } = useAuth();
  if (!claims.role || !allowed.includes(claims.role)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <FeedbackProvider>
          <BrowserRouter>
            <React.Suspense fallback={<div className="app-loader">Loading Smartly Manage…</div>}>
              <Routes>
                <Route path="/" element={<ProductPage />} />
                <Route path="/home" element={<Navigate to="/" replace />} />
                <Route path="/product" element={<Navigate to="/" replace />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/claim" element={<ClaimAccount />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/docs/integrations" element={<IntegrationDocs />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<BillingPolicy kind="terms" />} />
                <Route path="/refund-policy" element={<BillingPolicy kind="refund" />} />
                <Route path="/cancellation-policy" element={<BillingPolicy kind="cancellation" />} />
                <Route path="/calls" element={<Navigate to="/dashboard/calls" replace />} />
                <Route path="/team" element={<Navigate to="/dashboard/team" replace />} />
                <Route path="/platform" element={<Navigate to="/dashboard/platform" replace />} />
                <Route path="/settings" element={<Navigate to="/dashboard/settings" replace />} />
                <Route path="/notifications" element={<Navigate to="/dashboard/notifications" replace />} />
                <Route path="/integrations" element={<Navigate to="/dashboard/integrations" replace />} />
                <Route path="/billing" element={<Navigate to="/dashboard/billing" replace />} />

                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Layout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Dashboard />} />
                  <Route path="calls" element={<CallHistory />} />
                  <Route path="team" element={<Team />} />
                  <Route path="platform" element={<Platform />} />
                  <Route path="notifications" element={<Notifications />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="integrations" element={<Integrations />} />
                  <Route path="billing" element={<RoleRoute allowed={['org_admin', 'manager']}><Billing /></RoleRoute>} />
                  <Route path="billing-operations" element={<RoleRoute allowed={['platform_owner']}><BillingOperations /></RoleRoute>} />
                  <Route path="billing-catalog" element={<RoleRoute allowed={['platform_owner']}><BillingCatalog /></RoleRoute>} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </React.Suspense>
          </BrowserRouter>
        </FeedbackProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
