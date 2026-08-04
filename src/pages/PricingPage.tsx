import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, HelpCircle, ShieldCheck } from 'lucide-react';
import {
  billingCycleLabel,
  FALLBACK_BILLING_CATALOG,
  fetchBillingCatalog,
  formatBillingMoney,
} from '../api/billing';
import { MobileSlider, PublicFooter, PublicHeader, Reveal, usePublicMetadata } from '../components/public';
import { useAuth } from '../context/auth';
import type { BillingCatalogPlan } from '../types/billing';
import { publicPlanDetails } from './publicContent';

const comparisons = [
  { label: 'Call history and lead workspace', lite: true, pro: true, max: true, enterprise: true },
  { label: 'Team member access', lite: true, pro: true, max: true, enterprise: true },
  { label: 'Field shifts and visit records', lite: true, pro: true, max: true, enterprise: true },
  { label: 'Manager and organization controls', lite: false, pro: true, max: true, enterprise: true },
  { label: 'Advanced team reporting', lite: false, pro: true, max: true, enterprise: true },
  { label: 'Optional call intelligence', lite: false, pro: false, max: true, enterprise: true },
  { label: 'API access and signed webhooks', lite: false, pro: false, max: true, enterprise: true },
  { label: 'Custom limits and commercial terms', lite: false, pro: false, max: false, enterprise: true },
];

export const PricingPage = () => {
  const { user, claims } = useAuth();
  const [billingCatalog, setBillingCatalog] = useState(FALLBACK_BILLING_CATALOG);

  usePublicMetadata({
    title: 'Pricing | Smartly Manage',
    description: 'Compare Smartly Manage Lite, Pro, Max, and Enterprise plans for call tracking, leads, field visits, call intelligence, and integrations.',
    path: '/pricing',
  });

  useEffect(() => {
    let active = true;
    void fetchBillingCatalog().then((catalog) => {
      if (active) setBillingCatalog(catalog);
    });
    return () => { active = false; };
  }, []);

  const planDestination = (plan: BillingCatalogPlan) => {
    if (plan.code === 'enterprise') return 'mailto:info@smartlymanage.com?subject=Smartly%20Manage%20Enterprise';
    if (claims.role === 'platform_owner') return '/dashboard/billing-catalog';
    if (claims.role === 'org_admin' || claims.role === 'manager') {
      return plan.code === 'pro' || plan.code === 'max'
        ? `/dashboard/billing?plan=${plan.code}`
        : '/dashboard/billing';
    }
    if (claims.role === 'sales_member' || user) return '/dashboard';
    return `/signup?plan=${plan.code}`;
  };

  return (
    <div className="lw-public lw-inner-page">
      <PublicHeader contextLabel="Pricing" />
      <main>
        <section className="lw-page-hero lw-pricing-hero">
          <div className="lw-container lw-pricing-hero-grid">
            <Reveal>
              <p className="lw-eyebrow">Simple starting point, room to grow</p>
              <h1>Choose the workflow your sales operation needs today.</h1>
              <p>Start with calls and leads on Lite, add manager workflows with Pro, unlock call intelligence and integrations with Max, or design an Enterprise arrangement.</p>
            </Reveal>
            <Reveal className="lw-pricing-assurance" delay={100}>
              <ShieldCheck size={25} />
              <div><strong>Live organization pricing</strong><p>Paid prices and checkout availability come from the current billing catalog. GST is shown separately where applicable.</p></div>
            </Reveal>
          </div>
        </section>

        <section className="lw-section lw-pricing-section lw-pricing-page-plans">
          <div className="lw-container">
            {!billingCatalog.checkoutAvailable && (
              <div className="lw-catalog-notice" role="status">
                <ShieldCheck size={18} />
                <p><strong>Paid checkout is temporarily unavailable.</strong> You can still create a Lite account today and return when paid plans reopen.</p>
              </div>
            )}
            <MobileSlider className="lw-plan-grid" count={billingCatalog.plans.length} label="Pricing plans">
              {billingCatalog.plans.map((plan, index) => {
                const details = publicPlanDetails[plan.code];
                const price = plan.currentPrice;
                const planReady = plan.code === 'lite' || plan.code === 'enterprise' || (billingCatalog.checkoutAvailable && Boolean(price?.providerReady));
                const destination = !planReady && !user && plan.code !== 'lite' && plan.code !== 'enterprise'
                  ? '/signup?plan=lite'
                  : planDestination(plan);
                const actionLabel = claims.role === 'sales_member'
                  ? 'Return to dashboard'
                  : planReady
                    ? user
                      ? 'Manage plan'
                      : plan.code === 'lite'
                        ? 'Start free'
                        : `Choose ${plan.name}`
                    : user
                      ? 'View billing status'
                      : 'Start on Lite';

                return (
                  <Reveal
                    as="article"
                    className={`lw-plan-card lw-accent-${details.accent}${plan.code === 'pro' ? ' is-featured' : ''}`}
                    delay={index * 65}
                    key={plan.code}
                  >
                    <div className="lw-plan-topline">
                      <h3>{plan.name}</h3>
                      {plan.code === 'pro' && <span>Recommended</span>}
                    </div>
                    <small className="lw-plan-audience">{details.audience}</small>
                    <div className="lw-plan-price">
                      <strong>{plan.code === 'lite' ? '₹0' : plan.code === 'enterprise' ? 'Custom' : formatBillingMoney(price?.baseAmountPaise)}</strong>
                      <span>{plan.code === 'lite' ? 'free forever' : plan.code === 'enterprise' ? 'contact sales' : `${billingCycleLabel(plan.code, price?.billingPeriod, price?.interval)} + GST`}</span>
                    </div>
                    <p>{plan.description}</p>
                    <ul>{details.features.map((feature) => <li key={feature}><CheckCircle2 size={16} /> {feature}</li>)}</ul>
                    {plan.code === 'enterprise' ? (
                      <a className="lw-plan-action" href={destination}>Contact sales <ArrowRight size={16} /></a>
                    ) : (
                      <Link className="lw-plan-action" to={destination}>{actionLabel} <ArrowRight size={16} /></Link>
                    )}
                  </Reveal>
                );
              })}
            </MobileSlider>
          </div>
        </section>

        <Reveal as="section" className="lw-section lw-comparison-section">
          <div className="lw-container">
            <div className="lw-section-heading">
              <p className="lw-eyebrow">Feature comparison</p>
              <h2>See where each capability begins.</h2>
              <p>This summary shows where each major capability begins. Optional features still require the relevant organization approval, representative disclosure, and device permissions.</p>
            </div>
            <div className="lw-comparison-wrap">
              <table>
                <thead><tr><th>Capability</th><th>Lite</th><th>Pro</th><th>Max</th><th>Enterprise</th></tr></thead>
                <tbody>
                  {comparisons.map((row) => (
                    <tr key={row.label}>
                      <th>{row.label}</th>
                      {(['lite', 'pro', 'max', 'enterprise'] as const).map((plan) => (
                        <td key={plan}>{row[plan] ? <CheckCircle2 size={18} aria-label="Included" /> : <span aria-label="Not included">—</span>}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Reveal>

        <section className="lw-pricing-help">
          <div className="lw-container">
            <Reveal>
              <HelpCircle size={28} />
              <div><small>Need help deciding?</small><h2>Tell us about your team, reporting needs, and connected systems.</h2></div>
              <div>
                <a className="lw-button lw-button-light" href="mailto:info@smartlymanage.com">Talk to sales</a>
                <Link className="lw-text-link" to="/faq">Read pricing answers <ArrowRight size={16} /></Link>
              </div>
            </Reveal>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
};
