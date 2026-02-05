import React, { useEffect, useMemo, useState } from 'react';
import { StatusBadge } from '../components/StatusBadge';
import { usePayments, type Payment, type PaymentMethod } from '../store/usePayments';
import logo from '../assets/novo-logo.svg';

export const PaymentsPage: React.FC = () => {
  const { payments, addPayment } = usePayments();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [patientId, setPatientId] = useState('');
  const [printingPayment, setPrintingPayment] = useState<Payment | null>(null);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 16),
    patientId: '',
    patientName: '',
    method: 'CASH' as PaymentMethod,
    amount: '',
    cash: '',
    card: '',
    bank: '',
    other: '',
    source: 'appointment',
  });
  const normalizeDate = (raw: string) => raw.replace('T', ' ');
  const parseDate = (raw: string) => new Date(normalizeDate(raw));
  const formatMoney = (value?: number) => `PKR ${Math.round(value ?? 0).toLocaleString()}`;

  const paymentStatus = (p: Payment): 'Paid' | 'Partial' | 'Unpaid' => {
    const settled = (p.cash || 0) + (p.card || 0) + (p.bank || 0) + (p.other || 0);
    if (settled >= p.amount) return 'Paid';
    if (settled > 0) return 'Partial';
    return 'Unpaid';
  };

  const filtered = useMemo(
    () =>
      payments.filter((p) => {
        const payDate = parseDate(p.date);
        const fromDate = from ? parseDate(`${from} 00:00:00`) : null;
        const toDate = to ? parseDate(`${to} 23:59:59`) : null;
        const inRange =
          (!fromDate || payDate >= fromDate) &&
          (!toDate || payDate <= toDate);
        const matchesPatient = !patientId || p.patientId.includes(patientId);
        return inRange && matchesPatient;
      }),
    [from, to, patientId, payments]
  );

  const totals = useMemo(() => {
    const t = filtered.reduce(
      (acc, p) => {
        acc.amount += p.amount;
        acc.cash += p.cash;
        acc.card += p.card;
        acc.bank += p.bank;
        acc.other += p.other;
        return acc;
      },
      { amount: 0, cash: 0, card: 0, bank: 0, other: 0 }
    );
    return t;
  }, [filtered]);

  const handleAdd = () => {
    if (!form.patientName.trim()) return;
    const amount = Number(form.amount) || 0;
    const cash = form.cash ? Number(form.cash) : amount;
    const card = Number(form.card) || 0;
    const bank = Number(form.bank) || 0;
    const other = Number(form.other) || 0;
    addPayment({
      date: normalizeDate(form.date || new Date().toISOString().slice(0, 16)),
      patientId: form.patientId || 'N/A',
      patientName: form.patientName.trim(),
      method: form.method,
      amount,
      cash,
      card,
      bank,
      other,
      source: form.source || 'appointment',
    });
    setForm({
      date: new Date().toISOString().slice(0, 16),
      patientId: '',
      patientName: '',
      method: 'CASH',
      amount: '',
      cash: '',
      card: '',
      bank: '',
      other: '',
      source: 'appointment',
    });
  };

  const handleExport = () => {
    const headers = ['Date', 'Patient ID', 'Patient Name', 'Method', 'Status', 'Amount', 'Cash', 'Card', 'Bank', 'Other', 'Source', 'Ref ID'];
    const csv = [
      headers.join(','),
      ...filtered.map((p) =>
        [
          p.date,
          p.patientId,
          p.patientName,
          p.method,
          paymentStatus(p),
          p.amount,
          p.cash,
          p.card,
          p.bank,
          p.other,
          p.source,
          p.id,
        ].join(',')
      ),
      ['TOTALS', '', '', '', '', totals.amount, totals.cash, totals.card, totals.bank, totals.other, '', ''].join(','),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'payments.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = (payment: Payment) => {
    setPrintingPayment(payment);
  };

  useEffect(() => {
    if (!printingPayment) return;
    const handleAfterPrint = () => setPrintingPayment(null);
    window.addEventListener('afterprint', handleAfterPrint);
    window.print();
    return () => {
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, [printingPayment]);

  const now = new Date();
  const todayLabel = now.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
  const timeLabel = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="stack">
      <div className="panel section">
        <div className="section__header">
          <div>
            <div className="section__title">Payments Statement</div>
            <div className="muted">
              Period: {from || 'All'} to {to || 'All'} | Cash: {totals.cash.toLocaleString()} | Card: {totals.card.toLocaleString()} | Bank: {totals.bank.toLocaleString()} | Other: {totals.other.toLocaleString()} | Grand: {totals.amount.toLocaleString()}
            </div>
          </div>
          <div className="pill pill--ghost">All Branches</div>
        </div>
        <div className="filter-bar">
          <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
          <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
          <input
            className="input"
            placeholder="Patient ID (optional)"
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
          />
          <button className="pill" onClick={handleAdd}>
            + Add Payment
          </button>
          <button className="pill pill--ghost" onClick={handleExport}>
            Export CSV
          </button>
        </div>
        <div className="form-grid">
          <input
            type="datetime-local"
            className="input"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            title="Payment date/time"
          />
          <input
            className="input"
            placeholder="Patient ID"
            value={form.patientId}
            onChange={(e) => setForm((f) => ({ ...f, patientId: e.target.value }))}
          />
          <input
            className="input"
            placeholder="Patient Name"
            value={form.patientName}
            onChange={(e) => setForm((f) => ({ ...f, patientName: e.target.value }))}
            required
          />
          <select
            className="input"
            value={form.method}
            onChange={(e) => setForm((f) => ({ ...f, method: e.target.value as PaymentMethod }))}
          >
            <option value="CASH">Cash</option>
            <option value="CARD">Card</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
            <option value="OTHER">Other</option>
          </select>
          <input
            className="input"
            type="number"
            min="0"
            placeholder="Amount"
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
          />
          <input
            className="input"
            type="number"
            min="0"
            placeholder="Cash"
            value={form.cash}
            onChange={(e) => setForm((f) => ({ ...f, cash: e.target.value }))}
            title="Cash received (defaults to amount if left empty)"
          />
          <input
            className="input"
            type="number"
            min="0"
            placeholder="Card"
            value={form.card}
            onChange={(e) => setForm((f) => ({ ...f, card: e.target.value }))}
          />
          <input
            className="input"
            type="number"
            min="0"
            placeholder="Bank"
            value={form.bank}
            onChange={(e) => setForm((f) => ({ ...f, bank: e.target.value }))}
          />
          <input
            className="input"
            type="number"
            min="0"
            placeholder="Other"
            value={form.other}
            onChange={(e) => setForm((f) => ({ ...f, other: e.target.value }))}
          />
          <input
            className="input"
            placeholder="Source (e.g., appointment, retail)"
            value={form.source}
            onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
          />
        </div>
      </div>

      <div className="panel section">
        <div className="table-wrapper">
          <table className="table table--compact">
            <thead>
              <tr>
                <th>Date/Time</th>
                <th>Patient ID</th>
                <th>Patient Name</th>
                <th>Method</th>
                <th>Status</th>
                <th>Amount</th>
                <th>Cash</th>
                <th>Card</th>
                <th>Bank</th>
                <th>Other</th>
                <th>Source</th>
                <th>Ref ID</th>
                <th>Slip</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td>{p.date}</td>
                  <td className="muted small">{p.patientId}</td>
                  <td>{p.patientName}</td>
                  <td>{p.method}</td>
                  <td>
                    <StatusBadge status={paymentStatus(p)} />
                  </td>
                  <td>PKR {p.amount.toLocaleString()}</td>
                  <td>PKR {p.cash.toLocaleString()}</td>
                  <td>PKR {p.card.toLocaleString()}</td>
                  <td>PKR {p.bank.toLocaleString()}</td>
                  <td>PKR {p.other.toLocaleString()}</td>
                  <td className="muted small">{p.source}</td>
                  <td className="muted small">{p.id}</td>
                  <td>
                    <button className="icon-btn" title="Print slip" aria-label="Print slip" onClick={() => handlePrint(p)}>
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          d="M7 7V3h10v4H7zm10 2h1a3 3 0 0 1 3 3v5h-4v4H7v-4H3v-5a3 3 0 0 1 3-3h11zm-2 10v-4H9v4h6zm4-2h2v-5a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v5h2v-4h8v4h4z"
                          fill="currentColor"
                        />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length > 0 && (
                <tr>
                  <td className="strong">Totals</td>
                  <td />
                  <td />
                  <td />
                  <td />
                  <td>PKR {totals.amount.toLocaleString()}</td>
                  <td>PKR {totals.cash.toLocaleString()}</td>
                  <td>PKR {totals.card.toLocaleString()}</td>
                  <td>PKR {totals.bank.toLocaleString()}</td>
                  <td>PKR {totals.other.toLocaleString()}</td>
                  <td />
                  <td />
                  <td />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {printingPayment && (
        <section className="consultation-print">
          <div className="consultation-watermark" aria-hidden="true">
            <img src={logo} alt="" />
          </div>
          <header className="consultation-header">
            <div className="consultation-header__left">
              <div className="consultation-clinic">
                <div className="consultation-clinic__title">Novo Aesthetics</div>
                <div className="consultation-clinic__meta">2-W-101, B-1 Plaza Main Susan Road Faisalabad</div>
                <div className="consultation-clinic__meta">
                  Phone: 0312-1114455 | Email: care@novoaestheticspk.com
                </div>
              </div>
            </div>
            <div className="consultation-header__right">
              <div className="consultation-meta">
                <div>
                  <span>{`${now.toLocaleDateString('en-US')} ${timeLabel}`}</span>
                </div>
                <div>
                  <span>Date:</span>
                  <strong>{todayLabel}</strong>
                </div>
                <div>
                  <span>Payment Date:</span>
                  <strong>{printingPayment.date}</strong>
                </div>
                <div>
                  <span>Status:</span>
                  <strong className="consultation-status">{paymentStatus(printingPayment).toUpperCase()}</strong>
                </div>
              </div>
            </div>
          </header>

          <h1 className="consultation-title">Payment Receipt</h1>

          <section className="consultation-grid">
            <div className="consultation-field">
              <span>Patient Name</span>
              <div>{printingPayment.patientName}</div>
            </div>
            <div className="consultation-field">
              <span>Patient ID</span>
              <div>{printingPayment.patientId}</div>
            </div>
            <div className="consultation-field">
              <span>Method</span>
              <div>{printingPayment.method}</div>
            </div>
            <div className="consultation-field">
              <span>Source</span>
              <div>{printingPayment.source}</div>
            </div>
            <div className="consultation-field">
              <span>Reference</span>
              <div>{printingPayment.id}</div>
            </div>
          </section>

          <section className="consultation-block">
            <div className="consultation-block__title">Payment Breakdown</div>
            <table className="consultation-table">
              <thead>
                <tr>
                  <th>Total Amount</th>
                  <th>Cash</th>
                  <th>Card</th>
                  <th>Bank</th>
                  <th>Other</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{formatMoney(printingPayment.amount)}</td>
                  <td>{formatMoney(printingPayment.cash)}</td>
                  <td>{formatMoney(printingPayment.card)}</td>
                  <td>{formatMoney(printingPayment.bank)}</td>
                  <td>{formatMoney(printingPayment.other)}</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section className="consultation-signatures">
            <div>
              <div className="signature-line" />
              <div className="signature-label">Cashier Signature</div>
            </div>
            <div>
              <div className="signature-line" />
              <div className="signature-label">Patient Signature</div>
            </div>
          </section>
        </section>
      )}
    </div>
  );
};
