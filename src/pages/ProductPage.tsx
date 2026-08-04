import { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Download,
  Layers3,
  PhoneCall,
  Sparkles,
  Target,
  UsersRound,
} from 'lucide-react';
import salesTeamImage from '../assets/sales-team.jpg';
import { GoogleOneTap } from '../components/auth/GoogleOneTap';
import { MobileSlider, PublicFooter, PublicHeader, Reveal, usePublicMetadata } from '../components/public';
import { useAuth } from '../context/auth';
import { productOutcomes } from './publicContent';

const exploreCards = [
  {
    icon: Layers3,
    eyebrow: 'Product',
    title: 'See how phone activity becomes manager context.',
    copy: 'Explore the workflow, role-based experience, privacy model, and integrations in detail.',
    link: '/product',
    action: 'Explore the product',
  },
  {
    icon: Download,
    eyebrow: 'Android app',
    title: 'Get the companion app and current release details.',
    copy: 'Check availability, version information, what is new, permissions, and APK verification.',
    link: '/download',
    action: 'View Android app',
  },
  {
    icon: BarChart3,
    eyebrow: 'Plans',
    title: 'Choose the right level of visibility and control.',
    copy: 'Compare current pricing, plan features, billing cadence, and integration access.',
    link: '/pricing',
    action: 'Compare plans',
  },
];

