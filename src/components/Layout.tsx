import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Building2, LayoutDashboard, PhoneCall, Users, LogOut, Settings } from 'lucide-react';
import { auth } from '../config/firebase';
import { useAuth } from '../context/auth';

export const Layout: React.FC = () => {
  const navigate = useNavigate();
  const { user, claims } = useAuth();

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/login');
  };

  const isPlatformOwner = claims.role === 'platform_owner';
  const canManageTeam = claims.role === 'org_admin' || claims.role === 'manager';
  const canViewCalls = claims.role === 'org_admin' || claims.role === 'manager' || claims.role === 'sales_member';

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', end: true },
    ...(isPlatformOwner ? [{ path: '/dashboard/platform', icon: Building2, label: 'Tenants' }] : []),
    ...(canViewCalls ? [{ path: '/dashboard/calls', icon: PhoneCall, label: 'Call History' }] : []),
    ...(canManageTeam ? [{ path: '/dashboard/team', icon: Users, label: 'Team Management' }] : []),
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
      <aside className="sidebar glass-panel">
        <div className="brand">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '36px', height: '36px', background: 'var(--accent-primary)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PhoneCall color="white" size={18} />
            </div>
            <h2>RevConnect</h2>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              <item.icon size={20} color="currentColor" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-user">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', padding: '0 0.5rem' }}>
            <div className="sidebar-avatar">
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <p className="user-email">{user?.email}</p>
              <p className="user-role">{roleLabel}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', padding: '0.75rem 1rem', background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', borderRadius: 'var(--radius-md)', transition: 'var(--transition)' }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
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
