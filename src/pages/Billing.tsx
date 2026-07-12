import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  Clock3,
  CreditCard,
  Download,
  FileText,
  LoaderCircle,
  LockKeyhole,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { getApiErrorMessage } from '../api/client';
import {
  billingCycleLabel,
  billingPlanName,
  cancelBillingSubscription,
  abandonCheckoutSession,
  changeBillingPlan,
  createCheckoutSession,
  downloadBillingInvoice,
  fetchActiveCheckoutSession,
  fetchBillingAccount,
  fetchBillingCatalog,
  fetchBillingInvoices,
  fetchBillingPayments,
  fetchBillingSubscription,
  formatBillingDate,
  formatBillingMoney,
  newBillingOperationId,
  recoverBillingSubscription,
  updateBillingContact,
  verifyCheckoutSession,
} from '../api/billing';
import { openRazorpaySubscriptionCheckout, RazorpayCheckoutDismissedError } from '../api/razorpay';
import { useAuth } from '../context/auth';
import type {
  BillingAccount,
  BillingCatalog,
  BillingCatalogPlan,
  BillingCheckoutSession,
  BillingInvoice,
  BillingPayment,
  BillingSubscription,
} from '../types/billing';

const planFeatures: Record<BillingCatalogPlan['code'], string[]> = {
  lite: ['Call tracking essentials', 'Team activity dashboard', 'No payment method required'],
  pro: ['Manager and org admin workflows', 'Quarterly organization billing', 'Core reporting and team controls'],
  max: ['Growth integration limits', 'Annual organization billing', 'Advanced API and webhook access'],
  enterprise: ['Custom commercial agreement', 'Enterprise integration limits', 'Audited manual activation'],
};

const normalizeAccount = (value: BillingAccount | null): BillingAccount => value ?? {
  effectivePlan: 'lite',
  planSource: 'free',
  accessMode: 'full',
};

const isCheckoutSession = (value: unknown): value is BillingCheckoutSession => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<BillingCheckoutSession>;
  return typeof candidate.id === 'string' && typeof candidate.status === 'string';
};

const checkoutOperationKey = (orgId: string, priceVersionId: string) => `leadwatch.checkoutOperation.${orgId}.${priceVersionId}`;

const getCheckoutOperationId = (orgId: string, priceVersionId: string) => {
  const key = checkoutOperationKey(orgId, priceVersionId);
  const existing = sessionStorage.getItem(key);
  if (existing) return existing;
  const operationId = newBillingOperationId();
  sessionStorage.setItem(key, operationId);
  return operationId;
};

const clearCheckoutOperationIds = (orgId: string) => {
  const prefix = `leadwatch.checkoutOperation.${orgId}.`;
  for (let index = sessionStorage.length - 1; index >= 0; index -= 1) {
    const key = sessionStorage.key(index);
    if (key?.startsWith(prefix)) sessionStorage.removeItem(key);
  }
};

const emptyBillingContact = {
  name: '', email: '', phone: '', legalName: '', gstin: '', line1: '', line2: '',
  city: '', state: '', postalCode: '',
};

const billingContactForm = (value: BillingAccount | null) => ({
  name: value?.billingContact?.name || '',
  email: value?.billingContact?.email || '',
  phone: value?.billingContact?.phone || '',
  legalName: value?.billingContact?.legalName || '',
  gstin: value?.billingContact?.gstin || '',
  line1: value?.billingContact?.address?.line1 || '',
  line2: value?.billingContact?.address?.line2 || '',
  city: value?.billingContact?.address?.city || '',
  state: value?.billingContact?.address?.state || '',
  postalCode: value?.billingContact?.address?.postalCode || '',
});

