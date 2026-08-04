import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Focus, HeartHandshake, ShieldCheck, UsersRound } from 'lucide-react';
import salesTeamImage from '../assets/sales-team.jpg';
import { PublicFooter, PublicHeader, Reveal, usePublicMetadata } from '../components/public';
import { useAuth } from '../context/auth';

const principles = [
  {
    icon: Focus,
    title: 'Clarity before complexity',
    copy: 'Activity data should help a team decide what to do next, not create another reporting project.',
  },
  {
    icon: HeartHandshake,
    title: 'Respect the representative workflow',
    copy: 'Good visibility should reduce repetitive administration and keep the team focused on customers.',
  },
  {
    icon: ShieldCheck,
    title: 'Access with intention',
    copy: 'Authentication, roles, permissions, consent, and clear disclosure are part of the product—not an afterthought.',
  },
];

export const AboutPage = () => {
  const { user } = useAuth();

  usePublicMetadata({
    title: 'About | Smartly Manage',
    description: 'Learn why Smartly Manage is building a clearer, more respectful way to connect sales calls, follow-up, and field activity.',
    path: '/about',
  });

  return (
    <div className="lw-public lw-inner-page">
      <PublicHeader contextLabel="About" />
      <main>
        <section className="lw-page-hero lw-about-hero">
          <div className="lw-container lw-about-hero-grid">
            <Reveal>
              <p className="lw-eyebrow">About Smartly Manage</p>
              <h1>Sales visibility should support the work—not become more work.</h1>
              <p>We are building a practical bridge between the calls, follow-ups, and field visits representatives handle and the context managers need to coach and plan.</p>
            </Reveal>
            <Reveal className="lw-about-hero-image" delay={100}>
              <img src={salesTeamImage} alt="An Indian sales team reviewing call activity together" />
            </Reveal>
          </div>
        </section>

        <Reveal as="section" className="lw-section lw-about-mission">
          <div className="lw-container lw-about-mission-grid">
            <div>
              <p className="lw-eyebrow">Why we built it</p>
              <h2>Important context was getting lost between phone calls, field work, and spreadsheets.</h2>
            </div>
            <div>
              <p>Sales managers often need a reliable picture of customer activity, but representatives should not have to reconstruct every call, lead update, or visit at the end of the day.</p>
              <p>Smartly Manage connects permitted Android call metadata, follow-up records, and representative-started field shifts to a role-aware web workspace. The goal is simple: fewer status chases, better coaching context, and more time for customer work.</p>
              <ul>
                <li><CheckCircle2 size={18} /> Designed for real organization roles</li>
                <li><CheckCircle2 size={18} /> Clear about permissions, consent, and data use</li>
                <li><CheckCircle2 size={18} /> Built to grow from a free workflow to call intelligence and connected operations</li>
              </ul>
            </div>
          </div>
        </Reveal>

        <Reveal as="section" className="lw-section lw-values-section">
          <div className="lw-container">
            <div className="lw-section-heading lw-section-heading-center">
              <p className="lw-eyebrow">How we make product decisions</p>
              <h2>Three principles keep us grounded.</h2>
            </div>
            <div className="lw-values-grid">
              {principles.map((principle, index) => (
                <Reveal as="article" className="lw-value-card" delay={index * 80} key={principle.title}>
                  <span className="lw-icon-tile"><principle.icon size={22} /></span>
                  <h3>{principle.title}</h3>
                  <p>{principle.copy}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </Reveal>

        <section className="lw-final-cta">
          <div className="lw-container">
            <Reveal className="lw-final-cta-card">
              <p className="lw-eyebrow"><UsersRound size={15} /> Built for focused sales teams</p>
              <h2>Give your organization one clear place to understand sales activity.</h2>
              <p>Explore the calls-to-follow-up workflow in detail or create your workspace today.</p>
              <div>
                <Link className="lw-button lw-button-primary" to={user ? '/dashboard' : '/signup'}>
                  {user ? 'Open dashboard' : 'Start free'} <ArrowRight size={18} />
                </Link>
                <Link className="lw-button lw-button-secondary" to="/product">Explore the product</Link>
              </div>
            </Reveal>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
};
