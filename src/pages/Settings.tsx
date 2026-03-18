import React from 'react';
import { useTheme } from '../components/ThemeProvider';
import { useAuth } from '../components/AuthProvider';
import { MoonIcon, SunIcon } from '../components/UiIcons';

export const SettingsPage: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const isReadOnly = user?.role === 'fdo';

  return (
    <div className="stack">
      <div className="panel section">
        <div className="section__header">
          <div>
            <div className="section__title">Settings</div>
            <div className="muted">Control preferences and defaults</div>
          </div>
        </div>
        <div className="form-grid">
          <div className="form-row">
            <div>
              <div className="strong">Theme</div>
              <div className="muted small">Light / Dark mode</div>
            </div>
            <button
              className="icon-btn"
              onClick={toggleTheme}
              disabled={isReadOnly}
              aria-label={theme === 'light' ? 'Dark mode' : 'Light mode'}
              title={theme === 'light' ? 'Dark mode' : 'Light mode'}
            >
              {theme === 'light' ? <MoonIcon /> : <SunIcon />}
            </button>
          </div>
          <div className="form-row">
            <div>
              <div className="strong">Notifications</div>
              <div className="muted small">New orders, low stock alerts</div>
            </div>
            <label className="toggle">
              <input type="checkbox" defaultChecked disabled={isReadOnly} />
              <span className="toggle__slider" />
            </label>
          </div>
          <div className="form-row">
            <div>
              <div className="strong">Default Doctor</div>
              <div className="muted small">Used when creating appointments</div>
            </div>
            <select className="input" disabled={isReadOnly}>
              <option>Dr. Khan</option>
              <option>Dr. Fatima</option>
              <option>Dr. Ali</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
