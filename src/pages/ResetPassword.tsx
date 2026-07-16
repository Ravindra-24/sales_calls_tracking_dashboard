import { useEffect, useState } from 'react';
import { FirebaseError } from 'firebase/app';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, Check, Lock } from 'lucide-react';
import { auth } from '../config/firebase';

type Status = 'verifying' | 'valid' | 'invalid' | 'submitting' | 'success';

const mapResetCodeError = (err: unknown): string => {
  const code = err instanceof FirebaseError ? err.code : '';
  switch (code) {
    case 'auth/expired-action-code':
      return 'This reset link has expired. Request a new one from the login page.';
    case 'auth/invalid-action-code':
      return 'This reset link has already been used or is invalid. Request a new one.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Contact support.';
    case 'auth/user-not-found':
      return "We couldn't find an account for this reset link.";
    case 'auth/weak-password':
      return 'Choose a stronger password (at least 8 characters).';
    default:
      return 'This reset link is invalid. Please request a new password reset.';
  }
};

export const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const oobCode = searchParams.get('oobCode') ?? '';

  const [status, setStatus] = useState<Status>('verifying');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!oobCode) {
      setStatus('invalid');
      setError('This reset link is missing or malformed.');
      return;
    }
    verifyPasswordResetCode(auth, oobCode)
      .then((verifiedEmail) => {
        setEmail(verifiedEmail);
        setStatus('valid');
      })
      .catch((err) => {
        setStatus('invalid');
        setError(mapResetCodeError(err));
      });
  }, [oobCode]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setStatus('submitting');
    try {
      await confirmPasswordReset(auth, oobCode, password);
      setStatus('success');
    } catch (err) {
      const code = err instanceof FirebaseError ? err.code : '';
      setStatus(code === 'auth/expired-action-code' || code === 'auth/invalid-action-code' ? 'invalid' : 'valid');
      setError(mapResetCodeError(err));
    }
  };

  return (
    <div className="claim-page">
      <div className="glass-panel claim-card animate-fade-in">
        <div className="claim-header">
          <div className="success-icon"><Lock size={18} /></div>
          <h1>Reset your password</h1>
          <p>{status === 'valid' || status === 'submitting' ? (email ? `for ${email}` : 'Enter a new password below') : 'Set up a new password for your account'}</p>
        </div>

        {status === 'verifying' && <p>Verifying your reset link…</p>}

        {status === 'invalid' && (
          <>
            <div className="notice error-notice">
              <AlertCircle size={17} /> {error}
            </div>
            <p className="auth-footer">
              <Link to="/login">Back to login</Link>
            </p>
          </>
        )}

        {(status === 'valid' || status === 'submitting') && (
          <form className="claim-form" onSubmit={handleSubmit}>
            {error && (
              <div className="notice error-notice">
                <AlertCircle size={17} /> {error}
              </div>
            )}
            <label>
              New password
              <div className="input-with-icon">
                <Lock size={17} />
                <input
                  className="input-field"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={8}
                  required
                />
              </div>
            </label>
            <label>
              Confirm password
              <div className="input-with-icon">
                <Lock size={17} />
                <input
                  className="input-field"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  minLength={8}
                  required
                />
              </div>
            </label>
            <button className="btn-primary" disabled={status === 'submitting'}>
              {status === 'submitting' ? 'Resetting…' : 'Reset password'}
            </button>
          </form>
        )}

        {status === 'success' && (
          <>
            <div className="notice success-notice">
              <Check size={17} /> Your password has been reset.
            </div>
            <button className="btn-primary" onClick={() => navigate('/login')}>
              Go to login
            </button>
          </>
        )}
      </div>
    </div>
  );
};
