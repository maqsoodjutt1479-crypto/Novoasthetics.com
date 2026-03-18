import React, { useEffect, useMemo, useState } from 'react';
import { StatusBadge } from '../components/StatusBadge';
import { packages } from '../data/packages';
import { useAppointments } from '../store/useAppointments';
import { usePackageAssignments } from '../store/usePackageAssignments';
import { useAuth } from '../components/AuthProvider';
import { PlusIcon, XIcon } from '../components/UiIcons';

export const ServicesPackagesPage: React.FC = () => {
  const { appointments, hydrate: hydrateAppointments } = useAppointments();
  const { assignments, hydrate: hydrateAssignments, addAssignment } = usePackageAssignments();
  const { user } = useAuth();
  const isReadOnly = user?.role === 'fdo';
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string>('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    void hydrateAppointments();
    void hydrateAssignments();
  }, [hydrateAppointments, hydrateAssignments]);

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
            <div className="section__title">Packages</div>
            <div className="muted">Bundle multiple services; choose active / inactive</div>
          </div>
          <button className="pill" disabled={isReadOnly}>
            <PlusIcon /> New Package
          </button>
        </div>
        <div className="card-grid">
          {packages.map((pkg) => (
            <div key={pkg.name} className="service-card panel">
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
                  <button className="pill pill--ghost" disabled={isReadOnly}>
                    Show on website
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
