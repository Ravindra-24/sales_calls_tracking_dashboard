import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  Cloud,
  Copy,
  Download,
  Gauge,
  LockKeyhole,
  MessageCircle,
  PhoneCall,
  Send,
  ShieldCheck,
  Share2,
  Smartphone,
  Sparkles,
  Timer,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/auth';
import {
  billingCycleLabel,
  FALLBACK_BILLING_CATALOG,
  fetchBillingCatalog,
  formatBillingMoney,
} from '../api/billing';
import type { BillingCatalogPlan, BillingPlanCode } from '../types/billing';

const apkDownloadUrl = import.meta.env.VITE_APK_DOWNLOAD_URL?.trim() ?? '';
const configuredSiteUrl = import.meta.env.VITE_PUBLIC_SITE_URL?.trim().replace(/\/$/, '') ?? '';
const appIcon = '/favicon.svg';
const shareTitle = 'LeadWatch - Sales Call Tracking';
const shareDescription = 'Track sales calls from Android devices, monitor team performance, and manage your sales operation from one dashboard.';

const highlights = [
  { icon: PhoneCall, label: 'Automatic call capture', detail: 'Android sales calls sync into the dashboard with rep, duration, direction, and time.' },
  { icon: BarChart3, label: 'Live sales visibility', detail: 'Leaders see daily volume, rep ranking, missed calls, and team activity from one console.' },
  { icon: ShieldCheck, label: 'Role based access', detail: 'Platform owner, org admin, manager, and sales member flows stay clean and controlled.' },
  { icon: Cloud, label: 'Cloud ready operations', detail: 'Built around Firebase Auth, Cloud Functions, and storage-ready mobile delivery.' },
];

const workflow = [
  { icon: Smartphone, title: 'Install mobile app', copy: 'Sales members install the Android APK and sign in with their assigned account.' },
  { icon: Zap, title: 'Sync call activity', copy: 'The app uploads call metadata in the background so teams do not depend on manual entry.' },
  { icon: Gauge, title: 'Track performance', copy: 'Managers monitor call volume, duration, missed calls, and rep consistency.' },
];

const publicPlanDetails: Record<BillingPlanCode, { accent: string; features: string[] }> = {
  lite: {
    accent: 'mint',
    features: ['Call history dashboard', 'Team member access', 'Basic performance summary', 'No payment method required'],
  },
  pro: {
    accent: 'blue',
    features: ['Manager and org admin roles', 'Quarterly organization billing', 'Team reporting and controls', 'Payment recovery grace'],
  },
  max: {
    accent: 'coral',
    features: ['Organizer API access', 'Signed event webhooks', 'Growth integration limits', 'Annual organization billing'],
  },
  enterprise: {
    accent: 'gold',
    features: ['Custom commercial terms', 'Enterprise integration limits', 'Audited manual activation', 'Dedicated sales conversation'],
  },
};

