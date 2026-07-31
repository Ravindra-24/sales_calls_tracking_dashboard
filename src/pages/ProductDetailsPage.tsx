import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  Cloud,
  Clock3,
  MapPin,
  Route,
  ShieldCheck,
  UserRoundCheck,
} from 'lucide-react';
import { MobileSlider, PublicFooter, PublicHeader, Reveal, usePublicMetadata } from '../components/public';
import { useAuth } from '../context/auth';
import {
  integrations,
  managerBenefits,
  productOutcomes,
  representativeBenefits,
  securityPoints,
  workflow,
} from './publicContent';

export const ProductDetailsPage = () => {
  const { user } = useAuth();

  usePublicMetadata({
    title: 'Product | Smartly Manage',
    description: 'Explore the Smartly Manage Android-to-dashboard workflow, role-based team experience, security controls, and integrations.',
    path: '/product',
  });

  return (
    <div className="lw-public lw-inner-page">
      <PublicHeader contextLabel="Product" />
      <main>
        <section className="lw-page-hero lw-page-hero-product">
          <div className="lw-container lw-page-hero-grid">
            <Reveal>
              <p className="lw-eyebrow">The complete product</p>
              <h1>Call activity that becomes useful team context.</h1>
              <p>Smartly Manage connects the representative’s Android workflow with the manager’s web workspace—without adding a second reporting routine.</p>
              <div className="lw-page-hero-actions">
                <Link className="lw-button lw-button-primary" to={user ? '/dashboard' : '/signup'}>
                  {user ? 'Open dashboard' : 'Start free'} <ArrowRight size={18} />
                </Link>
                <Link className="lw-button lw-button-secondary" to="/download">View Android app</Link>
              </div>
            </Reveal>
            <Reveal className="lw-product-map" delay={100}>
              <div><span>01</span><strong>Android activity</strong><small>Permitted call metadata</small></div>
              <ArrowRight aria-hidden="true" />
              <div><span>02</span><strong>Secure sync</strong><small>Signed-in organization access</small></div>
              <ArrowRight aria-hidden="true" />
              <div><span>03</span><strong>Manager view</strong><small>Context for coaching</small></div>
            </Reveal>
          </div>
        </section>

        <Reveal as="section" className="lw-section">
          <div className="lw-container">
            <div className="lw-section-heading">
              <p className="lw-eyebrow">What the team gets</p>
              <h2>One workflow, four practical outcomes.</h2>
              <p>Each part is designed to make call activity easier to understand and act on.</p>
            </div>
            <MobileSlider className="lw-outcome-grid" count={productOutcomes.length} label="Product outcomes">
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

        <Reveal as="section" className="lw-section lw-tour-section">
          <div className="lw-container lw-tour-layout">
            <div className="lw-tour-copy">
              <p className="lw-eyebrow">A connected workflow</p>
              <h2>From the phone call to the manager view.</h2>
              <p>The account, Android companion, and web dashboard move together in one understandable flow.</p>
              <Link className="lw-text-link" to="/download">See app details <ArrowRight size={17} /></Link>
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

        <Reveal as="section" className="lw-section lw-field-section">
          <div className="lw-container lw-field-grid">
            <div className="lw-field-copy">
              <p className="lw-eyebrow">Field activity, when your team needs it</p>
              <h2>Start a shift. Understand customer visits. End tracking clearly.</h2>
              <p>Representatives can start a field shift from Android after reviewing the location disclosure. During that active shift, Smartly Manage can detect visits and give authorized managers a live team view.</p>
              <ul>
                <li><Clock3 size={18} /><span><strong>Representative-controlled shifts</strong><small>Tracking begins only after the representative starts a shift and stops when they end it.</small></span></li>
                <li><MapPin size={18} /><span><strong>Automatic visit context</strong><small>Eligible customer-site arrivals and dwell time can become visit summaries.</small></span></li>
                <li><ShieldCheck size={18} /><span><strong>Prominent disclosure</strong><small>Location use, visibility, and retention are explained before permissions are requested.</small></span></li>
              </ul>
              <Link className="lw-text-link lw-text-link-dark" to="/download">See the Android experience <ArrowRight size={17} /></Link>
            </div>
            <div className="lw-field-visual" aria-label="Field shift and visit workflow">
              <div className="lw-field-map" aria-hidden="true">
                <span className="lw-map-road road-one" />
                <span className="lw-map-road road-two" />
                <i className="pin-one"><MapPin /></i>
                <i className="pin-two"><MapPin /></i>
                <i className="pin-three"><MapPin /></i>
              </div>
              <div className="lw-field-status">
                <span><Route size={20} /></span>
                <div><small>Field shift</small><strong>Live and visible</strong></div>
                <em><i /> Active</em>
              </div>
              <div className="lw-field-visit">
                <MapPin size={18} />
                <div><strong>Customer visit detected</strong><small>Arrival and dwell context ready</small></div>
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal as="section" className="lw-section lw-roles-section">
          <div className="lw-container">
            <div className="lw-section-heading lw-section-heading-center">
              <p className="lw-eyebrow">Designed for both sides of the team</p>
              <h2>Useful for managers. Lightweight for representatives.</h2>
              <p>Leadership gets consistent context while representatives stay focused on customer conversations.</p>
            </div>
            <MobileSlider className="lw-role-grid" count={2} label="Role benefits">
              <Reveal as="article" className="lw-role-card lw-role-manager">
                <div className="lw-role-card-heading"><span className="lw-icon-tile"><BriefcaseBusiness size={22} /></span><div><small>For owners and managers</small><h3>Coach with a clearer view</h3></div></div>
                <p>Bring call activity into the same place you manage people, follow-up, and performance conversations.</p>
                <ul>{managerBenefits.map((benefit) => <li key={benefit}><CheckCircle2 size={17} /> {benefit}</li>)}</ul>
              </Reveal>
              <Reveal as="article" className="lw-role-card lw-role-rep" delay={100}>
                <div className="lw-role-card-heading"><span className="lw-icon-tile"><UserRoundCheck size={22} /></span><div><small>For sales representatives</small><h3>Spend less time reporting</h3></div></div>
                <p>Use the Android companion to keep eligible activity connected to the organization account with less repetitive administration.</p>
                <ul>{representativeBenefits.map((benefit) => <li key={benefit}><CheckCircle2 size={17} /> {benefit}</li>)}</ul>
              </Reveal>
            </MobileSlider>
          </div>
        </Reveal>

        <Reveal as="section" className="lw-section lw-security-section">
          <div className="lw-container lw-security-layout">
            <div className="lw-security-copy">
              <p className="lw-eyebrow">Privacy made understandable</p>
              <h2>Clear about what the product uses—and what it does not.</h2>
              <p>Smartly Manage centers the product experience on permitted metadata, authenticated users, and role-aware access.</p>
              <Link className="lw-text-link lw-text-link-dark" to="/faq">Read common questions <ArrowRight size={17} /></Link>
            </div>
            <MobileSlider className="lw-security-grid" count={securityPoints.length} label="Security features">
              {securityPoints.map((point, index) => (
                <Reveal as="article" className="lw-security-card" delay={index * 70} key={point.title}>
                  <point.icon size={21} />
                  <h3>{point.title}</h3>
                  <p>{point.copy}</p>
                </Reveal>
              ))}
            </MobileSlider>
          </div>
        </Reveal>

        <Reveal as="section" className="lw-section lw-integrations-section">
          <div className="lw-container">
            <div className="lw-integrations-heading">
              <div>
                <p className="lw-eyebrow">Build beyond the dashboard</p>
                <h2>Connect Smartly Manage to the systems around your workflow.</h2>
              </div>
              <Link className="lw-button lw-button-light" to="/docs/integrations">Explore API docs <ArrowRight size={17} /></Link>
            </div>
            <MobileSlider className="lw-integration-grid" count={integrations.length} label="Integration options">
              {integrations.map((item, index) => (
                <Reveal as="article" className="lw-integration-card" delay={index * 75} key={item.title}>
                  <span className="lw-icon-tile"><item.icon size={21} /></span>
                  <h3>{item.title}</h3>
                  <p>{item.copy}</p>
                </Reveal>
              ))}
            </MobileSlider>
            <p className="lw-integration-note"><Cloud size={15} /> Integration access and limits depend on the organization plan.</p>
          </div>
        </Reveal>

        <section className="lw-final-cta">
          <div className="lw-container">
            <Reveal className="lw-final-cta-card">
              <p className="lw-eyebrow">Ready to choose a starting point?</p>
              <h2>Start free, then add deeper reporting and integrations as you grow.</h2>
              <p>Compare the live catalog and see exactly what each plan includes.</p>
              <div>
                <Link className="lw-button lw-button-primary" to="/pricing">Compare plans <ArrowRight size={18} /></Link>
                <Link className="lw-button lw-button-secondary" to="/download">Get the Android app</Link>
              </div>
            </Reveal>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
};
