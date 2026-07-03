import { useMemo, useState } from 'react';
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

const apkDownloadUrl = import.meta.env.VITE_APK_DOWNLOAD_URL?.trim() ?? '';
const configuredSiteUrl = import.meta.env.VITE_PUBLIC_SITE_URL?.trim().replace(/\/$/, '') ?? '';
const appIcon = '/favicon.svg';
const shareTitle = 'RevConnect - Sales Call Tracking SaaS';
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

const plans = [
  {
    name: 'Starter',
    price: 'For small sales teams',
    accent: 'mint',
    features: ['Call history dashboard', 'Team member access', 'Basic performance summary', 'APK download support'],
  },
  {
    name: 'Growth',
    price: 'For growing organizations',
    accent: 'blue',
    featured: true,
    features: ['Manager and org admin roles', 'Invite and claim account flow', 'Team leaderboard', 'Daily activity trends'],
  },
  {
    name: 'Platform',
    price: 'For multi-tenant SaaS',
    accent: 'coral',
    features: ['Tenant management', 'Platform owner console', 'Organization controls', 'Scalable Firebase backend'],
  },
];

export const ProductPage = () => {
  const apkReady = Boolean(apkDownloadUrl);
  const [shareStatus, setShareStatus] = useState('');
  const shareUrl = useMemo(() => {
    if (configuredSiteUrl) return `${configuredSiteUrl}/`;
    if (typeof window !== 'undefined') return `${window.location.origin}/`;
    return 'https://saleconnect.vercel.app/';
  }, []);
  const encodedShareUrl = encodeURIComponent(shareUrl);
  const encodedShareText = encodeURIComponent(`${shareTitle} - ${shareDescription}`);

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
        <Link className="product-brand" to="/" aria-label="RevConnect product home">
          <span><img src={appIcon} alt="" /></span>
          RevConnect
        </Link>
        <div className="product-nav-links" aria-label="Product navigation">
          <a href="#product">Product</a>
          <a href="#plans">Plans</a>
          <a href="#download-app">APK</a>
          <Link to="/login">Sign in</Link>
        </div>
      </nav>

      <section className="product-hero" id="product">
        <div className="product-hero-copy product-reveal">
          <p className="product-kicker"><Sparkles size={15} /> Sales tracking SaaS</p>
          <h1>RevConnect turns every sales call into clear team momentum.</h1>
          <p>
            A modern call-tracking platform for sales teams that need mobile call sync, manager dashboards,
            tenant controls, and dependable visibility across the full sales floor.
          </p>
          <div className="product-hero-actions">
            <a className="product-primary-action" href="#download-app">
              <Download size={18} /> Download APK
            </a>
            <Link className="product-secondary-action" to="/login">
              Open dashboard <ArrowRight size={18} />
            </Link>
          </div>
          <div className="product-trust-row" aria-label="Product strengths">
            <span><CheckCircle2 size={16} /> Firebase backed</span>
            <span><CheckCircle2 size={16} /> Role secured</span>
            <span><CheckCircle2 size={16} /> Mobile first</span>
          </div>
          <div className="share-strip" aria-label="Share RevConnect">
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

        <div className="product-visual product-reveal" aria-label="RevConnect dashboard and mobile preview">
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
          <h2>Start focused, then scale to a complete multi-tenant platform.</h2>
        </div>
        <div className="plan-grid">
          {plans.map((plan) => (
            <article className={`plan-card product-scroll-reveal ${plan.accent}${plan.featured ? ' featured' : ''}`} key={plan.name}>
              {plan.featured && <div className="plan-badge">Recommended</div>}
              <h3>{plan.name}</h3>
              <p>{plan.price}</p>
              <ul>
                {plan.features.map((feature) => (
                  <li key={feature}><CheckCircle2 size={16} /> {feature}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="download-section product-scroll-reveal" id="download-app">
        <div>
          <p className="product-kicker"><Building2 size={15} /> Android APK</p>
          <h2>Give your sales team the mobile app in one click.</h2>
          <p>
            Upload the APK to Firebase Storage, set <code>VITE_APK_DOWNLOAD_URL</code>, and this section will serve
            the latest Android build directly from your public product page.
          </p>
        </div>
        <div className="download-panel">
          <div className="download-icon"><Smartphone size={28} /></div>
          <h3>RevConnect Android</h3>
          <p>{apkReady ? 'APK download is ready.' : 'APK URL is waiting for your Firebase Storage link.'}</p>
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
