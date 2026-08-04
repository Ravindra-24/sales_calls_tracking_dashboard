import React, { useEffect, useRef, useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { signInWithCustomToken } from 'firebase/auth';
import { Activity, BadgePercent, Bell, BrainCircuit, Building2, ContactRound, CreditCard, LayoutDashboard, MapPin, Mic2, PhoneCall, Route, Users, LogOut, Menu, Settings, ShieldAlert, Webhook, X, type LucideIcon } from 'lucide-react';
import { api, getApiErrorMessage } from '../api/client';
import { auth } from '../config/firebase';
import { useAuth } from '../context/auth';
import { useFeedback } from '../context/feedback';
import type { ApiResponse } from '../types/api';

const appIcon = '/smartly-manage-icon.webp';

interface SidebarNavItem {
  path: string;
  icon: LucideIcon;
  label: string;
  end?: boolean;
}

interface SidebarNavGroup {
  label: string;
  items: SidebarNavItem[];
}

export const Layout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, claims } = useAuth();
  const { toast } = useFeedback();
  const [menuOpen, setMenuOpen] = useState(false);
  const [returningToPlatform, setReturningToPlatform] = useState(false);
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

  const stopImpersonation = async () => {
    if (!claims.impersonationSessionId || returningToPlatform) return;
    setReturningToPlatform(true);
    try {
      const response = await api.post<ApiResponse<{ customToken: string }>>(
        '/admin/impersonation/stop',
      );
      await signInWithCustomToken(auth, response.data.data.customToken);
      toast({
        title: 'Returned to platform account',
        message: 'The impersonation session has ended.',
        variant: 'success',
      });
      navigate('/dashboard/platform', { replace: true });
    } catch (requestError) {
      toast({
        title: 'Could not return to platform account',
        message: getApiErrorMessage(
          requestError,
          'Sign out and sign in again with your platform-owner account.',
        ),
        variant: 'error',
      });
      setReturningToPlatform(false);
    }
  };

  const isPlatformOwner = claims.role === 'platform_owner';
  const isImpersonating = Boolean(claims.impersonatorUid && claims.impersonationSessionId);
  const canManageTeam = claims.role === 'org_admin' || claims.role === 'manager';
  const canViewCalls = claims.role === 'org_admin' || claims.role === 'manager' || claims.role === 'sales_member';
  const canManageIntegrations = isPlatformOwner || claims.role === 'org_admin';

  const navGroups: SidebarNavGroup[] = [
    {
      label: 'Overview',
      items: [
        { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', end: true },
        { path: '/dashboard/notifications', icon: Bell, label: 'Notifications' },
      ],
    },
    {
      label: 'Sales activity',
      items: [
        ...(canViewCalls ? [{ path: '/dashboard/calls', icon: PhoneCall, label: 'Call History' }] : []),
        ...(canViewCalls ? [{ path: '/dashboard/leads', icon: BrainCircuit, label: 'Leads' }] : []),
        ...(canViewCalls && claims.role !== 'sales_member' ? [{ path: '/dashboard/call-recordings', icon: Mic2, label: 'Call Recordings' }] : []),
      ],
    },
    {
      label: 'Team & field',
      items: [
        ...(canManageTeam ? [{ path: '/dashboard/team', icon: Users, label: 'Team Management' }] : []),
        ...(canManageTeam ? [{ path: '/dashboard/live', icon: MapPin, label: 'Live Tracking' }] : []),
        ...(canManageTeam ? [{ path: '/dashboard/clients', icon: ContactRound, label: 'Clients' }] : []),
        ...(canManageTeam ? [{ path: '/dashboard/visits', icon: Route, label: 'Visits & Routes' }] : []),
      ],
    },
    {
      label: 'Platform administration',
      items: isPlatformOwner ? [
        { path: '/dashboard/platform', icon: Building2, label: 'Tenants' },
        { path: '/dashboard/billing-operations', icon: Activity, label: 'Billing Operations' },
        { path: '/dashboard/billing-catalog', icon: BadgePercent, label: 'Billing Catalog' },
      ] : [],
    },
    {
      label: 'Manage',
      items: [
        ...(canManageIntegrations ? [{ path: '/dashboard/integrations', icon: Webhook, label: 'Integrations' }] : []),
        ...(canManageTeam ? [{ path: '/dashboard/billing', icon: CreditCard, label: 'Billing' }] : []),
        { path: '/dashboard/settings', icon: Settings, label: 'Settings' },
      ],
    },
  ].filter((group) => group.items.length > 0);

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
          {navGroups.map((group) => (
            <div className="sidebar-nav-group" role="group" aria-label={`${group.label} navigation`} key={group.label}>
              <p className="sidebar-nav-label">{group.label}</p>
              <div className="sidebar-nav-links">
                {group.items.map((item) => (
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
              </div>
            </div>
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
            {isImpersonating ? 'Sign out completely' : 'Logout'}
          </button>
        </div>
      </aside>

      <main className="main-content">
        {isImpersonating && (
          <aside className="impersonation-banner" aria-label="Impersonation session active">
            <ShieldAlert size={21} aria-hidden="true" />
            <div>
              <strong>Viewing as {user?.displayName || user?.email}</strong>
              <span>{roleLabel}{claims.impersonationReason ? ` · ${claims.impersonationReason}` : ''}</span>
            </div>
            <button type="button" disabled={returningToPlatform} onClick={() => void stopImpersonation()}>
              {returningToPlatform ? 'Returning…' : 'Return to platform account'}
            </button>
          </aside>
        )}
        <div className="content-panel glass-panel">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