export const Billing = () => {
  const { claims, user } = useAuth();
  const [catalog, setCatalog] = useState<BillingCatalog | null>(null);
  const [account, setAccount] = useState<BillingAccount | null>(null);
  const [subscription, setSubscription] = useState<BillingSubscription | null>(null);
  const [activeCheckout, setActiveCheckout] = useState<BillingCheckoutSession | null>(null);
  const [payments, setPayments] = useState<BillingPayment[]>([]);
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingAction, setWorkingAction] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [contactForm, setContactForm] = useState(emptyBillingContact);

  const canManageBilling = claims.role === 'org_admin' || claims.role === 'manager';

  const loadBilling = useCallback(async (quiet = false) => {
    if (!canManageBilling) return;
    if (!quiet) setLoading(true);
    setError('');
    const [catalogResult, accountResult, subscriptionResult, activeCheckoutResult, paymentResult, invoiceResult] = await Promise.allSettled([
      fetchBillingCatalog(),
      fetchBillingAccount(),
      fetchBillingSubscription(),
      fetchActiveCheckoutSession(),
      fetchBillingPayments({ params: { limit: 50 } }),
      fetchBillingInvoices({ params: { limit: 50 } }),
    ]);

    if (catalogResult.status === 'fulfilled') setCatalog(catalogResult.value);
    if (accountResult.status === 'fulfilled') {
      const nextAccount = normalizeAccount(accountResult.value);
      setAccount(nextAccount);
      setContactForm(billingContactForm(nextAccount));
    }
    if (subscriptionResult.status === 'fulfilled') setSubscription(subscriptionResult.value);
    if (activeCheckoutResult.status === 'fulfilled') setActiveCheckout(activeCheckoutResult.value);
    if (paymentResult.status === 'fulfilled') setPayments(paymentResult.value.data);
    if (invoiceResult.status === 'fulfilled') setInvoices(invoiceResult.value.data);

    const failed = [accountResult, subscriptionResult, activeCheckoutResult, paymentResult, invoiceResult].filter((result) => result.status === 'rejected');
    if (failed.length === 5) {
      const reason = failed[0].status === 'rejected' ? failed[0].reason : null;
      setError(getApiErrorMessage(reason, 'Billing details are temporarily unavailable. Your current access is unchanged.'));
    } else if (failed.length > 0) {
      setError('Some billing history could not be loaded. Refresh before taking an action.');
    }
    setLoading(false);
  }, [canManageBilling]);

  useEffect(() => { void loadBilling(); }, [loadBilling]);

  const effectiveAccount = normalizeAccount(account);
  const activePlan = effectiveAccount.effectivePlan;
  const capturedPayments = useMemo(() => payments.filter((payment) => payment.status === 'captured' || payment.status === 'partially_refunded'), [payments]);
  const graceActive = Boolean(effectiveAccount.graceUntil && new Date(effectiveAccount.graceUntil).valueOf() > Date.now());
  const checkoutUnavailable = !catalog?.checkoutAvailable;
  const checkoutPlanCode = (session: BillingCheckoutSession) => session.planCode
    ?? catalog?.plans.find((plan) => plan.currentPrice?.id === session.priceVersionId)?.code;
  const checkoutPlanName = (session: BillingCheckoutSession) => billingPlanName(checkoutPlanCode(session));
  const checkoutIsForPlan = (session: BillingCheckoutSession, plan: BillingCatalogPlan) => (
    checkoutPlanCode(session) === plan.code || session.priceVersionId === plan.currentPrice?.id
  );
  const checkoutIsResumable = (session: BillingCheckoutSession) => session.resumable === true
    || (session.resumable === undefined && session.status === 'awaiting_customer');
  const checkoutIsCancellable = (session: BillingCheckoutSession) => session.cancellable === true
    || (session.cancellable === undefined && session.status === 'awaiting_customer');

  const completeCheckout = async (session: BillingCheckoutSession, planName: string) => {
    setActiveCheckout(session);
    if (!session.keyId || !session.providerSubscriptionId) {
      throw new Error('Secure checkout is not configured for this plan yet. No payment was started.');
    }
    const checkoutResult = await openRazorpaySubscriptionCheckout({
      keyId: session.keyId,
      providerSubscriptionId: session.providerSubscriptionId,
      planName,
      customer: {
        name: effectiveAccount.billingContact?.name || user?.displayName || undefined,
        email: effectiveAccount.billingContact?.email || user?.email || undefined,
        phone: effectiveAccount.billingContact?.phone,
      },
    });
    setActiveCheckout({ ...session, status: 'client_verified', resumable: false, cancellable: false });
    try {
      await verifyCheckoutSession(session.id, checkoutResult);
    } catch (verificationError) {
      await loadBilling(true);
      throw verificationError;
    }
    setActiveCheckout(null);
    clearCheckoutOperationIds(claims.orgId);
    setMessage(session.purpose === 'replacement_downgrade'
      ? 'Replacement mandate verified. The downgrade is scheduled only after Razorpay confirms authorization.'
      : 'Payment response verified. Paid access will activate after Razorpay confirms the captured payment.');
    await loadBilling(true);
  };

  const abandonPendingCheckout = async (session: BillingCheckoutSession) => {
    if (!checkoutIsCancellable(session)) {
      throw new Error(`${checkoutPlanName(session)} payment is already authorized or processing. Refresh billing before taking another action.`);
    }
    const abandoned = await abandonCheckoutSession(session.id);
    if (!['failed', 'expired', 'cancelled'].includes(abandoned.status)) {
      throw new Error('The pending checkout could not be cancelled. No new checkout was started.');
    }
    clearCheckoutOperationIds(claims.orgId);
    setActiveCheckout(null);
  };

  const prepareCheckoutForPlan = async (plan: BillingCatalogPlan) => {
    if (!activeCheckout) return { proceed: true, switchConfirmed: false };
    if (checkoutIsForPlan(activeCheckout, plan)) {
      if (!checkoutIsResumable(activeCheckout)) {
        throw new Error(`${checkoutPlanName(activeCheckout)} payment is already authorized or processing. Refresh billing to see its latest status.`);
      }
      await completeCheckout(activeCheckout, plan.name);
      return { proceed: false, switchConfirmed: false };
    }
    if (!checkoutIsCancellable(activeCheckout)) {
      throw new Error(`${checkoutPlanName(activeCheckout)} payment is already authorized or processing. A ${plan.name} checkout cannot start yet.`);
    }
    const confirmed = window.confirm(
      `You already have a ${checkoutPlanName(activeCheckout)} checkout awaiting payment. Cancel it and start a ${plan.name} checkout?`,
    );
    if (!confirmed) return { proceed: false, switchConfirmed: false };
    await abandonPendingCheckout(activeCheckout);
    return { proceed: true, switchConfirmed: true };
  };

  const purchasePlan = async (plan: BillingCatalogPlan) => {
    const price = plan.currentPrice;
    if (!price || !price.providerReady || !catalog?.checkoutAvailable) {
      setError('Checkout is not configured for this plan yet. Your current access and payment details are unchanged.');
      return;
    }
    setWorkingAction(plan.code);
    setError('');
    setMessage('');
    try {
      const preparation = await prepareCheckoutForPlan(plan);
      if (!preparation.proceed) return;
      const operationStorageKey = checkoutOperationKey(claims.orgId, price.id);
      let operationId = getCheckoutOperationId(claims.orgId, price.id);
      const session = await createCheckoutSession({
        priceVersionId: price.id,
        couponCode: couponCode.trim() || undefined,
        operationId,
      });
      if (session.status === 'expired' || session.status === 'failed') {
        sessionStorage.removeItem(operationStorageKey);
        operationId = getCheckoutOperationId(claims.orgId, price.id);
        const replacement = await createCheckoutSession({
          priceVersionId: price.id,
          couponCode: couponCode.trim() || undefined,
          operationId,
        });
        await completeCheckout(replacement, plan.name);
      } else {
        await completeCheckout(session, plan.name);
      }
      sessionStorage.removeItem(operationStorageKey);
    } catch (requestError) {
      if (requestError instanceof RazorpayCheckoutDismissedError) {
        setMessage('Checkout saved. Resume payment from Payment history, or cancel it before choosing another plan.');
      } else {
        setError(getApiErrorMessage(requestError, requestError instanceof Error ? requestError.message : 'Checkout could not be started.'));
      }
    } finally {
      setWorkingAction('');
    }
  };

  const changePlan = async (plan: BillingCatalogPlan) => {
    const price = plan.currentPrice;
    if (!price || !price.providerReady || !catalog?.checkoutAvailable) {
      setError('This plan change is unavailable until billing is configured.');
      return;
    }
    const changeLabel = activePlan === 'max' && plan.code === 'pro' ? 'schedule this downgrade at the cycle end' : `change to ${plan.name}`;
    setWorkingAction(plan.code);
    setError('');
    setMessage('');
    try {
      const preparation = await prepareCheckoutForPlan(plan);
      if (!preparation.proceed) return;
      if (!preparation.switchConfirmed && !window.confirm(`Do you want to ${changeLabel}?`)) return;
      const result = await changeBillingPlan(price.id, newBillingOperationId());
      const nestedCheckout = result && typeof result === 'object' && 'checkoutSession' in result
        ? (result as { checkoutSession?: unknown }).checkoutSession
        : result;
      if (isCheckoutSession(nestedCheckout) && nestedCheckout.keyId && nestedCheckout.providerSubscriptionId) {
        await completeCheckout(nestedCheckout, plan.name);
      } else {
        setMessage(activePlan === 'max' && plan.code === 'pro'
          ? 'Downgrade requested. It will take effect at the current paid-cycle end after authorization is complete.'
          : 'Plan change started. Billing status will update after provider confirmation.');
        await loadBilling(true);
      }
    } catch (requestError) {
      if (requestError instanceof RazorpayCheckoutDismissedError) {
        setMessage('Checkout saved. Resume payment from Payment history, or cancel it before choosing another plan.');
      } else {
        setError(getApiErrorMessage(requestError, 'Plan change could not be completed. Your current plan remains active.'));
      }
    } finally {
      setWorkingAction('');
    }
  };

  const resumeActiveCheckout = async () => {
    if (!activeCheckout) return;
    if (!checkoutIsResumable(activeCheckout)) {
      setError(`${checkoutPlanName(activeCheckout)} payment is already authorized or processing. Refresh billing to see its latest status.`);
      return;
    }
    setWorkingAction('resume-checkout');
    setError('');
    setMessage('');
    try {
      await completeCheckout(activeCheckout, checkoutPlanName(activeCheckout));
    } catch (requestError) {
      if (requestError instanceof RazorpayCheckoutDismissedError) {
        setMessage('Checkout saved. You can resume it again when you are ready.');
      } else {
        setError(getApiErrorMessage(requestError, 'Checkout could not be resumed.'));
      }
    } finally {
      setWorkingAction('');
    }
  };

  const cancelActiveCheckout = async () => {
    if (!activeCheckout || !window.confirm(`Cancel the pending ${checkoutPlanName(activeCheckout)} checkout? No payment will be started.`)) return;
    setWorkingAction('cancel-checkout');
    setError('');
    setMessage('');
    try {
      await abandonPendingCheckout(activeCheckout);
      setMessage('Pending checkout cancelled. You can now choose another plan.');
      await loadBilling(true);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Checkout could not be cancelled. No new checkout was started.'));
    } finally {
      setWorkingAction('');
    }
  };

  const cancelSubscription = async () => {
    if (!window.confirm('Schedule cancellation at the end of the current paid cycle? This cannot be reversed in place.')) return;
    setWorkingAction('cancel');
    setError('');
    setMessage('');
    try {
      await cancelBillingSubscription(newBillingOperationId());
      setMessage('Cancellation is scheduled for the end of the current paid cycle. No automatic refund was created.');
      await loadBilling(true);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Cancellation could not be scheduled.')); 
    } finally {
      setWorkingAction('');
    }
  };

  const recoverSubscription = async () => {
    setWorkingAction('recover');
    setError('');
    setMessage('');
    try {
      const result = await recoverBillingSubscription(newBillingOperationId());
      const nestedCheckout = result && typeof result === 'object' && 'checkoutSession' in result
        ? (result as { checkoutSession?: unknown }).checkoutSession
        : result;
      if (isCheckoutSession(nestedCheckout) && nestedCheckout.keyId && nestedCheckout.providerSubscriptionId) {
        await completeCheckout(nestedCheckout, `${activePlan} recovery`);
      } else {
        setMessage('Payment recovery started. Access returns only after a captured payment covers the new service period.');
        await loadBilling(true);
      }
    } catch (requestError) {
      if (requestError instanceof RazorpayCheckoutDismissedError) {
        setMessage('Checkout saved. Resume payment from Payment history when you are ready.');
      } else {
        setError(getApiErrorMessage(requestError, 'Payment recovery could not be started.'));
      }
    } finally {
      setWorkingAction('');
    }
  };

  const downloadInvoice = async (invoice: BillingInvoice) => {
    setWorkingAction(`invoice-${invoice.id}`);
    setError('');
    try {
      const blob = await downloadBillingInvoice(invoice.id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${invoice.invoiceNumber || invoice.id}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Billing document could not be downloaded.'));
    } finally {
      setWorkingAction('');
    }
  };

  const saveBillingContact = async (event: React.FormEvent) => {
    event.preventDefault();
    if (effectiveAccount.version === undefined) {
      setError('Refresh billing details before saving the billing contact.');
      return;
    }
    setWorkingAction('billing-contact');
    setError('');
    try {
      const updated = await updateBillingContact(effectiveAccount.version, {
        name: contactForm.name.trim(),
        email: contactForm.email.trim().toLowerCase(),
        phone: contactForm.phone.trim() || undefined,
        legalName: contactForm.legalName.trim() || null,
        gstin: contactForm.gstin.trim().toUpperCase() || undefined,
        address: {
          line1: contactForm.line1.trim(),
          line2: contactForm.line2.trim() || undefined,
          city: contactForm.city.trim(),
          state: contactForm.state.trim(),
          postalCode: contactForm.postalCode.trim(),
          country: 'IN',
        },
      });
      setAccount(updated);
      setContactForm(billingContactForm(updated));
      setMessage('Billing contact and place-of-supply details updated.');
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Billing contact could not be updated.'));
    } finally {
      setWorkingAction('');
    }
  };

  if (!canManageBilling) {
    return <div className="page animate-fade-in"><div className="notice error-notice">Billing is available to organization admins and managers.</div></div>;
  }

  if (loading) {
    return <div className="billing-page-loader"><LoaderCircle className="spin" size={26} /> Loading secure billing…</div>;
  }

  return (
    <div className="page billing-page animate-fade-in">
      <header className="page-header billing-page-header">
        <div><p className="eyebrow">Organization billing</p><h1>Plan & subscription</h1><p>Manage access, automatic renewals, invoices, payments, and cancellation.</p></div>
        <button className="secondary-button" type="button" onClick={() => void loadBilling()}><RefreshCw size={16} /> Refresh</button>
      </header>

      {effectiveAccount.accessMode === 'read_only' && (
        <div className="billing-critical-banner"><LockKeyhole size={22} /><div><strong>Billing read-only mode is active</strong><p>Reads and payment recovery remain available, but organization changes and mobile sync are blocked until payment recovery or downgrade.</p></div><button className="btn-primary" onClick={() => void recoverSubscription()} disabled={workingAction === 'recover'}>Recover payment</button></div>
      )}
      {graceActive && effectiveAccount.accessMode === 'full' && (
        <div className="billing-warning-banner"><Clock3 size={21} /><div><strong>Payment grace period</strong><p>Full access continues through {formatBillingDate(effectiveAccount.graceUntil)}. Recover payment before then to avoid read-only mode.</p></div><button className="secondary-button" onClick={() => void recoverSubscription()} disabled={workingAction === 'recover'}>Recover now</button></div>
      )}
      {catalog?.fallback && <div className="notice billing-info-notice"><AlertTriangle size={17} /> Live catalog could not be loaded. Default plan information is shown, and checkout is safely disabled.</div>}
      {!catalog?.fallback && checkoutUnavailable && <div className="notice billing-info-notice"><ShieldCheck size={17} /> Plan browsing is available, but checkout is currently disabled while payment and tax configuration is completed.</div>}
      {error && <div className="notice error-notice">{error}</div>}
      {message && <div className="notice success-notice">{message}</div>}

      <section className="billing-overview-grid">
        <article className="section-card billing-current-card">
          <div className="billing-card-icon"><Sparkles size={21} /></div>
          <div><span>Current plan</span><h2>{billingPlanName(activePlan)}</h2><p>{effectiveAccount.planSource.replaceAll('_', ' ')}</p></div>
          <span className={`billing-access-pill ${effectiveAccount.accessMode}`}>{effectiveAccount.accessMode === 'full' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}{effectiveAccount.accessMode.replace('_', ' ')}</span>
        </article>
        <article className="section-card billing-overview-card"><CalendarClock size={21} /><div><span>Next renewal</span><strong>{subscription?.cancelAtPeriodEnd ? 'Cancellation scheduled' : formatBillingDate(subscription?.nextChargeAt || subscription?.currentPeriodEnd)}</strong><p>{subscription?.cancelAtPeriodEnd ? `Access continues to ${formatBillingDate(subscription.currentPeriodEnd)}` : subscription ? 'Automatic payment mandate' : 'No paid renewal'}</p></div></article>
        <article className="section-card billing-overview-card"><ReceiptText size={21} /><div><span>Captured payments</span><strong>{capturedPayments.length}</strong><p>{formatBillingMoney(capturedPayments.reduce((total, payment) => total + payment.grossAmountPaise, 0))} total billed</p></div></article>
        <article className="section-card billing-overview-card"><ShieldCheck size={21} /><div><span>Subscription status</span><strong className="billing-capitalize">{subscription?.status?.replace('_', ' ') || 'Lite access'}</strong><p>{subscription ? `${subscription.paidCount ?? 0} of ${subscription.totalCount ?? '—'} cycles` : 'No payment method needed'}</p></div></article>
      </section>

      <section className="section-card billing-contact-card">
        <div className="section-heading"><div><h2>Billing contact & tax address</h2><p>Used for GST place-of-supply checks and locally generated tax documents.</p></div><ReceiptText size={20} /></div>
        <form className="billing-form" onSubmit={saveBillingContact}>
          <div className="billing-form-grid">
            <label>Contact name<input className="input-field" value={contactForm.name} onChange={(event) => setContactForm((current) => ({ ...current, name: event.target.value }))} required /></label>
            <label>Billing email<input className="input-field" type="email" value={contactForm.email} onChange={(event) => setContactForm((current) => ({ ...current, email: event.target.value }))} required /></label>
            <label>Phone<input className="input-field" value={contactForm.phone} onChange={(event) => setContactForm((current) => ({ ...current, phone: event.target.value }))} /></label>
            <label>Legal name (optional)<input className="input-field" value={contactForm.legalName} onChange={(event) => setContactForm((current) => ({ ...current, legalName: event.target.value }))} /></label>
            <label>GSTIN (optional)<input className="input-field" maxLength={15} value={contactForm.gstin} onChange={(event) => setContactForm((current) => ({ ...current, gstin: event.target.value.toUpperCase() }))} /></label>
            <label>Address line 1<input className="input-field" value={contactForm.line1} onChange={(event) => setContactForm((current) => ({ ...current, line1: event.target.value }))} required /></label>
            <label>Address line 2<input className="input-field" value={contactForm.line2} onChange={(event) => setContactForm((current) => ({ ...current, line2: event.target.value }))} /></label>
            <label>City<input className="input-field" value={contactForm.city} onChange={(event) => setContactForm((current) => ({ ...current, city: event.target.value }))} required /></label>
            <label>State<input className="input-field" value={contactForm.state} onChange={(event) => setContactForm((current) => ({ ...current, state: event.target.value }))} required /></label>
            <label>PIN code<input className="input-field" inputMode="numeric" maxLength={6} value={contactForm.postalCode} onChange={(event) => setContactForm((current) => ({ ...current, postalCode: event.target.value.replace(/\D/g, '') }))} required /></label>
          </div>
          <button className="secondary-button" disabled={workingAction === 'billing-contact'}>{workingAction === 'billing-contact' ? 'Saving…' : 'Save billing details'}</button>
        </form>
      </section>

      <section className="section-card billing-plan-section">
        <div className="section-heading billing-plan-heading"><div><h2>Available plans</h2><p>Prices are flat per organization. Discounts apply before configured GST.</p></div><label>Coupon or private deal<input className="input-field" value={couponCode} onChange={(event) => setCouponCode(event.target.value.toUpperCase())} placeholder="Optional code" /></label></div>
        <div className="billing-plan-grid">
          {catalog?.plans.map((plan) => {
            const current = plan.code === activePlan;
            const price = plan.currentPrice;
            const isEnterprise = plan.code === 'enterprise';
            const paidTarget = plan.code === 'pro' || plan.code === 'max';
            const resumesPendingCheckout = Boolean(activeCheckout && checkoutIsForPlan(activeCheckout, plan) && checkoutIsResumable(activeCheckout));
            const switchesPendingCheckout = Boolean(activeCheckout && !checkoutIsForPlan(activeCheckout, plan) && checkoutIsCancellable(activeCheckout));
            const checkoutProcessing = Boolean(activeCheckout && !checkoutIsResumable(activeCheckout) && !checkoutIsCancellable(activeCheckout));
            const actionDisabled = Boolean(workingAction) || checkoutProcessing || (paidTarget && (!catalog.checkoutAvailable || !price?.providerReady));
            return (
              <article className={`billing-plan-card${current ? ' current' : ''}`} key={plan.code}>
                <div className="billing-plan-card-head"><div><span>{current ? 'Current plan' : plan.code === 'max' ? 'Best value' : 'Plan'}</span><h3>{plan.name}</h3></div>{current && <CheckCircle2 size={21} />}</div>
                <div className="billing-plan-price">
                  {plan.code === 'lite' ? <><strong>₹0</strong><span>free forever</span></> : isEnterprise ? <><strong>Custom</strong><span>contact sales</span></> : <><strong>{formatBillingMoney(price?.baseAmountPaise)}</strong><span>{billingCycleLabel(plan.code, price?.billingPeriod, price?.interval)} + applicable GST</span></>}
                </div>
                {price && price.taxAmountPaise > 0 && <p className="billing-gross-line">Current gross: {formatBillingMoney(price.grossAmountPaise, price.currency)}</p>}
                <p>{plan.description}</p>
                <ul>{planFeatures[plan.code].map((feature) => <li key={feature}><CheckCircle2 size={15} /> {feature}</li>)}</ul>
                {current ? (
                  <button className="secondary-button" disabled>Current plan</button>
                ) : plan.code === 'lite' ? (
                  <button className="secondary-button" type="button" onClick={() => void cancelSubscription()} disabled={!subscription || Boolean(workingAction)}>{workingAction === 'cancel' ? 'Scheduling…' : 'Cancel to Lite at cycle end'}</button>
                ) : isEnterprise ? (
                  <a className="secondary-button billing-action-link" href="mailto:sales@leadwatch.app?subject=LeadWatch%20Enterprise">Contact sales <ArrowUpRight size={15} /></a>
                ) : activePlan === 'lite' || !subscription ? (
                  <button className="btn-primary" type="button" onClick={() => void purchasePlan(plan)} disabled={actionDisabled}>{workingAction === plan.code ? 'Opening checkout…' : resumesPendingCheckout ? `Resume ${plan.name}` : switchesPendingCheckout ? `Switch to ${plan.name}` : catalog.checkoutAvailable && price?.providerReady ? `Choose ${plan.name}` : 'Checkout unavailable'}</button>
                ) : (
                  <button className="btn-primary" type="button" onClick={() => void changePlan(plan)} disabled={actionDisabled}>{workingAction === plan.code ? 'Starting change…' : resumesPendingCheckout ? `Resume ${plan.name}` : switchesPendingCheckout ? `Switch to ${plan.name}` : activePlan === 'max' && plan.code === 'pro' ? 'Schedule downgrade' : `Change to ${plan.name}`}</button>
                )}
              </article>
            );
          })}
        </div>
      </section>

      {subscription && (
        <section className="section-card billing-subscription-card">
          <div className="section-heading"><div><h2>Subscription details</h2><p>Provider-confirmed status and locally projected access.</p></div><span className={`billing-status ${subscription.status}`}>{subscription.status.replace('_', ' ')}</span></div>
          <dl className="billing-detail-grid">
            <div><dt>Plan</dt><dd>{billingPlanName(subscription.planCode)}</dd></div>
            <div><dt>Current period</dt><dd>{formatBillingDate(subscription.currentPeriodStart)} – {formatBillingDate(subscription.currentPeriodEnd)}</dd></div>
            <div><dt>Automatic renewal</dt><dd>{subscription.cancelAtPeriodEnd ? 'Stops at cycle end' : 'Enabled'}</dd></div>
            <div><dt>Cycles</dt><dd>{subscription.paidCount ?? 0} paid / {subscription.totalCount ?? '—'} configured</dd></div>
            {subscription.scheduledChange && <div><dt>Scheduled change</dt><dd>{billingPlanName(subscription.scheduledChange.planCode)} on {formatBillingDate(subscription.scheduledChange.effectiveAt)}</dd></div>}
          </dl>
          <div className="billing-inline-actions">
            {(subscription.status === 'pending' || subscription.status === 'halted' || effectiveAccount.accessMode === 'read_only') && <button className="btn-primary" onClick={() => void recoverSubscription()} disabled={Boolean(workingAction)}><RotateCcw size={16} /> Recover payment</button>}
            {!subscription.cancelAtPeriodEnd && !['cancelled', 'completed', 'expired'].includes(subscription.status) && <button className="secondary-button danger-button" onClick={() => void cancelSubscription()} disabled={Boolean(workingAction)}>Schedule cancellation</button>}
          </div>
        </section>
      )}

      <section className="billing-history-grid">
        <article className="section-card table-card">
          <div className="section-heading table-heading"><div><h2>Payment history</h2><p>Pending checkout, captured, failed, and renewal activity.</p></div><CreditCard size={20} /></div>
          <div className="table-scroll"><table className="data-table billing-table"><thead><tr><th>Date</th><th>Payment</th><th>Amount</th><th>Status</th><th>Method</th><th>Actions</th></tr></thead><tbody>
            {activeCheckout && (
              <tr className="billing-checkout-row">
                <td data-label="Date">{formatBillingDate(activeCheckout.createdAt, true)}{activeCheckout.expiresAt && <small>Expires {formatBillingDate(activeCheckout.expiresAt, true)}</small>}</td>
                <td data-label="Payment"><strong>{checkoutIsResumable(activeCheckout) ? 'Pending' : 'Processing'} {checkoutPlanName(activeCheckout)} checkout</strong><small>{activeCheckout.providerSubscriptionId || activeCheckout.id}</small></td>
                <td data-label="Amount">{formatBillingMoney(activeCheckout.amountPaise, activeCheckout.currency)}</td>
                <td data-label="Status"><span className={`billing-status ${checkoutIsResumable(activeCheckout) ? 'awaiting_customer' : 'in_progress'}`}>{checkoutIsResumable(activeCheckout) ? 'awaiting customer' : 'processing'}</span></td>
                <td data-label="Method">Razorpay</td>
                <td data-label="Actions"><div className="row-actions billing-checkout-actions">
                  {checkoutIsResumable(activeCheckout) && <button className="billing-link-button" type="button" disabled={Boolean(workingAction)} onClick={() => void resumeActiveCheckout()}><RotateCcw size={15} /> {workingAction === 'resume-checkout' ? 'Opening…' : 'Resume payment'}</button>}
                  {checkoutIsCancellable(activeCheckout) && <button className="billing-link-button danger-button" type="button" disabled={Boolean(workingAction)} onClick={() => void cancelActiveCheckout()}><XCircle size={15} /> {workingAction === 'cancel-checkout' ? 'Cancelling…' : 'Cancel checkout'}</button>}
                  {!checkoutIsResumable(activeCheckout) && !checkoutIsCancellable(activeCheckout) && <button className="billing-link-button" type="button" onClick={() => void loadBilling(true)}><RefreshCw size={15} /> Refresh status</button>}
                </div></td>
              </tr>
            )}
            {payments.length === 0 && !activeCheckout ? <tr><td colSpan={6} className="table-message">No payments yet.</td></tr> : payments.map((payment) => (
              <tr key={payment.id}>
                <td data-label="Date">{formatBillingDate(payment.capturedAt || payment.createdAt)}</td>
                <td data-label="Payment"><strong>{payment.kind || 'payment'}</strong><small>{payment.providerPaymentId || payment.id}</small></td>
                <td data-label="Amount">{formatBillingMoney(payment.grossAmountPaise, payment.currency)}</td>
                <td data-label="Status"><span className={`billing-status ${payment.status}`}>{payment.status.replaceAll('_', ' ')}</span>{payment.failureDescription && <small className="billing-failure-copy">{payment.failureDescription}</small>}</td>
                <td data-label="Method">{payment.method?.type ? `${payment.method.type}${payment.method.last4 ? ` •••• ${payment.method.last4}` : ''}` : '—'}</td>
                <td data-label="Actions">—</td>
              </tr>
            ))}
          </tbody></table></div>
        </article>

        <article className="section-card table-card">
          <div className="section-heading table-heading"><div><h2>Tax invoices & credit notes</h2><p>LeadWatch-issued documents, separate from payment confirmation.</p></div><FileText size={20} /></div>
          <div className="table-scroll"><table className="data-table billing-table"><thead><tr><th>Issued</th><th>Document</th><th>Period</th><th>Amount</th><th>Status</th><th>Download</th></tr></thead><tbody>
            {invoices.length === 0 ? <tr><td colSpan={6} className="table-message">No billing documents yet.</td></tr> : invoices.map((invoice) => (
              <tr key={invoice.id}>
                <td data-label="Issued">{formatBillingDate(invoice.issuedAt || invoice.createdAt)}</td>
                <td data-label="Document"><strong>{invoice.invoiceNumber || (invoice.type || invoice.documentType)?.replace('_', ' ') || 'Invoice'}</strong><small>{invoice.id}</small></td>
                <td data-label="Period">{invoice.periodStart ? `${formatBillingDate(invoice.periodStart)} – ${formatBillingDate(invoice.periodEnd)}` : '—'}</td>
                <td data-label="Amount">{formatBillingMoney(invoice.grossAmountPaise, invoice.currency)}</td>
                <td data-label="Status"><span className={`billing-status ${invoice.status}`}>{invoice.status}</span></td>
                <td data-label="Download">{invoice.status === 'issued' && invoice.pdfPath ? <button className="billing-link-button" type="button" disabled={workingAction === `invoice-${invoice.id}`} onClick={() => void downloadInvoice(invoice)}><Download size={15} /> PDF</button> : invoice.status === 'failed' ? 'Generation failed' : 'Preparing'}</td>
              </tr>
            ))}
          </tbody></table></div>
        </article>
      </section>

      <section className="section-card billing-policy-card"><div><ShieldCheck size={21} /><div><h2>No-refund and cancellation policy</h2><p>All paid plan purchases and renewals are final and non-refundable. Cancellation stops future renewals at the end of the current paid cycle; it does not return any amount already paid.</p></div></div></section>
    </div>
  );
};
