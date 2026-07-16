import { useEffect, useRef, useState } from 'react';
import { FirebaseError } from 'firebase/app';
import { applyActionCode } from 'firebase/auth';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, MailCheck } from 'lucide-react';
import { auth } from '../config/firebase';

type Status = 'verifying' | 'success' | 'invalid';

const mapVerifyCodeError = (err: unknown): string => {
  const code = err instanceof FirebaseError ? err.code : '';
  switch (code) {
    case 'auth/expired-action-code':
      return 'This verification link has expired. Request a new one from the signup page.';
    case 'auth/invalid-action-code':
      return 'This verification link has already been used or is invalid. Request a new one from the signup page.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Contact support.';
    case 'auth/user-not-found':
      return "We couldn't find an account for this verification link.";
    default:
      return 'This verification link is invalid. Please request a new verification email.';
  }
};

const safeContinuePath = (value: string | null): string => {
  if (value && value.startsWith('/') && !value.startsWith('//')) return value;
  return '/signup';
};

export const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const oobCode = searchParams.get('oobCode') ?? '';
  const continuePath = safeContinuePath(searchParams.get('continue'));

  const [status, setStatus] = useState<Status>('verifying');
  const [error, setError] = useState('');
  const [signedIn, setSignedIn] = useState(false);
  const appliedRef = useRef(false);

  useEffect(() => {
    // applyActionCode is one-shot; guard against StrictMode double-mount.
    if (appliedRef.current) return;
    appliedRef.current = true;

    if (!oobCode) {
      setStatus('invalid');
      setError('This verification link is missing or malformed.');
      return;
    }

    const run = async () => {
      try {
        await applyActionCode(auth, oobCode);
      } catch (err) {
        const code = err instanceof FirebaseError ? err.code : '';
        const alreadyVerified =
          code === 'auth/invalid-action-code' && auth.currentUser?.emailVerified;
        if (!alreadyVerified) {
          setStatus('invalid');
          setError(mapVerifyCodeError(err));
          return;
        }
      }
      if (auth.currentUser) {
        // Refresh the local user + token so emailVerified is visible everywhere.
        await auth.currentUser.reload();
        await auth.currentUser.getIdToken(true);
        setSignedIn(true);
      }
      setStatus('success');
    };
    void run();
  }, [oobCode]);

  useEffect(() => {
    if (status !== 'success' || !signedIn) return;
    const timer = setTimeout(() => navigate(continuePath, { replace: true }), 2500);
    return () => clearTimeout(timer);
  }, [status, signedIn, continuePath, navigate]);

  return (
    <div className="claim-page">
      <div className="glass-panel claim-card animate-fade-in">
        <div className="claim-header">
          <div className="success-icon"><MailCheck size={18} /></div>
          <h1>Email verification</h1>
          <p>Confirming your email address for Smartly Manage</p>
        </div>

        {status === 'verifying' && <p>Verifying your email…</p>}

        {status === 'invalid' && (
          <>
            <div className="notice error-notice">
              <AlertCircle size={17} /> {error}
            </div>
            <p className="auth-footer">
              <Link to="/signup">Back to signup</Link>
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="notice success-notice">
              <MailCheck size={17} /> Your email has been verified.
            </div>
            {signedIn ? (
              <>
                <p>Taking you to the next step…</p>
                <button className="btn-primary" onClick={() => navigate(continuePath, { replace: true })}>
                  Continue setup
                </button>
              </>
            ) : (
              <>
                <p>Sign in with your new account to continue setting up your organization.</p>
                <button className="btn-primary" onClick={() => navigate(continuePath, { replace: true })}>
                  Continue signup
                </button>
                <p className="auth-footer">
                  <Link to="/login">Go to login</Link>
                </p>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};
