import React, { useState } from 'react';
import { FirebaseError } from 'firebase/app';
import { sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebase';
import { Mail, Lock, AlertCircle } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth';

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      const claims = await refreshClaims();
      if (!claims.role) {
        await auth.signOut();
        setError('This account is not linked to dashboard access yet.');
        return;
      }
      navigate('/dashboard');
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
      await sendPasswordResetEmail(auth, email.trim());
      setResetSent(true);
    } catch {
      setResetSent(true);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', boxShadow: '0 12px 30px rgba(109, 40, 217, 0.32)', overflow: 'hidden' }}>
            <img src={appIcon} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <h2>LeadWatch</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Sign in to manage sales calls</p>
        </div>

        {(error || accessDenied) && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', color: 'var(--danger)', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
            <AlertCircle size={18} />
            {error || 'Your account does not have dashboard access.'}
          </div>
        )}

        {resetSent && (
          <div className="notice success-notice" style={{ marginBottom: '1.5rem' }}>
            If an account exists for this email, a reset link has been sent.
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input
                type="email"
                className="input-field"
                style={{ paddingLeft: '2.75rem' }}
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input
                type="password"
                className="input-field"
                style={{ paddingLeft: '2.75rem' }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '0.5rem', width: '100%' }}>
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
          <button type="button" className="secondary-button" onClick={handleResetPassword}>
            Reset password
          </button>
        </form>
        <p style={{ marginTop: '1.25rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.86rem' }}>
          New here? <Link to="/" style={{ color: '#8edbd1', fontWeight: 700, textDecoration: 'none' }}>View product page</Link>
        </p>
      </div>
    </div>
  );
};
