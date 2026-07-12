import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { useAuth } from './context/auth';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { CallHistory } from './pages/CallHistory';
import { Team } from './pages/Team';
import { Platform } from './pages/Platform';
import { ClaimAccount } from './pages/ClaimAccount';
import { Settings } from './pages/Settings';
import { ProductPage } from './pages/ProductPage';
import { Integrations } from './pages/Integrations';
import { IntegrationDocs } from './pages/IntegrationDocs';
import { Signup } from './pages/Signup';
import { Billing } from './pages/Billing';
import { BillingOperations } from './pages/BillingOperations';
import { BillingCatalog } from './pages/BillingCatalog';
import { BillingPolicy } from './pages/BillingPolicy';
import type { DashboardRole } from './context/auth';

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
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<ProductPage />} />
            <Route path="/home" element={<ProductPage />} />
            <Route path="/product" element={<Navigate to="/" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/claim" element={<ClaimAccount />} />
            <Route path="/docs/integrations" element={<IntegrationDocs />} />
            <Route path="/terms" element={<BillingPolicy kind="terms" />} />
            <Route path="/refund-policy" element={<BillingPolicy kind="refund" />} />
            <Route path="/cancellation-policy" element={<BillingPolicy kind="cancellation" />} />
            <Route path="/calls" element={<Navigate to="/dashboard/calls" replace />} />
            <Route path="/team" element={<Navigate to="/dashboard/team" replace />} />
            <Route path="/platform" element={<Navigate to="/dashboard/platform" replace />} />
            <Route path="/settings" element={<Navigate to="/dashboard/settings" replace />} />
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
              <Route path="settings" element={<Settings />} />
              <Route path="integrations" element={<Integrations />} />
              <Route path="billing" element={<RoleRoute allowed={['org_admin', 'manager']}><Billing /></RoleRoute>} />
              <Route path="billing-operations" element={<RoleRoute allowed={['platform_owner']}><BillingOperations /></RoleRoute>} />
              <Route path="billing-catalog" element={<RoleRoute allowed={['platform_owner']}><BillingCatalog /></RoleRoute>} />
            </Route>
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
