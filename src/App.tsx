import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/auth';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { CallHistory } from './pages/CallHistory';
import { Team } from './pages/Team';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, claims } = useAuth();
  if (!user || !claims.orgId || !['owner', 'manager'].includes(claims.role ?? '')) {
    return <Navigate to="/login" replace state={{ accessDenied: Boolean(user) }} />;
  }
  return <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="calls" element={<CallHistory />} />
            <Route path="team" element={<Team />} />
          </Route>
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
