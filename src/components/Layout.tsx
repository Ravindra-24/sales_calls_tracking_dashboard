import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, PhoneCall, Users, LogOut } from 'lucide-react';
import { auth } from '../config/firebase';
import { useAuth } from '../context/auth';

export const Layout: React.FC = () => {
  const navigate = useNavigate();
  const { user, claims } = useAuth();

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/login');
  };

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/calls', icon: PhoneCall, label: 'Call History' },
    { path: '/team', icon: Users, label: 'Team Management' },
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar glass-panel">
        <div className="brand">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '36px', height: '36px', background: 'var(--accent-primary)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PhoneCall color="white" size={18} />
            </div>
            <h2>SalesTracker</h2>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              <item.icon size={20} color="currentColor" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-user">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', padding: '0 0.5rem' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold' }}>
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <p className="user-email">{user?.email}</p>
              <p className="user-role">{claims.role}</p>
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
