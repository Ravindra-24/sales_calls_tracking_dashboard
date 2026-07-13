import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  BellRing,
  BriefcaseBusiness,
  CheckCircle2,
  Cloud,
  Code2,
  Download,
  Gauge,
  KeyRound,
  LockKeyhole,
  PhoneCall,
  Plug,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UserRoundCheck,
  UsersRound,
  Webhook,
  Zap,
} from 'lucide-react';
import {
  billingCycleLabel,
  FALLBACK_BILLING_CATALOG,
  fetchBillingCatalog,
  formatBillingMoney,
} from '../api/billing';
import { GoogleOneTap } from '../components/auth/GoogleOneTap';
import { PublicFooter, PublicHeader, Reveal, usePublicMetadata } from '../components/public';
import { useAuth } from '../context/auth';
import type { BillingCatalogPlan, BillingPlanCode } from '../types/billing';

const observedSections = ['product-tour', 'roles', 'pricing', 'android', 'faq'];

const outcomes = [
  {
    icon: PhoneCall,
    title: 'Calls become visible',
    copy: 'Android call metadata moves into one organized history without asking reps to recreate every interaction by hand.',
  },
  {
    icon: Gauge,
    title: 'Coaching gets context',
    copy: 'Managers can review call direction, duration, missed activity, and team patterns before the next coaching conversation.',
  },
  {
    icon: UserRoundCheck,
    title: 'Reps keep moving',
    copy: 'Sales members stay focused on conversations while their permitted call activity syncs in the background.',
  },
  {
    icon: ShieldCheck,
    title: 'Access stays intentional',
    copy: 'Role-aware workspaces keep organization controls, manager views, and individual activity appropriately separated.',
  },
];

const workflow = [
  {
    icon: UsersRound,
    step: '01',
    title: 'Bring your team together',
    copy: 'Invite managers and sales members into the organization with the role that matches how they work.',
  },
  {
    icon: Smartphone,
    step: '02',
    title: 'Connect Android activity',
    copy: 'The sales member signs in on Android and grants the call-log permissions needed for metadata sync.',
  },
  {
    icon: BarChart3,
    step: '03',
    title: 'See the whole picture',
    copy: 'Call history and team views give managers a dependable place to review activity and plan follow-up.',
  },
];

const managerBenefits = [
  'Review team activity from one workspace',
  'Spot missed-call and follow-up signals sooner',
  'Use consistent call context in coaching',
];

const representativeBenefits = [
  'Reduce repetitive manual call reporting',
  'Keep work activity tied to the right account',
  'Stay focused on customers instead of spreadsheets',
];

const securityPoints = [
  {
    icon: PhoneCall,
    title: 'Metadata, not recordings',
    copy: 'LeadWatch syncs call-log details such as time, direction, duration, and status. It does not record call audio.',
  },
  {
    icon: LockKeyhole,
    title: 'Authenticated access',
    copy: 'The dashboard and Android app require a signed-in LeadWatch account before organization activity is available.',
  },
  {
    icon: KeyRound,
    title: 'Role-aware controls',
    copy: 'Organization administration and team views follow the permissions assigned to each LeadWatch role.',
  },
];

const integrations = [
  {
    icon: Code2,
    title: 'LeadWatch API',
    copy: 'Read organization, team, call, and performance data from your own trusted backend.',
  },
  {
    icon: Webhook,
    title: 'Signed webhooks',
    copy: 'Receive verifiable event notifications when eligible LeadWatch activity changes.',
  },
  {
    icon: Plug,
    title: 'Scoped connections',
    copy: 'Create purpose-specific credentials and grant only the access each connected system needs.',
  },
];

const publicPlanDetails: Record<BillingPlanCode, { accent: string; features: string[] }> = {
  lite: {
    accent: 'cyan',
    features: ['Call history dashboard', 'Team member access', 'Basic performance summary', 'No payment method required'],
  },
  pro: {
    accent: 'violet',
    features: ['Manager and organization admin roles', 'Quarterly organization billing', 'Team reporting and controls', 'Payment recovery grace'],
  },
  max: {
    accent: 'blue',
    features: ['LeadWatch API access', 'Signed event webhooks', 'Higher integration limits', 'Annual organization billing'],
  },
  enterprise: {
    accent: 'warm',
    features: ['Custom commercial terms', 'Enterprise integration limits', 'Audited manual activation', 'Dedicated sales conversation'],
  },
};

