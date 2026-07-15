import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Menu, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/auth';

const sectionLinks = [
  { id: 'product-tour', label: 'Product' },
  { id: 'roles', label: 'Solutions' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'android', label: 'Android' },
  { id: 'faq', label: 'FAQ' },
];

interface PublicHeaderProps {
  activeSection?: string;
  contextLabel?: string;
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const PublicHeader = ({ activeSection = '', contextLabel }: PublicHeaderProps) => {
  const { user } = useAuth();
  const location = useLocation();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const mobilePanelRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const isHome = location.pathname === '/';

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const panel = mobilePanelRef.current;
    const firstLink = panel?.querySelector<HTMLElement>('a');
    firstLink?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
        return;
      }

      if (event.key !== 'Tab' || !panel) return;
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>('a, button:not([disabled])'));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const desktopQuery = window.matchMedia('(min-width: 961px)');
    const closeOnDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) setMenuOpen(false);
    };
    desktopQuery.addEventListener('change', closeOnDesktop);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      desktopQuery.removeEventListener('change', closeOnDesktop);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  const navigateToSection = (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    if (!isHome) {
      setMenuOpen(false);
      return;
    }

    const section = document.getElementById(id);
    if (!section) return;
    event.preventDefault();
    setMenuOpen(false);
    section.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
    window.history.replaceState(null, '', `/#${id}`);
  };

  const renderSectionLinks = (mobile = false) => sectionLinks.map((item) => (
    <a
      key={item.id}
      href={isHome ? `#${item.id}` : `/#${item.id}`}
      className={activeSection === item.id ? 'is-active' : ''}
      aria-current={activeSection === item.id ? 'location' : undefined}
      onClick={(event) => navigateToSection(event, item.id)}
      tabIndex={mobile || !menuOpen ? undefined : -1}
    >
      {item.label}
    </a>
  ));

  return (
    <header className="lw-public-header">
      <div className="lw-header-inner">
        <Link className="lw-public-brand" to="/" aria-label="Smartly Manage home">
          <span className="lw-brand-mark"><img src="/favicon.svg" alt="" /></span>
          <span>Smartly Manage</span>
          {contextLabel && <small>{contextLabel}</small>}
        </Link>

        <nav className="lw-desktop-navigation" aria-label="Primary navigation">
          {renderSectionLinks()}
          <Link className={location.pathname === '/docs/integrations' ? 'is-active' : ''} to="/docs/integrations">
            Docs
          </Link>
        </nav>

        <div className="lw-header-actions">
          {!user && <Link className="lw-header-account" to="/login">Sign in</Link>}
          <Link className="lw-button lw-button-small lw-button-primary" to={user ? '/dashboard' : '/signup'}>
            {user ? 'Open dashboard' : 'Start free'} <ArrowRight size={16} />
          </Link>
        </div>

        <button
          ref={menuButtonRef}
          className="lw-menu-toggle"
          type="button"
          aria-expanded={menuOpen}
          aria-controls="lw-mobile-navigation"
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {menuOpen && (
        <>
          <button
            className="lw-menu-backdrop"
            type="button"
            tabIndex={-1}
            aria-label="Dismiss navigation menu"
            onClick={() => setMenuOpen(false)}
          />
          <div ref={mobilePanelRef} className="lw-mobile-panel" id="lw-mobile-navigation">
            <nav aria-label="Mobile navigation">
              {renderSectionLinks(true)}
              <Link className={location.pathname === '/docs/integrations' ? 'is-active' : ''} to="/docs/integrations">Docs</Link>
            </nav>
            <div className={`lw-mobile-actions${user ? ' single-action' : ''}`}>
              {!user && <Link className="lw-button lw-button-secondary" to="/login">Sign in</Link>}
              <Link className="lw-button lw-button-primary" to={user ? '/dashboard' : '/signup'}>
                {user ? 'Open dashboard' : 'Start free'} <ArrowRight size={17} />
              </Link>
            </div>
          </div>
        </>
      )}
    </header>
  );
};
