import React, { useMemo } from 'react';
import { StatusBadge } from '../components/StatusBadge';
import { useAppointments } from '../store/useAppointments';
import { useNotifications, type Notification } from '../store/useNotifications';

type Appointment = {
  patient: string;
  doctor: string;
  time: string;
  status: 'Pending' | 'Coming Soon' | 'Arrived' | 'Delayed' | 'Confirmed';
  amount: number;
  service: string;
  today?: boolean;
};

export const DashboardPage: React.FC = () => {
  const { appointments: liveAppointments } = useAppointments();
  const { notifications, markRead } = useNotifications();
  const handleSendMessage = (notif: Notification) => {
    if (!notif.patient || !notif.phone || !notif.datetime) {
      window.alert('Patient contact details not available for this notification.');
      return;
    }
    const message = `Reminder: ${notif.patient}, your appointment is on ${notif.datetime}.`;
    window.alert(`Send message to ${notif.patient} (${notif.phone}):\n${message}`);
  };
  const referenceDate = useMemo(() => new Date().toLocaleDateString('en-CA'), []);
  const getDatePart = (value: string) => value.split('T')[0]?.split(' ')[0] || value;
  const todaysAppointments = useMemo(
    () => liveAppointments.filter((a) => getDatePart(a.datetime) === referenceDate),
    [liveAppointments, referenceDate]
  );
  const totals = useMemo(() => {
    const revenue = liveAppointments.reduce((sum, a) => sum + a.amount, 0);
    const missed = liveAppointments.filter((a) => a.status === 'Pending').length;
    return { revenue, missed };
  }, [liveAppointments]);

  const recentBookings = useMemo(() => {
    const sorted = [...liveAppointments].sort((a, b) => {
      const da = new Date(a.datetime.replace(' ', 'T')).getTime();
      const db = new Date(b.datetime.replace(' ', 'T')).getTime();
      return db - da;
    });
    return sorted.slice(0, 5);
  }, [liveAppointments]);

  return (
    <div className="stack">
      <section>
        <div className="card-grid">
          <div className="stat-card panel">
            <div className="stat-card__label">Today&apos;s Upcoming Appointments</div>
            <div className="stat-card__value">{todaysAppointments.length}</div>
            <div className="stat-card__trend">Arrivals, delays, and confirms at a glance</div>
          </div>
          <div className="stat-card panel">
            <div className="stat-card__label">Total Sales Revenue</div>
            <div className="stat-card__value">PKR {totals.revenue.toLocaleString()}</div>
            <div className="stat-card__trend success">+12% vs yesterday</div>
          </div>
          <div className="stat-card panel">
            <div className="stat-card__label">Unattempted / Missed</div>
            <div className="stat-card__value">{totals.missed}</div>
            <div className="stat-card__trend warning">Follow-up reminders pending</div>
          </div>
          <div className="stat-card panel">
            <div className="stat-card__label">Open Appointments</div>
            <div className="stat-card__value">{liveAppointments.length}</div>
            <div className="stat-card__trend">Tracked from the live store</div>
          </div>
        </div>
      </section>

      <section className="panel section">
        <div className="section__header">
          <div>
            <div className="section__title">New Booking Alerts</div>
            <div className="muted">Latest appointments added (live)</div>
          </div>
          <div className="pill pill--ghost">Admin</div>
        </div>
        <div className="card-grid">
          {recentBookings.map((appt) => (
            <div key={appt.id} className="mini-card">
              <div className="strong">{appt.patient}</div>
              <div className="muted small">{appt.doctor} - {appt.service}</div>
              <div className="muted small">{appt.datetime.replace(' ', ' @ ')}</div>
              <div className="muted small">{appt.phone}</div>
              <StatusBadge status={appt.status} />
            </div>
          ))}
          {recentBookings.length === 0 && <div className="muted small">No bookings yet.</div>}
        </div>
      </section>

      <section className="panel section">
        <div className="section__header">
          <div>
            <div className="section__title">Today&apos;s Appointments</div>
            <div className="muted">Only the next six bookings are shown</div>
          </div>
          <div className="pill">Admin control: change status</div>
        </div>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Doctor</th>
                <th>Service</th>
                <th>Time</th>
                <th>Status</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {todaysAppointments.slice(0, 6).map((appt) => (
                <tr key={appt.id}>
                  <td>
                    <div className="strong">{appt.patient}</div>
                    <div className="muted small">{appt.id}</div>
                  </td>
                  <td>{appt.doctor}</td>
                  <td>{appt.service}</td>
                  <td>{appt.datetime.replace(' ', ' @ ')}</td>
                  <td>
                    <StatusBadge status={appt.status} />
                  </td>
                  <td>PKR {appt.amount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel section">
        <div className="section__header">
          <div>
            <div className="section__title">Notifications</div>
            <div className="muted">Tap to mark read & clear</div>
          </div>
          <div className="pill pill--ghost">Admin</div>
        </div>
        <div className="stack">
          {notifications.map((n) => (
            <div key={n.id} className="mini-card" style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
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
                  Mark as read
                </button>
              </div>
            </div>
          ))}
          {notifications.length === 0 && <div className="muted small">No new notifications.</div>}
        </div>
      </section>
    </div>
  );
};
