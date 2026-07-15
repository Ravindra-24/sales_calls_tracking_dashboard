import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  Clock3,
  CreditCard,
  FileSearch,
  IndianRupee,
  LoaderCircle,
  Play,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Undo2,
  Webhook,
  XCircle,
} from 'lucide-react';
import { api, getApiErrorMessage } from '../api/client';
import { billingPlanName, formatBillingDate, formatBillingMoney } from '../api/billing';
import { useAuth } from '../context/auth';
import { useFeedback } from '../context/feedback';
import { useSearchParams } from 'react-router-dom';
import type { ApiResponse } from '../types/api';
import type { BillingAuditEvent, BillingOperation, BillingPayment, BillingRefund, BillingSubscription, BillingSummary, BillingWebhookEvent } from '../types/billing';

type OperationsTab = 'payments' | 'subscriptions' | 'refunds' | 'operations';

const extractList = <T,>(value: T[] | { items?: T[] } | null | undefined): T[] => {
  if (Array.isArray(value)) return value;
  return value?.items && Array.isArray(value.items) ? value.items : [];
};

const includesSearch = (value: unknown, search: string) => !search || JSON.stringify(value).toLowerCase().includes(search.toLowerCase());

export const BillingOperations = () => {
  const { claims } = useAuth();
  const { confirm, requestFields, requestText, toast } = useFeedback();
  const [searchParams] = useSearchParams();
  const [payments, setPayments] = useState<BillingPayment[]>([]);
  const [subscriptions, setSubscriptions] = useState<BillingSubscription[]>([]);
  const [refunds, setRefunds] = useState<BillingRefund[]>([]);
  const [operations, setOperations] = useState<BillingOperation[]>([]);
  const [auditEvents, setAuditEvents] = useState<BillingAuditEvent[]>([]);
  const [webhookEvents, setWebhookEvents] = useState<BillingWebhookEvent[]>([]);
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [nextCursors, setNextCursors] = useState<Record<OperationsTab, string | null>>({
    payments: null, subscriptions: null, refunds: null, operations: null,
  });
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<OperationsTab>('payments');
  const [filters, setFilters] = useState({ search: searchParams.get('search') || '', status: '', plan: '', from: '', to: '' });
  const [repairForm, setRepairForm] = useState({ orgId: '', eventId: '', mode: 'test', expectedVersion: '', apply: false, reason: '' });
  const [enterpriseForm, setEnterpriseForm] = useState({ orgId: '', contractReference: '', startsAt: '', endsAt: '', reason: '' });
  const [overrideForm, setOverrideForm] = useState({ orgId: '', planCode: 'max', expiresAt: '', reason: '' });

  useEffect(() => {
    const search = searchParams.get('search');
    if (search) setFilters((current) => ({ ...current, search }));
  }, [searchParams]);

  const loadOperations = useCallback(async () => {
    if (claims.role !== 'platform_owner') return;
    setLoading(true);
    setError('');
    const config = { params: { limit: 100 } };
    const [paymentResult, subscriptionResult, refundResult, operationResult, auditResult, webhookResult, summaryResult] = await Promise.allSettled([
      api.get<ApiResponse<BillingPayment[] | { items?: BillingPayment[] }>>('/billing/admin/payments', config),
      api.get<ApiResponse<BillingSubscription[] | { items?: BillingSubscription[] }>>('/billing/admin/subscriptions', config),
      api.get<ApiResponse<BillingRefund[] | { items?: BillingRefund[] }>>('/billing/admin/refunds', config),
      api.get<ApiResponse<BillingOperation[] | { items?: BillingOperation[] }>>('/billing/admin/operations', config),
      api.get<ApiResponse<BillingAuditEvent[] | { items?: BillingAuditEvent[] }>>('/billing/admin/audit-events', config),
      api.get<ApiResponse<BillingWebhookEvent[] | { items?: BillingWebhookEvent[] }>>('/billing/admin/webhook-events', config),
      api.get<ApiResponse<BillingSummary>>('/billing/admin/summary'),
    ]);
    if (paymentResult.status === 'fulfilled') setPayments(extractList(paymentResult.value.data.data));
    if (subscriptionResult.status === 'fulfilled') setSubscriptions(extractList(subscriptionResult.value.data.data));
    if (refundResult.status === 'fulfilled') setRefunds(extractList(refundResult.value.data.data));
    if (operationResult.status === 'fulfilled') setOperations(extractList(operationResult.value.data.data));
    setNextCursors({
      payments: paymentResult.status === 'fulfilled' ? paymentResult.value.data.meta?.nextCursor || null : null,
      subscriptions: subscriptionResult.status === 'fulfilled' ? subscriptionResult.value.data.meta?.nextCursor || null : null,
      refunds: refundResult.status === 'fulfilled' ? refundResult.value.data.meta?.nextCursor || null : null,
      operations: operationResult.status === 'fulfilled' ? operationResult.value.data.meta?.nextCursor || null : null,
    });
    if (auditResult.status === 'fulfilled') setAuditEvents(extractList(auditResult.value.data.data));
    if (webhookResult.status === 'fulfilled') setWebhookEvents(extractList(webhookResult.value.data.data));
    if (summaryResult.status === 'fulfilled') setSummary(summaryResult.value.data.data);
    if ([paymentResult, subscriptionResult, refundResult, operationResult, auditResult, webhookResult, summaryResult].some((result) => result.status === 'rejected')) {
      setError('Some billing operations could not be loaded. Actions remain server-validated; refresh before retrying.');
    }
    setLoading(false);
  }, [claims.role]);

  useEffect(() => { void loadOperations(); }, [loadOperations]);

  const loadOlder = async () => {
    const cursor = nextCursors[activeTab];
    if (!cursor) return;
    setWorking(`load-${activeTab}`);
    setError('');
    try {
      const response = await api.get<ApiResponse<unknown[] | { items?: unknown[] }>>(
        `/billing/admin/${activeTab}`,
        { params: { limit: 100, cursor } },
      );
      const items = extractList(response.data.data);
      if (activeTab === 'payments') setPayments((current) => [...current, ...(items as BillingPayment[])]);
      if (activeTab === 'subscriptions') setSubscriptions((current) => [...current, ...(items as BillingSubscription[])]);
      if (activeTab === 'refunds') setRefunds((current) => [...current, ...(items as BillingRefund[])]);
      if (activeTab === 'operations') setOperations((current) => [...current, ...(items as BillingOperation[])]);
      setNextCursors((current) => ({
        ...current,
        [activeTab]: response.data.meta?.nextCursor || null,
      }));
    } catch (requestError) {
      const message = getApiErrorMessage(requestError, 'Older billing records could not be loaded.');
      setError(message);
      toast({ title: 'Older records not loaded', message, variant: 'error' });
    } finally {
      setWorking('');
    }
  };

  const inDateRange = useCallback((value: string | null | undefined) => {
    if (!value) return !filters.from && !filters.to;
    const timestamp = new Date(value).valueOf();
    if (filters.from && timestamp < new Date(`${filters.from}T00:00:00`).valueOf()) return false;
    if (filters.to && timestamp > new Date(`${filters.to}T23:59:59.999`).valueOf()) return false;
    return true;
  }, [filters.from, filters.to]);

  const filteredPayments = useMemo(() => payments.filter((payment) => (
    includesSearch(payment, filters.search)
    && (!filters.status || payment.status === filters.status)
    && (!filters.plan || payment.planCode === filters.plan)
    && inDateRange(payment.capturedAt || payment.createdAt)
  )), [payments, filters, inDateRange]);
  const filteredSubscriptions = useMemo(() => subscriptions.filter((subscription) => (
    includesSearch(subscription, filters.search)
    && (!filters.status || subscription.status === filters.status)
    && (!filters.plan || subscription.planCode === filters.plan)
    && inDateRange(subscription.createdAt)
  )), [subscriptions, filters, inDateRange]);
  const filteredRefunds = useMemo(() => refunds.filter((refund) => (
    includesSearch(refund, filters.search)
    && (!filters.status || refund.status === filters.status)
    && inDateRange(refund.requestedAt)
  )), [refunds, filters, inDateRange]);
  const filteredOperations = useMemo(() => operations.filter((operation) => (
    includesSearch(operation, filters.search)
    && (!filters.status || operation.status === filters.status)
    && inDateRange(operation.createdAt)
  )), [operations, filters, inDateRange]);

  const metrics = useMemo(() => {
    if (summary) {
      return {
        captured: summary.capturedGrossPaise,
        processedRefunds: summary.processedRefundPaise,
        net: summary.netCollectedPaise,
        failedOrPending: summary.unresolvedPaymentCount,
        renewals: summary.renewalGrossPaise,
      };
    }
    const captured = payments.filter((payment) => ['captured', 'partially_refunded', 'refunded'].includes(payment.status)).reduce((sum, payment) => sum + payment.grossAmountPaise, 0);
    const processedRefunds = refunds.filter((refund) => refund.status === 'processed').reduce((sum, refund) => sum + (refund.amountPaise || 0), 0);
    return {
      captured,
      processedRefunds,
      net: Math.max(0, captured - processedRefunds),
      failedOrPending: payments.filter((payment) => payment.status === 'failed' || payment.status === 'created').length,
      renewals: payments.filter((payment) => payment.kind === 'renewal' && payment.status === 'captured').reduce((sum, payment) => sum + payment.grossAmountPaise, 0),
    };
  }, [payments, refunds, summary]);

  const timeline = useMemo(() => {
    const events = [
      ...operations.map((operation) => ({ id: `op-${operation.id}`, type: operation.type, status: operation.status, org: operation.organizationName || operation.orgId, at: operation.updatedAt || operation.createdAt, detail: operation.message || operation.id })),
      ...payments.map((payment) => ({ id: `pay-${payment.id}`, type: `payment ${payment.kind || ''}`, status: payment.status, org: payment.organizationName || payment.orgId, at: payment.capturedAt || payment.createdAt, detail: `${formatBillingMoney(payment.grossAmountPaise, payment.currency)} · ${payment.providerPaymentId || payment.id}` })),
      ...refunds.map((refund) => ({ id: `refund-${refund.id}`, type: 'refund', status: refund.status, org: refund.organizationName || refund.orgId, at: refund.processedAt || refund.requestedAt, detail: `${formatBillingMoney(refund.amountPaise)} · ${refund.paymentId}` })),
      ...auditEvents.map((event) => ({ id: `audit-${event.id}`, type: event.action, status: event.toState || event.fromState || 'recorded', org: event.orgId || event.actorType, at: event.createdAt, detail: `${event.entityType}: ${event.entityId}${event.reason ? ` · ${event.reason}` : ''}` })),
      ...webhookEvents.map((event) => ({ id: `webhook-${event.id}`, type: event.eventType, status: event.status, org: `Razorpay ${event.mode}`, at: event.processedAt || event.receivedAt, detail: `${event.providerEventId} · ${event.attempts} attempt${event.attempts === 1 ? '' : 's'}${event.lastError ? ` · ${event.lastError}` : ''}` })),
    ];
    return events.sort((left, right) => new Date(right.at || 0).valueOf() - new Date(left.at || 0).valueOf()).slice(0, 12);
  }, [operations, payments, refunds, auditEvents, webhookEvents]);

  const runAction = async (key: string, action: () => Promise<unknown>, success: string) => {
    setWorking(key);
    setError('');
    try {
      await action();
      toast({ message: success, variant: 'success' });
      await loadOperations();
    } catch (requestError) {
      const message = getApiErrorMessage(requestError, 'Billing operation failed safely. Provider and local state should be reconciled before retrying.');
      setError(message);
      toast({ title: 'Billing operation failed', message, variant: 'error' });
    } finally {
      setWorking('');
    }
  };

  const rejectRefund = async (refund: BillingRefund) => {
    const reason = await requestText({
      title: 'Reject this refund request?',
      message: 'The rejection and its reason are stored permanently in the billing audit trail.',
      label: 'Rejection reason',
      placeholder: 'Explain why this refund cannot be approved',
      minLength: 10,
      maxLength: 500,
      multiline: true,
      confirmLabel: 'Reject refund',
      variant: 'danger',
    });
    if (!reason) return;
    await runAction(
      `refund-${refund.id}`,
      () => api.post(`/billing/admin/refunds/${encodeURIComponent(refund.id)}/reject`, {
        reason: reason.trim(),
      }),
      'Refund request rejected under the no-refund policy with an audited reason.',
    );
  };

  const syncEntity = async (entityType: 'payment' | 'subscription' | 'refund', providerId: string, mode: 'test' | 'live' = 'test') => {
    const values = await requestFields({
      title: `Sync ${entityType} with Razorpay?`,
      message: `Smartly Manage will fetch ${providerId} in ${mode} mode and reconcile its local projection. The action and reason are audited.`,
      confirmLabel: 'Run provider sync',
      variant: 'warning',
      fields: [
        {
          id: 'reason',
          label: 'Audit reason',
          placeholder: 'Explain why provider reconciliation is required',
          minLength: 5,
          maxLength: 500,
          multiline: true,
        },
        ...(mode === 'live' ? [{
          id: 'expectedVersion',
          label: 'Current billing account version',
          type: 'number' as const,
          inputMode: 'numeric' as const,
          helpText: 'Required to protect live data from concurrent updates.',
          validate: (value: string) => /^\d+$/.test(value.trim()) ? undefined : 'Enter a non-negative whole number.',
        }] : []),
      ],
    });
    if (!values) return;
    const expectedVersionInput = values.expectedVersion?.trim() ?? '';
    await runAction(`sync-${providerId}`, () => api.post('/billing/admin/sync', {
      entityType,
      providerId,
      mode,
      dryRun: false,
      reason: values.reason.trim(),
      expectedVersion: expectedVersionInput ? Number(expectedVersionInput) : undefined,
    }), `${entityType} sync completed or queued for review.`);
  };

  const runReconciliation = async (event: React.FormEvent) => {
    event.preventDefault();
    if (repairForm.apply && repairForm.reason.trim().length < 10) {
      setError('Applied reconciliation requires a specific reason of at least 10 characters.');
      return;
    }
    if (repairForm.apply) {
      const approved = await confirm({
        title: 'Apply provider-backed repairs?',
        message: 'Every local change will be audited. Verify the organization, mode, account version, and reason before continuing.',
        confirmLabel: 'Run and apply',
        variant: 'warning',
      });
      if (!approved) return;
    }
    await runAction('reconcile', () => api.post('/billing/admin/reconciliation', {
      orgId: repairForm.orgId.trim() || undefined,
      mode: repairForm.mode,
      dryRun: !repairForm.apply,
      reason: repairForm.reason.trim() || undefined,
      expectedVersion: repairForm.expectedVersion ? Number(repairForm.expectedVersion) : undefined,
    }), repairForm.apply ? 'Reconciliation repairs completed or queued.' : 'Dry-run reconciliation completed. Review the run items before applying.');
  };

  const replayWebhook = async () => {
    if (!repairForm.eventId.trim()) return;
    const reason = await requestText({
      title: 'Replay this webhook event?',
      message: 'The event will be queued for idempotent processing and the reason will be stored in the audit trail.',
      label: 'Audit reason',
      placeholder: 'Explain why this webhook needs to be replayed',
      minLength: 5,
      maxLength: 500,
      multiline: true,
      confirmLabel: 'Replay event',
      variant: 'warning',
    });
    if (!reason) return;
    await runAction('replay', () => api.post(`/billing/admin/webhook-events/${encodeURIComponent(repairForm.eventId.trim())}/replay`, {
      dryRun: false,
      reason: reason.trim(),
    }), 'Webhook event queued for idempotent replay.');
  };

  const grantEnterprise = async (event: React.FormEvent) => {
    event.preventDefault();
    if (enterpriseForm.reason.trim().length < 10) {
      setError('Manual Enterprise activation requires a specific reason of at least 10 characters.');
      return;
    }
    const approved = await confirm({
      title: `Activate Enterprise for ${enterpriseForm.orgId}?`,
      message: 'This grants contract-backed access without a Razorpay subscription and records a permanent audit event.',
      confirmLabel: 'Activate Enterprise',
      variant: 'warning',
    });
    if (!approved) return;
    await runAction('enterprise', () => api.post('/billing/admin/manual-enterprise', {
      orgId: enterpriseForm.orgId.trim(),
      reference: enterpriseForm.contractReference.trim(),
      startsAt: new Date(`${enterpriseForm.startsAt}T00:00:00.000Z`).toISOString(),
      endsAt: enterpriseForm.endsAt ? new Date(`${enterpriseForm.endsAt}T23:59:59.999Z`).toISOString() : undefined,
      reason: enterpriseForm.reason.trim(),
    }), 'Manual Enterprise contract activated with an audit event.');
  };

  const grantOverride = async (event: React.FormEvent) => {
    event.preventDefault();
    if (overrideForm.reason.trim().length < 10) {
      setError('Complimentary overrides require a specific reason of at least 10 characters.');
      return;
    }
    const approved = await confirm({
      title: `Grant ${billingPlanName(overrideForm.planCode)} to ${overrideForm.orgId}?`,
      message: 'The time-bounded override takes effect immediately and remains in the audit history after expiry.',
      confirmLabel: 'Grant override',
      variant: 'warning',
    });
    if (!approved) return;
    await runAction('override', () => api.post('/billing/admin/overrides', {
      orgId: overrideForm.orgId.trim(),
      planCode: overrideForm.planCode,
      expiresAt: new Date(`${overrideForm.expiresAt}T23:59:59.999Z`).toISOString(),
      reason: overrideForm.reason.trim(),
    }), 'Complimentary override activated with expiry and audit history.');
  };

  if (claims.role !== 'platform_owner') return <div className="page animate-fade-in"><div className="notice error-notice">Only platform owners can access billing operations.</div></div>;
  if (loading && payments.length === 0 && subscriptions.length === 0) return <div className="billing-page-loader"><LoaderCircle className="spin" size={26} /> Loading billing operations…</div>;

  return (
    <div className="page billing-page billing-operations-page animate-fade-in">
      <header className="page-header"><div><p className="eyebrow">Platform owner</p><h1>Billing operations</h1><p>Investigate every payment lifecycle and run provider-backed, audited recovery actions.</p></div><button className="secondary-button" onClick={() => void loadOperations()}><RefreshCw size={16} /> Refresh</button></header>
      {error && <div className="notice error-notice">{error}</div>}

      <section className="billing-owner-metrics">
        <article className="section-card"><div className="stat-icon green"><IndianRupee size={20} /></div><div><span>Captured gross</span><strong>{formatBillingMoney(metrics.captured)}</strong></div></article>
        <article className="section-card"><div className="stat-icon orange"><Undo2 size={20} /></div><div><span>Processed refunds</span><strong>{formatBillingMoney(metrics.processedRefunds)}</strong></div></article>
        <article className="section-card"><div className="stat-icon blue"><CreditCard size={20} /></div><div><span>Net collected</span><strong>{formatBillingMoney(metrics.net)}</strong></div></article>
        <article className="section-card"><div className="stat-icon violet"><RefreshCw size={20} /></div><div><span>Renewal gross</span><strong>{formatBillingMoney(metrics.renewals)}</strong></div></article>
        <article className="section-card"><div className="stat-icon orange"><AlertTriangle size={20} /></div><div><span>Failed / pending</span><strong>{metrics.failedOrPending}</strong></div></article>
      </section>

      <section className="section-card billing-filter-panel">
        <label className="billing-search"><Search size={16} /><input value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Org, email, local or provider ID" /></label>
        <select className="input-field" aria-label="Filter by plan" value={filters.plan} onChange={(event) => setFilters((current) => ({ ...current, plan: event.target.value }))}><option value="">All plans</option><option value="lite">Lite</option><option value="pro">Pro</option><option value="max">Max</option><option value="enterprise">Enterprise</option></select>
        <input className="input-field" aria-label="Filter by status" value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))} placeholder="Exact status" />
        <input className="input-field" aria-label="From date" type="date" value={filters.from} onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))} />
        <input className="input-field" aria-label="To date" type="date" value={filters.to} onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))} />
      </section>

      <section className="section-card billing-timeline-card">
        <div className="section-heading"><div><h2>Unified recent timeline</h2><p>Checkout workflows, payments, refunds, and repair operations in event order.</p></div><Clock3 size={20} /></div>
        <div className="billing-timeline">
          {timeline.length === 0 ? <div className="empty-state">No billing timeline events yet.</div> : timeline.map((event) => <div className="billing-timeline-item" key={event.id}><span className={`billing-timeline-dot ${event.status}`} /><div><div><strong>{event.type.replaceAll('_', ' ')}</strong><span className={`billing-status ${event.status}`}>{event.status.replaceAll('_', ' ')}</span></div><p>{event.org || 'Unknown organization'} · {event.detail}</p></div><time>{formatBillingDate(event.at, true)}</time></div>)}
        </div>
      </section>

      <section className="section-card table-card billing-operations-table">
        <div className="billing-tabs" role="tablist" aria-label="Billing entity type">
          {(['payments', 'subscriptions', 'refunds', 'operations'] as OperationsTab[]).map((tab) => <button key={tab} role="tab" aria-selected={activeTab === tab} className={activeTab === tab ? 'active' : ''} onClick={() => setActiveTab(tab)}>{tab}</button>)}
        </div>
        <div className="table-scroll">
          {activeTab === 'payments' && <table className="data-table billing-table"><thead><tr><th>Date</th><th>Organization</th><th>Payment</th><th>Plan / kind</th><th>Gross</th><th>Status</th><th>Action</th></tr></thead><tbody>{filteredPayments.length === 0 ? <tr><td colSpan={7} className="table-message">No matching payments.</td></tr> : filteredPayments.map((payment) => <tr key={payment.id}><td data-label="Date">{formatBillingDate(payment.capturedAt || payment.createdAt, true)}</td><td data-label="Organization"><strong>{payment.organizationName || payment.orgId || '—'}</strong></td><td data-label="Payment"><strong>{payment.providerPaymentId || payment.id}</strong><small>{payment.id}</small></td><td data-label="Plan / kind">{billingPlanName(payment.planCode)} / {payment.kind || '—'}</td><td data-label="Gross">{formatBillingMoney(payment.grossAmountPaise, payment.currency)}</td><td data-label="Status"><span className={`billing-status ${payment.status}`}>{payment.status.replaceAll('_', ' ')}</span></td><td data-label="Action"><button className="secondary-button" disabled={working === `sync-${payment.providerPaymentId || payment.id}`} onClick={() => void syncEntity('payment', payment.providerPaymentId || payment.id, payment.mode || 'test')}><RefreshCw size={14} /> Sync</button></td></tr>)}</tbody></table>}
          {activeTab === 'subscriptions' && <table className="data-table billing-table"><thead><tr><th>Created</th><th>Organization</th><th>Subscription</th><th>Plan</th><th>Period end</th><th>Status</th><th>Action</th></tr></thead><tbody>{filteredSubscriptions.length === 0 ? <tr><td colSpan={7} className="table-message">No matching subscriptions.</td></tr> : filteredSubscriptions.map((subscription) => <tr key={subscription.id}><td data-label="Created">{formatBillingDate(subscription.createdAt)}</td><td data-label="Organization">{subscription.orgId || '—'}</td><td data-label="Subscription"><strong>{subscription.providerSubscriptionId || subscription.id}</strong><small>{subscription.id}</small></td><td data-label="Plan">{billingPlanName(subscription.planCode)}</td><td data-label="Period end">{formatBillingDate(subscription.currentPeriodEnd)}</td><td data-label="Status"><span className={`billing-status ${subscription.status}`}>{subscription.status.replaceAll('_', ' ')}</span></td><td data-label="Action">{subscription.providerSubscriptionId ? <button className="secondary-button" disabled={working === `sync-${subscription.providerSubscriptionId}`} onClick={() => void syncEntity('subscription', subscription.providerSubscriptionId!, subscription.mode || 'test')}><RefreshCw size={14} /> Sync</button> : '—'}</td></tr>)}</tbody></table>}
          {activeTab === 'refunds' && <table className="data-table billing-table"><thead><tr><th>Requested</th><th>Organization</th><th>Payment</th><th>Amount</th><th>Reason</th><th>Status</th><th>Review</th></tr></thead><tbody>{filteredRefunds.length === 0 ? <tr><td colSpan={7} className="table-message">No historical refunds.</td></tr> : filteredRefunds.map((refund) => <tr key={refund.id}><td data-label="Requested">{formatBillingDate(refund.requestedAt, true)}</td><td data-label="Organization">{refund.organizationName || refund.orgId || '—'}</td><td data-label="Payment"><strong>{refund.paymentId}</strong></td><td data-label="Amount">{formatBillingMoney(refund.amountPaise)}</td><td data-label="Reason"><span className="billing-reason-cell">{refund.reason}</span></td><td data-label="Status"><span className={`billing-status ${refund.status}`}>{refund.status}</span></td><td data-label="Review">{refund.status === 'requested' ? <button className="secondary-button danger-button" disabled={working === `refund-${refund.id}`} onClick={() => void rejectRefund(refund)}><XCircle size={14} /> Reject</button> : refund.providerRefundId ? <button className="secondary-button" disabled={working === `sync-${refund.providerRefundId}`} onClick={() => void syncEntity('refund', refund.providerRefundId!, refund.mode || 'test')}><RefreshCw size={14} /> Sync historical</button> : '—'}</td></tr>)}</tbody></table>}
          {activeTab === 'operations' && <table className="data-table billing-table"><thead><tr><th>Updated</th><th>Organization</th><th>Operation</th><th>Entity</th><th>Status</th><th>Detail</th></tr></thead><tbody>{filteredOperations.length === 0 ? <tr><td colSpan={6} className="table-message">No matching operations.</td></tr> : filteredOperations.map((operation) => <tr key={operation.id}><td data-label="Updated">{formatBillingDate(operation.updatedAt || operation.createdAt, true)}</td><td data-label="Organization">{operation.organizationName || operation.orgId || '—'}</td><td data-label="Operation"><strong>{operation.type.replaceAll('_', ' ')}</strong><small>{operation.id}</small></td><td data-label="Entity">{operation.entityType ? `${operation.entityType}: ${operation.entityId || '—'}` : '—'}</td><td data-label="Status"><span className={`billing-status ${operation.status}`}>{operation.status.replaceAll('_', ' ')}</span></td><td data-label="Detail">{operation.message || '—'}</td></tr>)}</tbody></table>}
        </div>
        {nextCursors[activeTab] && <button className="secondary-button" type="button" onClick={() => void loadOlder()} disabled={working === `load-${activeTab}`}>{working === `load-${activeTab}` ? 'Loading…' : `Load older ${activeTab}`}</button>}
      </section>

      <section className="billing-admin-two-column">
        <article className="section-card billing-admin-form-card">
          <div className="section-heading"><div><h2>Reconciliation & event replay</h2><p>Dry-run is the safe default. Applied repairs require an immutable reason.</p></div><FileSearch size={21} /></div>
          <form className="billing-form" onSubmit={runReconciliation}>
            <label>Organization ID (optional)<input className="input-field" value={repairForm.orgId} onChange={(event) => setRepairForm((current) => ({ ...current, orgId: event.target.value }))} placeholder="All monitored entities" /></label>
            <div className="billing-form-grid"><label>Razorpay mode<select className="input-field" value={repairForm.mode} onChange={(event) => setRepairForm((current) => ({ ...current, mode: event.target.value }))}><option value="test">Test</option><option value="live">Live</option></select></label><label>Expected account version<input className="input-field" type="number" min="0" value={repairForm.expectedVersion} onChange={(event) => setRepairForm((current) => ({ ...current, expectedVersion: event.target.value }))} placeholder="Required for live apply" /></label></div>
            <label className="billing-policy-check"><input type="checkbox" checked={repairForm.apply} onChange={(event) => setRepairForm((current) => ({ ...current, apply: event.target.checked }))} /><span>Apply provider-backed repairs after the comparison</span></label>
            {repairForm.apply && <label>Required audit reason<textarea className="input-field billing-textarea" minLength={10} value={repairForm.reason} onChange={(event) => setRepairForm((current) => ({ ...current, reason: event.target.value }))} required /></label>}
            <button className="btn-primary" disabled={working === 'reconcile'}><Play size={15} /> {working === 'reconcile' ? 'Running…' : repairForm.apply ? 'Run and apply' : 'Run dry-run'}</button>
          </form>
          <div className="billing-event-replay"><label>Webhook event ID<input className="input-field" value={repairForm.eventId} onChange={(event) => setRepairForm((current) => ({ ...current, eventId: event.target.value }))} /></label><button className="secondary-button" disabled={!repairForm.eventId || working === 'replay'} onClick={() => void replayWebhook()}><Webhook size={15} /> Replay idempotently</button></div>
        </article>

        <article className="section-card billing-admin-form-card">
          <div className="section-heading"><div><h2>Manual Enterprise contract</h2><p>Grant contract-backed access without creating a Razorpay subscription.</p></div><Building2 size={21} /></div>
          <form className="billing-form" onSubmit={grantEnterprise}>
            <div className="billing-form-grid"><label>Organization ID<input className="input-field" value={enterpriseForm.orgId} onChange={(event) => setEnterpriseForm((current) => ({ ...current, orgId: event.target.value }))} required /></label><label>Contract reference<input className="input-field" value={enterpriseForm.contractReference} onChange={(event) => setEnterpriseForm((current) => ({ ...current, contractReference: event.target.value }))} required /></label><label>Starts on<input className="input-field" type="date" value={enterpriseForm.startsAt} onChange={(event) => setEnterpriseForm((current) => ({ ...current, startsAt: event.target.value }))} required /></label><label>Ends on (optional)<input className="input-field" type="date" value={enterpriseForm.endsAt} onChange={(event) => setEnterpriseForm((current) => ({ ...current, endsAt: event.target.value }))} /></label></div>
            <label>Required audit reason<textarea className="input-field billing-textarea" minLength={10} value={enterpriseForm.reason} onChange={(event) => setEnterpriseForm((current) => ({ ...current, reason: event.target.value }))} required /></label>
            <button className="btn-primary" disabled={working === 'enterprise'}><ShieldCheck size={15} /> Activate Enterprise</button>
          </form>
        </article>

        <article className="section-card billing-admin-form-card">
          <div className="section-heading"><div><h2>Complimentary override</h2><p>Time-bounded support access with automatic expiry and audit history.</p></div><RotateCcw size={21} /></div>
          <form className="billing-form" onSubmit={grantOverride}>
            <div className="billing-form-grid"><label>Organization ID<input className="input-field" value={overrideForm.orgId} onChange={(event) => setOverrideForm((current) => ({ ...current, orgId: event.target.value }))} required /></label><label>Effective plan<select className="input-field" value={overrideForm.planCode} onChange={(event) => setOverrideForm((current) => ({ ...current, planCode: event.target.value }))}><option value="pro">Pro</option><option value="max">Max</option><option value="enterprise">Enterprise</option></select></label><label>Expires on<input className="input-field" type="date" value={overrideForm.expiresAt} onChange={(event) => setOverrideForm((current) => ({ ...current, expiresAt: event.target.value }))} required /></label></div>
            <label>Required audit reason<textarea className="input-field billing-textarea" minLength={10} value={overrideForm.reason} onChange={(event) => setOverrideForm((current) => ({ ...current, reason: event.target.value }))} required /></label>
            <button className="btn-primary" disabled={working === 'override'}><ShieldCheck size={15} /> Grant override</button>
          </form>
        </article>

        <article className="section-card billing-safety-card"><div className="billing-card-icon"><ShieldCheck size={20} /></div><h2>Repair safety</h2><p>There is no “force paid” action. Sync and repair actions must fetch Razorpay truth, remain idempotent, and write an audit event. Refund creation and approval are disabled by policy; historical provider records remain available for reconciliation.</p></article>
      </section>
    </div>
  );
};
