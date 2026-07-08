import { useMemo, useState } from 'react';
import { signInWithCustomToken } from 'firebase/auth';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, Check, Lock, Phone, User } from 'lucide-react';
import { api, getApiErrorMessage } from '../api/client';
import { auth } from '../config/firebase';
import { useAuth } from '../context/auth';
import type { ApiResponse } from '../types/api';

interface ClaimResult {
  customToken: string;
  email: string;
  orgId: string;
  role: string;
}

export const ClaimAccount = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshClaims } = useAuth();
  const inviteToken = useMemo(() => searchParams.get('token') ?? '', [searchParams]);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submitClaim = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await api.post<ApiResponse<ClaimResult>>('/auth/invite/claim', {
        token: inviteToken,
        name: name.trim(),
        password,
        phoneNumber: phoneNumber.trim() || undefined,
      });
      await signInWithCustomToken(auth, response.data.data.customToken);
      await refreshClaims();
      navigate('/dashboard');
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Failed to claim this account.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="claim-page">
      <div className="glass-panel claim-card animate-fade-in">
        <div className="claim-header">
          <div className="success-icon"><Check size={18} /></div>
          <h1>Claim account</h1>
          <p>Set up your dashboard login for LeadWatch.</p>
        </div>

        {!inviteToken && (
          <div className="notice error-notice">
            <AlertCircle size={17} /> This claim link is missing an invite token.
          </div>
        )}

        {error && <div className="notice error-notice">{error}</div>}

        <form className="claim-form" onSubmit={submitClaim}>
          <label>Your name<div className="input-with-icon"><User size={17} /><input className="input-field" value={name} onChange={(event) => setName(event.target.value)} required /></div></label>
          <label>Phone number<div className="input-with-icon"><Phone size={17} /><input className="input-field" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} placeholder="Optional" /></div></label>
          <label>Password<div className="input-with-icon"><Lock size={17} /><input className="input-field" type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={6} required /></div></label>
          <button className="btn-primary" disabled={loading || !inviteToken}>{loading ? 'Creating account…' : 'Claim account'}</button>
        </form>
      </div>
    </div>
  );
};
