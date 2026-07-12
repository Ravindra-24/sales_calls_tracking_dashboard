import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BadgePercent,
  CalendarDays,
  CheckCircle2,
  IndianRupee,
  LoaderCircle,
  Plus,
  RefreshCw,
  ShieldCheck,
  Tags,
  Users,
} from 'lucide-react';
import { api, getApiErrorMessage } from '../api/client';
import { billingPlanName, fetchBillingCatalog, formatBillingDate, formatBillingMoney, newBillingOperationId } from '../api/billing';
import { useAuth } from '../context/auth';
import { useFeedback } from '../context/feedback';
import type { ApiResponse } from '../types/api';
import type { BillingCatalog as BillingCatalogData, BillingPlanCode, BillingPriceVersion, BillingPromotion, BillingSettings } from '../types/billing';

const extractList = <T,>(value: T[] | { items?: T[] } | null | undefined): T[] => {
  if (Array.isArray(value)) return value;
  if (value && Array.isArray(value.items)) return value.items;
  return [];
};

export const BillingCatalog = () => {
  const { claims } = useAuth();
  const { confirm, toast } = useFeedback();
  const [catalog, setCatalog] = useState<BillingCatalogData | null>(null);
  const [prices, setPrices] = useState<BillingPriceVersion[]>([]);
  const [promotions, setPromotions] = useState<BillingPromotion[]>([]);
  const [settings, setSettings] = useState<BillingSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState('');
  const [error, setError] = useState('');
  const [priceForm, setPriceForm] = useState({ planCode: 'pro' as 'pro' | 'max', baseRupees: '1999', taxPercent: '18' });
  const [promotionForm, setPromotionForm] = useState({
    code: '',
    name: '',
    type: 'percentage' as 'percentage' | 'flat',
    value: '',
    planCode: '' as '' | BillingPlanCode,
    organizationId: '',
    validUntil: '',
    maxRedemptions: '',
  });
  const [settingsForm, setSettingsForm] = useState({
    legalName: '', gstin: '', sellerAddress: '', sellerState: '', sac: '', invoicePrefix: '',
    creditNotePrefix: '', placeOfSupplyMode: 'billing_address', alertEmails: '',
    checkoutEnabled: false, legalAndTaxApproved: false, alertingVerified: false, liveReady: false,
  });

  const loadCatalog = useCallback(async () => {
    if (claims.role !== 'platform_owner') return;
    setLoading(true);
    setError('');
    const [catalogResult, pricesResult, promotionsResult, settingsResult] = await Promise.allSettled([
      fetchBillingCatalog(),
      api.get<ApiResponse<BillingPriceVersion[] | { items?: BillingPriceVersion[] }>>('/billing/admin/prices'),
      api.get<ApiResponse<BillingPromotion[] | { items?: BillingPromotion[] }>>('/billing/admin/promotions'),
      api.get<ApiResponse<BillingSettings>>('/billing/admin/settings'),
    ]);
    if (catalogResult.status === 'fulfilled') setCatalog(catalogResult.value);
    if (pricesResult.status === 'fulfilled') setPrices(extractList(pricesResult.value.data.data));
    if (promotionsResult.status === 'fulfilled') setPromotions(extractList(promotionsResult.value.data.data));
    if (settingsResult.status === 'fulfilled') {
      const next = settingsResult.value.data.data;
      setSettings(next);
      setSettingsForm({
        legalName: next.merchant.legalName || '',
        gstin: next.merchant.gstin || '',
        sellerAddress: next.merchant.sellerAddress || '',
        sellerState: next.merchant.sellerState || '',
        sac: next.merchant.sac || '',
        invoicePrefix: next.invoicePrefix || '',
        creditNotePrefix: next.creditNotePrefix || '',
        placeOfSupplyMode: next.placeOfSupplyMode || 'billing_address',
        alertEmails: next.alertEmails.join(', '),
        checkoutEnabled: next.checkoutEnabled,
        legalAndTaxApproved: next.legalAndTaxApproved,
        alertingVerified: next.alertingVerified,
        liveReady: next.liveReady,
      });
    }
    if (pricesResult.status === 'rejected' || promotionsResult.status === 'rejected' || settingsResult.status === 'rejected') {
      setError('Catalog loaded, but some owner-only price or promotion history is unavailable.');
    }
    setLoading(false);
  }, [claims.role]);

  useEffect(() => { void loadCatalog(); }, [loadCatalog]);

  const preview = useMemo(() => {
    const baseAmountPaise = Math.round(Number(priceForm.baseRupees || 0) * 100);
    const taxRateBps = Math.round(Number(priceForm.taxPercent || 0) * 100);
    const taxAmountPaise = Math.round(baseAmountPaise * taxRateBps / 10000);
    return { baseAmountPaise, taxRateBps, taxAmountPaise, grossAmountPaise: baseAmountPaise + taxAmountPaise };
  }, [priceForm.baseRupees, priceForm.taxPercent]);

  const publishPrice = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!Number.isInteger(preview.baseAmountPaise) || preview.baseAmountPaise <= 0 || preview.taxRateBps < 0) {
      setError('Enter a valid positive base price and GST percentage.');
      return;
    }
    const plan = priceForm.planCode;
    const approved = await confirm({
      title: `Publish a new ${billingPlanName(plan)} price?`,
      message: `${formatBillingMoney(preview.baseAmountPaise)} plus ${priceForm.taxPercent}% GST will become the active immutable price. Existing subscribers remain on their current price.`,
      confirmLabel: 'Publish price',
      variant: 'warning',
    });
    if (!approved) return;
    setWorking('price');
    setError('');
    try {
      await api.post('/billing/admin/prices', {
        planCode: plan,
        baseAmountPaise: preview.baseAmountPaise,
        taxRateBps: preview.taxRateBps,
        operationId: newBillingOperationId(),
      });
      toast({ title: 'Price version published', message: 'Existing subscriptions remain grandfathered.', variant: 'success' });
      await loadCatalog();
    } catch (requestError) {
      const message = getApiErrorMessage(requestError, 'Price could not be published. No catalog change was made.');
      setError(message);
      toast({ title: 'Price not published', message, variant: 'error' });
    } finally {
      setWorking('');
    }
  };

  const createPromotion = async (event: React.FormEvent) => {
    event.preventDefault();
    const numericValue = Number(promotionForm.value);
    if (!promotionForm.code.trim() || !Number.isFinite(numericValue) || numericValue <= 0) {
      setError('Enter a code and a valid positive discount value.');
      return;
    }
    if (promotionForm.type === 'percentage' && numericValue > 100) {
      setError('Percentage discounts cannot exceed 100%.');
      return;
    }
    const approved = await confirm({
      title: `Publish promotion ${promotionForm.code.trim().toUpperCase()}?`,
      message: 'Its discounted Razorpay plan and redeemed subscription pricing will remain immutable.',
      confirmLabel: 'Publish promotion',
      variant: 'warning',
    });
    if (!approved) return;
    setWorking('promotion');
    setError('');
    try {
      await api.post('/billing/admin/promotions', {
        code: promotionForm.code.trim().toUpperCase(),
        name: promotionForm.name.trim() || promotionForm.code.trim().toUpperCase(),
        kind: promotionForm.type,
        value: promotionForm.type === 'flat' ? Math.round(numericValue * 100) : Math.round(numericValue * 100),
        planCodes: promotionForm.planCode ? [promotionForm.planCode] : ['pro', 'max'],
        organizationId: promotionForm.organizationId.trim() || undefined,
        expiresAt: promotionForm.validUntil ? new Date(`${promotionForm.validUntil}T23:59:59.999Z`).toISOString() : undefined,
        maxRedemptions: promotionForm.maxRedemptions ? Number(promotionForm.maxRedemptions) : undefined,
      });
      setPromotionForm({ code: '', name: '', type: 'percentage', value: '', planCode: '', organizationId: '', validUntil: '', maxRedemptions: '' });
      toast({ title: 'Promotion published', message: 'The code is only shown in masked form after creation.', variant: 'success' });
      await loadCatalog();
    } catch (requestError) {
      const message = getApiErrorMessage(requestError, 'Promotion could not be published.');
      setError(message);
      toast({ title: 'Promotion not published', message, variant: 'error' });
    } finally {
      setWorking('');
    }
  };

  const disablePromotion = async (promotion: BillingPromotion) => {
    const name = promotion.name || promotion.codeMasked || promotion.id;
    const approved = await confirm({
      title: `Disable ${name}?`,
      message: 'New redemptions will stop immediately. Existing subscribers keep their discount.',
      confirmLabel: 'Disable promotion',
      variant: 'danger',
    });
    if (!approved) return;
    setWorking(promotion.id);
    setError('');
    try {
      await api.patch(`/billing/admin/promotions/${encodeURIComponent(promotion.id)}`, { status: 'disabled' });
      toast({ title: 'Promotion disabled', message: `${name} is unavailable for new checkouts.`, variant: 'success' });
      await loadCatalog();
    } catch (requestError) {
      const message = getApiErrorMessage(requestError, 'Promotion could not be disabled.');
      setError(message);
      toast({ title: 'Promotion not disabled', message, variant: 'error' });
    } finally {
      setWorking('');
    }
  };

  const saveBillingSettings = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!settings) return;
    const approved = await confirm({
      title: 'Save billing readiness settings?',
      message: 'Tax identity and checkout-readiness changes take effect after server validation. This action is audited.',
      confirmLabel: 'Save settings',
      variant: 'warning',
    });
    if (!approved) return;
    setWorking('settings');
    setError('');
    try {
      await api.patch('/billing/admin/settings', {
        expectedVersion: settings.version,
        checkoutEnabled: settingsForm.checkoutEnabled,
        legalAndTaxApproved: settingsForm.legalAndTaxApproved,
        alertingVerified: settingsForm.alertingVerified,
        liveReady: settingsForm.liveReady,
        invoicePrefix: settingsForm.invoicePrefix.trim().toUpperCase() || null,
        creditNotePrefix: settingsForm.creditNotePrefix.trim().toUpperCase() || null,
        placeOfSupplyMode: settingsForm.placeOfSupplyMode,
        merchant: {
          legalName: settingsForm.legalName.trim() || null,
          gstin: settingsForm.gstin.trim().toUpperCase() || null,
          sellerAddress: settingsForm.sellerAddress.trim() || null,
          sellerState: settingsForm.sellerState.trim() || null,
          sac: settingsForm.sac.trim() || null,
        },
        alertEmails: settingsForm.alertEmails.split(',').map((email) => email.trim().toLowerCase()).filter(Boolean),
      });
      toast({ title: 'Billing settings saved', message: 'The readiness update was recorded with an audit event.', variant: 'success' });
      await loadCatalog();
    } catch (requestError) {
      const message = getApiErrorMessage(requestError, 'Billing readiness settings could not be saved.');
      setError(message);
      toast({ title: 'Billing settings not saved', message, variant: 'error' });
    } finally {
      setWorking('');
    }
  };

  if (claims.role !== 'platform_owner') {
    return <div className="page animate-fade-in"><div className="notice error-notice">Only platform owners can manage the billing catalog.</div></div>;
  }
  if (loading && !catalog) return <div className="billing-page-loader"><LoaderCircle className="spin" size={26} /> Loading billing catalog…</div>;

  return (
    <div className="page billing-page animate-fade-in">
      <header className="page-header"><div><p className="eyebrow">Platform billing</p><h1>Catalog & promotions</h1><p>Publish immutable organization prices and lifetime subscription discounts.</p></div><button className="secondary-button" onClick={() => void loadCatalog()}><RefreshCw size={16} /> Refresh</button></header>
      {error && <div className="notice error-notice">{error}</div>}
      <div className={`billing-readiness ${catalog?.checkoutAvailable ? 'ready' : 'blocked'}`}>
        {catalog?.checkoutAvailable ? <CheckCircle2 size={21} /> : <AlertTriangle size={21} />}
        <div><strong>{catalog?.checkoutAvailable ? 'Checkout configured' : 'Checkout safely disabled'}</strong><p>Mode: {catalog?.mode || 'unknown'} · Live enabled: {catalog?.liveEnabled ? 'yes' : 'no'} · Provider/tax readiness is enforced by the server.</p></div>
      </div>

      <section className="billing-admin-plan-grid">
        {catalog?.plans.map((plan) => (
          <article className="section-card billing-admin-plan" key={plan.code}>
            <div className="billing-card-icon"><ShieldCheck size={19} /></div><span>{plan.code}</span><h2>{plan.name}</h2>
            <strong>{plan.code === 'lite' ? '₹0' : plan.code === 'enterprise' ? 'Manual contract' : formatBillingMoney(plan.currentPrice?.baseAmountPaise)}</strong>
            <p>{plan.currentPrice ? `Gross ${formatBillingMoney(plan.currentPrice.grossAmountPaise)} · ${plan.currentPrice.providerReady ? 'provider ready' : 'provider pending'}` : plan.description}</p>
          </article>
        ))}
      </section>

      <section className="billing-admin-two-column">
        <article className="section-card billing-admin-form-card billing-settings-card">
          <div className="section-heading"><div><h2>GST, legal & live readiness</h2><p>Live checkout remains server-blocked until every legal, provider, and webhook check passes.</p></div><ShieldCheck size={21} /></div>
          <form className="billing-form" onSubmit={saveBillingSettings}>
            <div className="billing-form-grid">
              <label>Seller legal name<input className="input-field" value={settingsForm.legalName} onChange={(event) => setSettingsForm((current) => ({ ...current, legalName: event.target.value }))} /></label>
              <label>GSTIN<input className="input-field" maxLength={15} value={settingsForm.gstin} onChange={(event) => setSettingsForm((current) => ({ ...current, gstin: event.target.value.toUpperCase() }))} /></label>
              <label>SAC<input className="input-field" value={settingsForm.sac} onChange={(event) => setSettingsForm((current) => ({ ...current, sac: event.target.value }))} /></label>
              <label>Seller state<input className="input-field" value={settingsForm.sellerState} onChange={(event) => setSettingsForm((current) => ({ ...current, sellerState: event.target.value }))} /></label>
              <label>Invoice prefix<input className="input-field" value={settingsForm.invoicePrefix} onChange={(event) => setSettingsForm((current) => ({ ...current, invoicePrefix: event.target.value.toUpperCase() }))} /></label>
              <label>Credit-note prefix<input className="input-field" value={settingsForm.creditNotePrefix} onChange={(event) => setSettingsForm((current) => ({ ...current, creditNotePrefix: event.target.value.toUpperCase() }))} /></label>
              <label>Place of supply<select className="input-field" value={settingsForm.placeOfSupplyMode} onChange={(event) => setSettingsForm((current) => ({ ...current, placeOfSupplyMode: event.target.value }))}><option value="billing_address">Customer billing address</option><option value="seller_state">Seller state</option></select></label>
            </div>
            <label>Seller address<textarea className="input-field billing-textarea" value={settingsForm.sellerAddress} onChange={(event) => setSettingsForm((current) => ({ ...current, sellerAddress: event.target.value }))} /></label>
            <label>Alert emails (comma-separated)<input className="input-field" value={settingsForm.alertEmails} onChange={(event) => setSettingsForm((current) => ({ ...current, alertEmails: event.target.value }))} /></label>
            <div className="billing-policy-stack">
              <label className="billing-policy-check"><input type="checkbox" checked={settingsForm.checkoutEnabled} onChange={(event) => setSettingsForm((current) => ({ ...current, checkoutEnabled: event.target.checked }))} /><span>Allow checkout when the selected mode is otherwise ready</span></label>
              <label className="billing-policy-check"><input type="checkbox" checked={settingsForm.legalAndTaxApproved} onChange={(event) => setSettingsForm((current) => ({ ...current, legalAndTaxApproved: event.target.checked }))} /><span>Accountant/legal approval completed</span></label>
              <label className="billing-policy-check"><input type="checkbox" checked={settingsForm.alertingVerified} onChange={(event) => setSettingsForm((current) => ({ ...current, alertingVerified: event.target.checked }))} /><span>Owner alert notification channel tested successfully</span></label>
              <label className="billing-policy-check"><input type="checkbox" checked={settingsForm.liveReady} onChange={(event) => setSettingsForm((current) => ({ ...current, liveReady: event.target.checked }))} /><span>Live plan IDs, methods, webhook health, alerts, migration, and zero-drift checks completed</span></label>
            </div>
            <p className="billing-form-footnote">Webhook: {settings?.webhookHealth ? `${settings.webhookHealth.mode} · ${formatBillingDate(settings.webhookHealth.lastValidAt, true)}` : 'no verified event yet'} · Settings version {settings?.version ?? '—'}</p>
            <button className="btn-primary" disabled={!settings || working === 'settings'}>{working === 'settings' ? 'Saving…' : 'Save readiness settings'}</button>
          </form>
        </article>

        <article className="section-card billing-admin-form-card">
          <div className="section-heading"><div><h2>Publish price version</h2><p>Razorpay prices are immutable. Publication never migrates existing subscribers.</p></div><IndianRupee size={21} /></div>
          <form className="billing-form" onSubmit={publishPrice}>
            <div className="billing-form-grid">
              <label>Paid plan<select className="input-field" value={priceForm.planCode} onChange={(event) => setPriceForm((current) => ({ ...current, planCode: event.target.value as 'pro' | 'max', baseRupees: event.target.value === 'pro' ? '1999' : '3999' }))}><option value="pro">Pro · quarterly</option><option value="max">Max · yearly</option></select></label>
              <label>Base amount (₹)<input className="input-field" type="number" min="1" step="0.01" value={priceForm.baseRupees} onChange={(event) => setPriceForm((current) => ({ ...current, baseRupees: event.target.value }))} required /></label>
              <label>GST rate (%)<input className="input-field" type="number" min="0" max="100" step="0.01" value={priceForm.taxPercent} onChange={(event) => setPriceForm((current) => ({ ...current, taxPercent: event.target.value }))} required /></label>
            </div>
            <div className="billing-price-preview"><div><span>Base</span><strong>{formatBillingMoney(preview.baseAmountPaise)}</strong></div><div><span>GST</span><strong>{formatBillingMoney(preview.taxAmountPaise)}</strong></div><div><span>Gross debit</span><strong>{formatBillingMoney(preview.grossAmountPaise)}</strong></div></div>
            {preview.grossAmountPaise > 1500000 && <div className="billing-warning-inline"><AlertTriangle size={17} /> Gross price exceeds ₹15,000; recurring UPI/card restrictions may require eMandate review.</div>}
            <button className="btn-primary" disabled={working === 'price'}><Plus size={16} /> {working === 'price' ? 'Publishing…' : 'Publish immutable price'}</button>
          </form>
        </article>

        <article className="section-card billing-admin-form-card">
          <div className="section-heading"><div><h2>Create promotion</h2><p>One flat or percentage discount, applied before GST for the subscription lifetime.</p></div><BadgePercent size={21} /></div>
          <form className="billing-form" onSubmit={createPromotion}>
            <div className="billing-form-grid">
              <label>Code<input className="input-field" value={promotionForm.code} onChange={(event) => setPromotionForm((current) => ({ ...current, code: event.target.value.toUpperCase().replace(/\s/g, '') }))} placeholder="LAUNCH20" required /></label>
              <label>Display name<input className="input-field" value={promotionForm.name} onChange={(event) => setPromotionForm((current) => ({ ...current, name: event.target.value }))} placeholder="Launch customer" /></label>
              <label>Discount type<select className="input-field" value={promotionForm.type} onChange={(event) => setPromotionForm((current) => ({ ...current, type: event.target.value as 'flat' | 'percentage' }))}><option value="percentage">Percentage</option><option value="flat">Flat rupees</option></select></label>
              <label>{promotionForm.type === 'flat' ? 'Discount (₹)' : 'Discount (%)'}<input className="input-field" type="number" min="0.01" step="0.01" value={promotionForm.value} onChange={(event) => setPromotionForm((current) => ({ ...current, value: event.target.value }))} required /></label>
              <label>Plan restriction<select className="input-field" value={promotionForm.planCode} onChange={(event) => setPromotionForm((current) => ({ ...current, planCode: event.target.value as '' | BillingPlanCode }))}><option value="">Any paid plan</option><option value="pro">Pro</option><option value="max">Max</option></select></label>
              <label>Organization ID<input className="input-field" value={promotionForm.organizationId} onChange={(event) => setPromotionForm((current) => ({ ...current, organizationId: event.target.value }))} placeholder="Blank = public" /></label>
              <label>New-redemption expiry<input className="input-field" type="date" value={promotionForm.validUntil} onChange={(event) => setPromotionForm((current) => ({ ...current, validUntil: event.target.value }))} /></label>
              <label>Maximum redemptions<input className="input-field" type="number" min="1" value={promotionForm.maxRedemptions} onChange={(event) => setPromotionForm((current) => ({ ...current, maxRedemptions: event.target.value }))} /></label>
            </div>
            <button className="btn-primary" disabled={working === 'promotion'}><Tags size={16} /> {working === 'promotion' ? 'Publishing…' : 'Publish promotion'}</button>
          </form>
        </article>
      </section>

      <section className="section-card table-card billing-admin-table">
        <div className="section-heading table-heading"><div><h2>Immutable price history</h2><p>Subscriber count identifies grandfathered versions still in use.</p></div><IndianRupee size={20} /></div>
        <div className="table-scroll"><table className="data-table"><thead><tr><th>Plan</th><th>Version</th><th>Base</th><th>GST</th><th>Gross</th><th>Provider</th><th>Subscribers</th><th>Published</th></tr></thead><tbody>
          {prices.length === 0 ? <tr><td colSpan={8} className="table-message">No owner price history returned yet.</td></tr> : prices.map((price) => <tr key={price.id}><td data-label="Plan">{billingPlanName(price.planCode)}</td><td data-label="Version"><strong>v{price.version || '—'}</strong><small>{price.id}</small></td><td data-label="Base">{formatBillingMoney(price.baseAmountPaise, price.currency)}</td><td data-label="GST">{formatBillingMoney(price.taxAmountPaise, price.currency)}</td><td data-label="Gross">{formatBillingMoney(price.grossAmountPaise, price.currency)}</td><td data-label="Provider"><span className={`billing-status ${price.providerReady ? 'active' : 'pending'}`}>{price.providerReady ? 'ready' : 'pending'}</span></td><td data-label="Subscribers"><span className="billing-count"><Users size={14} /> {price.subscriberCount ?? 0}</span></td><td data-label="Published">{formatBillingDate(price.createdAt)}</td></tr>)}
        </tbody></table></div>
      </section>

      <section className="section-card table-card billing-admin-table">
        <div className="section-heading table-heading"><div><h2>Promotions</h2><p>Expiry or disablement affects new redemptions only.</p></div><BadgePercent size={20} /></div>
        <div className="table-scroll"><table className="data-table"><thead><tr><th>Promotion</th><th>Discount</th><th>Scope</th><th>Validity</th><th>Usage</th><th>Status</th><th>Action</th></tr></thead><tbody>
          {promotions.length === 0 ? <tr><td colSpan={7} className="table-message">No promotions created yet.</td></tr> : promotions.map((promotion) => <tr key={promotion.id}><td data-label="Promotion"><strong>{promotion.name || promotion.codeMasked || 'Private deal'}</strong><small>{promotion.codeMasked || promotion.id}</small></td><td data-label="Discount">{promotion.type === 'flat' ? formatBillingMoney(promotion.value) : `${promotion.value / 100}%`}</td><td data-label="Scope">{promotion.organizationId ? `Org ${promotion.organizationId}` : promotion.planCodes?.join(', ') || promotion.planCode || 'All paid plans'}</td><td data-label="Validity"><span className="billing-date-cell"><CalendarDays size={14} /> {promotion.validUntil ? `to ${formatBillingDate(promotion.validUntil)}` : 'No expiry'}</span></td><td data-label="Usage">{promotion.redemptionCount || 0} redeemed · {promotion.reservationCount || 0} reserved / {promotion.maxRedemptions || '∞'}</td><td data-label="Status"><span className={`billing-status ${promotion.status}`}>{promotion.status}</span></td><td data-label="Action">{promotion.status === 'active' ? <button className="secondary-button danger-button" onClick={() => void disablePromotion(promotion)} disabled={working === promotion.id}>Disable</button> : '—'}</td></tr>)}
        </tbody></table></div>
      </section>
    </div>
  );
};
