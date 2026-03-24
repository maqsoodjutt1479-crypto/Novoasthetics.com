import React, { useEffect, useMemo, useState } from 'react';
import { useStaff, type StaffRole } from '../store/useStaff';
import { hashPassword } from '../utils/password';
import { useAuth } from '../components/AuthProvider';
import { EditIcon, FilterXIcon, TrashIcon } from '../components/UiIcons';

export const StaffPage: React.FC = () => {
  const { staff, error, hydrate, addStaff, updateStaff, removeStaff } = useStaff();
  const { user } = useAuth();
  const canManageStaff = user?.role === 'admin' || user?.role === 'fdo';
  const isReadOnly = !canManageStaff;
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<'All' | StaffRole>('All');
  const [editingId, setEditingId] = useState('');
  const [form, setForm] = useState({
    name: '',
    role: 'Doctor' as StaffRole,
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    specialty: '',
    branch: 'Main',
    status: 'Active' as 'Active' | 'Inactive',
  });
  const [formError, setFormError] = useState('');

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const filtered = useMemo(
    () =>
      staff.filter((s) => {
        const matchSearch =
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          s.phone.includes(search) ||
          s.email.toLowerCase().includes(search.toLowerCase()) ||
          (s.specialty || '').toLowerCase().includes(search.toLowerCase());
        const matchRole = filterRole === 'All' || s.role === filterRole;
        return matchSearch && matchRole;
      }),
    [staff, search, filterRole]
  );

  const resetForm = () => {
    setEditingId('');
    setForm({
      name: '',
      role: 'Doctor',
      phone: '',
      email: '',
      password: '',
      confirmPassword: '',
      specialty: '',
      branch: 'Main',
      status: 'Active',
    });
  };

  const handleSave = async () => {
    if (isReadOnly) return;
    setFormError('');
    if (!form.name || !form.phone || !form.email) {
      setFormError('Name, phone, and email are required.');
      return;
    }
    if (!editingId && (!form.password || form.password.length < 6)) {
      setFormError('Password is required and must be at least 6 characters.');
      return;
    }
    if ((form.password || form.confirmPassword) && form.password !== form.confirmPassword) {
      setFormError('Password and confirm password do not match.');
      return;
    }

    const passwordHash =
      form.password && form.password.length >= 6 ? await hashPassword(form.password) : undefined;
    const payload = {
      name: form.name.trim(),
      role: form.role,
      phone: form.phone.trim(),
      email: form.email.trim(),
      specialty: form.specialty || undefined,
      branch: form.branch || undefined,
      status: form.status,
      passwordHash,
    };
    const saved = editingId
      ? await updateStaff(editingId, payload)
      : await addStaff({
          ...payload,
          passwordHash: passwordHash!,
        });
    if (!saved) return;
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (isReadOnly) return;
    await removeStaff(id);
  };

  const handleEdit = (id: string) => {
    if (isReadOnly) return;
    const member = staff.find((row) => row.id === id);
    if (!member) return;
    setEditingId(id);
    setForm({
      name: member.name,
      role: member.role,
      phone: member.phone,
      email: member.email,
      password: '',
      confirmPassword: '',
      specialty: member.specialty || '',
      branch: member.branch || 'Main',
      status: member.status,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="stack">
      <div className="panel section">
        <div className="section__header">
          <div>
            <div className="section__title">Add Doctor / Staff</div>
            <div className="muted">Create profiles for doctors, nurses, reception, technicians, or admins</div>
          </div>
          <div className="action-stack">
            {editingId && (
              <button className="pill pill--ghost" onClick={resetForm} disabled={isReadOnly}>
                Cancel Edit
              </button>
            )}
            <button className="pill" onClick={handleSave} disabled={isReadOnly}>
              {editingId ? 'Update Team Member' : 'Save Team Member'}
            </button>
          </div>
        </div>
        <div className="form-grid">
          <input
            className="input"
            placeholder="Full Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            disabled={isReadOnly}
          />
          <select className="input" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as StaffRole }))} disabled={isReadOnly}>
            <option value="Doctor">Doctor</option>
            <option value="Nurse">Nurse</option>
            <option value="Reception">Reception</option>
            <option value="Admin">Admin</option>
            <option value="Technician">Technician</option>
            <option value="FDO">FDO</option>
          </select>
          <input
            className="input"
            placeholder="Mobile"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            disabled={isReadOnly}
          />
          <input
            className="input"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            disabled={isReadOnly}
          />
          <input
            className="input"
            type="password"
            placeholder={editingId ? 'New password (optional)' : 'Password (min 6 characters)'}
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            autoComplete="new-password"
            disabled={isReadOnly}
          />
          <input
            className="input"
            type="password"
            placeholder="Confirm password"
            value={form.confirmPassword}
            onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
            autoComplete="new-password"
            disabled={isReadOnly}
          />
          <input
            className="input"
            placeholder="Specialty (e.g., Laser, PRP)"
            value={form.specialty}
            onChange={(e) => setForm((f) => ({ ...f, specialty: e.target.value }))}
            disabled={isReadOnly}
          />
          <input
            className="input"
            placeholder="Branch (e.g., Main / Clinic Store)"
            value={form.branch}
            onChange={(e) => setForm((f) => ({ ...f, branch: e.target.value }))}
            disabled={isReadOnly}
          />
          <select className="input" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as 'Active' | 'Inactive' }))} disabled={isReadOnly}>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
        {formError && <div className="muted small" style={{ marginTop: 8, color: 'var(--color-error, #c00)' }}>{formError}</div>}
        {error && <div className="muted small" style={{ marginTop: 8, color: 'var(--color-error, #c00)' }}>{error}</div>}
      </div>

      <div className="panel section">
        <div className="section__header">
          <div>
            <div className="section__title">Team Directory</div>
            <div className="muted">Search by name, phone, email, or specialty; filter by role</div>
          </div>
          <div className="filter-bar">
            <input
              className="input"
              placeholder="Search team..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select className="input" value={filterRole} onChange={(e) => setFilterRole(e.target.value as StaffRole | 'All')}>
              <option value="All">All Roles</option>
              <option value="Doctor">Doctor</option>
              <option value="Nurse">Nurse</option>
              <option value="Reception">Reception</option>
              <option value="Admin">Admin</option>
              <option value="Technician">Technician</option>
              <option value="FDO">FDO</option>
            </select>
            <button className="icon-btn" onClick={() => { setSearch(''); setFilterRole('All'); }} aria-label="Clear filters" title="Clear filters">
              <FilterXIcon />
            </button>
          </div>
        </div>
        <div className="table-wrapper">
          <table className="table table--compact table--sticky-actions">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Specialty</th>
                <th>Branch</th>
                <th>Status</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((member) => (
                <tr key={member.id}>
                  <td>
                    <div className="strong">{member.name}</div>
                    <div className="muted small">{member.id}</div>
                  </td>
                  <td>{member.role}</td>
                  <td className="muted small">{member.specialty || '-'}</td>
                  <td className="muted small">{member.branch || '-'}</td>
                  <td className="muted small">{member.status}</td>
                  <td className="muted small">{member.phone}</td>
                  <td className="muted small">{member.email}</td>
                  <td className="actions-cell">
                    <div className="action-stack">
                      <button className="icon-btn" onClick={() => handleEdit(member.id)} disabled={isReadOnly} aria-label="Edit" title="Edit">
                        <EditIcon />
                      </button>
                      <button className="icon-btn" onClick={() => handleDelete(member.id)} disabled={isReadOnly} aria-label="Delete" title="Delete">
                        <TrashIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="muted small" style={{ textAlign: 'center' }}>
                    No team members match this search.
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
