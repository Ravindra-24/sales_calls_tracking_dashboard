import { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Download,
  Layers3,
  Sparkles,
  UsersRound,
} from 'lucide-react';
import salesTeamImage from '../assets/sales-team.jpg';
import { GoogleOneTap } from '../components/auth/GoogleOneTap';
import { FeatureBento, HeroProductShot, PublicFooter, PublicHeader, Reveal, usePublicMetadata } from '../components/public';
import { useAuth } from '../context/auth';

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
          <div className="lw-container lw-hero-inner">
            <Reveal className="lw-hero-copy">
              <p className="lw-hero-badge"><Sparkles size={14} /> Connected sales activity, without status chasing</p>
              <h1 id="smartly-manage-hero-title">Calls, leads, and field visits.{' '}<span>One clear picture.</span></h1>
              <p className="lw-hero-lead">
                Permitted Android call activity, lead follow-ups, and consented field visits in one focused workspace your managers can act on.
              </p>
              <div className="lw-hero-actions">
                <Link className="lw-button lw-button-primary" to={user ? '/dashboard' : '/signup'}>
                  {user ? 'Open dashboard' : 'Start free'} <ArrowRight size={18} />
                </Link>
                <Link className="lw-hero-link" to="/product">
                  Explore the product <ArrowRight size={16} />
                </Link>
              </div>
              {!user && (
                <>
                  <GoogleOneTap
                    context="signin"
                    showButton={false}
                    onSuccess={routeAfterGoogleAuth}
                    onError={setGoogleError}
                  />
                  {googleError && <div className="lw-hero-google-error" role="alert">{googleError}</div>}
                </>
              )}
              <p className="lw-hero-assurances">
                <span>No cloud-telephony charges</span>{' '}
                <span>Role-aware access</span>{' '}
                <span>Representative-controlled tracking</span>
              </p>
            </Reveal>
          </div>
          <Reveal className="lw-container lw-hero-shot" delay={140}>
            <HeroProductShot />
          </Reveal>
        </section>

        <Reveal as="section" className="lw-section lw-home-proof">
          <div className="lw-container">
            <div className="lw-section-heading">
              <h2>Less chasing for updates. More useful action.</h2>
              <p>Give managers dependable call, lead, and field context without turning every sales representative into a data-entry operator.</p>
            </div>
            <FeatureBento />
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
              <h2>Go deeper when you’re ready.</h2>
              <p>See the full workflow, pick the plan that fits your team, or get the Android app for your representatives.</p>
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