const faqs = [
  {
    question: 'Does LeadWatch record sales call audio?',
    answer: 'No. LeadWatch syncs permitted call metadata from Android, including details such as call time, direction, duration, and status. It does not record the conversation.',
  },
  {
    question: 'Who is LeadWatch designed for?',
    answer: 'LeadWatch is designed for sales organizations that want managers to understand team call activity while keeping the rep workflow simple.',
  },
  {
    question: 'Do sales members need to enter every call manually?',
    answer: 'No. After the Android app is installed, the member signs in, and the required call-log permissions are granted, eligible metadata can sync from the device.',
  },
  {
    question: 'Can LeadWatch connect with another business system?',
    answer: 'Max and Enterprise plans include LeadWatch integration capabilities such as scoped API access and signed webhooks. The public API documentation explains the available endpoints and limits.',
  },
  {
    question: 'What happens when Android download is not available?',
    answer: 'The page shows a clear availability status instead of sending visitors to a broken download. Your organization can still review the product and create an account.',
  },
];

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const usePublicScrollSpy = () => {
  const [activeSection, setActiveSection] = useState('');

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const marker = Math.min(190, window.innerHeight * 0.32);
      let current = '';
      for (const id of observedSections) {
        const section = document.getElementById(id);
        if (section && section.getBoundingClientRect().top <= marker) current = id;
      }
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 8) current = 'faq';
      setActiveSection(current);
    };

    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, []);

  return activeSection;
};

