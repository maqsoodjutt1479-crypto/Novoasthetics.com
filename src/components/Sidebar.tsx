import React, { useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import { useAuth } from './AuthProvider';
import logo from '../assets/novo-logo.svg';

type NavItem = {
  label: string;
  to?: string;
  children?: NavItem[];
};

type SidebarProps = {
  isMobileOpen?: boolean;
  onClose?: () => void;
};

const navItems: NavItem[] = [
  { label: 'Dashboard', to: '/' },
  { label: 'Appointments', to: '/appointments' },
  { label: 'Patients / Treatment', to: '/patients' },
  {
    label: 'Services',
    children: [
      { label: 'Clinical', to: '/services/clinical' },
      { label: 'Packages', to: '/services/packages' },
      { label: 'Membership', to: '/services/membership' },
    ],
  },
  { label: 'Products', to: '/products' },
  { label: 'Payments', to: '/payments' },
  { label: 'Reports', to: '/reports' },
  { label: 'Doctors & Staff', to: '/staff' },
  { label: 'Settings', to: '/settings' },
];

export const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, onClose }) => {
  const location = useLocation();
  const [servicesOpen, setServicesOpen] = useState(() => location.pathname.startsWith('/services'));
  const {
    user,
  } = useAuth();
  const role = user?.role || 'admin';

  const filteredNavItems = useMemo(() => {
    if (role === 'admin' || role === 'fdo') return navItems;
    // Doctor view: only appointments
    return navItems.filter((item) => item.label === 'Appointments');
  }, [role]);

  const navContent = useMemo(
    () =>
      filteredNavItems.map((item) => {
        if (item.children) {
          return (
            <div key={item.label}>
              <button
                onClick={() => setServicesOpen((v) => !v)}
                className="nav-parent"
                aria-expanded={servicesOpen}
              >
                <span>{item.label}</span>
                <span aria-hidden>{servicesOpen ? 'v' : '>'}</span>
              </button>
              {servicesOpen && (
                <div className="nav-children">
                  {item.children.map((child) => (
                    <NavLink
                      key={child.to}
                      to={child.to || '#'}
                      className={({ isActive }) =>
                        clsx('nav-link child', {
                          active: isActive || location.pathname === child.to,
                        })
                      }
                    onClick={onClose}
                  >
                    {child.label}
                  </NavLink>
                ))}
              </div>
            )}
            </div>
          );
        }

        return (
          <NavLink
            key={item.to}
            to={item.to || '#'}
            className={({ isActive }) => clsx('nav-link', { active: isActive })}
            onClick={onClose}
          >
            {item.label}
          </NavLink>
        );
      }),
    [servicesOpen, location.pathname, filteredNavItems]
  );

  return (
    <aside className={clsx('sidebar panel', { 'sidebar--mobile-open': isMobileOpen })}>
      <div className="sidebar__brand">
        <div className="brand-lockup">
          <img className="brand-logo" src={logo} alt="Novo Aesthetics" />
          <div className="brand-subtitle">AI-ready</div>
        </div>
        <div className="sidebar__mobile-actions">
          <button className="icon-btn" aria-label="Close navigation" onClick={onClose}>
            X
          </button>
        </div>
      </div>
      <nav className="sidebar__nav">{navContent}</nav>
    </aside>
  );
};

const styles = `
.sidebar {
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  position: relative;
}

.sidebar__brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: linear-gradient(120deg, rgba(56, 189, 248, 0.12), transparent);
}

.brand-lockup {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sidebar__brand .brand-logo {
  height: 36px;
}

.brand-subtitle {
  font-size: 12px;
  color: var(--muted);
}

.sidebar__mobile-actions {
  display: none;
}

.sidebar__nav {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.nav-link,
.nav-parent {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text);
  cursor: pointer;
  font-weight: 600;
  transition: all 0.15s ease;
}

.nav-link:hover,
.nav-parent:hover {
  border-color: var(--accent);
  background: rgba(14, 165, 233, 0.08);
}

.nav-link.active {
  background: linear-gradient(120deg, rgba(14, 165, 233, 0.16), rgba(14, 165, 233, 0.05));
  border-color: var(--accent);
  color: var(--text);
  box-shadow: inset 0 0 0 1px rgba(14, 165, 233, 0.18);
}

.nav-parent {
  text-align: left;
}

.nav-children {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-left: 6px;
}

.nav-link.child {
  font-weight: 600;
  padding: 10px 14px 10px 18px;
  border-radius: 10px;
}

@media (max-width: 960px) {
  .sidebar {
    padding: 12px 10px;
  }

  .brand-title,
  .brand-subtitle {
    display: none;
  }
}

@media (max-width: 960px) {
  .sidebar {
    position: fixed;
    inset: 0 auto 0 0;
    max-width: 80vw;
    width: 280px;
    height: 100vh;
    transform: translateX(-100%);
    transition: transform 0.22s ease, box-shadow 0.22s ease;
    z-index: 60;
    background: var(--panel);
  }

  .sidebar--mobile-open {
    transform: translateX(0);
    box-shadow: 0 18px 48px rgba(0, 0, 0, 0.25);
  }

  .sidebar__mobile-actions {
    margin-left: auto;
    display: flex;
  }
}

@media (min-width: 961px) {
  .sidebar {
    position: sticky;
    top: 0;
    height: 100vh;
    overflow-y: auto;
  }
}

@media (max-width: 540px) {
  .sidebar {
    max-width: 86vw;
    width: 260px;
  }
}
`;

// Inline style injection to avoid extra CSS files for the sidebar
const SidebarStyles: React.FC = () => <style>{styles}</style>;

// Export both for convenience
type SidebarWithStylesProps = SidebarProps;

export const SidebarWithStyles: React.FC<SidebarWithStylesProps> = (props) => (
  <>
    <SidebarStyles />
    <Sidebar {...props} />
  </>
);
