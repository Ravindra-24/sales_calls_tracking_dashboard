import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  fetchBillingActivationSnapshot,
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
import { BillingCelebration, type BillingCelebrationData } from '../components/billing/BillingCelebration';
import {
  BILLING_ACTIVATION_POLL_LIMIT_MS,
  SELECTED_BILLING_PLAN_KEY,
  billingActivationPollDelay,
  billingActivationStorageKey,
  billingCelebratedStorageKey,
  findTerminalActivationPayment,
  matchBillingActivation,
  parseBillingActivationAttempt,
  readBillingStorage,
  removeBillingStorage,
  resolveCheckoutActivationAction,
  shouldTrackRecoveryActivation,
  writeBillingStorage,
  verificationFailureIsDeterministic,
  type BillingActivationAction,
  type BillingActivationAttempt,
} from '../components/billing/billingActivation';
import { useAuth } from '../context/auth';
import { useFeedback } from '../context/feedback';
import type {
  BillingAccount,
  BillingActivationSnapshot,
  BillingCatalog,
  BillingCatalogPlan,
  BillingCheckoutSession,
  BillingInvoice,
  BillingPayment,
  BillingPlanCode,
  BillingSubscription,
} from '../types/billing';
import '../styles/billing-celebration.css';

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

const readCheckoutSessionStorage = (key: string) => {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeCheckoutSessionStorage = (key: string, value: string) => {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // The operation ID remains valid in memory when browser storage is blocked.
  }
};

const removeCheckoutSessionStorage = (key: string) => {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // Checkout completion must not depend on browser storage availability.
  }
};

const getCheckoutOperationId = (orgId: string, priceVersionId: string) => {
  const key = checkoutOperationKey(orgId, priceVersionId);
  const existing = readCheckoutSessionStorage(key);
  if (existing) return existing;
  const operationId = newBillingOperationId();
  writeCheckoutSessionStorage(key, operationId);
  return operationId;
};

