import React, { useCallback, useState } from 'react';
import { FirebaseError } from 'firebase/app';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebase';
import { Mail, Lock, AlertCircle } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth';
import { api, getApiErrorMessage } from '../api/client';
import { GoogleOneTap } from '../components/auth/GoogleOneTap';

const appIcon = '/favicon.svg';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshClaims } = useAuth();
  const accessDenied = Boolean((location.state as { accessDenied?: boolean } | null)?.accessDenied);

  const routeAfterAuth = useCallback(async () => {
    const claims = await refreshClaims();
    if (!claims.role) {
      const selectedPlan = new URLSearchParams(location.search).get('plan') || localStorage.getItem('leadwatch.selectedBillingPlan') || 'lite';
      navigate(`/signup?plan=${selectedPlan}`, { replace: true });
      return;
    }
    const selectedPlan = new URLSearchParams(location.search).get('plan');
    navigate(selectedPlan && selectedPlan !== 'lite' && (claims.role === 'org_admin' || claims.role === 'manager') ? '/dashboard/billing' : '/dashboard');
  }, [location.search, navigate, refreshClaims]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      await routeAfterAuth();
    } catch (error) {
      if (error instanceof FirebaseError && error.code.includes('api-key')) {
        setError('Dashboard Firebase configuration is invalid. Set the VITE_FIREBASE_* variables in Vercel and redeploy.');
        return;
      }
      setError('Sign-in failed. Check your email and password.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email.trim()) {
      setError('Enter your email first, then request a reset link.');
      return;
    }
    setError('');
    setResetSent(false);
    try {
      await api.post('/auth/password/reset', { email: email.trim() });
      setResetSent(true);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Failed to request a reset link.'));
    }
  };

  return (
    <div className="auth-page">
      <div className="glass-panel animate-fade-in auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <img src={appIcon} alt="" />
          </div>
          <h2>LeadWatch</h2>
          <p>Sign in to manage sales calls</p>
        </div>

        {(error || accessDenied) && (
          <div className="notice error-notice auth-notice">
            <AlertCircle size={18} />
            {error || 'Your account does not have dashboard access.'}
          </div>
        )}

        {resetSent && (
          <div className="notice success-notice auth-notice">
            If an account exists for this email, a reset link has been sent.
          </div>
        )}

        <GoogleOneTap
          context="signin"
          buttonText="continue_with"
          onSuccess={routeAfterAuth}
          onError={setError}
        />

        <div className="auth-divider"><span>or use email</span></div>

        <form className="auth-form" onSubmit={handleLogin}>
          <div>
            <label htmlFor="login-email">Email</label>
            <div className="auth-input">
              <Mail size={18} />
              <input
                id="login-email"
                type="email"
                className="input-field"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="login-password">Password</label>
            <div className="auth-input">
              <Lock size={18} />
              <input
                id="login-password"
                type="password"
                className="input-field"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn-primary auth-submit" disabled={loading}>
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
          <button type="button" className="secondary-button" onClick={handleResetPassword}>
            Reset password
          </button>
        </form>
        <p className="auth-footer">
          New here? <Link to="/">View product page</Link>
        </p>
      </div>
    </div>
  );
};
