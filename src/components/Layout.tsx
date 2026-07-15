import React, { useEffect, useRef, useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Activity, BadgePercent, Bell, Building2, CreditCard, LayoutDashboard, PhoneCall, Users, LogOut, Menu, Settings, Webhook, X } from 'lucide-react';
import { auth } from '../config/firebase';
import { useAuth } from '../context/auth';

const appIcon = '/favicon.svg';

export const Layout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, claims } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const desktopQuery = window.matchMedia('(min-width: 901px)');
    const closeAtDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) setMenuOpen(false);
    };
    desktopQuery.addEventListener('change', closeAtDesktop);
    return () => desktopQuery.removeEventListener('change', closeAtDesktop);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
        return;
      }
      if (event.key === 'Tab' && sidebarRef.current) {
        const focusable = Array.from(sidebarRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex="0"]'));
        const first = focusable[0];
        const last = focusable.at(-1);
        if (!first || !last) return;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [menuOpen]);

  const handleLogout = async () => {
    setMenuOpen(false);
    await auth.signOut();
    navigate('/login');
  };

  const isPlatformOwner = claims.role === 'platform_owner';
  const canManageTeam = claims.role === 'org_admin' || claims.role === 'manager';
  const canViewCalls = claims.role === 'org_admin' || claims.role === 'manager' || claims.role === 'sales_member';
  const canManageIntegrations = isPlatformOwner || claims.role === 'org_admin';

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', end: true },
    ...(isPlatformOwner ? [{ path: '/dashboard/platform', icon: Building2, label: 'Tenants' }] : []),
    ...(canViewCalls ? [{ path: '/dashboard/calls', icon: PhoneCall, label: 'Call History' }] : []),
    ...(canManageTeam ? [{ path: '/dashboard/team', icon: Users, label: 'Team Management' }] : []),
    { path: '/dashboard/notifications', icon: Bell, label: 'Notifications' },
    ...(canManageIntegrations ? [{ path: '/dashboard/integrations', icon: Webhook, label: 'Integrations' }] : []),
    ...(canManageTeam ? [{ path: '/dashboard/billing', icon: CreditCard, label: 'Billing' }] : []),
    ...(isPlatformOwner ? [
      { path: '/dashboard/billing-operations', icon: Activity, label: 'Billing Operations' },
      { path: '/dashboard/billing-catalog', icon: BadgePercent, label: 'Billing Catalog' },
    ] : []),
    { path: '/dashboard/settings', icon: Settings, label: 'Settings' },
  ];

  const roleLabel = {
    platform_owner: 'Platform owner',
    org_admin: 'Org admin',
    manager: 'Manager',
    sales_member: 'Sales member',
  }[claims.role ?? 'sales_member'];

  return (
    <div className="app-shell">
      <header className="mobile-header glass-panel">
        <NavLink to="/dashboard" className="mobile-brand" aria-label="Smartly Manage dashboard">
          <span className="brand-mark"><img src={appIcon} alt="" /></span>
          <strong>Smartly Manage</strong>
        </NavLink>
        <button
          ref={menuButtonRef}
          className="mobile-menu-button"
          type="button"
          aria-label="Open navigation"
          aria-expanded={menuOpen}
          aria-controls="dashboard-navigation"
          onClick={() => setMenuOpen(true)}
        >
          <Menu size={22} />
        </button>
      </header>

      <button
        className={`sidebar-backdrop${menuOpen ? ' visible' : ''}`}
        type="button"
        aria-label="Close navigation"
        tabIndex={menuOpen ? 0 : -1}
        onClick={() => setMenuOpen(false)}
      />

      <aside ref={sidebarRef} id="dashboard-navigation" className={`sidebar glass-panel${menuOpen ? ' open' : ''}`} aria-label="Dashboard navigation">
        <div className="brand">
          <div className="brand-lockup">
            <div className="brand-mark">
              <img src={appIcon} alt="" />
            </div>
            <h2>Smartly Manage</h2>
          </div>
          <button
            ref={closeButtonRef}
            className="sidebar-close"
            type="button"
            aria-label="Close navigation"
            onClick={() => {
              setMenuOpen(false);
              window.requestAnimationFrame(() => menuButtonRef.current?.focus());
            }}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              <item.icon size={20} color="currentColor" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-user">
          <div className="sidebar-user-details">
            <div className="sidebar-avatar">
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <div className="sidebar-user-copy">
              <p className="user-email">{user?.email}</p>
              <p className="user-role">{roleLabel}</p>
            </div>
          </div>
          <button
            className="logout-button"
            onClick={handleLogout}
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      <main className="main-content">
        <div className="content-panel glass-panel">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