const clearCheckoutOperationIds = (orgId: string) => {
  const prefix = `leadwatch.checkoutOperation.${orgId}.`;
  try {
    for (let index = sessionStorage.length - 1; index >= 0; index -= 1) {
      const key = sessionStorage.key(index);
      if (key?.startsWith(prefix)) removeCheckoutSessionStorage(key);
    }
  } catch {
    // Nothing else in checkout completion depends on this optional cleanup.
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

const requestedBillingPlan = (value: string | null): BillingPlanCode | null => (
  value === 'pro' || value === 'max' ? value : null
);

const apiErrorCode = (error: unknown) => {
  if (!axios.isAxiosError(error)) return null;
  const code = error.response?.data?.error?.code;
  return typeof code === 'string' ? code : null;
};

const isDeterministicVerificationFailure = (error: unknown) => verificationFailureIsDeterministic({
  status: axios.isAxiosError(error) ? error.response?.status ?? null : null,
  code: apiErrorCode(error),
});

const mutationOutcomeIsAmbiguous = (error: unknown) => (
  !axios.isAxiosError(error)
  || !error.response
  || error.response.status === 408
  || error.response.status >= 500
);

const safeAuthorizationUrl = (value: string | null | undefined) => {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' ? parsed.toString() : null;
  } catch {
    return null;
  }
};

export const Billing = () => {
  const { claims, user } = useAuth();
  const { confirm, toast } = useFeedback();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
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
  const [pendingActivation, setPendingActivation] = useState<BillingActivationAttempt | null>(null);
  const [activationPhase, setActivationPhase] = useState<'idle' | 'processing' | 'timed_out'>('idle');
  const [activationPollRun, setActivationPollRun] = useState(0);
  const [celebration, setCelebration] = useState<BillingCelebrationData | null>(null);
  const [highlightedPlan, setHighlightedPlan] = useState<BillingPlanCode | null>(() => (
    requestedBillingPlan(searchParams.get('plan'))
      ?? requestedBillingPlan(readBillingStorage(SELECTED_BILLING_PLAN_KEY))
  ));
  const [authorizationUrl, setAuthorizationUrl] = useState<string | null>(null);
  const planSectionRef = useRef<HTMLElement>(null);
  const paymentHistoryRef = useRef<HTMLElement>(null);
  const highlightedPlanScrolled = useRef(false);
  const celebratedAttempts = useRef(new Set<string>());

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

  useEffect(() => {
    const queryPlan = requestedBillingPlan(searchParams.get('plan'));
    if (!queryPlan) return;
    setHighlightedPlan(queryPlan);
    highlightedPlanScrolled.current = false;
  }, [searchParams]);

  useEffect(() => {
    if (!catalog || !highlightedPlan || highlightedPlanScrolled.current) return;
    highlightedPlanScrolled.current = true;
    const frame = requestAnimationFrame(() => {
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      document.getElementById(`billing-plan-${highlightedPlan}`)?.scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth',
        block: 'center',
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [catalog, highlightedPlan]);

  useEffect(() => {
    if (!claims.orgId) return;
    const storageKey = billingActivationStorageKey(claims.orgId);
    const serialized = readBillingStorage(storageKey);
    const restored = parseBillingActivationAttempt(serialized, claims.orgId);
    if (!restored) {
      if (serialized) removeBillingStorage(storageKey);
      setPendingActivation(null);
      setActivationPhase('idle');
      return;
    }
    if (readBillingStorage(billingCelebratedStorageKey(claims.orgId)) === restored.attemptId) {
      removeBillingStorage(storageKey);
      setPendingActivation(null);
      setActivationPhase('idle');
      return;
    }
    setPendingActivation(restored);
    setActivationPhase('processing');
  }, [claims.orgId]);

  useEffect(() => {
    const selectedPlan = requestedBillingPlan(readBillingStorage(SELECTED_BILLING_PLAN_KEY));
    if (selectedPlan && selectedPlan === activePlan && effectiveAccount.accessMode === 'full') {
      removeBillingStorage(SELECTED_BILLING_PLAN_KEY);
    }
  }, [activePlan, effectiveAccount.accessMode]);

  const applyActivationSnapshot = useCallback((snapshot: BillingActivationSnapshot) => {
    setAccount(normalizeAccount(snapshot.account));
    setSubscription(snapshot.subscription);
    setPayments(snapshot.payments);
  }, []);

  const refreshActivationSnapshot = useCallback(async () => {
    const snapshot = await fetchBillingActivationSnapshot();
    applyActivationSnapshot(snapshot);
    return snapshot;
  }, [applyActivationSnapshot]);

  const persistActivationAttempt = useCallback((attempt: BillingActivationAttempt) => {
    writeBillingStorage(billingActivationStorageKey(attempt.orgId), JSON.stringify(attempt));
    setPendingActivation(attempt);
    setActivationPhase('processing');
    setActivationPollRun((current) => current + 1);
  }, []);

  const stageActivationAttempt = useCallback((attempt: BillingActivationAttempt) => {
    writeBillingStorage(billingActivationStorageKey(attempt.orgId), JSON.stringify(attempt));
  }, []);

  const clearActivationAttempt = useCallback((attempt: BillingActivationAttempt) => {
    removeBillingStorage(billingActivationStorageKey(attempt.orgId));
    setPendingActivation((current) => current?.attemptId === attempt.attemptId ? null : current);
    setActivationPhase('idle');
  }, []);

  const completeActivation = useCallback((
    attempt: BillingActivationAttempt,
    snapshot: BillingActivationSnapshot,
  ) => {
    removeBillingStorage(billingActivationStorageKey(attempt.orgId));
    removeBillingStorage(SELECTED_BILLING_PLAN_KEY);
    clearCheckoutOperationIds(attempt.orgId);
    setPendingActivation(null);
    setActivationPhase('idle');
    setActiveCheckout(null);
    setHighlightedPlan(null);
    setAuthorizationUrl(null);
    setMessage('');

    const celebratedKey = billingCelebratedStorageKey(attempt.orgId);
    if (celebratedAttempts.current.has(attempt.attemptId)
      || readBillingStorage(celebratedKey) === attempt.attemptId) return;
    celebratedAttempts.current.add(attempt.attemptId);
    writeBillingStorage(celebratedKey, attempt.attemptId);
    setCelebration({
      action: attempt.action,
      targetPlan: attempt.targetPlan,
      previousAccessMode: attempt.previousAccessMode,
      renewalDate: snapshot.subscription?.nextChargeAt || snapshot.subscription?.currentPeriodEnd,
      benefits: planFeatures[attempt.targetPlan],
      showPaymentHistory: true,
    });
  }, []);

  useEffect(() => {
    if (!pendingActivation || !canManageBilling) return;
    let cancelled = false;
    let checking = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let elapsedVisibleMs = 0;
    let visibleSince = document.hidden ? null : Date.now();

    const activeElapsed = () => elapsedVisibleMs + (visibleSince === null ? 0 : Date.now() - visibleSince);
    const clearTimer = () => {
      if (timer !== null) clearTimeout(timer);
      timer = null;
    };
    const timeout = () => {
      clearTimer();
      setActivationPhase('timed_out');
    };
    const schedule = (poll: () => Promise<void>) => {
      if (cancelled || document.hidden) return;
      const elapsed = activeElapsed();
      if (elapsed >= BILLING_ACTIVATION_POLL_LIMIT_MS) {
        timeout();
        return;
      }
      const delay = billingActivationPollDelay(elapsed);
      if (delay === null) {
        timeout();
        return;
      }
      timer = setTimeout(() => void poll(), delay);
    };

    const poll = async () => {
      if (cancelled || checking || document.hidden) return;
      if (activeElapsed() >= BILLING_ACTIVATION_POLL_LIMIT_MS) {
        timeout();
        return;
      }
      checking = true;
      try {
        const snapshot = await refreshActivationSnapshot();
        if (cancelled) return;
        const terminalPayment = findTerminalActivationPayment(pendingActivation, snapshot);
        if (terminalPayment) {
          cancelled = true;
          clearActivationAttempt(pendingActivation);
          setAuthorizationUrl(null);
          toast({
            variant: 'error',
            title: terminalPayment.status === 'refunded' ? 'Payment was refunded' : 'Payment failed',
            message: terminalPayment.failureDescription
              || 'Razorpay reported a terminal payment status. Your existing plan and access remain unchanged.',
          });
          return;
        }
        const match = matchBillingActivation(pendingActivation, snapshot);
        if (match.confirmed) {
          cancelled = true;
          completeActivation(pendingActivation, snapshot);
          return;
        }
      } catch {
        // A transient read failure is retried within the bounded activation window.
      } finally {
        checking = false;
      }
      schedule(poll);
    };

    const handleVisibilityChange = () => {
      clearTimer();
      if (document.hidden) {
        if (visibleSince !== null) elapsedVisibleMs += Date.now() - visibleSince;
        visibleSince = null;
        return;
      }
      visibleSince = Date.now();
      void poll();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    setActivationPhase('processing');
    void poll();
    return () => {
      cancelled = true;
      clearTimer();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activationPollRun, canManageBilling, clearActivationAttempt, completeActivation, pendingActivation, refreshActivationSnapshot, toast]);

  const newActivationAttempt = (
    action: BillingActivationAction,
    attemptId: string,
    checkoutSessionId: string | null,
    targetPlan: BillingPlanCode,
    targetPriceVersionId: string,
    correlatedPaymentId: string | null = null,
  ): BillingActivationAttempt => ({
    version: 1,
    orgId: claims.orgId,
    attemptId,
    checkoutSessionId,
    correlatedPaymentId,
    action,
    previousPlan: activePlan,
    previousAccessMode: effectiveAccount.accessMode,
    targetPlan,
    targetPriceVersionId,
    startedAt: Date.now(),
  });

  const completeCheckout = async (
    session: BillingCheckoutSession,
    planName: string,
    requestedAction?: BillingActivationAction | null,
  ) => {
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
    const targetPlan = requestedBillingPlan(checkoutPlanCode(session) ?? null);
    const activationAction = resolveCheckoutActivationAction({
      purpose: session.purpose,
      requestedAction,
      accessMode: effectiveAccount.accessMode,
    });
    const activationAttempt = activationAction && targetPlan && session.priceVersionId
      ? newActivationAttempt(activationAction, session.id, session.id, targetPlan, session.priceVersionId)
      : null;
    if (activationAttempt) stageActivationAttempt(activationAttempt);
    try {
      await verifyCheckoutSession(session.id, checkoutResult);
    } catch (verificationError) {
      if (!activationAttempt) {
        await loadBilling(true);
        throw verificationError;
      }
      let snapshot: BillingActivationSnapshot | null = null;
      try {
        snapshot = await refreshActivationSnapshot();
      } catch {
        // Network and server failures remain ambiguous; bounded polling continues.
      }
      if (snapshot) {
        const terminalPayment = findTerminalActivationPayment(activationAttempt, snapshot);
        if (terminalPayment) {
          clearActivationAttempt(activationAttempt);
          await loadBilling(true);
          throw new Error(terminalPayment.failureDescription || 'Razorpay reported that the payment failed.');
        }
        const match = matchBillingActivation(activationAttempt, snapshot);
        if (match.confirmed) {
          completeActivation(activationAttempt, snapshot);
          return;
        }
        const correlatedPayment = snapshot.payments.find((payment) => (
          payment.checkoutSessionId === activationAttempt.checkoutSessionId
        ));
        if (correlatedPayment && (correlatedPayment.status === 'authorized' || correlatedPayment.status === 'captured')) {
          persistActivationAttempt(activationAttempt);
          toast({
            variant: 'info',
            title: 'Activation check continues',
            message: 'Razorpay has the payment, and Smartly Manage is still confirming the subscription and full access.',
            duration: 7_000,
          });
          return;
        }
      }
      if (isDeterministicVerificationFailure(verificationError)) {
        clearActivationAttempt(activationAttempt);
        await loadBilling(true);
        throw verificationError;
      }
      toast({
        variant: 'info',
        title: 'Verification response delayed',
        message: 'Smartly Manage could not confirm the callback response yet. Your payment is not being marked failed; authoritative checks will continue for up to one minute.',
        duration: 7_000,
      });
      persistActivationAttempt(activationAttempt);
      return;
    }
    setActiveCheckout(null);
    if (activationAttempt) {
      persistActivationAttempt(activationAttempt);
      setMessage('');
    } else {
      clearCheckoutOperationIds(claims.orgId);
      setMessage(session.purpose === 'replacement_downgrade'
        ? 'Replacement mandate verified. The downgrade is scheduled only after Razorpay confirms authorization.'
        : 'Payment response verified. Billing status will update after Razorpay confirms the result.');
      await loadBilling(true);
    }
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
    const confirmed = await confirm({
      title: `Switch to ${plan.name}?`,
      description: `You already have a ${checkoutPlanName(activeCheckout)} checkout awaiting payment. It must be cancelled before a new checkout can start.`,
      confirmLabel: `Cancel and start ${plan.name}`,
      cancelLabel: 'Keep current checkout',
      variant: 'warning',
    });
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
    setAuthorizationUrl(null);
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
        removeCheckoutSessionStorage(operationStorageKey);
        operationId = getCheckoutOperationId(claims.orgId, price.id);
        const replacement = await createCheckoutSession({
          priceVersionId: price.id,
          couponCode: couponCode.trim() || undefined,
          operationId,
        });
        await completeCheckout(replacement, plan.name, 'initial');
      } else {
        await completeCheckout(session, plan.name, 'initial');
      }
      removeCheckoutSessionStorage(operationStorageKey);
    } catch (requestError) {
      if (requestError instanceof RazorpayCheckoutDismissedError) {
        setMessage('Checkout saved. Resume payment from Payment history, or cancel it before choosing another plan.');
      } else {
        const errorMessage = getApiErrorMessage(requestError, requestError instanceof Error ? requestError.message : 'Checkout could not be started.');
        toast({ variant: 'error', title: 'Checkout not started', message: errorMessage });
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
    setAuthorizationUrl(null);
    let provisionalAttempt: BillingActivationAttempt | null = null;
    try {
      const preparation = await prepareCheckoutForPlan(plan);
      if (!preparation.proceed) return;
      if (!preparation.switchConfirmed && !await confirm({
        title: activePlan === 'max' && plan.code === 'pro' ? 'Schedule downgrade?' : `Change to ${plan.name}?`,
        description: activePlan === 'max' && plan.code === 'pro'
          ? 'The change is scheduled for the end of your current paid cycle. Your Max access continues until then.'
          : `Smartly Manage will ask Razorpay to ${changeLabel}. Paid access changes only after provider confirmation.`,
        confirmLabel: activePlan === 'max' && plan.code === 'pro' ? 'Schedule downgrade' : `Change to ${plan.name}`,
        variant: activePlan === 'max' && plan.code === 'pro' ? 'warning' : 'default',
      })) return;
      const operationId = newBillingOperationId();
      if (activePlan === 'pro' && plan.code === 'max') {
        provisionalAttempt = newActivationAttempt(
          'upgrade',
          operationId,
          null,
          plan.code,
          price.id,
        );
        persistActivationAttempt(provisionalAttempt);
      }
      const result = await changeBillingPlan(price.id, operationId);
      setAuthorizationUrl(result.status === 'awaiting_customer' || result.status === 'awaiting_payment'
        ? safeAuthorizationUrl(result.authorizationUrl)
        : null);
      const nestedCheckout = result.checkoutSession;
      if (isCheckoutSession(nestedCheckout) && nestedCheckout.keyId && nestedCheckout.providerSubscriptionId) {
        if (provisionalAttempt) {
          clearActivationAttempt(provisionalAttempt);
          provisionalAttempt = null;
        }
        await completeCheckout(
          nestedCheckout,
          plan.name,
          activePlan === 'max' && plan.code === 'pro' ? null : 'upgrade',
        );
      } else if (activePlan === 'pro' && plan.code === 'max') {
        provisionalAttempt = {
          ...provisionalAttempt!,
          attemptId: result.activationOperationId,
          targetPriceVersionId: result.targetPriceVersionId,
        };
        persistActivationAttempt(provisionalAttempt);
        setMessage('');
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
        if (provisionalAttempt && !mutationOutcomeIsAmbiguous(requestError)) {
          clearActivationAttempt(provisionalAttempt);
          provisionalAttempt = null;
        }
        toast({
          variant: provisionalAttempt ? 'info' : 'error',
          title: provisionalAttempt ? 'Upgrade outcome is being checked' : 'Plan unchanged',
          message: provisionalAttempt
            ? 'The server response was interrupted. Smartly Manage will check for the exact upgrade operation before changing what you see.'
            : getApiErrorMessage(requestError, 'Plan change could not be completed. Your current plan remains active.'),
        });
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
        toast({ variant: 'error', title: 'Checkout not resumed', message: getApiErrorMessage(requestError, 'Checkout could not be resumed.') });
      }
    } finally {
      setWorkingAction('');
    }
  };

  const cancelActiveCheckout = async () => {
    if (!activeCheckout || !await confirm({
      title: `Cancel ${checkoutPlanName(activeCheckout)} checkout?`,
      description: 'No payment will be started. You can choose this plan again later.',
      confirmLabel: 'Cancel checkout',
      cancelLabel: 'Keep checkout',
      variant: 'danger',
    })) return;
    setWorkingAction('cancel-checkout');
    setError('');
    setMessage('');
    try {
      await abandonPendingCheckout(activeCheckout);
      setMessage('Pending checkout cancelled. You can now choose another plan.');
      toast({ variant: 'success', message: 'Pending checkout cancelled.' });
      await loadBilling(true);
    } catch (requestError) {
      toast({ variant: 'error', title: 'Checkout not cancelled', message: getApiErrorMessage(requestError, 'Checkout could not be cancelled. No new checkout was started.') });
    } finally {
      setWorkingAction('');
    }
  };

  const cancelSubscription = async () => {
    if (!await confirm({
      title: 'Schedule subscription cancellation?',
      description: `Your ${billingPlanName(activePlan)} access continues through ${formatBillingDate(subscription?.currentPeriodEnd)}. Future renewals stop at the cycle end, and no refund is created.`,
      confirmLabel: 'Schedule cancellation',
      cancelLabel: 'Keep subscription',
      variant: 'danger',
    })) return;
    setWorkingAction('cancel');
    setError('');
    setMessage('');
    try {
      await cancelBillingSubscription(newBillingOperationId());
      setMessage('Cancellation is scheduled for the end of the current paid cycle. No automatic refund was created.');
      toast({ variant: 'success', message: 'Cancellation scheduled for the cycle end.' });
      await loadBilling(true);
    } catch (requestError) {
      toast({ variant: 'error', title: 'Cancellation not scheduled', message: getApiErrorMessage(requestError, 'Cancellation could not be scheduled.') });
    } finally {
      setWorkingAction('');
    }
  };

  const recoverSubscription = async () => {
    setWorkingAction('recover');
    setError('');
    setMessage('');
    setAuthorizationUrl(null);
    const resumableAttempt = pendingActivation?.action === 'recovery'
      && !pendingActivation.correlatedPaymentId ? pendingActivation : null;
    const targetPlan = requestedBillingPlan(activePlan);
    const targetPriceVersionId = subscription?.priceVersionId || effectiveAccount.currentPriceVersionId;
    const operationId = resumableAttempt?.attemptId ?? newBillingOperationId();
    const provisionalAttempt = resumableAttempt ?? (targetPlan && targetPriceVersionId
      ? newActivationAttempt(
        'recovery',
        operationId,
        null,
        targetPlan,
        targetPriceVersionId,
      )
      : null);
    if (provisionalAttempt) stageActivationAttempt(provisionalAttempt);
    try {
      const result = await recoverBillingSubscription(operationId);
      setAuthorizationUrl(result.status === 'recovered'
        ? null
        : safeAuthorizationUrl(result.authorizationUrl));
      if (shouldTrackRecoveryActivation(result.status)) {
        persistActivationAttempt({
          ...(provisionalAttempt ?? newActivationAttempt(
            'recovery',
            operationId,
            null,
            result.targetPlan,
            result.targetPriceVersionId,
          )),
          targetPlan: result.targetPlan,
          targetPriceVersionId: result.targetPriceVersionId,
          correlatedPaymentId: result.correlatedPaymentId,
        });
        setMessage('');
      } else {
        if (provisionalAttempt) clearActivationAttempt(provisionalAttempt);
        setMessage(result.status === 'replacement_required'
          ? 'A replacement payment mandate is required before full access can return.'
          : 'Payment is still required. Full access returns only after Razorpay confirms a captured payment for the new service period.');
        await loadBilling(true);
      }
    } catch (requestError) {
      if (requestError instanceof RazorpayCheckoutDismissedError) {
        setMessage('Checkout saved. Resume payment from Payment history when you are ready.');
      } else {
        const ambiguous = mutationOutcomeIsAmbiguous(requestError);
        if (provisionalAttempt && ambiguous) persistActivationAttempt(provisionalAttempt);
        else if (provisionalAttempt) clearActivationAttempt(provisionalAttempt);
        toast({
          variant: ambiguous ? 'info' : 'error',
          title: ambiguous ? 'Recovery outcome is being checked' : 'Recovery not started',
          message: ambiguous
            ? 'The response was interrupted. Smartly Manage will check the exact recovery operation, and Retry will reuse the same operation ID.'
            : getApiErrorMessage(requestError, 'Payment recovery could not be started.'),
        });
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
      toast({ variant: 'error', title: 'Download unavailable', message: getApiErrorMessage(requestError, 'Billing document could not be downloaded.') });
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
      setMessage('');
      toast({ variant: 'success', message: 'Billing contact and tax address updated.' });
    } catch (requestError) {
      toast({ variant: 'error', title: 'Billing details not saved', message: getApiErrorMessage(requestError, 'Billing contact could not be updated.') });
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

      {pendingActivation && (
        <div className={`billing-activation-banner${activationPhase === 'timed_out' ? ' timed-out' : ''}`} role="status" aria-live="polite">
          {activationPhase === 'timed_out' ? <Clock3 size={22} /> : <LoaderCircle className="spin" size={22} />}
          <div>
            <strong>{activationPhase === 'timed_out'
              ? 'Your plan is still processing'
              : pendingActivation.checkoutSessionId
                ? 'Payment confirmed—activating your plan.'
                : pendingActivation.action === 'recovery'
                  ? !pendingActivation.correlatedPaymentId
                    ? 'Recovery outcome is being checked.'
                    : pendingActivation.previousAccessMode === 'read_only'
                      ? 'Restoring full organization access.'
                      : 'Payment recovered—confirming continued full access.'
                  : 'Upgrade requested—confirming your payment and plan.'}</strong>
            <p>{activationPhase === 'timed_out'
              ? 'This is not a payment failure. Razorpay confirmation can take longer than usual; refresh to check the authoritative status again.'
              : pendingActivation.action === 'recovery' && !pendingActivation.correlatedPaymentId
                ? 'Smartly Manage is checking the exact recovery operation before changing your plan or access status.'
                : `Smartly Manage is confirming the ${billingPlanName(pendingActivation.targetPlan)} subscription, captured payment, and full organization access.`}</p>
          </div>
          {activationPhase === 'timed_out' && (
            <button className="secondary-button" type="button" disabled={workingAction === 'recover'} onClick={() => {
              if (pendingActivation.action === 'recovery' && !pendingActivation.correlatedPaymentId) {
                void recoverSubscription();
                return;
              }
              setActivationPhase('processing');
              setActivationPollRun((current) => current + 1);
            }}><RefreshCw size={16} /> {pendingActivation.action === 'recovery' && !pendingActivation.correlatedPaymentId ? 'Retry recovery' : 'Refresh status'}</button>
          )}
        </div>
      )}

      {authorizationUrl && (
        <div className="billing-activation-banner authorization-required">
          <CreditCard size={22} />
          <div>
            <strong>Complete the payment step with Razorpay</strong>
            <p>Use the secure provider page to authorize or complete payment, then return here and refresh your billing status.</p>
          </div>
          <a className="secondary-button billing-action-link" href={authorizationUrl} target="_blank" rel="noreferrer">
            Continue securely <ArrowUpRight size={16} />
          </a>
        </div>
      )}

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

      <section ref={planSectionRef} className="section-card billing-plan-section">
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
            const requested = highlightedPlan === plan.code && !current;
            return (
              <article id={`billing-plan-${plan.code}`} className={`billing-plan-card${current ? ' current' : ''}${requested ? ' requested' : ''}`} key={plan.code}>
                <div className="billing-plan-card-head"><div><span>{current ? 'Current plan' : requested ? 'Selected plan' : plan.code === 'max' ? 'Best value' : 'Plan'}</span><h3>{plan.name}</h3></div>{current && <CheckCircle2 size={21} />}</div>
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
                  <a className="secondary-button billing-action-link" href="mailto:sales@leadwatch.app?subject=Smartly%20Manage%20Enterprise">Contact sales <ArrowUpRight size={15} /></a>
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

      <section ref={paymentHistoryRef} id="billing-payment-history" className="billing-history-grid">
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
          <div className="section-heading table-heading"><div><h2>Tax invoices & credit notes</h2><p>Smartly Manage-issued documents, separate from payment confirmation.</p></div><FileText size={20} /></div>
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

      {celebration && (
        <BillingCelebration
          celebration={celebration}
          onClose={() => setCelebration(null)}
          onOpenDashboard={() => {
            setCelebration(null);
            navigate('/dashboard');
          }}
          onViewPaymentHistory={() => {
            setCelebration(null);
            requestAnimationFrame(() => paymentHistoryRef.current?.scrollIntoView({
              behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
              block: 'start',
            }));
          }}
        />
      )}
    </div>
  );
};
