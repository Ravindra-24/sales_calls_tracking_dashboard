import { Link } from 'react-router-dom';
import { ArrowRight, HelpCircle, Mail } from 'lucide-react';
import { PublicFooter, PublicHeader, Reveal, usePublicMetadata } from '../components/public';
import { faqGroups } from './publicContent';

export const FaqPage = () => {
  usePublicMetadata({
    title: 'FAQ | Smartly Manage',
    description: 'Answers about Smartly Manage calls, leads, field shifts, Android permissions, privacy, plans, call intelligence, and integrations.',
    path: '/faq',
  });

  return (
    <div className="lw-public lw-inner-page">
      <PublicHeader contextLabel="FAQ" />
      <main>
        <section className="lw-page-hero lw-faq-page-hero">
          <div className="lw-container lw-page-hero-grid">
            <Reveal>
              <p className="lw-eyebrow"><HelpCircle size={15} /> Frequently asked questions</p>
              <h1>Understand the product before your team adopts it.</h1>
              <p>Clear answers about calls, leads, field shifts, Android permissions, data use, call intelligence, plans, and integrations.</p>
            </Reveal>
            <Reveal className="lw-help-card" delay={100}>
              <Mail size={24} />
              <div>
                <strong>Have an organization-specific question?</strong>
                <p>Tell us how your team works and we will point you in the right direction.</p>
                <a href="mailto:info@smartlymanage.com">info@smartlymanage.com <ArrowRight size={15} /></a>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="lw-section lw-faq-page-section">
          <div className="lw-container lw-faq-page-layout">
            <aside className="lw-faq-index">
              <strong>On this page</strong>
              {faqGroups.map((group, index) => (
                <a href={`#faq-group-${index + 1}`} key={group.title}>{group.title}</a>
              ))}
            </aside>
            <div className="lw-faq-groups">
              {faqGroups.map((group, groupIndex) => (
                <Reveal as="section" className="lw-faq-group" id={`faq-group-${groupIndex + 1}`} key={group.title}>
                  <div className="lw-faq-group-heading">
                    <span>{String(groupIndex + 1).padStart(2, '0')}</span>
                    <div><h2>{group.title}</h2><p>{group.description}</p></div>
                  </div>
                  <div className="lw-faq-list">
                    {group.items.map((faq) => (
                      <details key={faq.question}>
                        <summary>{faq.question}<span aria-hidden="true">+</span></summary>
                        <p>{faq.answer}</p>
                      </details>
                    ))}
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="lw-faq-bottom-cta">
          <div className="lw-container">
            <Reveal>
              <div><small>Still exploring?</small><h2>See the complete workflow or compare current plans.</h2></div>
              <div>
                <Link className="lw-button lw-button-primary" to="/product">Explore product <ArrowRight size={17} /></Link>
                <Link className="lw-button lw-button-secondary" to="/pricing">Compare plans</Link>
              </div>
            </Reveal>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
};
