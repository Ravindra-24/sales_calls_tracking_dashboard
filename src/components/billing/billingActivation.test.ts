import { describe, expect, it, vi } from 'vitest';
import type { BillingActivationSnapshot } from '../../types/billing';
import {
  billingActivationPollDelay,
  findTerminalActivationPayment,
  matchBillingActivation,
  parseBillingActivationAttempt,
  resolveCheckoutActivationAction,
  writeBillingStorage,
  verificationFailureIsDeterministic,
  shouldTrackRecoveryActivation,
  type BillingActivationAttempt,
} from './billingActivation';

const attempt: BillingActivationAttempt = {
  version: 1,
  orgId: 'org_1',
  attemptId: 'checkout_1',
  checkoutSessionId: 'checkout_1',
  correlatedPaymentId: null,
  action: 'initial',
  previousPlan: 'lite',
  previousAccessMode: 'full',
  targetPlan: 'pro',
  targetPriceVersionId: 'pro_v1',
  startedAt: Date.parse('2026-07-13T00:00:00.000Z'),
};

const activeSnapshot: BillingActivationSnapshot = {
  account: {
    effectivePlan: 'pro',
    planSource: 'razorpay',
    accessMode: 'full',
    currentPriceVersionId: 'pro_v1',
  },
  subscription: {
    id: 'subscription_1',
    planCode: 'pro',
    priceVersionId: 'pro_v1',
    status: 'active',
  },
  payments: [{
    id: 'payment_1',
    checkoutSessionId: 'checkout_1',
    subscriptionId: 'subscription_1',
    planCode: 'pro',
    priceVersionId: 'pro_v1',
    status: 'captured',
    grossAmountPaise: 199900,
    capturedAt: '2026-07-13T00:00:10.000Z',
  }],
};

describe('billing activation matching', () => {
  it('requires the exact checkout session for a checkout-driven activation', () => {
    expect(matchBillingActivation(attempt, activeSnapshot).confirmed).toBe(true);
    expect(matchBillingActivation(attempt, {
      ...activeSnapshot,
      payments: [{ ...activeSnapshot.payments[0], checkoutSessionId: 'another_checkout' }],
    }).confirmed).toBe(false);
  });

  it('stays pending through authorization and confirms after delayed capture', () => {
    expect(matchBillingActivation(attempt, {
      ...activeSnapshot,
      payments: [{ ...activeSnapshot.payments[0], status: 'authorized' }],
    }).confirmed).toBe(false);
    expect(matchBillingActivation(attempt, activeSnapshot).confirmed).toBe(true);
  });

  it('does not activate on authorization, read-only access, or the wrong price', () => {
    expect(matchBillingActivation(attempt, {
      ...activeSnapshot,
      payments: [{ ...activeSnapshot.payments[0], status: 'authorized' }],
    }).confirmed).toBe(false);
    expect(matchBillingActivation(attempt, {
      ...activeSnapshot,
      account: { ...activeSnapshot.account!, accessMode: 'read_only' },
    }).confirmed).toBe(false);
    expect(matchBillingActivation(attempt, {
      ...activeSnapshot,
      subscription: { ...activeSnapshot.subscription!, priceVersionId: 'pro_v2' },
    }).confirmed).toBe(false);
  });

  it('detects an exact failed checkout instead of treating it as a timeout', () => {
    const failedSnapshot = {
      ...activeSnapshot,
      payments: [{ ...activeSnapshot.payments[0], status: 'failed' as const }],
    };
    expect(findTerminalActivationPayment(attempt, failedSnapshot)?.id).toBe('payment_1');
    expect(findTerminalActivationPayment({ ...attempt, checkoutSessionId: 'another' }, failedSnapshot)).toBeNull();
  });

  it('accepts a captured current-subscription payment for recovery without a checkout', () => {
    const recovery = {
      ...attempt,
      action: 'recovery' as const,
      checkoutSessionId: null,
      correlatedPaymentId: 'payment_1',
    };
    expect(matchBillingActivation(recovery, activeSnapshot).confirmed).toBe(true);
  });

  it('resumes recovery after response loss using the exact recovery operation', () => {
    const provisionalRecovery = {
      ...attempt,
      attemptId: 'recovery_op_1',
      action: 'recovery' as const,
      checkoutSessionId: null,
      correlatedPaymentId: null,
    };
    const restored = parseBillingActivationAttempt(
      JSON.stringify(provisionalRecovery),
      provisionalRecovery.orgId,
      provisionalRecovery.startedAt + 10_000,
    );
    expect(matchBillingActivation(restored!, {
      ...activeSnapshot,
      payments: [{
        ...activeSnapshot.payments[0],
        checkoutSessionId: null,
        recoveryOperationId: 'recovery_op_1',
      }],
    }).confirmed).toBe(true);
    expect(matchBillingActivation(restored!, {
      ...activeSnapshot,
      payments: [{
        ...activeSnapshot.payments[0],
        checkoutSessionId: null,
        recoveryOperationId: 'another_recovery',
      }],
    }).confirmed).toBe(false);
  });

  it('uses exact operation and promotion-resolved price for a direct upgrade', () => {
    const upgrade = {
      ...attempt,
      action: 'upgrade' as const,
      attemptId: 'operation_1',
      checkoutSessionId: null,
      correlatedPaymentId: null,
      previousPlan: 'pro' as const,
      targetPlan: 'max' as const,
      targetPriceVersionId: 'max_catalog_v1',
    };
    const upgradedSnapshot: BillingActivationSnapshot = {
      account: {
        effectivePlan: 'max',
        planSource: 'razorpay',
        accessMode: 'full',
        currentPriceVersionId: 'max_promo_v1',
      },
      subscription: {
        id: 'subscription_1',
        planCode: 'max',
        priceVersionId: 'max_promo_v1',
        status: 'cancel_scheduled',
      },
      payments: [{
        id: 'upgrade_payment',
        subscriptionId: 'subscription_1',
        activationOperationId: 'operation_1',
        planCode: 'max',
        priceVersionId: 'max_promo_v1',
        status: 'captured',
        grossAmountPaise: 399900,
        capturedAt: new Date(upgrade.startedAt + 5_000).toISOString(),
      }],
    };
    const restoredAfterResponseLoss = parseBillingActivationAttempt(
      JSON.stringify(upgrade),
      upgrade.orgId,
      upgrade.startedAt + 30_000,
    );
    expect(restoredAfterResponseLoss).not.toBeNull();
    expect(matchBillingActivation(restoredAfterResponseLoss!, upgradedSnapshot).confirmed).toBe(true);
    expect(matchBillingActivation(upgrade, {
      ...upgradedSnapshot,
      payments: [{
        ...upgradedSnapshot.payments[0],
        activationOperationId: 'unrelated_operation',
      }],
    }).confirmed).toBe(false);
    expect(matchBillingActivation(upgrade, {
      ...upgradedSnapshot,
      payments: [{
        ...upgradedSnapshot.payments[0],
        planCode: 'pro',
        priceVersionId: 'pro_v1',
      }],
    }).confirmed).toBe(false);
  });
});

