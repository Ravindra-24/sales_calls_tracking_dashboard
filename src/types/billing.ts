export type BillingPlanCode = 'lite' | 'pro' | 'max' | 'enterprise';
export type BillingPlanSource = 'free' | 'razorpay' | 'manual_enterprise' | 'complimentary_override';
export type BillingAccessMode = 'full' | 'read_only';
export type BillingSubscriptionStatus =
  | 'created'
  | 'authenticated'
  | 'active'
  | 'pending'
  | 'halted'
  | 'cancel_scheduled'
  | 'cancelled'
  | 'completed'
  | 'expired';
export type BillingOperationStatus =
  | 'created'
  | 'in_progress'
  | 'awaiting_customer'
  | 'succeeded'
  | 'failed'
  | 'unknown'
  | 'needs_review';

export interface BillingPriceVersion {
  id: string;
  planCode?: BillingPlanCode;
  baseAmountPaise: number;
  discountAmountPaise: number;
  taxAmountPaise: number;
  grossAmountPaise: number;
  currency: 'INR' | string;
  billingPeriod: 'monthly' | 'yearly' | string | null;
  interval: number | null;
  providerReady: boolean;
  providerPlanIds?: Partial<Record<'test' | 'live', string>>;
  active?: boolean;
  version?: number;
  taxRateBps?: number;
  subscriberCount?: number;
  createdAt?: string | null;
}

export interface BillingCatalogPlan {
  code: BillingPlanCode;
  name: string;
  description: string;
  currentPrice: BillingPriceVersion | null;
}

export interface BillingCatalog {
  mode: 'test' | 'live' | string;
  liveEnabled: boolean;
  checkoutAvailable: boolean;
  plans: BillingCatalogPlan[];
  policyVersions?: {
    terms: string;
    refund: string;
    cancellation: string;
  };
  fallback?: boolean;
}

export interface BillingSettings {
  checkoutEnabled: boolean;
  liveReady: boolean;
  legalAndTaxApproved: boolean;
  taxRateBps: number;
  invoicePrefix: string | null;
  creditNotePrefix: string | null;
  placeOfSupplyMode: 'billing_address' | 'seller_state' | null;
  merchant: {
    legalName: string | null;
    gstin: string | null;
    sellerAddress: string | null;
    sellerState: string | null;
    sac: string | null;
  };
  alertEmails: string[];
  alertingVerified: boolean;
  policyVersions: {
    terms: string;
    refund: string;
    cancellation: string;
  };
  webhookHealth?: {
    mode: 'test' | 'live';
    lastValidAt: string | null;
    providerEventId: string;
  } | null;
  version: number;
  updatedAt?: string | null;
}

export interface BillingSummary {
  capturedGrossPaise: number;
  capturedCount: number;
  processedRefundPaise: number;
  processedRefundCount: number;
  netCollectedPaise: number;
  unresolvedPaymentCount: number;
  renewalGrossPaise: number;
}

export interface BillingAccount {
  id?: string;
  orgId?: string;
  effectivePlan: BillingPlanCode;
  planSource: BillingPlanSource;
  accessMode: BillingAccessMode;
  version?: number;
  currentSubscriptionId?: string | null;
  currentPriceVersionId?: string | null;
  billingContact?: {
    name?: string;
    email?: string;
    phone?: string;
    gstin?: string;
    legalName?: string | null;
    address?: {
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      country?: 'IN';
    } | null;
  };
  firstFailureAt?: string | null;
  graceUntil?: string | null;
  manualEnterprise?: {
    contractReference?: string;
    startsAt?: string | null;
    endsAt?: string | null;
  } | null;
  updatedAt?: string | null;
}

