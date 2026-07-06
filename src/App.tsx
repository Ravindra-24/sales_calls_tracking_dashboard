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

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, claims } = useAuth();
  if (!user || !claims.role) {
    return <Navigate to="/login" replace state={{ accessDenied: Boolean(user) }} />;
  }
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
            <Route path="/claim" element={<ClaimAccount />} />
            <Route path="/calls" element={<Navigate to="/dashboard/calls" replace />} />
            <Route path="/team" element={<Navigate to="/dashboard/team" replace />} />
            <Route path="/platform" element={<Navigate to="/dashboard/platform" replace />} />
            <Route path="/settings" element={<Navigate to="/dashboard/settings" replace />} />
            
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
            </Route>
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
