import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { SidebarWithStyles } from '../components/Sidebar';
import { TopBarWithStyles } from '../components/TopBar';
import { useAppointments } from '../store/useAppointments';
import { useNotifications } from '../store/useNotifications';

type AppLayoutProps = {
  title: string;
  children: React.ReactNode;
};

export const AppLayout: React.FC<AppLayoutProps> = ({ title, children }) => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const location = useLocation();
  const { appointments } = useAppointments();
  const { syncReminders } = useNotifications();

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    syncReminders(appointments);
  }, [appointments, syncReminders]);

  useEffect(() => {
    const interval = window.setInterval(() => syncReminders(appointments), 60 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, [appointments, syncReminders]);

  return (
    <div className="app-shell" data-mobile-open={mobileNavOpen}>
      <SidebarWithStyles isMobileOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      {mobileNavOpen && (
        <button
          aria-label="Close navigation"
          className="sidebar-scrim"
          onClick={() => setMobileNavOpen(false)}
        />
      )}
      <main>
        <div className="content">
          <TopBarWithStyles title={title} onToggleSidebar={() => setMobileNavOpen((v) => !v)} />
          {children}
        </div>
      </main>
    </div>
  );
};
