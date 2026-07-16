import { useCallback, useEffect, useMemo, useState } from 'react';
import { FirebaseError } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { ArrowLeft, Building2, CheckCircle2, MailCheck, ShieldCheck, UserPlus } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, getApiErrorMessage } from '../api/client';
import { fetchBillingCatalog, FALLBACK_BILLING_CATALOG } from '../api/billing';
import { auth } from '../config/firebase';
import { useAuth } from '../context/auth';
import { GoogleOneTap } from '../components/auth/GoogleOneTap';
import type { ApiResponse } from '../types/api';
import type { BillingPlanCode } from '../types/billing';

const selectedPlanKey = 'leadwatch.selectedBillingPlan';
const onboardingDraftKey = 'leadwatch.billingOnboardingDraft';
const purchasablePlans: BillingPlanCode[] = ['lite', 'pro', 'max'];

const readSelectedPlan = (queryValue: string | null): BillingPlanCode => {
  if (queryValue && purchasablePlans.includes(queryValue as BillingPlanCode)) return queryValue as BillingPlanCode;
  const stored = localStorage.getItem(selectedPlanKey);
  return stored && purchasablePlans.includes(stored as BillingPlanCode) ? stored as BillingPlanCode : 'lite';
};

const firebaseSignupMessage = (error: unknown) => {
  if (!(error instanceof FirebaseError)) return 'Unable to create your account. Try again.';
  if (error.code === 'auth/email-already-in-use') return 'An account already exists for this email. Sign in to continue.';
  if (error.code === 'auth/weak-password') return 'Use a stronger password with at least six characters.';
  if (error.code === 'auth/invalid-email') return 'Enter a valid email address.';
  return 'Unable to create your account. Try again.';
};

