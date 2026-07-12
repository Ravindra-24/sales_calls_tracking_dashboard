import type { AxiosRequestConfig } from 'axios';
import { api } from './client';
import type { ApiResponse } from '../types/api';
import type {
  BillingAccount,
  BillingActivationSnapshot,
  BillingCatalog,
  BillingCheckoutSession,
  BillingInvoice,
  BillingListResponse,
  BillingPayment,
  BillingPlanCode,
  BillingPlanChangeResult,
  BillingRecoveryResult,
  BillingSubscription,
} from '../types/billing';

const fallbackPlans: BillingCatalog['plans'] = [
  {
    code: 'lite',
    name: 'Lite',
    description: 'Essential call tracking for teams getting started.',
    currentPrice: null,
  },
  {
    code: 'pro',
    name: 'Pro',
    description: 'Quarterly billing for growing sales organizations.',
    currentPrice: {
      id: 'unavailable_pro',
      baseAmountPaise: 199900,
      discountAmountPaise: 0,
      taxAmountPaise: 0,
      grossAmountPaise: 199900,
      currency: 'INR',
      billingPeriod: 'monthly',
      interval: 3,
      providerReady: false,
    },
  },
  {
    code: 'max',
    name: 'Max',
    description: 'Annual value with advanced integrations and higher limits.',
    currentPrice: {
      id: 'unavailable_max',
      baseAmountPaise: 399900,
      discountAmountPaise: 0,
      taxAmountPaise: 0,
      grossAmountPaise: 399900,
      currency: 'INR',
      billingPeriod: 'yearly',
      interval: 1,
      providerReady: false,
    },
  },
  {
    code: 'enterprise',
    name: 'Enterprise',
    description: 'A custom, audited contract for complex organizations.',
    currentPrice: null,
  },
];

export const FALLBACK_BILLING_CATALOG: BillingCatalog = {
  mode: 'test',
  liveEnabled: false,
  checkoutAvailable: false,
  fallback: true,
  policyVersions: {
    terms: '2026-07-11',
    refund: '2026-07-12',
    cancellation: '2026-07-11',
  },
  plans: fallbackPlans,
};

export const fetchBillingCatalog = async (): Promise<BillingCatalog> => {
  try {
    const response = await api.get<ApiResponse<BillingCatalog>>('/billing/catalog');
    const catalog = response.data.data;
    if (!Array.isArray(catalog?.plans) || catalog.plans.length === 0) return FALLBACK_BILLING_CATALOG;
    return catalog;
  } catch {
    return FALLBACK_BILLING_CATALOG;
  }
};

export const fetchBillingAccount = async () => {
  const response = await api.get<ApiResponse<BillingAccount | null>>('/billing/account');
  return response.data.data;
};

export const updateBillingContact = async (
  expectedVersion: number,
  billingContact: NonNullable<BillingAccount['billingContact']>,
) => {
  const response = await api.patch<ApiResponse<BillingAccount>>('/billing/account', {
    expectedVersion,
    billingContact,
  });
  return response.data.data;
};

export const fetchBillingSubscription = async () => {
  const response = await api.get<ApiResponse<BillingSubscription | null>>('/billing/subscription');
  return response.data.data;
};

export const fetchBillingPayments = async (config?: AxiosRequestConfig) => {
  const response = await api.get<BillingListResponse<BillingPayment>>('/billing/payments', config);
  return response.data;
};

export const fetchBillingInvoices = async (config?: AxiosRequestConfig) => {
  const response = await api.get<BillingListResponse<BillingInvoice>>('/billing/invoices', config);
  return response.data;
};

export const fetchBillingActivationSnapshot = async (): Promise<BillingActivationSnapshot> => {
  const [account, subscription, paymentResponse] = await Promise.all([
    fetchBillingAccount(),
    fetchBillingSubscription(),
    fetchBillingPayments({ params: { limit: 20 } }),
  ]);
  return { account, subscription, payments: paymentResponse.data };
};

export const downloadBillingInvoice = async (invoiceId: string) => {
  const response = await api.get<Blob>(
    `/billing/invoices/${encodeURIComponent(invoiceId)}/download`,
    { responseType: 'blob' },
  );
  return response.data;
};

export const createCheckoutSession = async (body: {
  priceVersionId: string;
  couponCode?: string;
  operationId: string;
}) => {
  const response = await api.post<ApiResponse<BillingCheckoutSession>>('/billing/checkout-sessions', body);
  return response.data.data;
};

export const fetchActiveCheckoutSession = async () => {
  const response = await api.get<ApiResponse<BillingCheckoutSession | null>>(
    '/billing/checkout-sessions/active',
  );
  return response.data.data;
};

export const verifyCheckoutSession = async (
  sessionId: string,
  body: { razorpay_payment_id: string; razorpay_signature: string },
) => {
  const response = await api.post<ApiResponse<BillingCheckoutSession>>(
    `/billing/checkout-sessions/${encodeURIComponent(sessionId)}/verify`,
    body,
  );
  return response.data.data;
};

export const abandonCheckoutSession = async (sessionId: string) => {
  const response = await api.post<ApiResponse<BillingCheckoutSession>>(
    `/billing/checkout-sessions/${encodeURIComponent(sessionId)}/abandon`,
  );
  return response.data.data;
};

export const changeBillingPlan = async (targetPriceVersionId: string, operationId: string) => {
  const response = await api.post<ApiResponse<BillingPlanChangeResult>>('/billing/subscription/change', {
    targetPriceVersionId,
    operationId,
  });
  return response.data.data;
};

export const cancelBillingSubscription = async (operationId: string) => {
  const response = await api.post<ApiResponse<unknown>>('/billing/subscription/cancel', { operationId });
  return response.data.data;
};

export const recoverBillingSubscription = async (operationId: string) => {
  const response = await api.post<ApiResponse<BillingRecoveryResult>>('/billing/subscription/recover', { operationId });
  return response.data.data;
};

export const billingPlanName = (plan: BillingPlanCode | string | null | undefined) => {
  if (!plan) return '—';
  if (plan === 'pro') return 'Pro';
  return plan.charAt(0).toUpperCase() + plan.slice(1);
};

export const formatBillingMoney = (amountPaise: number | null | undefined, currency = 'INR') => {
  if (amountPaise === null || amountPaise === undefined || !Number.isFinite(amountPaise)) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: amountPaise % 100 === 0 ? 0 : 2,
  }).format(amountPaise / 100);
};

export const formatBillingDate = (value: string | null | undefined, includeTime = false) => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(includeTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  }).format(parsed);
};

export const billingCycleLabel = (planCode: BillingPlanCode, period?: string | null, interval?: number | null) => {
  if (planCode === 'lite') return 'Free forever';
  if (planCode === 'enterprise') return 'Custom contract';
  if (period === 'monthly' && interval === 3) return 'every quarter';
  if (period === 'yearly' && interval === 1) return 'per year';
  if (!period) return '';
  return interval && interval > 1 ? `every ${interval} ${period.replace(/ly$/, '')}s` : `per ${period.replace(/ly$/, '')}`;
};

export const newBillingOperationId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `billing_${Date.now()}_${Math.random().toString(36).slice(2)}`;
};
