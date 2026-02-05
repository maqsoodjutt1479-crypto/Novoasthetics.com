import React from 'react';
import { useTheme } from './ThemeProvider';
import { useAuth } from './AuthProvider';
import { useNavigate } from 'react-router-dom';
import { useNotifications, type Notification } from '../store/useNotifications';

type TopBarProps = {
  title?: string;
  onToggleSidebar?: () => void;
};

export const TopBar: React.FC<TopBarProps> = ({ title, onToggleSidebar }) => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout, setRole } = useAuth();
  const navigate = useNavigate();
  const { notifications, markRead } = useNotifications();
  const [open, setOpen] = React.useState(false);
  if (!user) return null;

  const handleSendMessage = (notif: Notification) => {
    if (!notif.patient || !notif.phone || !notif.datetime) {
      window.alert('Patient contact details not available for this notification.');
      return;
    }
    const message = `Reminder: ${notif.patient}, your appointment is on ${notif.datetime}.`;
    window.alert(`Send message to ${notif.patient} (${notif.phone}):\n${message}`);
  };

  return (
    <header className="topbar panel">
      <div className="topbar__left">
        {onToggleSidebar && (
          <button
            className="icon-btn mobile-nav-toggle"
            aria-label="Toggle navigation"
            onClick={onToggleSidebar}
          >
            Menu
          </button>
        )}
        <div className="topbar__title">{title || 'Overview'}</div>
      </div>
      
      <div className="topbar__actions">
        <div className="notification-wrapper">
          <button className="pill pill--ghost" onClick={() => setOpen((v) => !v)}>
            Notifications {notifications.length > 0 ? `(${notifications.length})` : ''}
          </button>
          {open && (
            <div className="notif-popover panel">
              <div className="section__header">
                <div className="section__title">Notifications</div>
                <button className="pill pill--ghost" onClick={() => setOpen(false)}>
                  Close
                </button>
              </div>
              <div className="stack">
                {notifications.map((n) => (
                  <div key={n.id} className="mini-card" style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <div>
                      <div className="badge badge--muted" style={{ marginBottom: 6 }}>
                        {n.kind === 'reminder' ? 'Reminder' : 'Booking'}
                      </div>
                      <div className="strong">{n.message}</div>
                      <div className="muted small">{n.createdAt.replace('T', ' ').slice(0, 16)}</div>
                    </div>
                    <div className="action-stack" style={{ alignItems: 'flex-end' }}>
                      {n.kind === 'reminder' && (
                        <button className="pill pill--ghost" onClick={() => handleSendMessage(n)}>
                          Send Msg
                        </button>
                      )}
                      <button className="pill pill--ghost" onClick={() => markRead(n.id)}>
                        Mark read
                      </button>
                    </div>
                  </div>
                ))}
                {notifications.length === 0 && <div className="muted small">No new notifications.</div>}
              </div>
            </div>
          )}
        </div>
        <div className="user-pill">
          <span>
            {user.role === 'admin'
              ? 'Admin'
              : user.role === 'fdo'
              ? 'FDO'
              : user.doctorName || 'Doctor'}
          </span>
          {user.role === 'doctor' && user.doctorName && (
            <span className="muted small">({user.doctorName})</span>
          )}
        </div>
        {user.role === 'admin' && (
          <select
            className="user-select"
            value={user.role}
            onChange={(e) => {
              const role = e.target.value as 'admin' | 'doctor' | 'fdo';
              if (role === 'doctor') {
                setRole('doctor', user.doctorName || 'Dr. Khan');
              } else if (role === 'fdo') {
                setRole('fdo');
              } else {
                setRole('admin');
              }
            }}
          >
            <option value="admin">Admin</option>
            <option value="doctor">Doctor</option>
            <option value="fdo">FDO</option>
          </select>
        )}
        <button
          className="pill pill--ghost"
          onClick={() => {
            logout();
            navigate('/login');
          }}
        >
          Logout
        </button>
        <button className="pill" onClick={toggleTheme} aria-label="Toggle theme">
          {theme === 'light' ? 'Switch to Dark' : 'Switch to Light'}
        </button>
      </div>
    </header>
  );
};

const styles = `
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  margin-bottom: 18px;
  gap: 12px;
  position: sticky;
  top: 0;
  z-index: 40;
  background: var(--panel);
}

.topbar__title {
  font-weight: 800;
  font-size: 18px;
}

.topbar__subtitle {
  font-size: 13px;
  color: var(--muted);
}

.topbar__actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.user-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: rgba(148, 163, 184, 0.14);
  font-size: 13px;
}

.user-select {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 6px 8px;
  background: var(--panel);
  color: var(--text);
}

.pill {
  background: linear-gradient(120deg, rgba(14, 165, 233, 0.14), rgba(14, 165, 233, 0.08));
}

.notification-wrapper {
  position: relative;
}

.notif-popover {
  position: absolute;
  right: 0;
  top: 48px;
  width: 360px;
  max-width: 80vw;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--panel);
  box-shadow: var(--shadow);
  padding: 12px;
  z-index: 30;
}

.mobile-nav-toggle {
  display: none;
}

.topbar__left {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

@media (max-width: 1024px) {
  .topbar {
    flex-wrap: wrap;
  }

  .topbar__actions {
    width: 100%;
  }
}

@media (max-width: 768px) {
  .mobile-nav-toggle {
    display: inline-flex;
  }

  .topbar__subtitle {
    width: 100%;
  }

  .topbar__actions {
    justify-content: flex-start;
  }

  .notif-popover {
    left: 0;
    right: auto;
    width: min(420px, calc(100vw - 24px));
  }
}

@media (max-width: 560px) {
  .topbar__actions {
    gap: 8px;
  }

  .topbar__actions .pill,
  .topbar__actions .user-select,
  .topbar__actions .user-pill {
    width: 100%;
    justify-content: center;
  }
}
`;

export const TopBarWithStyles: React.FC<TopBarProps> = (props) => (
  <>
    <style>{styles}</style>
    <TopBar {...props} />
  </>
);
