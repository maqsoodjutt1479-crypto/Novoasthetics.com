import React, { useEffect, useMemo, useState } from 'react';
import { StatusBadge } from '../components/StatusBadge';
import { useAppointments } from '../store/useAppointments';
import { usePayments } from '../store/usePayments';
import { useNotifications, type Notification } from '../store/useNotifications';
import { CheckIcon, FilterXIcon, SendIcon } from '../components/UiIcons';

type SalesView = 'daily' | 'weekly' | 'monthly';

const parseDate = (value: string) => new Date(value.replace(' ', 'T'));
const pad = (value: number) => String(value).padStart(2, '0');
const dateKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const monthKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
const receivedAmount = (payment: { cash: number; card: number; bank: number; other: number }) =>
  (payment.cash || 0) + (payment.card || 0) + (payment.bank || 0) + (payment.other || 0);

const weekKey = (date: Date) => {
  const ref = new Date(date);
  const diffToMonday = (ref.getDay() + 6) % 7;
  ref.setDate(ref.getDate() - diffToMonday);
  return dateKey(ref);
};

export const DashboardPage: React.FC = () => {
  const { appointments, hydrate: hydrateAppointments } = useAppointments();
  const { payments, hydrate: hydratePayments } = usePayments();
  const { notifications, markRead } = useNotifications();
  const [salesView, setSalesView] = useState<SalesView>('daily');
  const [salesDateFrom, setSalesDateFrom] = useState('');
  const [salesDateTo, setSalesDateTo] = useState('');

  useEffect(() => {
    void hydrateAppointments();
    void hydratePayments();
  }, [hydrateAppointments, hydratePayments]);

  const handleSendMessage = (notif: Notification) => {
    if (!notif.patient || !notif.phone || !notif.datetime) {
      window.alert('Patient contact details not available for this notification.');
      return;
    }
    const message = `Reminder: ${notif.patient}, your appointment is on ${notif.datetime}.`;
    window.alert(`Send message to ${notif.patient} (${notif.phone}):\n${message}`);
  };

  const today = useMemo(() => new Date().toLocaleDateString('en-CA'), []);
  const todaysAppointments = useMemo(
    () => appointments.filter((appointment) => appointment.datetime.split('T')[0]?.split(' ')[0] === today),
    [appointments, today]
  );

  const totals = useMemo(() => {
    const billed = payments.reduce((sum, payment) => sum + payment.amount, 0);
    const received = payments.reduce((sum, payment) => sum + receivedAmount(payment), 0);
    const openAppointments = appointments.filter((appointment) => appointment.status !== 'Cancelled').length;
    const missed = appointments.filter((appointment) => appointment.status === 'Pending').length;
    return { billed, received, openAppointments, missed };
  }, [appointments, payments]);

  const recentBookings = useMemo(() => {
    const sorted = [...appointments].sort((a, b) => parseDate(b.datetime).getTime() - parseDate(a.datetime).getTime());
    return sorted.slice(0, 5);
  }, [appointments]);

  const filteredSalesPayments = useMemo(
    () =>
      payments.filter((payment) => {
        const datePart = payment.date.split('T')[0]?.split(' ')[0] || payment.date;
        if (salesDateFrom && datePart < salesDateFrom) return false;
        if (salesDateTo && datePart > salesDateTo) return false;
        return true;
      }),
    [payments, salesDateFrom, salesDateTo]
  );

  const salesChart = useMemo(() => {
    const grouped = new Map<string, number>();
    filteredSalesPayments.forEach((payment) => {
      const date = parseDate(payment.date);
      if (Number.isNaN(date.getTime())) return;
      const key =
        salesView === 'daily'
          ? dateKey(date)
          : salesView === 'weekly'
          ? weekKey(date)
          : monthKey(date);
      grouped.set(key, (grouped.get(key) || 0) + receivedAmount(payment));
    });
    const entries = Array.from(grouped.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-8)
      .map(([key, value]) => {
        const label =
          salesView === 'daily'
            ? new Date(`${key}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            : salesView === 'weekly'
            ? `Week of ${new Date(`${key}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
            : new Date(`${key}-01T00:00:00`).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        return [label, value] as const;
      });
    const max = entries.reduce((highest, [, value]) => Math.max(highest, value), 0) || 1;
    return { entries, max };
  }, [filteredSalesPayments, salesView]);

  return (
    <div className="stack">
      <section>
        <div className="card-grid">
          <div className="stat-card panel">
            <div className="stat-card__label">Today&apos;s Appointments</div>
            <div className="stat-card__value">{todaysAppointments.length}</div>
            <div className="stat-card__trend">Current day schedule</div>
          </div>
          <div className="stat-card panel">
            <div className="stat-card__label">Billed Revenue</div>
            <div className="stat-card__value">PKR {totals.billed.toLocaleString()}</div>
            <div className="stat-card__trend">All payment entries</div>
          </div>
          <div className="stat-card panel">
            <div className="stat-card__label">Received Revenue</div>
            <div className="stat-card__value">PKR {totals.received.toLocaleString()}</div>
            <div className="stat-card__trend success">Cash, card, bank, and other</div>
          </div>
          <div className="stat-card panel">
            <div className="stat-card__label">Open Appointments</div>
            <div className="stat-card__value">{totals.openAppointments}</div>
            <div className="stat-card__trend warning">{totals.missed} still pending</div>
          </div>
        </div>
      </section>

      <section className="panel section">
        <div className="section__header">
          <div>
            <div className="section__title">Sales Graph</div>
            <div className="muted">Switch between daily, weekly, and monthly revenue.</div>
          </div>
          <div className="filter-bar">
            <input
              type="date"
              className="input"
              value={salesDateFrom}
              onChange={(e) => setSalesDateFrom(e.target.value)}
            />
            <input
              type="date"
              className="input"
              value={salesDateTo}
              onChange={(e) => setSalesDateTo(e.target.value)}
            />
            <button
              type="button"
              className="icon-btn"
              onClick={() => {
                setSalesDateFrom('');
                setSalesDateTo('');
              }}
              aria-label="Clear dates"
              title="Clear dates"
            >
              <FilterXIcon />
            </button>
            {(['daily', 'weekly', 'monthly'] as const).map((view) => (
              <button
                key={view}
                type="button"
                className={`pill ${salesView === view ? '' : 'pill--ghost'}`}
                onClick={() => setSalesView(view)}
              >
                {view === 'daily' ? 'Daily' : view === 'weekly' ? 'Weekly' : 'Monthly'}
              </button>
            ))}
          </div>
        </div>
        {(salesDateFrom || salesDateTo) && (
          <div className="muted small" style={{ marginBottom: 10 }}>
            Showing revenue {salesDateFrom ? `from ${salesDateFrom}` : ''}{salesDateFrom && salesDateTo ? ' ' : ''}
            {salesDateTo ? `to ${salesDateTo}` : ''}.
          </div>
        )}
        <div className="bar-chart">
          {salesChart.entries.map(([label, value]) => (
            <div key={label} className="bar">
              <div className="bar__fill" style={{ height: `${Math.max(10, (value / salesChart.max) * 100)}%` }} />
              <div className="bar__label">{label}</div>
              <div className="bar__count">PKR {Math.round(value).toLocaleString()}</div>
            </div>
          ))}
          {salesChart.entries.length === 0 && <div className="muted small">No sales data available.</div>}
        </div>
      </section>

      <section className="panel section">
        <div className="section__header">
          <div>
            <div className="section__title">New Booking Alerts</div>
            <div className="muted">Latest appointments added to the live store.</div>
          </div>
          <div className="pill pill--ghost">Admin</div>
        </div>
        <div className="card-grid">
          {recentBookings.map((appointment) => (
            <div key={appointment.id} className="mini-card">
              <div className="strong">{appointment.patient}</div>
              <div className="muted small">{appointment.doctor} - {appointment.service}</div>
              <div className="muted small">{appointment.datetime.replace('T', ' @ ')}</div>
              <div className="muted small">{appointment.phone}</div>
              <StatusBadge status={appointment.status} />
            </div>
          ))}
          {recentBookings.length === 0 && <div className="muted small">No bookings yet.</div>}
        </div>
      </section>

      <section className="panel section">
        <div className="section__header">
          <div>
            <div className="section__title">Today&apos;s Appointments</div>
            <div className="muted">Only the next six bookings are shown.</div>
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
              {todaysAppointments.slice(0, 6).map((appointment) => (
                <tr key={appointment.id}>
                  <td>
                    <div className="strong">{appointment.patient}</div>
                    <div className="muted small">{appointment.id}</div>
                  </td>
                  <td>{appointment.doctor}</td>
                  <td>{appointment.service}</td>
                  <td>{appointment.datetime.replace('T', ' @ ')}</td>
                  <td><StatusBadge status={appointment.status} /></td>
                  <td>PKR {appointment.amount.toLocaleString()}</td>
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
            <div className="muted">Tap to mark read and clear.</div>
          </div>
          <div className="pill pill--ghost">Admin</div>
        </div>
        <div className="stack">
          {notifications.map((notification) => (
            <div key={notification.id} className="mini-card" style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div className="badge badge--muted" style={{ marginBottom: 6 }}>
                  {notification.kind === 'reminder' ? 'Reminder' : 'Booking'}
                </div>
                <div className="strong">{notification.message}</div>
                <div className="muted small">{notification.createdAt.replace('T', ' ').slice(0, 16)}</div>
              </div>
              <div className="action-stack" style={{ alignItems: 'flex-end' }}>
                {notification.kind === 'reminder' && (
                  <button className="icon-btn" onClick={() => handleSendMessage(notification)} aria-label="Send message" title="Send message">
                    <SendIcon />
                  </button>
                )}
                <button className="icon-btn" onClick={() => markRead(notification.id)} aria-label="Mark as read" title="Mark as read">
                  <CheckIcon />
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
