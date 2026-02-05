import React, { useMemo, useState } from 'react';
import { StatusBadge } from '../components/StatusBadge';
import { useStaff, type StaffRole, type StaffMember } from '../store/useStaff';
import { hashPassword } from '../utils/password';

export const StaffPage: React.FC = () => {
  const { staff, addStaff, updateStatus, removeStaff } = useStaff();
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<'All' | StaffRole>('All');
  const [form, setForm] = useState({
    name: '',
    role: 'Doctor' as StaffRole,
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    specialty: '',
    branch: 'Main',
    status: 'Active' as StaffMember['status'],
  });
  const [formError, setFormError] = useState('');

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

  const handleAdd = async () => {
    setFormError('');
    if (!form.name || !form.phone || !form.email) {
      setFormError('Name, phone, and email are required.');
      return;
    }
    if (!form.password || form.password.length < 6) {
      setFormError('Password is required and must be at least 6 characters.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setFormError('Password and confirm password do not match.');
      return;
    }
    const passwordHash = await hashPassword(form.password);
    addStaff({
      name: form.name,
      role: form.role,
      phone: form.phone,
      email: form.email,
      specialty: form.specialty || undefined,
      branch: form.branch || undefined,
      status: form.status,
      passwordHash,
    });
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

  const toggleStatus = (id: string) => {
    const current = staff.find((s) => s.id === id);
    if (!current) return;
    updateStatus(id, current.status === 'Active' ? 'Inactive' : 'Active');
  };

  const handleDelete = (id: string) => {
    removeStaff(id);
  };

  return (
    <div className="stack">
      <div className="panel section">
        <div className="section__header">
          <div>
            <div className="section__title">Add Doctor / Staff</div>
            <div className="muted">Create profiles for doctors, nurses, reception, technicians, or admins</div>
          </div>
          <button className="pill" onClick={handleAdd}>
            Save Team Member
          </button>
        </div>
        <div className="form-grid">
          <input
            className="input"
            placeholder="Full Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <select className="input" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as StaffRole }))}>
            <option value="Doctor">Doctor</option>
            <option value="Nurse">Nurse</option>
            <option value="Reception">Reception</option>
            <option value="Admin">Admin</option>
            <option value="Technician">Technician</option>
          </select>
          <input
            className="input"
            placeholder="Mobile"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
          <input
            className="input"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
          <input
            className="input"
            type="password"
            placeholder="Password (min 6 characters)"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            autoComplete="new-password"
          />
          <input
            className="input"
            type="password"
            placeholder="Confirm password"
            value={form.confirmPassword}
            onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
            autoComplete="new-password"
          />
          <input
            className="input"
            placeholder="Specialty (e.g., Laser, PRP)"
            value={form.specialty}
            onChange={(e) => setForm((f) => ({ ...f, specialty: e.target.value }))}
          />
          <input
            className="input"
            placeholder="Branch (e.g., Main / Clinic Store)"
            value={form.branch}
            onChange={(e) => setForm((f) => ({ ...f, branch: e.target.value }))}
          />
          <select
            className="input"
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as StaffMember['status'] }))}
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
        {formError && <div className="muted small" style={{ marginTop: 8, color: 'var(--color-error, #c00)' }}>{formError}</div>}
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
            </select>
            <button className="pill pill--ghost" onClick={() => { setSearch(''); setFilterRole('All'); }}>
              Clear
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
                <th>Phone</th>
                <th>Email</th>
                <th>Status</th>
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
                  <td className="muted small">{member.phone}</td>
                  <td className="muted small">{member.email}</td>
                  <td>
                    <div className="action-stack">
                      <label className="toggle" title="Activate/Deactivate">
                        <input
                          type="checkbox"
                          checked={member.status === 'Active'}
                          onChange={() => toggleStatus(member.id)}
                        />
                        <span className="toggle__slider" />
                      </label>
                      <StatusBadge status={member.status} />
                    </div>
                  </td>
                  <td className="actions-cell">
                    <div className="action-stack">
                      <button className="pill pill--ghost" onClick={() => toggleStatus(member.id)}>
                        {member.status === 'Active' ? 'Deactivate' : 'Activate'}
                      </button>
                      <button className="pill pill--ghost" onClick={() => handleDelete(member.id)}>
                        Delete
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
