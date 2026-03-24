import React, { useEffect, useMemo, useState } from 'react';
import { StatusBadge } from '../components/StatusBadge';
import { usePayments, type Payment, type PaymentMethod } from '../store/usePayments';
import logo from '../assets/novo-logo.svg';
import { useAuth } from '../components/AuthProvider';
import { DownloadIcon, FilterXIcon, PlusIcon, TrashIcon } from '../components/UiIcons';

type RangeFilter = 'all' | 'today' | 'week' | 'month';
type HistoryView = 'day' | 'week' | 'month';

const getReceivedAmount = (payment: Payment) =>
  (payment.cash || 0) + (payment.card || 0) + (payment.bank || 0) + (payment.other || 0);

const normalizeDate = (raw: string) => raw.replace('T', ' ');
const parseDate = (raw: string) => new Date(normalizeDate(raw));
const formatMoney = (value?: number) => `PKR ${Math.round(value ?? 0).toLocaleString()}`;

const getDiscountValue = (discount: string | undefined, amount: number) => {
  const raw = (discount || '').trim();
  if (!raw) return 0;
  const numeric = Number(raw.replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(numeric)) return 0;
  if (/%\s*$/.test(raw)) {
    return Math.round((amount * numeric) / 100);
  }
  return Math.round(numeric);
};

const paymentStatus = (payment: Payment): 'Paid' | 'Partial' | 'Unpaid' => {
  const settled = getReceivedAmount(payment);
  if (settled >= payment.amount) return 'Paid';
  if (settled > 0) return 'Partial';
  return 'Unpaid';
};

const getWeekKey = (date: Date) => {
  const ref = new Date(date);
  const diffToMonday = (ref.getDay() + 6) % 7;
  ref.setDate(ref.getDate() - diffToMonday);
  return ref.toISOString().slice(0, 10);
};

const stripReferenceSuffix = (value: string) => value.replace(/\s*\([^()]+\)\s*$/, '').trim();

