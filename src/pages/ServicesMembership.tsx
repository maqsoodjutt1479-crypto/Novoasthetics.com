import React, { useMemo, useState } from 'react';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../components/AuthProvider';

type MembershipType = {
  id: string;
  name: string;
  code: string;
  durationDays: number;
  basePrice: number;
  familyLimit?: number;
  status: 'Active' | 'Inactive';
};

const sampleCards = [
  {
    id: 'MB-9001',
    patient: 'Ali Raza',
    issueDate: '2026-01-01',
    expiry: '2027-01-01',
    benefits: ['10% on appointments', 'Priority booking', '1 free follow-up'],
    linked: ['Appointments', 'Services'],
  },
  {
    id: 'MB-9002',
    patient: 'Sara Malik',
    issueDate: '2026-01-05',
    expiry: '2027-01-05',
    benefits: ['15% on packages', 'Free product delivery'],
    linked: ['Appointments', 'Services', 'Products'],
  },
];

const initialTypes: MembershipType[] = [
  { id: 'MT-01', name: 'Diamond', code: 'DIAMOND', durationDays: 365, basePrice: 35000, familyLimit: 4, status: 'Active' },
  { id: 'MT-02', name: 'Student', code: 'STD', durationDays: 180, basePrice: 12000, familyLimit: 1, status: 'Inactive' },
];

