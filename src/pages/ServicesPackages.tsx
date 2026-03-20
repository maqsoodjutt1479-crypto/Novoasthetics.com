import React, { useEffect, useMemo, useState } from 'react';
import { StatusBadge } from '../components/StatusBadge';
import { useAppointments } from '../store/useAppointments';
import { usePackageAssignments } from '../store/usePackageAssignments';
import { usePackages, type ClinicPackage } from '../store/usePackages';
import { useAuth } from '../components/AuthProvider';
import { EditIcon, PlusIcon, TrashIcon, XIcon } from '../components/UiIcons';

export const ServicesPackagesPage: React.FC = () => {
  const { appointments, hydrate: hydrateAppointments } = useAppointments();
  const { assignments, hydrate: hydrateAssignments, addAssignment, renamePackageName } = usePackageAssignments();
  const { packages, hydrate: hydratePackages, addPackage, updatePackage, removePackage, isLoading, error } = usePackages();
  const { user } = useAuth();
  const canManagePackages = user?.role === 'admin' || user?.role === 'fdo';
  const isReadOnly = !canManagePackages;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string>('');
  const [search, setSearch] = useState('');
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({
    name: '',
    price: '',
    duration: '',
    services: '',
    active: true,
  });

  useEffect(() => {
    void hydrateAppointments();
    void hydratePackages();
    void hydrateAssignments();
  }, [hydrateAppointments, hydrateAssignments, hydratePackages]);

  const patientOptions = useMemo(() => {
    return appointments.map((appt) => ({
      id: appt.id,
      label: `${appt.patient} (${appt.phone})`,
      name: appt.patient,
      phone: appt.phone,
    }));
  }, [appointments]);

  const filteredOptions = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return patientOptions;
    return patientOptions.filter(
      (p) => p.label.toLowerCase().includes(term) || p.id.toLowerCase().includes(term)
    );
  }, [patientOptions, search]);

  const assignedCount = (pkgName: string) =>
    assignments.filter((a) => a.packageName === pkgName).length;

  const resetForm = () => {
    setEditingId(null);
    setFormError('');
    setForm({
      name: '',
      price: '',
      duration: '',
      services: '',
      active: true,
    });
  };

  const hydrateForm = (pkg: ClinicPackage) => {
    setEditingId(pkg.id);
    setFormError('');
    setForm({
      name: pkg.name,
      price: pkg.price,
      duration: pkg.duration,
      services: pkg.services.join(', '),
      active: pkg.active,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSavePackage = async () => {
    if (isReadOnly) return;
    const name = form.name.trim();
    const price = form.price.trim();
    const duration = form.duration.trim();
    const services = form.services
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    if (!name || !price || !duration || services.length === 0) {
      setFormError('Name, price, duration, and at least one service are required.');
      return;
    }

    const duplicate = packages.find(
      (pkg) => pkg.name.toLowerCase() === name.toLowerCase() && pkg.id !== editingId
    );
    if (duplicate) {
      setFormError('A package with this name already exists.');
      return;
    }

    if (editingId) {
      const current = packages.find((pkg) => pkg.id === editingId);
      const updated = await updatePackage(editingId, {
        name,
        price,
        duration,
        services,
        active: form.active,
      });
      if (updated && current && current.name !== updated.name) {
        await renamePackageName(current.name, updated.name);
      }
      if (updated) resetForm();
      return;
    }

    const created = await addPackage({
      name,
      price,
      duration,
      services,
      active: form.active,
    });
    if (created) resetForm();
  };

  const handleDeletePackage = async (pkg: ClinicPackage) => {
    if (isReadOnly) return;
    if (assignedCount(pkg.name) > 0) {
      setFormError('Assigned packages cannot be deleted.');
      return;
    }
    await removePackage(pkg.id);
    if (editingId === pkg.id) {
      resetForm();
    }
  };

  const handleTogglePackageStatus = async (pkg: ClinicPackage) => {
    if (isReadOnly) return;
    await updatePackage(pkg.id, { active: !pkg.active });
  };

  const handleAssign = () => {
    if (isReadOnly) return;
    if (!selectedPackage || !selectedAppointmentId) return;
    const selected = patientOptions.find((p) => p.id === selectedAppointmentId);
    if (!selected) return;
    addAssignment({
      packageName: selectedPackage,
      patientName: selected.name,
      phone: selected.phone,
      appointmentId: selectedAppointmentId,
    });
    setSelectedPackage(null);
    setSelectedAppointmentId('');
    setSearch('');
  };

  return (
    <div className="stack">
      <div className="panel section">
        <div className="section__header">
          <div>
            <div className="section__title">{editingId ? 'Edit Package' : 'Packages'}</div>
            <div className="muted">Add more packages, edit existing ones, and assign them to patients.</div>
            {isLoading ? <div className="muted small">Loading packages from database...</div> : null}
            {error ? <div className="muted small" style={{ color: '#b91c1c' }}>{error}</div> : null}
          </div>
          <div className="action-stack">
            {editingId ? (
              <button className="pill pill--ghost" onClick={resetForm} disabled={isReadOnly}>
                Cancel Edit
              </button>
            ) : null}
            <button className="pill" onClick={handleSavePackage} disabled={isReadOnly}>
              {editingId ? 'Update Package' : <><PlusIcon /> New Package</>}
            </button>
          </div>
        </div>
        <div className="form-grid" style={{ marginBottom: 14 }}>
          <input
            className="input"
            placeholder="Package Name"
            value={form.name}
            onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
            disabled={isReadOnly}
          />
          <input
            className="input"
            placeholder="Price (e.g. PKR 42,000)"
            value={form.price}
            onChange={(e) => setForm((current) => ({ ...current, price: e.target.value }))}
            disabled={isReadOnly}
          />
          <input
            className="input"
            placeholder="Duration (e.g. 6 weeks)"
            value={form.duration}
            onChange={(e) => setForm((current) => ({ ...current, duration: e.target.value }))}
            disabled={isReadOnly}
          />
          <label className="pill" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm((current) => ({ ...current, active: e.target.checked }))}
              disabled={isReadOnly}
            />
            <span>{form.active ? 'Active package' : 'Inactive package'}</span>
          </label>
          <textarea
            className="input"
            placeholder="Services, separated by commas"
            value={form.services}
            onChange={(e) => setForm((current) => ({ ...current, services: e.target.value }))}
            disabled={isReadOnly}
            style={{ gridColumn: '1 / -1', minHeight: 110, resize: 'vertical' }}
          />
        </div>
        {formError ? <div className="muted small" style={{ marginBottom: 12, color: '#b91c1c' }}>{formError}</div> : null}
        <div className="card-grid">
          {packages.map((pkg) => (
            <div key={pkg.id} className="service-card panel">
              <div className="service-card__header">
                <div className="strong">{pkg.name}</div>
                <StatusBadge status={pkg.active ? 'Active' : 'Inactive'} />
              </div>
              <div className="muted small">Duration: {pkg.duration}</div>
              <div className="muted small">Assigned: {assignedCount(pkg.name)}</div>
              <div className="muted small">Included:</div>
              <div className="chips">
                {pkg.services.map((svc) => (
                  <span key={svc} className="chip">
                    {svc}
                  </span>
                ))}
              </div>
              <div className="service-card__footer">
                <div className="strong">{pkg.price}</div>
                <div className="action-stack">
                  <button
                    className="icon-btn"
                    title="Edit package"
                    aria-label="Edit package"
                    onClick={() => hydrateForm(pkg)}
                    disabled={isReadOnly}
                  >
                    <EditIcon />
                  </button>
                  <button
                    className="icon-btn"
                    title="Delete package"
                    aria-label="Delete package"
                    onClick={() => void handleDeletePackage(pkg)}
                    disabled={isReadOnly}
                  >
                    <TrashIcon />
                  </button>
                  <button
                    className="icon-btn"
                    title="Assign patient"
                    aria-label="Assign patient"
                    onClick={() => setSelectedPackage(pkg.name)}
                    disabled={isReadOnly}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="M15 12a4 4 0 1 1-4-4 4 4 0 0 1 4 4zm7 8v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1h20zm-4-9h-2V9h-2V7h2V5h2v2h2v2h-2v2z"
                        fill="currentColor"
                      />
                    </svg>
                  </button>
                  <button
                    className="pill pill--ghost"
                    disabled={isReadOnly}
                    onClick={() => void handleTogglePackageStatus(pkg)}
                  >
                    {pkg.active ? 'Visible' : 'Hidden'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedPackage && (
        <div className="modal-backdrop" role="presentation" onClick={() => setSelectedPackage(null)}>
          <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <div className="strong">Assign Package</div>
              <button className="icon-btn" onClick={() => setSelectedPackage(null)} aria-label="Close">
                <XIcon />
              </button>
            </div>
            <div className="stack">
              <div className="muted small">Package: {selectedPackage}</div>
              <input
                className="input"
                placeholder="Search patient by name, phone, or ID"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                disabled={isReadOnly}
              />
              <select
                className="input"
                value={selectedAppointmentId}
                onChange={(e) => setSelectedAppointmentId(e.target.value)}
                disabled={isReadOnly}
              >
                <option value="">-- Select Patient --</option>
                {filteredOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
              <div className="action-stack">
                <button className="pill" onClick={handleAssign} disabled={isReadOnly}>
                  Assign
                </button>
                <button className="pill pill--ghost" onClick={() => setSelectedPackage(null)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
