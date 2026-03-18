import React, { useMemo, useState } from 'react';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../components/AuthProvider';
import { EditIcon, FilterXIcon, PowerIcon, TrashIcon } from '../components/UiIcons';

type MembershipType = { id: string; name: string; code: string; durationDays: number; basePrice: number; familyLimit?: number; status: 'Active' | 'Inactive' };
type MembershipCard = { id: string; patient: string; typeId: string; typeName: string; issueDate: string; expiry: string; benefits: string[]; linked: string[]; status: 'Active' | 'Inactive' };

const initialTypes: MembershipType[] = [
  { id: 'MT-01', name: 'Diamond', code: 'DIAMOND', durationDays: 365, basePrice: 35000, familyLimit: 4, status: 'Active' },
  { id: 'MT-02', name: 'Student', code: 'STD', durationDays: 180, basePrice: 12000, familyLimit: 1, status: 'Inactive' },
];

const initialCards: MembershipCard[] = [
  { id: 'MB-9001', patient: 'Ali Raza', typeId: 'MT-01', typeName: 'Diamond', issueDate: '2026-01-01', expiry: '2027-01-01', benefits: ['10% on appointments', 'Priority booking', '1 free follow-up'], linked: ['Appointments', 'Services'], status: 'Active' },
  { id: 'MB-9002', patient: 'Sara Malik', typeId: 'MT-01', typeName: 'Diamond', issueDate: '2026-01-05', expiry: '2027-01-05', benefits: ['15% on packages', 'Free product delivery'], linked: ['Appointments', 'Services', 'Products'], status: 'Active' },
];