export const ProductPage = () => {
  const { user, claims } = useAuth();
  const apkReady = Boolean(apkDownloadUrl);
  const [shareStatus, setShareStatus] = useState('');
  const [billingCatalog, setBillingCatalog] = useState(FALLBACK_BILLING_CATALOG);
  const shareUrl = useMemo(() => {
    if (configuredSiteUrl) return `${configuredSiteUrl}/`;
    if (typeof window !== 'undefined') return `${window.location.origin}/`;
    return 'https://saleconnect.vercel.app/';
  }, []);
  const encodedShareUrl = encodeURIComponent(shareUrl);
  const encodedShareText = encodeURIComponent(`${shareTitle} - ${shareDescription}`);

  useEffect(() => {
    let active = true;
    void fetchBillingCatalog().then((catalog) => {
      if (active) setBillingCatalog(catalog);
    });
    return () => { active = false; };
  }, []);

  const planDestination = (plan: BillingCatalogPlan) => {
    if (plan.code === 'enterprise') return 'mailto:sales@leadwatch.app?subject=LeadWatch%20Enterprise';
    if (claims.role === 'org_admin' || claims.role === 'manager') return '/dashboard/billing';
    if (claims.role === 'platform_owner') return '/dashboard/billing-catalog';
    if (claims.role) return '/dashboard';
    return `/signup?plan=${plan.code}`;
  };

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareStatus('Copied');
    } catch {
      setShareStatus('Copy link');
    }
    window.setTimeout(() => setShareStatus(''), 1800);
  };

  const shareLandingPage = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle, text: shareDescription, url: shareUrl });
        return;
      } catch {
        return;
      }
    }
    await copyShareLink();
  };

  return (
    <main className="product-page">
      <nav className="product-nav">
        <Link className="product-brand" to="/" aria-label="LeadWatch product home">
          <span><img src={appIcon} alt="" /></span>
          LeadWatch
        </Link>
        <div className="product-nav-links" aria-label="Product navigation">
          <a href="#product">Product</a>
          <a href="#plans">Plans</a>
          <Link to="/docs/integrations">API Docs</Link>
          <a href="#download-app">APK</a>
          <Link to={user ? '/dashboard' : '/login'}>{user ? 'Dashboard' : 'Sign in'}</Link>
        </div>
      </nav>

      <section className="product-hero" id="product">
        <div className="product-hero-copy product-reveal">
          <p className="product-kicker"><Sparkles size={15} /> Sales call tracking</p>
          <h1>LeadWatch turns every sales call into clear team momentum.</h1>
          <p>
            A modern call-tracking platform for sales teams that need mobile call sync, manager dashboards,
            tenant controls, and dependable visibility across the full sales floor.
          </p>
          <div className="product-hero-actions">
            <a className="product-primary-action" href="#download-app">
              <Download size={18} /> Download APK
            </a>
            <Link className="product-secondary-action" to={user ? '/dashboard' : '/login'}>
              {user ? 'Return to dashboard' : 'Open dashboard'} <ArrowRight size={18} />
            </Link>
          </div>
          <div className="product-trust-row" aria-label="Product strengths">
            <span><CheckCircle2 size={16} /> Firebase backed</span>
            <span><CheckCircle2 size={16} /> Role secured</span>
            <span><CheckCircle2 size={16} /> Mobile first</span>
          </div>
          <div className="share-strip" aria-label="Share LeadWatch">
            <button type="button" onClick={shareLandingPage}>
              <Share2 size={16} /> Share
            </button>
            <a
              href={`https://wa.me/?text=${encodedShareText}%20${encodedShareUrl}`}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle size={16} /> WhatsApp
            </a>
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedShareUrl}`}
              target="_blank"
              rel="noreferrer"
            >
              <Send size={16} /> LinkedIn
            </a>
            <a
              href={`https://twitter.com/intent/tweet?text=${encodedShareText}&url=${encodedShareUrl}`}
              target="_blank"
              rel="noreferrer"
            >
              X
            </a>
            <button type="button" onClick={copyShareLink}>
              <Copy size={16} /> {shareStatus || 'Copy'}
            </button>
          </div>
        </div>

        <div className="product-visual product-reveal" aria-label="LeadWatch dashboard and mobile preview">
          <div className="signal-ring" />
          <div className="dashboard-preview">
            <div className="preview-toolbar">
              <span />
              <span />
              <span />
            </div>
            <div className="preview-grid">
              <div>
                <p>Today calls</p>
                <strong>248</strong>
              </div>
              <div>
                <p>Connected</p>
                <strong>81%</strong>
              </div>
            </div>
            <div className="preview-bars" aria-hidden="true">
              <i style={{ height: '48%' }} />
              <i style={{ height: '72%' }} />
              <i style={{ height: '58%' }} />
              <i style={{ height: '86%' }} />
              <i style={{ height: '64%' }} />
              <i style={{ height: '92%' }} />
            </div>
          </div>
          <div className="phone-preview">
            <img className="phone-app-icon" src={appIcon} alt="" />
            <div className="phone-screen">
              <PhoneCall size={18} />
              <strong>Call synced</strong>
              <span>2m 48s outgoing</span>
            </div>
          </div>
          <div className="live-pill"><Timer size={15} /> Live activity</div>
        </div>
      </section>

      <section className="product-section product-scroll-reveal">
        <div className="product-section-heading">
          <p className="product-kicker">Why teams use it</p>
          <h2>Everything your sales operation needs after the call happens.</h2>
        </div>
        <div className="product-feature-grid">
          {highlights.map((item) => (
            <article className="product-feature-card product-scroll-reveal" key={item.label}>
              <span><item.icon size={21} /></span>
              <h3>{item.label}</h3>
              <p>{item.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="product-workflow product-scroll-reveal">
        {workflow.map((item, index) => (
          <article className="workflow-step product-scroll-reveal" key={item.title}>
            <div className="workflow-index">0{index + 1}</div>
            <span><item.icon size={22} /></span>
            <h3>{item.title}</h3>
            <p>{item.copy}</p>
          </article>
        ))}
      </section>

      <section className="product-section product-scroll-reveal" id="plans">
        <div className="product-section-heading">
          <p className="product-kicker">Plans</p>
          <h2>Simple organization pricing that grows with your sales operation.</h2>
        </div>
        {!billingCatalog.checkoutAvailable && (
          <div className="product-billing-notice">
            Plan purchase is temporarily unavailable while secure payment and tax configuration is completed. You can still create a Lite account.
          </div>
        )}
        <div className="plan-grid">
          {billingCatalog.plans.map((plan) => {
            const details = publicPlanDetails[plan.code];
            const price = plan.currentPrice;
            const planReady = plan.code === 'lite' || plan.code === 'enterprise' || (billingCatalog.checkoutAvailable && Boolean(price?.providerReady));
            return (
            <article className={`plan-card product-scroll-reveal ${details.accent}${plan.code === 'pro' ? ' featured' : ''}`} key={plan.code}>
              {plan.code === 'pro' && <div className="plan-badge">Recommended</div>}
              <h3>{plan.name}</h3>
              <div className="public-plan-price">
                <strong>{plan.code === 'lite' ? '₹0' : plan.code === 'enterprise' ? 'Custom' : formatBillingMoney(price?.baseAmountPaise)}</strong>
                <span>{plan.code === 'lite' ? 'free forever' : plan.code === 'enterprise' ? 'contact sales' : `${billingCycleLabel(plan.code, price?.billingPeriod, price?.interval)} + GST`}</span>
              </div>
              <p>{plan.description}</p>
              <ul>
                {details.features.map((feature) => (
                  <li key={feature}><CheckCircle2 size={16} /> {feature}</li>
                ))}
              </ul>
              {plan.code === 'enterprise' ? (
                <a className="public-plan-action" href={planDestination(plan)}>Contact sales <ArrowRight size={16} /></a>
              ) : (
                <Link className="public-plan-action" to={planDestination(plan)}>
                  {claims.role === 'sales_member' ? 'Return to dashboard' : planReady ? (user ? 'Manage plan' : plan.code === 'lite' ? 'Start free' : `Choose ${plan.name}`) : (user ? 'View billing status' : 'Start on Lite')}
                  <ArrowRight size={16} />
                </Link>
              )}
            </article>
            );
          })}
        </div>
      </section>

      <section className="download-section product-scroll-reveal" id="download-app">
        <div>
          <p className="product-kicker"><Building2 size={15} /> Android APK</p>
          <h2>Give your sales team the mobile app in one click.</h2>
          <p>
            Download the Android app, sign in with your LeadWatch account, and let call activity sync securely
            to the dashboard for managers and sales teams.
          </p>
        </div>
        <div className="download-panel">
          <div className="download-icon"><Smartphone size={28} /></div>
          <h3>LeadWatch Android</h3>
          <p>{apkReady ? 'Install the latest Android build for call syncing.' : 'The Android app download will be available soon.'}</p>
          <a
            className={`product-download-button${apkReady ? '' : ' is-disabled'}`}
            href={apkReady ? apkDownloadUrl : '#download-app'}
            aria-disabled={!apkReady}
            onClick={(event) => {
              if (!apkReady) event.preventDefault();
            }}
          >
            <Download size={18} /> {apkReady ? 'Download APK' : 'URL coming soon'}
          </a>
          <span><LockKeyhole size={14} /> Dashboard access stays protected by Firebase Auth.</span>
        </div>
      </section>
    </main>
  );
};