export const Signup = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, claims, refreshClaims } = useAuth();
  const selectedPlan = useMemo(() => readSelectedPlan(searchParams.get('plan')), [searchParams]);
  const [step, setStep] = useState<'account' | 'verify' | 'organization'>(() => (
    user ? (user.emailVerified ? 'organization' : 'verify') : 'account'
  ));
  const [account, setAccount] = useState({ name: '', email: '', password: '' });
  const [organization, setOrganization] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(onboardingDraftKey) || '{}') as Record<string, string>;
      return {
        organizationName: stored.organizationName || '',
        billingName: stored.billingName || '',
        billingEmail: stored.billingEmail || '',
        billingPhone: stored.billingPhone || '',
        gstin: stored.gstin || '',
      };
    } catch {
      return { organizationName: '', billingName: '', billingEmail: '', billingPhone: '', gstin: '' };
    }
  });
  const [policiesAccepted, setPoliciesAccepted] = useState(false);
  const [policyVersions, setPolicyVersions] = useState(
    FALLBACK_BILLING_CATALOG.policyVersions!,
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    localStorage.setItem(selectedPlanKey, selectedPlan);
  }, [selectedPlan]);

  useEffect(() => {
    void fetchBillingCatalog().then((catalog) => {
      if (catalog.policyVersions) setPolicyVersions(catalog.policyVersions);
    });
  }, []);

  useEffect(() => {
    if (claims.role === 'org_admin' || claims.role === 'manager') {
      navigate('/dashboard/billing', { replace: true });
    }
  }, [claims.role, navigate]);

  useEffect(() => {
    if (!user) return;
    setStep(user.emailVerified ? 'organization' : 'verify');
    setAccount((current) => ({ ...current, email: user.email || current.email, name: user.displayName || current.name }));
    setOrganization((current) => ({
      ...current,
      billingName: current.billingName || user.displayName || '',
      billingEmail: current.billingEmail || user.email || '',
    }));
  }, [user]);

  useEffect(() => {
    localStorage.setItem(onboardingDraftKey, JSON.stringify(organization));
  }, [organization]);

  const sendVerification = async () => {
    if (!auth.currentUser) return null;
    const response = await api.post<ApiResponse<{
      emailSent: boolean;
      emailError?: string;
      verifyLink?: string;
      alreadyVerified?: boolean;
    }>>('/auth/email/verification', {
      continuePath: `/signup?plan=${selectedPlan}`,
    });
    return response.data.data ?? null;
  };

  const verificationSentMessage = (
    result: Awaited<ReturnType<typeof sendVerification>>,
    sentText: string,
  ) => {
    if (result && !result.emailSent && result.verifyLink) {
      return `Email delivery is unavailable right now. Open this link to verify: ${result.verifyLink}`;
    }
    return sentText;
  };

  const createAccount = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const credential = await createUserWithEmailAndPassword(auth, account.email.trim(), account.password);
      setStep('verify');
      try {
        await updateProfile(credential.user, { displayName: account.name.trim() });
        const result = await sendVerification();
        setMessage(verificationSentMessage(result, 'Verification email sent. Open it, then return here to continue.'));
      } catch {
        setError('Your account was created, but the verification email was not sent. Use “Resend verification” below.');
      }
    } catch (requestError) {
      setError(firebaseSignupMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  const checkVerification = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      await auth.currentUser?.reload();
      if (!auth.currentUser?.emailVerified) {
        setError('Email is not verified yet. Open the link in your inbox, then check again.');
        return;
      }
      setStep('organization');
      setMessage('Email verified. Complete your organization details.');
    } finally {
      setLoading(false);
    }
  };

  const resendVerification = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const result = await sendVerification();
      if (result?.alreadyVerified) {
        setLoading(false);
        await checkVerification();
        return;
      }
      setMessage(verificationSentMessage(result, 'A fresh verification email has been sent.'));
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Verification email could not be sent yet. Wait a moment and try again.'));
    } finally {
      setLoading(false);
    }
  };

  const createOrganization = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    if (!policiesAccepted) {
      setError('Accept the Terms, Refund Policy, and Cancellation Policy to continue.');
      return;
    }
    setLoading(true);
    try {
      await auth.currentUser?.reload();
      if (!auth.currentUser?.emailVerified) {
        setStep('verify');
        setError('Verify your email before creating the organization.');
        return;
      }
      await auth.currentUser.getIdToken(true);
      await api.post<ApiResponse<unknown>>('/auth/self-serve/organization', {
        orgName: organization.organizationName.trim(),
        adminName: (auth.currentUser.displayName || account.name).trim(),
        phoneNumber: organization.billingPhone.trim() || undefined,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
        selectedPlan,
        billingContact: {
          name: organization.billingName.trim(),
          email: auth.currentUser.email,
          phone: organization.billingPhone.trim() || null,
          gstin: organization.gstin.trim().toUpperCase() || null,
          legalName: null,
          address: null,
        },
        policyVersions: {
          terms: policyVersions.terms,
          refund: policyVersions.refund,
          cancellation: policyVersions.cancellation,
        },
      });
      const nextClaims = await refreshClaims();
      if (!nextClaims.role) {
        setError('Organization was created, but access is still syncing. Sign in again in a moment.');
        return;
      }
      localStorage.removeItem(onboardingDraftKey);
      navigate(selectedPlan === 'lite' ? '/dashboard' : '/dashboard/billing', { replace: true });
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to create the organization. Your account remains available; try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleUseAnotherAccount = async () => {
    await signOut(auth);
    setStep('account');
    setError('');
    setMessage('');
  };

  const continueWithGoogle = useCallback(async () => {
    setError('');
    setMessage('');
    const nextClaims = await refreshClaims();
    if (nextClaims.role === 'org_admin' || nextClaims.role === 'manager') {
      navigate('/dashboard/billing', { replace: true });
      return;
    }
    if (nextClaims.role) {
      navigate('/dashboard', { replace: true });
      return;
    }

    const currentUser = auth.currentUser;
    setAccount((current) => ({
      ...current,
      email: currentUser?.email || current.email,
      name: currentUser?.displayName || current.name,
    }));
    setOrganization((current) => ({
      ...current,
      billingName: current.billingName || currentUser?.displayName || '',
      billingEmail: current.billingEmail || currentUser?.email || '',
    }));
    setStep(currentUser?.emailVerified ? 'organization' : 'verify');
    setMessage(currentUser?.emailVerified ? 'Google sign-in complete. Set up your organization.' : 'Google sign-in complete. Verify your email to continue.');
  }, [navigate, refreshClaims]);

  return (
    <main className="onboarding-page">
      <Link className="onboarding-back" to="/"><ArrowLeft size={17} /> Back to Smartly Manage</Link>
      <section className="onboarding-shell glass-panel animate-fade-in">
        <aside className="onboarding-summary">
          <div className="auth-logo"><img src="/favicon.svg" alt="" /></div>
          <p className="eyebrow">Selected plan</p>
          <h1>{selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)}</h1>
          <p>Your organization starts safely on Lite. Paid access activates only after a captured payment is confirmed by Smartly Manage.</p>
          <ol className="onboarding-progress">
            <li className={step === 'account' ? 'active' : ''}><UserPlus size={18} /> Create account</li>
            <li className={step === 'verify' ? 'active' : ''}><MailCheck size={18} /> Verify email</li>
            <li className={step === 'organization' ? 'active' : ''}><Building2 size={18} /> Organization</li>
          </ol>
          <div className="onboarding-assurance"><ShieldCheck size={18} /><span>No charge is created during signup. Checkout always opens separately.</span></div>
        </aside>

        <div className="onboarding-form-panel">
          {error && <div className="notice error-notice">{error}</div>}
          {message && <div className="notice success-notice">{message}</div>}

          {step === 'account' && (
            <form className="billing-form" onSubmit={createAccount}>
              <div className="billing-form-heading"><p className="eyebrow">Step 1 of 3</p><h2>Create your account</h2><p>Use the email that should own your organization.</p></div>
              <GoogleOneTap
                context="signup"
                buttonText="signup_with"
                onSuccess={continueWithGoogle}
                onError={setError}
              />
              <div className="auth-divider"><span>or create with email</span></div>
              <label>Full name<input className="input-field" autoComplete="name" value={account.name} onChange={(event) => setAccount((current) => ({ ...current, name: event.target.value }))} required /></label>
              <label>Work email<input className="input-field" type="email" autoComplete="email" value={account.email} onChange={(event) => setAccount((current) => ({ ...current, email: event.target.value }))} required /></label>
              <label>Password<input className="input-field" type="password" autoComplete="new-password" minLength={6} value={account.password} onChange={(event) => setAccount((current) => ({ ...current, password: event.target.value }))} required /></label>
              <button className="btn-primary" disabled={loading}>{loading ? 'Creating account…' : 'Create account'}</button>
              <p className="billing-form-footnote">Already registered? <Link to={`/login?plan=${selectedPlan}`}>Sign in</Link></p>
            </form>
          )}

          {step === 'verify' && (
            <div className="verification-panel">
              <span className="verification-icon"><MailCheck size={28} /></span>
              <p className="eyebrow">Step 2 of 3</p>
              <h2>Verify your email</h2>
              <p>We sent a verification link to <strong>{auth.currentUser?.email}</strong>. Verification protects organization creation and billing access.</p>
              <button className="btn-primary" type="button" disabled={loading} onClick={() => void checkVerification()}>{loading ? 'Checking…' : 'I verified my email'}</button>
              <button className="secondary-button" type="button" disabled={loading} onClick={() => void resendVerification()}>Resend verification</button>
              <button className="billing-link-button" type="button" onClick={() => void handleUseAnotherAccount()}>Use another email</button>
            </div>
          )}

          {step === 'organization' && (
            <form className="billing-form" onSubmit={createOrganization}>
              <div className="billing-form-heading"><p className="eyebrow">Step 3 of 3</p><h2>Set up your organization</h2><p>These billing details can be updated before your first purchase.</p></div>
              <label>Organization name<input className="input-field" value={organization.organizationName} onChange={(event) => setOrganization((current) => ({ ...current, organizationName: event.target.value }))} required /></label>
              <div className="billing-form-grid">
                <label>Billing contact<input className="input-field" value={organization.billingName} onChange={(event) => setOrganization((current) => ({ ...current, billingName: event.target.value }))} required /></label>
                <label>Billing email<input className="input-field" type="email" value={auth.currentUser?.email || organization.billingEmail} disabled /></label>
                <label>Phone (optional)<input className="input-field" inputMode="tel" value={organization.billingPhone} onChange={(event) => setOrganization((current) => ({ ...current, billingPhone: event.target.value }))} /></label>
                <label>GSTIN (optional)<input className="input-field" maxLength={15} value={organization.gstin} onChange={(event) => setOrganization((current) => ({ ...current, gstin: event.target.value.toUpperCase() }))} /></label>
              </div>
              <label className="billing-policy-check">
                <input type="checkbox" checked={policiesAccepted} onChange={(event) => setPoliciesAccepted(event.target.checked)} />
                <span>I accept the Smartly Manage <Link to="/terms" target="_blank">Terms</Link> (v{policyVersions.terms}), no-refund <Link to="/refund-policy" target="_blank">Refund Policy</Link> (v{policyVersions.refund}), and cycle-end <Link to="/cancellation-policy" target="_blank">Cancellation Policy</Link> (v{policyVersions.cancellation}).</span>
              </label>
              <button className="btn-primary" disabled={loading}>{loading ? 'Creating organization…' : <><CheckCircle2 size={17} /> Create organization</>}</button>
              <button className="billing-link-button" type="button" onClick={() => void handleUseAnotherAccount()}>Use another account</button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
};
