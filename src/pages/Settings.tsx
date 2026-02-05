import React from 'react';
import { useTheme } from '../components/ThemeProvider';

export const SettingsPage: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

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
            <button className="pill" onClick={toggleTheme}>
              {theme === 'light' ? 'Switch to Dark' : 'Switch to Light'}
            </button>
          </div>
          <div className="form-row">
            <div>
              <div className="strong">Notifications</div>
              <div className="muted small">New orders, low stock alerts</div>
            </div>
            <label className="toggle">
              <input type="checkbox" defaultChecked />
              <span className="toggle__slider" />
            </label>
          </div>
          <div className="form-row">
            <div>
              <div className="strong">Default Doctor</div>
              <div className="muted small">Used when creating appointments</div>
            </div>
            <select className="input">
              <option>Dr. Khan</option>
              <option>Dr. Fatima</option>
              <option>Dr. Ali</option>
            </select>
          </div>
          <div className="form-row">
            <div>
              <div className="strong">AI Agent (future)</div>
              <div className="muted small">Enable automated reminders & scheduling</div>
            </div>
            <div className="pill pill--ghost">Coming soon</div>
          </div>
        </div>
      </div>
    </div>
  );
};