const getReceiptItems = (payment: Payment) => {
  const rawSource = stripReferenceSuffix(payment.source || '');
  const normalized = rawSource
    .replace(/^Appointment\s*-\s*/i, '')
    .replace(/^Product (Sale|Balance)\s*-\s*/i, '')
    .replace(/^Manual Entry\s*-\s*/i, '')
    .trim();

  const sourceItems = normalized
    .split(/\s+\+\s+|,\s*/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (sourceItems.length > 0) {
    return sourceItems;
  }

  return (payment.notes || '')
    .split(/\s+\+\s+|,\s*/)
    .map((item) => item.trim())
    .filter(Boolean);
};

export const PaymentsPage: React.FC = () => {
  const { payments, error, hydrate, addPayment, removePayment } = usePayments();
  const { user } = useAuth();
  const canManagePayments = user?.role === 'admin' || user?.role === 'fdo';
  const canDeletePayments = user?.role === 'admin';
  const isReadOnly = !canManagePayments;
  const [range, setRange] = useState<RangeFilter>('all');
  const [historyView, setHistoryView] = useState<HistoryView>('day');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [patientQuery, setPatientQuery] = useState('');
  const [sourceQuery, setSourceQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState<'All' | PaymentMethod>('All');
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
    source: '',
    notes: '',
  });

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!printingPayment) return;
    const handleAfterPrint = () => setPrintingPayment(null);
    window.addEventListener('afterprint', handleAfterPrint);
    window.print();
    return () => {
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, [printingPayment]);

  const filtered = useMemo(() => {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const weekKey = getWeekKey(now);
    const monthKey = now.toISOString().slice(0, 7);

    return payments.filter((payment) => {
      const payDate = parseDate(payment.date);
      const dateKey = payDate.toISOString().slice(0, 10);
      const inQuickRange =
        range === 'all'
          ? true
          : range === 'today'
          ? dateKey === today
          : range === 'week'
          ? getWeekKey(payDate) === weekKey
          : payDate.toISOString().slice(0, 7) === monthKey;
      const fromDate = from ? parseDate(`${from} 00:00:00`) : null;
      const toDate = to ? parseDate(`${to} 23:59:59`) : null;
      const inManualRange = (!fromDate || payDate >= fromDate) && (!toDate || payDate <= toDate);
      const query = patientQuery.trim().toLowerCase();
      const matchesPatient =
        !query ||
        payment.patientId.toLowerCase().includes(query) ||
        payment.patientName.toLowerCase().includes(query);
      const sourceText = `${payment.source} ${payment.notes || ''}`.toLowerCase();
      const matchesSource = !sourceQuery.trim() || sourceText.includes(sourceQuery.trim().toLowerCase());
      const matchesMethod = methodFilter === 'All' || payment.method === methodFilter;
      return inQuickRange && inManualRange && matchesPatient && matchesSource && matchesMethod;
    });
  }, [payments, range, from, to, patientQuery, sourceQuery, methodFilter]);

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, payment) => {
        const received = getReceivedAmount(payment);
        acc.amount += payment.amount;
        acc.received += received;
        acc.cash += payment.cash;
        acc.card += payment.card;
        acc.bank += payment.bank;
        acc.other += payment.other;
        acc.balance += Math.max(0, payment.amount - received);
        return acc;
      },
      { amount: 0, received: 0, cash: 0, card: 0, bank: 0, other: 0, balance: 0 }
    );
  }, [filtered]);

  const historyRows = useMemo(() => {
    const grouped = new Map<
      string,
      {
        label: string;
        count: number;
        amount: number;
        received: number;
        balance: number;
      }
    >();

    filtered.forEach((payment) => {
      const date = parseDate(payment.date);
      const key =
        historyView === 'day'
          ? date.toISOString().slice(0, 10)
          : historyView === 'week'
          ? getWeekKey(date)
          : date.toISOString().slice(0, 7);
      const label =
        historyView === 'day'
          ? key
          : historyView === 'week'
          ? `Week of ${key}`
          : new Date(`${key}-01T00:00:00`).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      const received = getReceivedAmount(payment);
      const existing = grouped.get(key) ?? { label, count: 0, amount: 0, received: 0, balance: 0 };
      existing.count += 1;
      existing.amount += payment.amount;
      existing.received += received;
      existing.balance += Math.max(0, payment.amount - received);
      grouped.set(key, existing);
    });

    return Array.from(grouped.entries())
      .sort((a, b) => (a[0] > b[0] ? -1 : 1))
      .map(([, value]) => value);
  }, [filtered, historyView]);

  const handleAdd = async () => {
    if (isReadOnly) return;
    if (!form.patientName.trim()) return;
    const amount = Number(form.amount) || 0;
    const cash = Number(form.cash) || 0;
    const card = Number(form.card) || 0;
    const bank = Number(form.bank) || 0;
    const other = Number(form.other) || 0;
    const created = await addPayment({
      date: normalizeDate(form.date || new Date().toISOString().slice(0, 16)),
      patientId: form.patientId.trim() || 'N/A',
      patientName: form.patientName.trim(),
      method: form.method,
      amount,
      discount: '0%',
      notes: form.notes.trim() || undefined,
      cash,
      card,
      bank,
      other,
      source: form.source.trim() || 'Manual Entry',
    });
    if (!created) return;
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
      source: '',
      notes: '',
    });
  };

  const handleExport = () => {
    const headers = [
      'Date',
      'Patient ID',
      'Patient Name',
      'Method',
      'Status',
      'Amount',
      'Received',
      'Cash',
      'Card',
      'Bank',
      'Other',
      'Source',
      'Notes',
      'Ref ID',
    ];
    const csv = [
      headers.join(','),
      ...filtered.map((payment) =>
        [
          payment.date,
          payment.patientId,
          payment.patientName,
          payment.method,
          paymentStatus(payment),
          payment.amount,
          getReceivedAmount(payment),
          payment.cash,
          payment.card,
          payment.bank,
          payment.other,
          (payment.source || '').replace(/,/g, ';'),
          (payment.notes || '').replace(/,/g, ';'),
          payment.id,
        ].join(',')
      ),
      [
        'TOTALS',
        '',
        '',
        '',
        '',
        totals.amount,
        totals.received,
        totals.cash,
        totals.card,
        totals.bank,
        totals.other,
        '',
        '',
        '',
      ].join(','),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'payments.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async (payment: Payment) => {
    if (!canDeletePayments) return;
    if (!window.confirm(`Delete payment ${payment.id} for ${payment.patientName}?`)) return;
    await removePayment(payment.id);
  };

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
              Revenue filtered by range, patient, method, service/product source, and notes.
            </div>
          </div>
          <div className="filter-bar">
            {(['all', 'today', 'week', 'month'] as const).map((value) => (
              <button
                key={value}
                type="button"
                className={`pill ${range === value ? '' : 'pill--ghost'}`}
                onClick={() => setRange(value)}
              >
                {value === 'all' ? 'All Time' : value === 'today' ? 'Today' : value === 'week' ? 'This Week' : 'This Month'}
              </button>
            ))}
          </div>
        </div>

        <div className="card-grid" style={{ marginBottom: 14 }}>
          <div className="stat-card panel">
            <div className="stat-card__label">Billed Revenue</div>
            <div className="stat-card__value">{formatMoney(totals.amount)}</div>
            <div className="stat-card__trend">Invoices in current filter</div>
          </div>
          <div className="stat-card panel">
            <div className="stat-card__label">Received</div>
            <div className="stat-card__value">{formatMoney(totals.received)}</div>
            <div className="stat-card__trend success">Cash, card, bank, and other combined</div>
          </div>
          <div className="stat-card panel">
            <div className="stat-card__label">Outstanding</div>
            <div className="stat-card__value">{formatMoney(totals.balance)}</div>
            <div className="stat-card__trend warning">Remaining to collect</div>
          </div>
          <div className="stat-card panel">
            <div className="stat-card__label">Entries</div>
            <div className="stat-card__value">{filtered.length}</div>
            <div className="stat-card__trend">Visible payment records</div>
          </div>
        </div>

        <div className="filter-bar">
          <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
          <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
          <input
            className="input"
            placeholder="Patient ID or name"
            value={patientQuery}
            onChange={(e) => setPatientQuery(e.target.value)}
          />
          <input
            className="input"
            placeholder="Source / treatment / product / notes"
            value={sourceQuery}
            onChange={(e) => setSourceQuery(e.target.value)}
          />
          <select
            className="input"
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value as 'All' | PaymentMethod)}
          >
            <option value="All">All Methods</option>
            <option value="CASH">Cash</option>
            <option value="CARD">Card</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
            <option value="OTHER">Other</option>
          </select>
          <button className="icon-btn" type="button" onClick={handleExport} aria-label="Export CSV" title="Export CSV">
            <DownloadIcon />
          </button>
          <button
            className="icon-btn"
            type="button"
            onClick={() => {
              setRange('all');
              setFrom('');
              setTo('');
              setPatientQuery('');
              setSourceQuery('');
              setMethodFilter('All');
            }}
            aria-label="Clear filters"
            title="Clear filters"
          >
            <FilterXIcon />
          </button>
        </div>
        {error && <div className="muted small" style={{ marginTop: 10, color: '#b91c1c' }}>{error}</div>}
      </div>

      <div className="panel section">
        <div className="section__header">
          <div>
            <div className="section__title">Add Payment</div>
            <div className="muted">Source should clearly mention the service, treatment, or product sold.</div>
          </div>
          <button className="pill" onClick={handleAdd} disabled={isReadOnly}>
            <PlusIcon /> Add Payment
          </button>
        </div>
        <div className="form-grid">
          <input
            type="datetime-local"
            className="input"
            value={form.date}
            onChange={(e) => setForm((current) => ({ ...current, date: e.target.value }))}
            disabled={isReadOnly}
          />
          <input
            className="input"
            placeholder="Patient ID"
            value={form.patientId}
            onChange={(e) => setForm((current) => ({ ...current, patientId: e.target.value }))}
            disabled={isReadOnly}
          />
          <input
            className="input"
            placeholder="Patient Name"
            value={form.patientName}
            onChange={(e) => setForm((current) => ({ ...current, patientName: e.target.value }))}
            disabled={isReadOnly}
          />
          <select
            className="input"
            value={form.method}
            onChange={(e) => setForm((current) => ({ ...current, method: e.target.value as PaymentMethod }))}
            disabled={isReadOnly}
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
            placeholder="Bill Amount"
            value={form.amount}
            onChange={(e) => setForm((current) => ({ ...current, amount: e.target.value }))}
            disabled={isReadOnly}
          />
          <input
            className="input"
            type="number"
            min="0"
            placeholder="Cash Received"
            value={form.cash}
            onChange={(e) => setForm((current) => ({ ...current, cash: e.target.value }))}
            disabled={isReadOnly}
          />
          <input
            className="input"
            type="number"
            min="0"
            placeholder="Card Received"
            value={form.card}
            onChange={(e) => setForm((current) => ({ ...current, card: e.target.value }))}
            disabled={isReadOnly}
          />
          <input
            className="input"
            type="number"
            min="0"
            placeholder="Bank Received"
            value={form.bank}
            onChange={(e) => setForm((current) => ({ ...current, bank: e.target.value }))}
            disabled={isReadOnly}
          />
          <input
            className="input"
            type="number"
            min="0"
            placeholder="Other Received"
            value={form.other}
            onChange={(e) => setForm((current) => ({ ...current, other: e.target.value }))}
            disabled={isReadOnly}
          />
          <input
            className="input"
            placeholder="Source / Treatment / Product"
            value={form.source}
            onChange={(e) => setForm((current) => ({ ...current, source: e.target.value }))}
            disabled={isReadOnly}
          />
          <input
            className="input"
            placeholder="Notes"
            value={form.notes}
            onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))}
            disabled={isReadOnly}
          />
        </div>
      </div>

      <div className="panel section">
        <div className="section__header">
          <div>
            <div className="section__title">Sales / Revenue History</div>
            <div className="muted">Grouped revenue trends for the current filter.</div>
          </div>
          <div className="filter-bar">
            {(['day', 'week', 'month'] as const).map((value) => (
              <button
                key={value}
                type="button"
                className={`pill ${historyView === value ? '' : 'pill--ghost'}`}
                onClick={() => setHistoryView(value)}
              >
                {value === 'day' ? 'Daily' : value === 'week' ? 'Weekly' : 'Monthly'}
              </button>
            ))}
          </div>
        </div>
        <div className="table-wrapper">
          <table className="table table--compact">
            <thead>
              <tr>
                <th>Period</th>
                <th>Entries</th>
                <th>Billed</th>
                <th>Received</th>
                <th>Outstanding</th>
              </tr>
            </thead>
            <tbody>
              {historyRows.map((row) => (
                <tr key={row.label}>
                  <td>{row.label}</td>
                  <td>{row.count}</td>
                  <td>{formatMoney(row.amount)}</td>
                  <td>{formatMoney(row.received)}</td>
                  <td>{formatMoney(row.balance)}</td>
                </tr>
              ))}
              {historyRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="muted small" style={{ textAlign: 'center' }}>
                    No revenue history for the current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel section">
        <div className="table-wrapper">
          <table className="table table--compact">
            <thead>
              <tr>
                <th>Date/Time</th>
                <th>Patient</th>
                <th>Method</th>
                <th>Status</th>
                <th>Billed</th>
                <th>Received</th>
                <th>Balance</th>
                <th>Source</th>
                <th>Notes</th>
                <th>Ref ID</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((payment) => {
                const received = getReceivedAmount(payment);
                return (
                  <tr key={payment.id}>
                    <td>{payment.date}</td>
                    <td>
                      <div>{payment.patientName}</div>
                      <div className="muted small">{payment.patientId}</div>
                    </td>
                    <td>{payment.method}</td>
                    <td>
                      <StatusBadge status={paymentStatus(payment)} />
                    </td>
                    <td>{formatMoney(payment.amount)}</td>
                    <td>{formatMoney(received)}</td>
                    <td>{formatMoney(Math.max(0, payment.amount - received))}</td>
                    <td className="muted small">{payment.source}</td>
                    <td className="muted small">{payment.notes || '-'}</td>
                    <td className="muted small">{payment.id}</td>
                    <td className="actions-cell">
                      <div className="action-stack">
                      <button className="icon-btn" title="Print slip" aria-label="Print slip" onClick={() => setPrintingPayment(payment)}>
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path
                            d="M7 7V3h10v4H7zm10 2h1a3 3 0 0 1 3 3v5h-4v4H7v-4H3v-5a3 3 0 0 1 3-3h11zm-2 10v-4H9v4h6zm4-2h2v-5a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v5h2v-4h8v4h4z"
                            fill="currentColor"
                          />
                        </svg>
                      </button>
                      {canDeletePayments && (
                        <button className="icon-btn" title="Delete payment" aria-label="Delete payment" onClick={() => void handleDelete(payment)}>
                          <TrashIcon />
                        </button>
                      )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length > 0 && (
                <tr>
                  <td className="strong">Totals</td>
                  <td />
                  <td />
                  <td />
                  <td>{formatMoney(totals.amount)}</td>
                  <td>{formatMoney(totals.received)}</td>
                  <td>{formatMoney(totals.balance)}</td>
                  <td />
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
          {(() => {
            const receiptItems = getReceiptItems(printingPayment);
            return (
              <>
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
            <div className="consultation-field consultation-field--wide">
              <span>Source</span>
              <div>{printingPayment.source}</div>
            </div>
            <div className="consultation-field">
              <span>Reference</span>
              <div>{printingPayment.id}</div>
            </div>
            <div className="consultation-field consultation-field--wide">
              <span>Notes</span>
              <div>{printingPayment.notes || '-'}</div>
            </div>
          </section>

          <section className="consultation-block">
            <div className="consultation-block__title">Payment Breakdown</div>
            <table className="consultation-table">
              <thead>
                <tr>
                  <th>Total Amount</th>
                  <th>Discount</th>
                  <th>Payable</th>
                  <th>Cash</th>
                  <th>Card</th>
                  <th>Bank</th>
                  <th>Other</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  {(() => {
                    const baseAmount = printingPayment.amount;
                    const discountValue = getDiscountValue(printingPayment.discount, baseAmount);
                    const payableAmount = Math.max(0, baseAmount - discountValue);
                    const discountLabel = (printingPayment.discount || '0%').trim() || '0%';
                    return (
                      <>
                        <td>{formatMoney(baseAmount)}</td>
                        <td>{`${discountLabel} (${formatMoney(discountValue)})`}</td>
                        <td>{formatMoney(payableAmount)}</td>
                        <td>{formatMoney(printingPayment.cash)}</td>
                      </>
                    );
                  })()}
                  <td>{formatMoney(printingPayment.card)}</td>
                  <td>{formatMoney(printingPayment.bank)}</td>
                  <td>{formatMoney(printingPayment.other)}</td>
                </tr>
              </tbody>
            </table>
          </section>

          {receiptItems.length > 0 && (
            <section className="consultation-block">
              <div className="consultation-block__title">Treatment / Product Details</div>
              <table className="consultation-table">
                <thead>
                  <tr>
                    <th>Item</th>
                  </tr>
                </thead>
                <tbody>
                  {receiptItems.map((item) => (
                    <tr key={item}>
                      <td>{item}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

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
              </>
            );
          })()}
        </section>
      )}
    </div>
  );
};
