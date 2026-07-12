import type {
  BillingAccessMode,
  BillingActivationSnapshot,
  BillingCheckoutSession,
  BillingPayment,
  BillingPlanCode,
} from '../../types/billing';

export const BILLING_ACTIVATION_MAX_AGE_MS = 24 * 60 * 60 * 1000;
export const BILLING_ACTIVATION_POLL_LIMIT_MS = 60 * 1000;
export const SELECTED_BILLING_PLAN_KEY = 'leadwatch.selectedBillingPlan';

export type BillingActivationAction = 'initial' | 'upgrade' | 'recovery';

export interface BillingActivationAttempt {
  version: 1;
  orgId: string;
  attemptId: string;
  checkoutSessionId: string | null;
  correlatedPaymentId: string | null;
  action: BillingActivationAction;
  previousPlan: BillingPlanCode;
  previousAccessMode: BillingAccessMode;
  targetPlan: BillingPlanCode;
  targetPriceVersionId: string;
  startedAt: number;
}

export interface BillingActivationMatch {
  confirmed: boolean;
  payment: BillingPayment | null;
}

export const billingActivationStorageKey = (orgId: string) => `leadwatch.billingActivation.${orgId}`;
export const billingCelebratedStorageKey = (orgId: string) => `leadwatch.billingCelebrated.${orgId}`;

export const readBillingStorage = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

export const writeBillingStorage = (key: string, value: string): boolean => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
};

export const removeBillingStorage = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch {
    // Persistence is optional; in-memory verification must continue.
  }
};

export const verificationFailureIsDeterministic = (input: {
  status: number | null;
  code: string | null;
}): boolean => input.code === 'INVALID_PAYMENT_SIGNATURE'
  || input.code === 'PAYMENT_AMOUNT_MISMATCH'
  || Boolean(
    input.status
    && input.status >= 400
    && input.status < 500
    && input.status !== 408
    && input.status !== 429
  );

export const billingActivationPollDelay = (elapsedMs: number): number | null => {
  if (elapsedMs >= BILLING_ACTIVATION_POLL_LIMIT_MS) return null;
  return elapsedMs < 15_000 ? 2_000 : 5_000;
};

export const resolveCheckoutActivationAction = (input: {
  purpose?: BillingCheckoutSession['purpose'];
  requestedAction?: BillingActivationAction | null;
  accessMode: BillingAccessMode;
}): BillingActivationAction | null => {
  if (input.purpose === 'replacement_downgrade') return null;
  if (input.requestedAction !== undefined) return input.requestedAction;
  if (input.purpose === 'replacement_upgrade') return 'upgrade';
  if (input.accessMode === 'read_only') return 'recovery';
  return 'initial';
};

export const shouldTrackRecoveryActivation = (status: string) => status === 'recovered';

const paidPlan = (value: unknown): value is BillingPlanCode => value === 'pro' || value === 'max';
const activationAction = (value: unknown): value is BillingActivationAction => (
  value === 'initial' || value === 'upgrade' || value === 'recovery'
);

export const parseBillingActivationAttempt = (
  serialized: string | null,
  orgId: string,
  now = Date.now(),
): BillingActivationAttempt | null => {
  if (!serialized) return null;
  try {
    const candidate = JSON.parse(serialized) as Partial<BillingActivationAttempt>;
    if (
      candidate.version !== 1
      || candidate.orgId !== orgId
      || typeof candidate.attemptId !== 'string'
      || !candidate.attemptId
      || (candidate.checkoutSessionId !== null && typeof candidate.checkoutSessionId !== 'string')
      || (candidate.correlatedPaymentId !== undefined
        && candidate.correlatedPaymentId !== null
        && typeof candidate.correlatedPaymentId !== 'string')
      || !activationAction(candidate.action)
      || !paidPlan(candidate.previousPlan) && candidate.previousPlan !== 'lite'
      || (candidate.previousAccessMode !== 'full' && candidate.previousAccessMode !== 'read_only')
      || !paidPlan(candidate.targetPlan)
      || typeof candidate.targetPriceVersionId !== 'string'
      || !candidate.targetPriceVersionId
      || typeof candidate.startedAt !== 'number'
      || !Number.isFinite(candidate.startedAt)
      || candidate.startedAt > now + 60_000
      || now - candidate.startedAt > BILLING_ACTIVATION_MAX_AGE_MS
    ) return null;
    return { ...candidate, correlatedPaymentId: candidate.correlatedPaymentId ?? null } as BillingActivationAttempt;
  } catch {
    return null;
  }
};

export const findActivationPayment = (
  attempt: BillingActivationAttempt,
  snapshot: BillingActivationSnapshot,
): BillingPayment | null => {
  const captured = snapshot.payments.filter((payment) => (
    payment.status === 'captured' && payment.planCode === attempt.targetPlan
  ));

  if (attempt.checkoutSessionId) {
    return captured.find((payment) => payment.checkoutSessionId === attempt.checkoutSessionId) ?? null;
  }

  if (attempt.correlatedPaymentId) {
    return captured.find((payment) => payment.id === attempt.correlatedPaymentId) ?? null;
  }

  if (attempt.action === 'recovery') {
    return captured.find((payment) => payment.recoveryOperationId === attempt.attemptId) ?? null;
  }

  if (attempt.action === 'upgrade') {
    return captured.find((payment) => payment.activationOperationId === attempt.attemptId) ?? null;
  }
  return null;
};

export const findTerminalActivationPayment = (
  attempt: BillingActivationAttempt,
  snapshot: BillingActivationSnapshot,
): BillingPayment | null => snapshot.payments.find((payment) => {
  if (payment.status !== 'failed' && payment.status !== 'refunded') return false;
  if (attempt.checkoutSessionId) return payment.checkoutSessionId === attempt.checkoutSessionId;
  if (attempt.correlatedPaymentId) return payment.id === attempt.correlatedPaymentId;
  if (attempt.action === 'recovery') return payment.recoveryOperationId === attempt.attemptId;
  return attempt.action === 'upgrade' && payment.activationOperationId === attempt.attemptId;
}) ?? null;

export const matchBillingActivation = (
  attempt: BillingActivationAttempt,
  snapshot: BillingActivationSnapshot,
): BillingActivationMatch => {
  const account = snapshot.account;
  const subscription = snapshot.subscription;
  const payment = findActivationPayment(attempt, snapshot);
  const resolvedPriceVersionId = payment?.priceVersionId ?? attempt.targetPriceVersionId;
  const accountMatches = Boolean(
    account
    && account.effectivePlan === attempt.targetPlan
    && account.currentPriceVersionId === resolvedPriceVersionId
    && account.planSource === 'razorpay'
    && account.accessMode === 'full'
  );
  const subscriptionMatches = Boolean(
    subscription
    && subscription.planCode === attempt.targetPlan
    && subscription.priceVersionId === resolvedPriceVersionId
    && (subscription.status === 'active' || subscription.status === 'cancel_scheduled')
  );
  const paymentMatches = Boolean(
    payment
    && payment.subscriptionId === subscription?.id
    && payment.priceVersionId === resolvedPriceVersionId
  );
  return { confirmed: accountMatches && subscriptionMatches && paymentMatches, payment };
};