export const ServicesMembershipPage: React.FC = () => {
  const { user } = useAuth();
  const isReadOnly = user?.role === 'fdo';
  const [types, setTypes] = useState<MembershipType[]>(initialTypes);
  const [cards, setCards] = useState<MembershipCard[]>(initialCards);
  const [filter, setFilter] = useState('');
  const [cardFilter, setCardFilter] = useState('');
  const [form, setForm] = useState({ name: '', code: '', durationDays: 365, basePrice: 0, familyLimit: '', status: 'Active' as MembershipType['status'], editingId: '' });
  const [issueForm, setIssueForm] = useState({ patient: '', typeId: '', benefits: '10% on appointments', linked: 'Appointments, Services' });

  const filteredTypes = useMemo(() => types.filter((type) => `${type.name} ${type.code}`.toLowerCase().includes(filter.toLowerCase())), [types, filter]);
  const filteredCards = useMemo(() => cards.filter((card) => `${card.patient} ${card.typeName} ${card.id}`.toLowerCase().includes(cardFilter.toLowerCase())), [cards, cardFilter]);
  const activeTypes = useMemo(() => types.filter((type) => type.status === 'Active'), [types]);

  const saveType = () => {
    if (isReadOnly || !form.name.trim() || !form.code.trim()) return;
    const payload = { name: form.name.trim(), code: form.code.trim().toUpperCase(), durationDays: Number(form.durationDays) || 0, basePrice: Number(form.basePrice) || 0, familyLimit: form.familyLimit ? Number(form.familyLimit) : undefined, status: form.status };
    if (form.editingId) {
      setTypes((rows) => rows.map((type) => type.id === form.editingId ? { ...type, ...payload } : type));
    } else {
      setTypes((rows) => [{ id: `MT-${Math.floor(1000 + Math.random() * 9000)}`, ...payload }, ...rows]);
    }
    setForm({ name: '', code: '', durationDays: 365, basePrice: 0, familyLimit: '', status: 'Active', editingId: '' });
  };

  const issueMembership = () => {
    if (isReadOnly || !issueForm.patient.trim() || !issueForm.typeId) return;
    const selectedType = types.find((type) => type.id === issueForm.typeId);
    if (!selectedType) return;
    const issueDate = new Date().toISOString().slice(0, 10);
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + selectedType.durationDays);
    setCards((rows) => [{
      id: `MB-${Math.floor(1000 + Math.random() * 9000)}`,
      patient: issueForm.patient.trim(),
      typeId: selectedType.id,
      typeName: selectedType.name,
      issueDate,
      expiry: expiryDate.toISOString().slice(0, 10),
      benefits: issueForm.benefits.split(',').map((item) => item.trim()).filter(Boolean),
      linked: issueForm.linked.split(',').map((item) => item.trim()).filter(Boolean),
      status: 'Active',
    }, ...rows]);
    setIssueForm({ patient: '', typeId: '', benefits: '10% on appointments', linked: 'Appointments, Services' });
  };

  return (
    <div className="stack">
      <div className="panel section">
        <div className="section__header"><div><div className="section__title">Membership Types</div><div className="muted">Create, edit, activate, and deactivate membership plans.</div></div><button className="pill" onClick={saveType} disabled={isReadOnly}>{form.editingId ? 'Update Type' : 'Save Type'}</button></div>
        <div className="form-grid">
          <input className="input" placeholder="Name" value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} disabled={isReadOnly} />
          <input className="input" placeholder="Code" value={form.code} onChange={(e) => setForm((current) => ({ ...current, code: e.target.value }))} disabled={isReadOnly} />
          <input className="input" type="number" min="0" placeholder="Duration (days)" value={form.durationDays} onChange={(e) => setForm((current) => ({ ...current, durationDays: Number(e.target.value) }))} disabled={isReadOnly} />
          <input className="input" type="number" min="0" placeholder="Base Price" value={form.basePrice} onChange={(e) => setForm((current) => ({ ...current, basePrice: Number(e.target.value) }))} disabled={isReadOnly} />
          <input className="input" type="number" min="0" placeholder="Family Limit" value={form.familyLimit} onChange={(e) => setForm((current) => ({ ...current, familyLimit: e.target.value }))} disabled={isReadOnly} />
          <select className="input" value={form.status} onChange={(e) => setForm((current) => ({ ...current, status: e.target.value as MembershipType['status'] }))} disabled={isReadOnly}><option value="Active">Active</option><option value="Inactive">Inactive</option></select>
        </div>
      </div>

      <div className="panel section">
        <div className="section__header"><div><div className="section__title">Membership Type List</div><div className="muted">Search, edit, delete, and change active status.</div></div><div className="filter-bar"><input className="input" placeholder="Search name or code" value={filter} onChange={(e) => setFilter(e.target.value)} /><button className="icon-btn" onClick={() => setFilter('')} aria-label="Clear filter" title="Clear filter"><FilterXIcon /></button></div></div>
        <div className="table-wrapper"><table className="table table--compact table--sticky-actions"><thead><tr><th>Name</th><th>Code</th><th>Duration</th><th>Base Price</th><th>Family Limit</th><th>Status</th><th>Actions</th></tr></thead><tbody>
          {filteredTypes.map((type) => <tr key={type.id}><td>{type.name}</td><td className="muted small">{type.code}</td><td>{type.durationDays}d</td><td>PKR {type.basePrice.toLocaleString()}</td><td>{type.familyLimit ?? '-'}</td><td><div className="action-stack"><StatusBadge status={type.status} /><label className="toggle"><input type="checkbox" checked={type.status === 'Active'} onChange={() => setTypes((rows) => rows.map((row) => row.id === type.id ? { ...row, status: row.status === 'Active' ? 'Inactive' : 'Active' } : row))} disabled={isReadOnly} /><span className="toggle__slider" /></label></div></td><td><div className="action-stack"><button className="icon-btn" onClick={() => setForm({ name: type.name, code: type.code, durationDays: type.durationDays, basePrice: type.basePrice, familyLimit: type.familyLimit ? String(type.familyLimit) : '', status: type.status, editingId: type.id })} disabled={isReadOnly} aria-label="Edit" title="Edit"><EditIcon /></button><button className="icon-btn" onClick={() => setTypes((rows) => rows.filter((row) => row.id !== type.id))} disabled={isReadOnly} aria-label="Delete" title="Delete"><TrashIcon /></button></div></td></tr>)}
        </tbody></table></div>
      </div>

      <div className="panel section">
        <div className="section__header"><div><div className="section__title">Issue Membership</div><div className="muted">Create live membership cards from active plans.</div></div><button className="pill" onClick={issueMembership} disabled={isReadOnly || activeTypes.length === 0}>Issue Membership</button></div>
        <div className="form-grid">
          <input className="input" placeholder="Patient Name" value={issueForm.patient} onChange={(e) => setIssueForm((current) => ({ ...current, patient: e.target.value }))} disabled={isReadOnly} />
          <select className="input" value={issueForm.typeId} onChange={(e) => setIssueForm((current) => ({ ...current, typeId: e.target.value }))} disabled={isReadOnly || activeTypes.length === 0}><option value="">-- Select Active Membership --</option>{activeTypes.map((type) => <option key={type.id} value={type.id}>{type.name} - PKR {type.basePrice.toLocaleString()}</option>)}</select>
          <input className="input" placeholder="Benefits (comma separated)" value={issueForm.benefits} onChange={(e) => setIssueForm((current) => ({ ...current, benefits: e.target.value }))} disabled={isReadOnly} />
          <input className="input" placeholder="Linked modules (comma separated)" value={issueForm.linked} onChange={(e) => setIssueForm((current) => ({ ...current, linked: e.target.value }))} disabled={isReadOnly} />
        </div>
      </div>

      <div className="panel section">
        <div className="section__header"><div><div className="section__title">Membership Cards</div><div className="muted">Issued membership history with active/inactive controls.</div></div><div className="filter-bar"><input className="input" placeholder="Search patient, type, or ID" value={cardFilter} onChange={(e) => setCardFilter(e.target.value)} /><button className="icon-btn" onClick={() => setCardFilter('')} aria-label="Clear filter" title="Clear filter"><FilterXIcon /></button></div></div>
        <div className="card-grid">
          {filteredCards.map((card) => <div key={card.id} className="membership-card panel"><div className="membership-card__header"><div><div className="strong">{card.id}</div><div className="muted small">{card.patient} - {card.typeName}</div></div><StatusBadge status={card.status} /></div><div className="muted small">Issued: {card.issueDate}</div><div className="muted small">Expiry: {card.expiry}</div><div className="muted small">Benefits:</div><ul className="list">{card.benefits.map((benefit) => <li key={benefit}>{benefit}</li>)}</ul><div className="muted small">Linked with: {card.linked.join(', ')}</div><div className="action-stack"><button className="icon-btn" onClick={() => setCards((rows) => rows.map((row) => row.id === card.id ? { ...row, status: row.status === 'Active' ? 'Inactive' : 'Active' } : row))} disabled={isReadOnly} aria-label={card.status === 'Active' ? 'Set inactive' : 'Set active'} title={card.status === 'Active' ? 'Set inactive' : 'Set active'}><PowerIcon /></button><button className="icon-btn" onClick={() => setCards((rows) => rows.filter((row) => row.id !== card.id))} disabled={isReadOnly} aria-label="Delete card" title="Delete card"><TrashIcon /></button></div></div>)}
          {filteredCards.length === 0 && <div className="muted small">No membership cards found.</div>}
        </div>
      </div>
    </div>
  );
};
