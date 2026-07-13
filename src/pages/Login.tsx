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
  const [currentSlide, setCurrentSlide] = useState(0);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshClaims } = useAuth();
  const accessDenied = Boolean((location.state as { accessDenied?: boolean } | null)?.accessDenied);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % 4);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

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
    <div className="split-auth-page">
      <div className="split-auth-form-side">
        <div className="split-auth-form-container">
          <div className="auth-header">
            <div className="auth-logo">
              <img src={appIcon} alt="LeadWatch Logo" />
            </div>
            <h2>Welcome back</h2>
            <p>Sign in to your LeadWatch dashboard</p>
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

          <div className="auth-sso-section">
            <GoogleOneTap
              context="signin"
              buttonText="continue_with"
              onSuccess={routeAfterAuth}
              onError={setError}
            />
          </div>

          <div className="auth-divider"><span>or continue with email</span></div>

          <form className="auth-form" onSubmit={handleLogin}>
            
            <div className="input-group">
              <label htmlFor="login-email">Work Email</label>
              <div className="auth-input">
                <Mail size={18} className="input-icon" />
                <input
                  id="login-email"
                  type="email"
                  className="input-field"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="input-group">
              <div className="password-label-row">
                <label htmlFor="login-password">Password</label>
                <button type="button" className="auth-reset-btn" onClick={handleResetPassword}>
                  Forgot password?
                </button>
              </div>
              <div className="auth-input">
                <Lock size={18} className="input-icon" />
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

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          <p className="auth-footer">
            Don't have an account? <Link to="/signup">Request access</Link>
          </p>
        </div>
      </div>

      <div className="split-auth-hero-side">
        <div className="hero-bg-gradients">
          <div className="hero-blob blob-1"></div>
          <div className="hero-blob blob-2"></div>
        </div>
        
        {/* Slide 0: Analytics */}
        <div className={`hero-content hero-slide ${currentSlide === 0 ? 'active' : ''}`}>
          <h3 className="hero-title">Track every call.<br/>Close more deals.</h3>
          <p className="hero-subtitle">The platform built for high-performing sales teams.</p>
          <div className="mock-analytics-card">
            <div className="mock-card-header">
              <div className="mock-avatar"></div>
              <div className="mock-text-lines">
                <div className="mock-line short"></div>
                <div className="mock-line long"></div>
              </div>
              <div className="mock-badge">Top Performer</div>
            </div>
            <div className="mock-chart">
              <div className="mock-bar" style={{height: '40%', transitionDelay: '0.1s'}}></div>
              <div className="mock-bar" style={{height: '65%', transitionDelay: '0.2s'}}></div>
              <div className="mock-bar" style={{height: '35%', transitionDelay: '0.3s'}}></div>
              <div className="mock-bar" style={{height: '85%', transitionDelay: '0.4s'}}></div>
              <div className="mock-bar" style={{height: '55%', transitionDelay: '0.5s'}}></div>
              <div className="mock-bar" style={{height: '100%', transitionDelay: '0.6s', background: 'var(--accent-primary)'}}></div>
            </div>
          </div>
        </div>

        {/* Slide 1: Team Management */}
        <div className={`hero-content hero-slide ${currentSlide === 1 ? 'active' : ''}`}>
          <h3 className="hero-title">Manage your team.<br/>Scale your success.</h3>
          <p className="hero-subtitle">Real-time visibility into rep performance and coaching opportunities.</p>
          <div className="mock-analytics-card">
            <div className="mock-team-list">
              {[85, 92, 78].map((score, i) => (
                <div key={i} className="mock-team-row">
                  <div className="mock-avatar-small"></div>
                  <div className="mock-text-lines">
                    <div className="mock-line long" style={{width: `${score}%`}}></div>
                  </div>
                  <div className="mock-score">{score}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Slide 2: Seamless Integrations */}
        <div className={`hero-content hero-slide ${currentSlide === 2 ? 'active' : ''}`}>
          <h3 className="hero-title">Seamlessly integrated.<br/>Workflow perfected.</h3>
          <p className="hero-subtitle">Connects instantly with Salesforce, HubSpot, and Slack.</p>
          <div className="mock-analytics-card">
             <div className="mock-integration-grid">
                <div className="mock-integration-box" style={{background: '#00A1E0'}}></div>
                <div className="mock-integration-box" style={{background: '#FF7A59'}}></div>
                <div className="mock-integration-box" style={{background: '#4A154B'}}></div>
             </div>
          </div>
        </div>

        {/* Slide 3: Auto SMS/WhatsApp */}
        <div className={`hero-content hero-slide ${currentSlide === 3 ? 'active' : ''}`}>
          <h3 className="hero-title">Auto Messaging.<br/>Direct from mobile.</h3>
          <p className="hero-subtitle">Send automated SMS & WhatsApp directly from the rep's phone when a call ends.</p>
          <div className="mock-analytics-card">
            <div className="mock-chat-bubble mock-chat-left">
               <div className="mock-line short"></div>
               <div className="mock-line long"></div>
            </div>
            <div className="mock-chat-bubble mock-chat-right" style={{background: 'var(--accent-primary)', marginLeft: 'auto', marginTop: '12px'}}>
               <div className="mock-line long" style={{background: 'rgba(255,255,255,0.4)'}}></div>
               <div className="mock-line short" style={{background: 'rgba(255,255,255,0.4)'}}></div>
            </div>
            <div className="mock-badge" style={{marginTop: '16px', display: 'inline-block', background: 'rgba(37,211,102,0.15)', color: '#25D366'}}>WhatsApp API</div>
          </div>
        </div>
        
        {/* Slide Indicators */}
        <div className="hero-slide-indicators">
          {[0, 1, 2, 3].map((idx) => (
            <div 
              key={idx} 
              className={`slide-indicator ${currentSlide === idx ? 'active' : ''}`}
              onClick={() => setCurrentSlide(idx)}
            ></div>
          ))}
        </div>
      </div>
    </div>
  );
};