export interface BillingSubscription {
  id: string;
  mode?: 'test' | 'live';
  providerSubscriptionId?: string | null;
  orgId?: string;
  planCode: BillingPlanCode;
  status: BillingSubscriptionStatus;
  source?: BillingPlanSource;
  priceVersionId?: string;
  promotionId?: string | null;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  nextChargeAt?: string | null;
  cancelAtPeriodEnd?: boolean;
  scheduledChange?: {
    planCode?: BillingPlanCode;
    effectiveAt?: string | null;
  } | null;
  paidCount?: number;
  totalCount?: number;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface BillingPayment {
  id: string;
  mode?: 'test' | 'live';
  orgId?: string;
  organizationName?: string;
  subscriptionId?: string | null;
  invoiceId?: string | null;
  providerPaymentId?: string | null;
  planCode?: BillingPlanCode;
  kind?: 'initial' | 'renewal' | 'upgrade' | string;
  status: 'created' | 'authorized' | 'captured' | 'failed' | 'refunded' | 'partially_refunded' | string;
  baseAmountPaise?: number;
  discountAmountPaise?: number;
  taxAmountPaise?: number;
  grossAmountPaise: number;
  refundedAmountPaise?: number;
  currency?: string;
  failureCode?: string | null;
  failureDescription?: string | null;
  method?: { type?: string; last4?: string; network?: string; bank?: string; vpaMasked?: string } | null;
  capturedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface BillingInvoice {
  id: string;
  orgId?: string;
  organizationName?: string;
  subscriptionId?: string | null;
  paymentId?: string | null;
  invoiceNumber?: string | null;
  type?: 'tax_invoice' | 'credit_note' | string;
  documentType?: 'tax_invoice' | 'credit_note' | string;
  status: 'pending' | 'issued' | 'failed' | 'void' | string;
  grossAmountPaise: number;
  currency?: string;
  periodStart?: string | null;
  periodEnd?: string | null;
  issuedAt?: string | null;
  pdfUrl?: string | null;
  pdfPath?: string | null;
  createdAt?: string | null;
}

export interface BillingRefund {
  id: string;
  mode?: 'test' | 'live';
  orgId?: string;
  organizationName?: string;
  paymentId: string;
  providerRefundId?: string | null;
  status: 'requested' | 'approved' | 'rejected' | 'pending' | 'processed' | 'failed' | string;
  amountPaise?: number;
  reason: string;
  requestedBy?: string;
  requestedAt?: string | null;
  processedAt?: string | null;
  failureDescription?: string | null;
}

export interface BillingOperation {
  id: string;
  orgId?: string;
  organizationName?: string;
  type: string;
  status: BillingOperationStatus;
  message?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface BillingAuditEvent {
  id: string;
  orgId?: string | null;
  actorType: 'user' | 'system' | 'provider' | 'repair';
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  fromState?: string | null;
  toState?: string | null;
  reason?: string | null;
  correlationId?: string | null;
  createdAt?: string | null;
}

export interface BillingWebhookEvent {
  id: string;
  mode: 'test' | 'live';
  providerEventId: string;
  eventType: string;
  status: string;
  attempts: number;
  lastError?: string | null;
  receivedAt?: string | null;
  processedAt?: string | null;
  updatedAt?: string | null;
}

export interface BillingPromotion {
  id: string;
  name?: string;
  codeMasked?: string;
  code?: string;
  type: 'flat' | 'percentage';
  kind?: 'flat' | 'percentage';
  value: number;
  organizationId?: string | null;
  planCode?: BillingPlanCode | null;
  planCodes?: BillingPlanCode[];
  status: 'active' | 'disabled' | 'expired' | string;
  validFrom?: string | null;
  validUntil?: string | null;
  maxRedemptions?: number | null;
  redemptionCount?: number;
  reservationCount?: number;
  discountedPriceVersionId?: string | null;
  createdAt?: string | null;
}

export interface BillingCheckoutSession {
  id: string;
  orgId?: string;
  status: string;
  priceVersionId?: string;
  planCode?: BillingPlanCode;
  providerSubscriptionId?: string | null;
  providerStatus?: string | null;
  keyId?: string | null;
  amountPaise?: number;
  currency?: string;
  checkoutUrl?: string | null;
  expiresAt?: string | null;
  createdAt?: string | null;
  operationId?: string;
  purpose?: 'initial' | 'replacement_upgrade' | 'replacement_downgrade';
  resumable?: boolean;
  cancellable?: boolean;
}

export interface BillingListMeta {
  limit?: number;
  nextCursor?: string;
}

export interface BillingListResponse<T> {
  success: true;
  data: T[];
  meta?: BillingListMeta;
}
