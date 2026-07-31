import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Focus, HeartHandshake, ShieldCheck, UsersRound } from 'lucide-react';
import salesTeamImage from '../assets/sales-team.jpg';
import { PublicFooter, PublicHeader, Reveal, usePublicMetadata } from '../components/public';
import { useAuth } from '../context/auth';

const principles = [
  {
    icon: Focus,
    title: 'Clarity before complexity',
    copy: 'Call activity should help a manager decide what to do next, not create another reporting project.',
  },
  {
    icon: HeartHandshake,
    title: 'Respect the representative workflow',
    copy: 'Good visibility should reduce repetitive administration and keep the team focused on customers.',
  },
  {
    icon: ShieldCheck,
    title: 'Access with intention',
    copy: 'Authentication, roles, permissions, and disclosure are part of the product—not an afterthought.',
  },
];

export const AboutPage = () => {
  const { user } = useAuth();

  usePublicMetadata({
    title: 'About | Smartly Manage',
    description: 'Learn why Smartly Manage is building a clearer, more respectful way for sales teams to understand call activity.',
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
              <h1>Sales visibility should help the conversation—not replace it.</h1>
              <p>We are building a practical bridge between the calls representatives make and the context managers need to coach, plan, and follow up.</p>
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
              <h2>Important work was getting lost between phone calls and spreadsheets.</h2>
            </div>
            <div>
              <p>Sales managers often need a reliable picture of customer activity, but representatives should not have to reconstruct every call at the end of the day.</p>
              <p>Smartly Manage connects permitted Android call metadata to a role-aware web workspace. The goal is simple: fewer status chases, better coaching context, and more time for actual customer work.</p>
              <ul>
                <li><CheckCircle2 size={18} /> Designed for real organization roles</li>
                <li><CheckCircle2 size={18} /> Clear about permissions and data use</li>
                <li><CheckCircle2 size={18} /> Built to grow from a free team workflow to connected operations</li>
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
              <h2>Give your organization one clear place to understand call activity.</h2>
              <p>Explore the workflow in detail or create your workspace today.</p>
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