export const ServicesMembershipPage: React.FC = () => {
  const { user } = useAuth();
  const isReadOnly = user?.role === 'fdo';
  const [types, setTypes] = useState<MembershipType[]>(initialTypes);
  const [filter, setFilter] = useState('');
  const [form, setForm] = useState({
    name: '',
    code: '',
    durationDays: 365,
    basePrice: 0,
    familyLimit: '',
    status: 'Active' as MembershipType['status'],
    editingId: '' as string,
  });

  const filtered = useMemo(
    () =>
      types.filter(
        (t) =>
          t.name.toLowerCase().includes(filter.toLowerCase()) ||
          t.code.toLowerCase().includes(filter.toLowerCase())
      ),
    [types, filter]
  );

  const handleSave = () => {
    if (isReadOnly) return;
    if (!form.name || !form.code) return;
    if (form.editingId) {
      setTypes((prev) =>
        prev.map((t) =>
          t.id === form.editingId
            ? {
                ...t,
                name: form.name,
                code: form.code,
                durationDays: Number(form.durationDays) || 0,
                basePrice: Number(form.basePrice) || 0,
                familyLimit: form.familyLimit ? Number(form.familyLimit) : undefined,
                status: form.status,
              }
            : t
        )
      );
    } else {
      const id = `MT-${Math.floor(1000 + Math.random() * 9000)}`;
      setTypes((prev) => [
        {
          id,
          name: form.name,
          code: form.code,
          durationDays: Number(form.durationDays) || 0,
          basePrice: Number(form.basePrice) || 0,
          familyLimit: form.familyLimit ? Number(form.familyLimit) : undefined,
          status: form.status,
        },
        ...prev,
      ]);
    }
    setForm({
      name: '',
      code: '',
      durationDays: 365,
      basePrice: 0,
      familyLimit: '',
      status: 'Active',
      editingId: '',
    });
  };

  const handleEdit = (t: MembershipType) => {
    if (isReadOnly) return;
    setForm({
      name: t.name,
      code: t.code,
      durationDays: t.durationDays,
      basePrice: t.basePrice,
      familyLimit: t.familyLimit ? String(t.familyLimit) : '',
      status: t.status,
      editingId: t.id,
    });
  };

  const handleDelete = (id: string) => {
    if (isReadOnly) return;
    setTypes((prev) => prev.filter((t) => t.id !== id));
  };

  const handleToggleStatus = (id: string) => {
    if (isReadOnly) return;
    setTypes((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: t.status === 'Active' ? 'Inactive' : 'Active' } : t))
    );
  };

  return (
    <div className="stack">
      <div className="panel section">
        <div className="section__header">
          <div>
            <div className="section__title">Add Membership Type</div>
            <div className="muted">Naya type create karein (Student / Diamond etc.)</div>
          </div>
          <div className="pill pill--ghost">All Branches</div>
        </div>
        <div className="form-grid">
          <input
            className="input"
            placeholder="Name *"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            disabled={isReadOnly}
          />
          <input
            className="input"
            placeholder="Code *"
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
            disabled={isReadOnly}
          />
          <input
            className="input"
            type="number"
            min="0"
            placeholder="Duration (days)"
            value={form.durationDays}
            onChange={(e) => setForm((f) => ({ ...f, durationDays: Number(e.target.value) }))}
            disabled={isReadOnly}
          />
          <input
            className="input"
            type="number"
            min="0"
            placeholder="Base Price"
            value={form.basePrice}
            onChange={(e) => setForm((f) => ({ ...f, basePrice: Number(e.target.value) }))}
            disabled={isReadOnly}
          />
          <input
            className="input"
            type="number"
            min="0"
            placeholder="Family Limit (optional)"
            value={form.familyLimit}
            onChange={(e) => setForm((f) => ({ ...f, familyLimit: e.target.value }))}
            disabled={isReadOnly}
          />
          <select
            className="input"
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as MembershipType['status'] }))}
            disabled={isReadOnly}
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
          <button className="pill" onClick={handleSave} disabled={isReadOnly}>
            {form.editingId ? 'Update Type' : 'Save Type'}
          </button>
        </div>
      </div>

      <div className="panel section">
        <div className="section__header">
          <div>
            <div className="section__title">Membership Type List</div>
            <div className="muted">Edit / Activate / Delete / Family Limit</div>
          </div>
          <div className="filter-bar">
          <input
            className="input"
            placeholder="Search by name or code..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
            <button className="pill pill--ghost" onClick={() => setFilter('')}>
              Clear
            </button>
          </div>
        </div>
        <div className="table-wrapper">
          <table className="table table--compact table--sticky-actions">
            <thead>
              <tr>
                <th>Name</th>
                <th>Code</th>
                <th>Duration</th>
                <th>Base Price</th>
                <th>Family Limit</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id}>
                  <td>
                    <div className="strong">{t.name}</div>
                  </td>
                  <td className="muted small">{t.code}</td>
                  <td>{t.durationDays}d</td>
                  <td>PKR {t.basePrice.toLocaleString()}</td>
                  <td className="muted small">{t.familyLimit ?? '-'}</td>
                  <td>
                    <div className="action-stack">
                      <label className="toggle" title="Activate/Deactivate">
                        <input
                          type="checkbox"
                          checked={t.status === 'Active'}
                          onChange={() => handleToggleStatus(t.id)}
                          disabled={isReadOnly}
                        />
                        <span className="toggle__slider" />
                      </label>
                      <StatusBadge status={t.status} />
                    </div>
                  </td>
                  <td className="actions-cell">
                    <div className="action-stack">
                      <button className="icon-btn" title="Edit" onClick={() => handleEdit(t)} disabled={isReadOnly}>
                        Edit
                      </button>
                      <button
                        className="icon-btn"
                        title={t.status === 'Active' ? 'Deactivate' : 'Activate'}
                        onClick={() => handleToggleStatus(t.id)}
                        disabled={isReadOnly}
                      >
                        {t.status === 'Active' ? 'Deactivate' : 'Activate'}
                      </button>
                      <button className="icon-btn" title="Delete" onClick={() => handleDelete(t.id)} disabled={isReadOnly}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel section">
        <div className="section__header">
          <div>
            <div className="section__title">Membership Cards</div>
            <div className="muted">Link benefits with appointments & services</div>
          </div>
          <button className="pill" disabled={isReadOnly}>
            + Issue Membership
          </button>
        </div>
        <div className="card-grid">
          {sampleCards.map((m) => (
            <div key={m.id} className="membership-card panel">
              <div className="membership-card__header">
                <div>
                  <div className="strong">{m.id}</div>
                  <div className="muted small">{m.patient}</div>
                </div>
                <div className="tag">1-Year Valid</div>
              </div>
              <div className="muted small">Issued: {m.issueDate}</div>
              <div className="muted small">Expiry: {m.expiry}</div>
              <div className="muted small">Benefits / Discounts:</div>
              <ul className="list">
                {m.benefits.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
              <div className="muted small">Linked with: {m.linked.join(', ')}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