export const ProductPage = () => {
  const navigate = useNavigate();
  const { user, claims, refreshClaims } = useAuth();
  const [billingCatalog, setBillingCatalog] = useState(FALLBACK_BILLING_CATALOG);
  const [screenshotFailed, setScreenshotFailed] = useState(false);
  const [googleError, setGoogleError] = useState('');
  const activeSection = usePublicScrollSpy();
  const apkDownloadUrl = import.meta.env.VITE_APK_DOWNLOAD_URL?.trim() ?? '';
  const apkScreenshotUrl = import.meta.env.VITE_APK_SCREENSHOT_URL?.trim() ?? '';
  const apkReady = Boolean(apkDownloadUrl);
  const screenshotReady = Boolean(apkScreenshotUrl) && !screenshotFailed;

  usePublicMetadata({
    title: 'LeadWatch | Every sales call. One clear picture.',
    description: 'Turn Android sales call metadata into a clear, role-aware view for managers and their teams with LeadWatch.',
    path: '/',
  });

  useEffect(() => {
    let active = true;
    void fetchBillingCatalog().then((catalog) => {
      if (active) setBillingCatalog(catalog);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!window.location.hash) return;
    const id = window.location.hash.slice(1);
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        block: 'start',
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const planDestination = (plan: BillingCatalogPlan) => {
    if (plan.code === 'enterprise') return 'mailto:sales@leadwatch.app?subject=LeadWatch%20Enterprise';
    if (claims.role === 'platform_owner') return '/dashboard/billing-catalog';
    if (claims.role === 'org_admin' || claims.role === 'manager') {
      return plan.code === 'pro' || plan.code === 'max'
        ? `/dashboard/billing?plan=${plan.code}`
        : '/dashboard/billing';
    }
    if (claims.role === 'sales_member' || user) return '/dashboard';
    return `/signup?plan=${plan.code}`;
  };

  const scrollToProductTour = (event: React.MouseEvent<HTMLAnchorElement>) => {
    const section = document.getElementById('product-tour');
    if (!section) return;
    event.preventDefault();
    section.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
    window.history.replaceState(null, '', '/#product-tour');
  };

  const routeAfterGoogleAuth = useCallback(async () => {
    setGoogleError('');
    const nextClaims = await refreshClaims();
    if (!nextClaims.role) {
      const selectedPlan = localStorage.getItem('leadwatch.selectedBillingPlan') || 'lite';
      navigate(`/signup?plan=${selectedPlan}`, { replace: true });
      return;
    }
    navigate('/dashboard', { replace: true });
  }, [navigate, refreshClaims]);

  return (
    <div className="lw-public lw-home">
      <PublicHeader activeSection={activeSection} />

      <main>
        <section className="lw-hero" aria-labelledby="leadwatch-hero-title">
          <div className="lw-hero-glow" aria-hidden="true" />
          <div className="lw-container lw-hero-grid">
            <Reveal className="lw-hero-copy">
              <p className="lw-eyebrow"><Sparkles size={15} /> Sales call visibility, without manual reporting</p>
              <h1 id="leadwatch-hero-title">Every sales call. One clear picture.</h1>
              <p className="lw-hero-lead">
                LeadWatch brings Android call metadata, team activity, and manager context into one focused workspace—so your sales operation can act with clarity.
              </p>
              <div className="lw-hero-actions">
                <Link className="lw-button lw-button-primary" to={user ? '/dashboard' : '/signup'}>
                  {user ? 'Open dashboard' : 'Start free'} <ArrowRight size={18} />
                </Link>
                <a className="lw-button lw-button-secondary" href="#product-tour" onClick={scrollToProductTour}>
                  See the product tour
                </a>
              </div>
              {!user && (
                <div className="lw-hero-google-auth">
                  <GoogleOneTap
                    context="signin"
                    buttonText="continue_with"
                    onSuccess={routeAfterGoogleAuth}
                    onError={setGoogleError}
                  />
                  {googleError && <div className="lw-hero-google-error" role="alert">{googleError}</div>}
                </div>
              )}
              <div className="lw-hero-assurances" aria-label="LeadWatch product assurances">
                <span><CheckCircle2 size={15} /> Call metadata—not recordings</span>
                <span><CheckCircle2 size={15} /> Role-aware access</span>
                <span><CheckCircle2 size={15} /> Android and web workflow</span>
              </div>
            </Reveal>

            <Reveal className="lw-product-preview" delay={120}>
              <div className="lw-preview-orbit" aria-hidden="true" />
              <div className="lw-preview-window">
                <div className="lw-preview-toolbar">
                  <div className="lw-preview-title">
                    <img src="/favicon.svg" alt="" />
                    <span><strong>Team overview</strong><small>Manager workspace</small></span>
                  </div>
                  <span className="lw-preview-status"><i /> Sync ready</span>
                </div>
                <div className="lw-preview-body">
                  <div className="lw-preview-sidebar" aria-hidden="true">
                    <span className="active"><Gauge size={16} /> Overview</span>
                    <span><PhoneCall size={16} /> Calls</span>
                    <span><UsersRound size={16} /> Team</span>
                    <span><BarChart3 size={16} /> Reports</span>
                  </div>
                  <div className="lw-preview-content">
                    <div className="lw-preview-heading">
                      <span>Call activity</span>
                      <small>Updates when your team syncs</small>
                    </div>
                    <div className="lw-preview-summary">
                      <div><PhoneCall size={17} /><span><strong>Recent calls</strong><small>One organized timeline</small></span></div>
                      <div><BellRing size={17} /><span><strong>Follow-up signals</strong><small>Missed activity stays visible</small></span></div>
                    </div>
                    <div className="lw-preview-activity">
                      <div><span className="lw-call-icon outgoing"><ArrowRight size={14} /></span><p><strong>Outgoing call</strong><small>Synced from Android</small></p><em>Connected</em></div>
                      <div><span className="lw-call-icon incoming"><PhoneCall size={14} /></span><p><strong>Incoming call</strong><small>Available to the manager view</small></p><em>Synced</em></div>
                      <div><span className="lw-call-icon missed"><BellRing size={14} /></span><p><strong>Missed call</strong><small>Ready for follow-up</small></p><em>Review</em></div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="lw-preview-phone" aria-label="LeadWatch Android sync preview">
                <span className="lw-phone-speaker" />
                <img src="/favicon.svg" alt="" />
                <small>Android sync</small>
                <strong>Call metadata ready</strong>
                <span className="lw-phone-check"><CheckCircle2 size={17} /> Secure sign-in</span>
              </div>
            </Reveal>
          </div>
        </section>

        <Reveal as="section" className="lw-section lw-outcomes-section" id="outcomes">
          <div className="lw-container">
            <div className="lw-section-heading">
              <p className="lw-eyebrow">What changes with LeadWatch</p>
              <h2>Less chasing for updates. More useful conversations.</h2>
              <p>LeadWatch gives managers a consistent view of sales call activity while keeping the day-to-day experience practical for the rep.</p>
            </div>
            <div className="lw-outcome-grid">
              {outcomes.map((outcome, index) => (
                <Reveal as="article" className="lw-outcome-card" delay={index * 70} key={outcome.title}>
                  <span className="lw-icon-tile"><outcome.icon size={21} /></span>
                  <h3>{outcome.title}</h3>
                  <p>{outcome.copy}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal as="section" className="lw-section lw-tour-section" id="product-tour">
          <div className="lw-container lw-tour-layout">
            <div className="lw-tour-copy">
              <p className="lw-eyebrow">A connected workflow</p>
              <h2>From the phone call to the manager view.</h2>
              <p>No disconnected reporting chain. LeadWatch connects the team account, the Android companion, and the web dashboard in one understandable flow.</p>
              <Link className="lw-text-link" to={user ? '/dashboard' : '/signup'}>
                {user ? 'Open your workspace' : 'Create your workspace'} <ArrowRight size={17} />
              </Link>
            </div>
            <div className="lw-workflow-list">
              {workflow.map((item, index) => (
                <Reveal className="lw-workflow-step" delay={index * 80} key={item.title}>
                  <span className="lw-workflow-number">{item.step}</span>
                  <span className="lw-icon-tile"><item.icon size={21} /></span>
                  <div><h3>{item.title}</h3><p>{item.copy}</p></div>
                </Reveal>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal as="section" className="lw-section lw-roles-section" id="roles">
          <div className="lw-container">
            <div className="lw-section-heading lw-section-heading-center">
              <p className="lw-eyebrow">Designed for both sides of the team</p>
              <h2>Useful for managers. Lightweight for representatives.</h2>
              <p>The product works when it creates clarity for leadership without turning every sales member into a data-entry operator.</p>
            </div>
            <div className="lw-role-grid">
              <Reveal as="article" className="lw-role-card lw-role-manager">
                <div className="lw-role-card-heading"><span className="lw-icon-tile"><BriefcaseBusiness size={22} /></span><div><small>For owners and managers</small><h3>Coach with a clearer view</h3></div></div>
                <p>Bring call activity into the same place you manage people, follow-up, and performance conversations.</p>
                <ul>{managerBenefits.map((benefit) => <li key={benefit}><CheckCircle2 size={17} /> {benefit}</li>)}</ul>
              </Reveal>
              <Reveal as="article" className="lw-role-card lw-role-rep" delay={100}>
                <div className="lw-role-card-heading"><span className="lw-icon-tile"><UserRoundCheck size={22} /></span><div><small>For sales representatives</small><h3>Spend less time reporting</h3></div></div>
                <p>Use the Android companion to keep eligible activity connected to the organization account with less repetitive admin.</p>
                <ul>{representativeBenefits.map((benefit) => <li key={benefit}><CheckCircle2 size={17} /> {benefit}</li>)}</ul>
              </Reveal>
            </div>
          </div>
        </Reveal>

        <Reveal as="section" className="lw-section lw-security-section" id="security">
          <div className="lw-container lw-security-layout">
            <div className="lw-security-copy">
              <p className="lw-eyebrow">Privacy made understandable</p>
              <h2>Clear about what the product uses—and what it does not.</h2>
              <p>Teams should understand the data path before they adopt a call-visibility tool. LeadWatch keeps the product experience centered on permitted metadata and authenticated, role-aware access.</p>
            </div>
            <div className="lw-security-grid">
              {securityPoints.map((point, index) => (
                <Reveal as="article" className="lw-security-card" delay={index * 70} key={point.title}>
                  <point.icon size={21} />
                  <h3>{point.title}</h3>
                  <p>{point.copy}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal as="section" className="lw-section lw-integrations-section" id="integrations">
          <div className="lw-container">
            <div className="lw-integrations-heading">
              <div>
                <p className="lw-eyebrow">Build beyond the dashboard</p>
                <h2>Connect LeadWatch to the systems around your sales workflow.</h2>
              </div>
              <Link className="lw-button lw-button-light" to="/docs/integrations">Explore API docs <ArrowRight size={17} /></Link>
            </div>
            <div className="lw-integration-grid">
              {integrations.map((item, index) => (
                <Reveal as="article" className="lw-integration-card" delay={index * 75} key={item.title}>
                  <span className="lw-icon-tile"><item.icon size={21} /></span>
                  <h3>{item.title}</h3>
                  <p>{item.copy}</p>
                </Reveal>
              ))}
            </div>
            <p className="lw-integration-note"><Cloud size={15} /> Integration access and limits depend on the organization plan.</p>
          </div>
        </Reveal>

        <Reveal as="section" className="lw-section lw-pricing-section" id="pricing">
          <div className="lw-container">
            <div className="lw-section-heading">
              <p className="lw-eyebrow">Live organization pricing</p>
              <h2>Start simply. Add depth as the operation grows.</h2>
              <p>Choose the level of team visibility, reporting, and integrations that fits your sales operation today.</p>
            </div>
            {!billingCatalog.checkoutAvailable && (
              <div className="lw-catalog-notice" role="status">
                <ShieldCheck size={18} />
                <p><strong>Paid checkout is temporarily unavailable.</strong> You can still create a Lite account today and return when paid plans reopen.</p>
              </div>
            )}
            <div className="lw-plan-grid">
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
            </div>
          </div>
        </Reveal>

        <Reveal as="section" className="lw-section lw-android-section" id="android">
          <div className="lw-container lw-android-layout">
            <div className="lw-device-stage">
              <div className="lw-device-frame">
                <span className="lw-device-speaker" />
                {screenshotReady ? (
                  <img
                    src={apkScreenshotUrl}
                    alt="LeadWatch Android call activity screen"
                    loading="lazy"
                    decoding="async"
                    onError={() => setScreenshotFailed(true)}
                  />
                ) : (
                  <div className="lw-device-fallback" role="img" aria-label="LeadWatch Android app preview">
                    <div className="lw-device-fallback-brand"><img src="/favicon.svg" alt="" /><span>LeadWatch</span></div>
                    <p>Call activity</p>
                    <div><PhoneCall size={18} /><span><strong>Android sync</strong><small>Call metadata ready</small></span></div>
                    <div><ShieldCheck size={18} /><span><strong>Signed-in access</strong><small>Connected to your team</small></span></div>
                    <small className="lw-device-fallback-note">LeadWatch Android preview</small>
                  </div>
                )}
              </div>
              <span className="lw-device-caption"><Zap size={15} /> Built for the rep’s Android workflow</span>
            </div>

            <div className="lw-android-copy">
              <p className="lw-eyebrow">LeadWatch for Android</p>
              <h2>Connect the calls your sales team already makes.</h2>
              <p>Install the Android companion, sign in to the assigned LeadWatch account, and allow the call-log access needed to sync eligible call metadata.</p>
              <ol className="lw-install-steps">
                <li><span>1</span><div><strong>Download the Android app</strong><p>Use the current LeadWatch APK when it is available.</p></div></li>
                <li><span>2</span><div><strong>Grant call-log permissions</strong><p>Android will ask for the permissions required to read and sync call metadata.</p></div></li>
                <li><span>3</span><div><strong>Sign in and start syncing</strong><p>Use the sales member’s LeadWatch account to connect activity to the right organization.</p></div></li>
              </ol>
              <div className="lw-android-actions">
                {apkReady ? (
                  <a className="lw-button lw-button-primary" href={apkDownloadUrl}>
                    <Download size={18} /> Download APK
                  </a>
                ) : (
                  <span className="lw-button lw-button-unavailable" role="status">
                    <Smartphone size={18} /> Android download coming soon
                  </span>
                )}
                <span><ShieldCheck size={16} /> Syncs call metadata. It does not record call audio.</span>
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal as="section" className="lw-section lw-faq-section" id="faq">
          <div className="lw-container lw-faq-layout">
            <div className="lw-faq-heading">
              <p className="lw-eyebrow">Questions, answered</p>
              <h2>Understand the product before your team adopts it.</h2>
              <p>Need a conversation specific to your organization? <a href="mailto:support@leadwatch.app">Talk to LeadWatch support.</a></p>
            </div>
            <div className="lw-faq-list">
              {faqs.map((faq) => (
                <details key={faq.question}>
                  <summary>{faq.question}<span aria-hidden="true">+</span></summary>
                  <p>{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </Reveal>

        <section className="lw-final-cta" aria-labelledby="leadwatch-final-cta">
          <div className="lw-container">
            <Reveal className="lw-final-cta-card">
              <p className="lw-eyebrow">Give your sales operation a clearer rhythm</p>
              <h2 id="leadwatch-final-cta">Your team makes the calls. LeadWatch brings the picture together.</h2>
              <p>Start with the role-aware dashboard today, then connect Android activity when your team is ready.</p>
              <div>
                <Link className="lw-button lw-button-primary" to={user ? '/dashboard' : '/signup'}>
                  {user ? 'Open dashboard' : 'Start free'} <ArrowRight size={18} />
                </Link>
                <Link className="lw-button lw-button-secondary" to="/docs/integrations">Read the API docs</Link>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
};