export const ProductPage = () => {
  const navigate = useNavigate();
  const { user, refreshClaims } = useAuth();
  const [googleError, setGoogleError] = useState('');

  usePublicMetadata({
    title: 'Smartly Manage | Calls, leads, and field visibility',
    description: 'Connect permitted Android call activity, lead follow-up, and representative-started field shifts in one role-aware sales workspace.',
    path: '/',
  });

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
      <PublicHeader />

      <main>
        <section className="lw-hero" aria-labelledby="smartly-manage-hero-title">
          <div className="lw-hero-glow" aria-hidden="true" />
          <div className="lw-container lw-hero-grid">
            <Reveal className="lw-hero-copy">
              <p className="lw-eyebrow"><Sparkles size={15} /> Connected sales activity, without status chasing</p>
              <h1 id="smartly-manage-hero-title">Calls, follow-ups, and field activity. One clear picture.</h1>
              <p className="lw-hero-lead">
                Smartly Manage brings permitted Android call activity, lead follow-up, consented field visits, and manager workflows into one focused workspace.
              </p>
              <div className="lw-hero-actions">
                <Link className="lw-button lw-button-primary" to={user ? '/dashboard' : '/signup'}>
                  {user ? 'Open dashboard' : 'Start free'} <ArrowRight size={18} />
                </Link>
                <Link className="lw-button lw-button-secondary" to="/product">
                  Explore the product
                </Link>
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
              <div className="lw-hero-assurances" aria-label="Smartly Manage product assurances">
                <span><CheckCircle2 size={15} /> No cloud-telephony charges</span>
                <span><CheckCircle2 size={15} /> Role-aware access</span>
                <span><CheckCircle2 size={15} /> Representative-controlled tracking</span>
              </div>
            </Reveal>

            <Reveal className="lw-product-preview" delay={120}>
              <div className="lw-preview-orbit" aria-hidden="true" />
              <div className="lw-preview-window">
                <div className="lw-preview-toolbar">
                  <div className="lw-preview-title">
                    <img src="/smartly-manage-icon.webp" alt="" />
                    <span><strong>Team overview</strong><small>Manager workspace</small></span>
                  </div>
                  <span className="lw-preview-status"><i /> Sync ready</span>
                </div>
                <div className="lw-preview-body">
                  <div className="lw-preview-sidebar" aria-hidden="true">
                    <span className="active"><BarChart3 size={16} /> Overview</span>
                    <span><PhoneCall size={16} /> Calls</span>
                    <span><UsersRound size={16} /> Team</span>
                    <span><Target size={16} /> Leads</span>
                  </div>
                  <div className="lw-preview-content">
                    <div className="lw-preview-heading">
                      <span>Today’s activity</span>
                      <small>Updated when your team syncs</small>
                    </div>
                    <div className="lw-preview-summary">
                      <div><PhoneCall size={17} /><span><strong>Recent calls</strong><small>One organized timeline</small></span></div>
                      <div><BarChart3 size={17} /><span><strong>Follow-up context</strong><small>Ready for the next action</small></span></div>
                    </div>
                    <div className="lw-preview-activity">
                      <div><span className="lw-call-icon outgoing"><ArrowRight size={14} /></span><p><strong>Outgoing call</strong><small>Synced from Android</small></p><em>Connected</em></div>
                      <div><span className="lw-call-icon incoming"><PhoneCall size={14} /></span><p><strong>Incoming call</strong><small>Visible to the manager</small></p><em>Synced</em></div>
                      <div><span className="lw-call-icon missed"><PhoneCall size={14} /></span><p><strong>Missed call</strong><small>Ready for follow-up</small></p><em>Review</em></div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="lw-preview-phone" aria-label="Smartly Manage Android sync preview">
                <span className="lw-phone-speaker" />
                <img src="/smartly-manage-icon.webp" alt="" />
                <small>Android sync</small>
                <strong>Activity ready to sync</strong>
                <span className="lw-phone-check"><CheckCircle2 size={17} /> Secure sign-in</span>
              </div>
            </Reveal>
          </div>
        </section>

        <Reveal as="section" className="lw-section lw-home-proof">
          <div className="lw-container">
            <div className="lw-section-heading">
              <p className="lw-eyebrow">A clearer operating rhythm</p>
              <h2>Less chasing for updates. More useful action.</h2>
              <p>Give managers dependable call, lead, and field context without turning every sales representative into a data-entry operator.</p>
            </div>
            <MobileSlider className="lw-outcome-grid" count={productOutcomes.length} label="Smartly Manage outcomes">
              {productOutcomes.map((outcome, index) => (
                <Reveal as="article" className="lw-outcome-card" delay={index * 70} key={outcome.title}>
                  <span className="lw-icon-tile"><outcome.icon size={21} /></span>
                  <h3>{outcome.title}</h3>
                  <p>{outcome.copy}</p>
                </Reveal>
              ))}
            </MobileSlider>
          </div>
        </Reveal>

        <Reveal as="section" className="lw-section lw-story-section">
          <div className="lw-container lw-story-grid">
            <div className="lw-story-image">
              <img
                src={salesTeamImage}
                alt="A sales manager and representatives reviewing call activity together"
                loading="lazy"
                decoding="async"
              />
              <span><UsersRound size={16} /> Built around real team conversations</span>
            </div>
            <div className="lw-story-copy">
              <p className="lw-eyebrow">Managers and representatives, connected</p>
              <h2>See what happened and what needs attention next.</h2>
              <p>Representatives keep calling, updating leads, and starting field shifts from Android. Managers get a role-aware view for coaching, follow-up, and team planning. Everyone works from the same activity picture.</p>
              <ul>
                <li><CheckCircle2 size={18} /> Clear call direction, duration, and timing</li>
                <li><CheckCircle2 size={18} /> Lead stages, next actions, and follow-up dates</li>
                <li><CheckCircle2 size={18} /> Consent-led field visits and optional call intelligence</li>
              </ul>
              <Link className="lw-text-link lw-text-link-dark" to="/about">
                Why we built Smartly Manage <ArrowRight size={17} />
              </Link>
            </div>
          </div>
        </Reveal>

        <Reveal as="section" className="lw-section lw-explore-section">
          <div className="lw-container">
            <div className="lw-section-heading lw-section-heading-center">
              <p className="lw-eyebrow">Find what you need</p>
              <h2>Product details now have room to breathe.</h2>
              <p>Go directly to the workflow, current plans, or the Android release instead of searching through one very long page.</p>
            </div>
            <div className="lw-explore-grid">
              {exploreCards.map((card, index) => (
                <Reveal as="article" className="lw-explore-card" delay={index * 80} key={card.title}>
                  <span className="lw-icon-tile"><card.icon size={22} /></span>
                  <small>{card.eyebrow}</small>
                  <h3>{card.title}</h3>
                  <p>{card.copy}</p>
                  <Link to={card.link}>{card.action} <ArrowRight size={16} /></Link>
                </Reveal>
              ))}
            </div>
          </div>
        </Reveal>

        <section className="lw-final-cta" aria-labelledby="smartly-manage-final-cta">
          <div className="lw-container">
            <Reveal className="lw-final-cta-card">
              <p className="lw-eyebrow">Give your sales operation a clearer rhythm</p>
              <h2 id="smartly-manage-final-cta">Your team does the work. Smartly Manage keeps the context connected.</h2>
              <p>Start with the role-aware workspace today, then enable Android call or field features when your team is ready.</p>
              <div>
                <Link className="lw-button lw-button-primary" to={user ? '/dashboard' : '/signup'}>
                  {user ? 'Open dashboard' : 'Start free'} <ArrowRight size={18} />
                </Link>
                <Link className="lw-button lw-button-secondary" to="/product">Explore all features</Link>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
};