describe('persisted activation attempts', () => {
  it('rejects attempts older than 24 hours or belonging to another organization', () => {
    const serialized = JSON.stringify(attempt);
    expect(parseBillingActivationAttempt(serialized, 'org_1', attempt.startedAt + 60_000)).toEqual(attempt);
    expect(parseBillingActivationAttempt(serialized, 'org_2', attempt.startedAt + 60_000)).toBeNull();
    expect(parseBillingActivationAttempt(serialized, 'org_1', attempt.startedAt + 24 * 60 * 60 * 1000 + 1)).toBeNull();
  });

  it('keeps verification available when browser persistence is blocked', () => {
    const blocked = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Blocked', 'SecurityError');
    });
    expect(writeBillingStorage('leadwatch.test', 'value')).toBe(false);
    blocked.mockRestore();
  });
});

describe('activation flow safeguards', () => {
  it('uses the fast cadence first, slows down, and stops at 60 seconds', () => {
    expect(billingActivationPollDelay(0)).toBe(2_000);
    expect(billingActivationPollDelay(14_999)).toBe(2_000);
    expect(billingActivationPollDelay(15_000)).toBe(5_000);
    expect(billingActivationPollDelay(59_999)).toBe(5_000);
    expect(billingActivationPollDelay(60_000)).toBeNull();
  });

  it('never tracks a replacement downgrade as an activation celebration', () => {
    expect(resolveCheckoutActivationAction({
      purpose: 'replacement_downgrade',
      requestedAction: 'upgrade',
      accessMode: 'full',
    })).toBeNull();
    expect(resolveCheckoutActivationAction({ purpose: 'replacement_upgrade', accessMode: 'full' })).toBe('upgrade');
  });

  it('only tracks recovery once the backend reports restored access', () => {
    expect(shouldTrackRecoveryActivation('recovered')).toBe(true);
    expect(shouldTrackRecoveryActivation('payment_required')).toBe(false);
    expect(shouldTrackRecoveryActivation('replacement_required')).toBe(false);
  });

  it('separates deterministic verification rejection from ambiguous failures', () => {
    expect(verificationFailureIsDeterministic({ status: 400, code: 'INVALID_PAYMENT_SIGNATURE' })).toBe(true);
    expect(verificationFailureIsDeterministic({ status: 409, code: 'PAYMENT_AMOUNT_MISMATCH' })).toBe(true);
    expect(verificationFailureIsDeterministic({ status: 404, code: 'NOT_FOUND' })).toBe(true);
    expect(verificationFailureIsDeterministic({ status: 408, code: null })).toBe(false);
    expect(verificationFailureIsDeterministic({ status: 500, code: 'INTERNAL_ERROR' })).toBe(false);
    expect(verificationFailureIsDeterministic({ status: null, code: null })).toBe(false);
  });
});
