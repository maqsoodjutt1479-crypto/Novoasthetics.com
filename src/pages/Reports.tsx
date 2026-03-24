import React, { useEffect, useMemo } from 'react';
import { useAppointments } from '../store/useAppointments';
import { usePayments } from '../store/usePayments';
import { useProductSales } from '../store/useProductSales';

const getReceivedAmount = (payment: { cash: number; card: number; bank: number; other: number }) =>
  (payment.cash || 0) + (payment.card || 0) + (payment.bank || 0) + (payment.other || 0);

const formatMoney = (value: number) => `PKR ${Math.round(value).toLocaleString()}`;

export const ReportsPage: React.FC = () => {
  const { appointments, hydrate: hydrateAppointments } = useAppointments();
  const { payments, hydrate: hydratePayments } = usePayments();
  const { orders, hydrate: hydrateSales } = useProductSales();

  useEffect(() => {
    void hydrateAppointments();
    void hydratePayments();
    void hydrateSales();
  }, [hydrateAppointments, hydratePayments, hydrateSales]);

  const appointmentTotals = useMemo(() => {
    const total = appointments.length;
    const confirmed = appointments.filter((row) => row.status === 'Confirmed').length;
    const cancelled = appointments.filter((row) => row.status === 'Cancelled').length;
    const active = appointments.filter((row) => row.status !== 'Cancelled').length;
    return {
      total,
      confirmed,
      cancelled,
      active,
      conversionRate: active > 0 ? Math.round((confirmed / active) * 100) : 0,
      cancellationRate: total > 0 ? Math.round((cancelled / total) * 100) : 0,
    };
  }, [appointments]);

  const paymentTotals = useMemo(() => {
    const billed = payments.reduce((sum, payment) => sum + payment.amount, 0);
    const received = payments.reduce((sum, payment) => sum + getReceivedAmount(payment), 0);
    const outstanding = payments.reduce(
      (sum, payment) => sum + Math.max(0, payment.amount - getReceivedAmount(payment)),
      0
    );
    const serviceReceived = payments
      .filter((payment) => payment.source.toLowerCase().startsWith('appointment -'))
      .reduce((sum, payment) => sum + getReceivedAmount(payment), 0);
    const productReceived = payments
      .filter((payment) => payment.source.toLowerCase().startsWith('product '))
      .reduce((sum, payment) => sum + getReceivedAmount(payment), 0);
    const averageTicket = payments.length > 0 ? Math.round(received / payments.length) : 0;
    return {
      billed,
      received,
      outstanding,
      serviceReceived,
      productReceived,
      averageTicket,
    };
  }, [payments]);

  const statusRows = useMemo(() => {
    const grouped = new Map<string, number>();
    appointments.forEach((appointment) => {
      grouped.set(appointment.status, (grouped.get(appointment.status) || 0) + 1);
    });
    return Array.from(grouped.entries()).sort((a, b) => b[1] - a[1]);
  }, [appointments]);

  const revenueRows = useMemo(
    () => [
      ['Services', paymentTotals.serviceReceived] as const,
      ['Products', paymentTotals.productReceived] as const,
      [
        'Manual / Other',
        Math.max(0, paymentTotals.received - paymentTotals.serviceReceived - paymentTotals.productReceived),
      ] as const,
    ],
    [paymentTotals]
  );

  const salesTotals = useMemo(() => {
    const total = orders.reduce((sum, order) => sum + order.total, 0);
    const received = orders.reduce((sum, order) => sum + order.paid, 0);
    const balance = orders.reduce((sum, order) => sum + Math.max(0, order.total - order.paid), 0);
    return { total, received, balance };
  }, [orders]);

  return (
    <div className="stack">
      <div className="panel section">
        <div className="section__header">
          <div>
            <div className="section__title">Reports & Analytics</div>
            <div className="muted">Live values calculated from appointments, payments, and product sales.</div>
          </div>
          <div className="pill pill--ghost">Auto-updating</div>
        </div>
        <div className="card-grid">
          <div className="stat-card panel">
            <div className="stat-card__label">Appointment Conversion</div>
            <div className="stat-card__value">{appointmentTotals.conversionRate}%</div>
            <div className="stat-card__trend">{appointmentTotals.confirmed} confirmed from {appointmentTotals.active} active bookings</div>
          </div>
          <div className="stat-card panel">
            <div className="stat-card__label">Received Revenue</div>
            <div className="stat-card__value">{formatMoney(paymentTotals.received)}</div>
            <div className="stat-card__trend success">Based on live payment records</div>
          </div>
          <div className="stat-card panel">
            <div className="stat-card__label">Outstanding Balance</div>
            <div className="stat-card__value">{formatMoney(paymentTotals.outstanding)}</div>
            <div className="stat-card__trend warning">Drops immediately when payments are removed or updated</div>
          </div>
          <div className="stat-card panel">
            <div className="stat-card__label">Average Ticket</div>
            <div className="stat-card__value">{formatMoney(paymentTotals.averageTicket)}</div>
            <div className="stat-card__trend">{payments.length} payment entries in report scope</div>
          </div>
        </div>
      </div>

      <div className="panel section">
        <div className="section__header">
          <div>
            <div className="section__title">Revenue Mix</div>
            <div className="muted">Service and product totals from recorded payments.</div>
          </div>
        </div>
        <div className="table-wrapper">
          <table className="table table--compact">
            <thead>
              <tr>
                <th>Category</th>
                <th>Received</th>
                <th>Share</th>
              </tr>
            </thead>
            <tbody>
              {revenueRows.map(([label, value]) => (
                <tr key={label}>
                  <td>{label}</td>
                  <td>{formatMoney(value)}</td>
                  <td>{paymentTotals.received > 0 ? `${Math.round((value / paymentTotals.received) * 100)}%` : '0%'}</td>
                </tr>
              ))}
              <tr>
                <td className="strong">Total</td>
                <td className="strong">{formatMoney(paymentTotals.received)}</td>
                <td className="strong">100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel section">
        <div className="section__header">
          <div>
            <div className="section__title">Operational Snapshot</div>
            <div className="muted">Current appointment and product-sale totals.</div>
          </div>
        </div>
        <div className="table-wrapper">
          <table className="table table--compact">
            <thead>
              <tr>
                <th>Metric</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Total Appointments</td>
                <td>{appointmentTotals.total}</td>
              </tr>
              <tr>
                <td>Cancellation Rate</td>
                <td>{appointmentTotals.cancellationRate}%</td>
              </tr>
              <tr>
                <td>Billed Revenue</td>
                <td>{formatMoney(paymentTotals.billed)}</td>
              </tr>
              <tr>
                <td>Product Sales Total</td>
                <td>{formatMoney(salesTotals.total)}</td>
              </tr>
              <tr>
                <td>Product Sales Received</td>
                <td>{formatMoney(salesTotals.received)}</td>
              </tr>
              <tr>
                <td>Product Sales Outstanding</td>
                <td>{formatMoney(salesTotals.balance)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel section">
        <div className="section__header">
          <div>
            <div className="section__title">Appointment Status Breakdown</div>
            <div className="muted">Counts by live appointment status.</div>
          </div>
        </div>
        <div className="table-wrapper">
          <table className="table table--compact">
            <thead>
              <tr>
                <th>Status</th>
                <th>Count</th>
              </tr>
            </thead>
            <tbody>
              {statusRows.map(([status, count]) => (
                <tr key={status}>
                  <td>{status}</td>
                  <td>{count}</td>
                </tr>
              ))}
              {statusRows.length === 0 && (
                <tr>
                  <td colSpan={2} className="muted small" style={{ textAlign: 'center' }}>
                    No appointment data available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
