import React, { useEffect, useMemo, useState } from 'react';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../components/AuthProvider';
import { useAppointments, type Appointment } from '../store/useAppointments';
import { PrintIcon, SendIcon, XIcon } from '../components/UiIcons';

type PatientRow = {
  id: string;
  key: string;
  name: string;
  phone: string;
  services: string[];
  from: string;
  to: string;
  doctorNotes: string;
  history: string;
  followUp: string;
  status: 'Active' | 'Inactive';
};

const FOLLOWUP_STORAGE_KEY = 'clinic-patient-followups';

const loadFollowUps = (): Record<string, string> => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(FOLLOWUP_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed || {};
  } catch (err) {
    console.error('Failed to load follow-ups', err);
    return {};
  }
};

const persistFollowUps = (rows: Record<string, string>) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(FOLLOWUP_STORAGE_KEY, JSON.stringify(rows));
  } catch (err) {
    console.error('Failed to persist follow-ups', err);
  }
};

export const PatientsPage: React.FC = () => {
  const { appointments, hydrate, updateStatus } = useAppointments();
  const { user } = useAuth();
  const isReadOnly = user?.role === 'fdo';
  const [search, setSearch] = useState('');
  const [followUps, setFollowUps] = useState<Record<string, string>>(loadFollowUps);
  const [historyKey, setHistoryKey] = useState<string | null>(null);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    persistFollowUps(followUps);
  }, [followUps]);

  const patients = useMemo(() => {
    const grouped = appointments.reduce<Record<string, PatientRow>>((acc, appt) => {
      const key = `${appt.patient}-${appt.phone}`;
      const current = acc[key];
      const normalizedDate = appt.datetime.replace('T', ' ');
      const dateOnly = normalizedDate.split(' ')[0] || normalizedDate;
      const services = current ? [...current.services] : [];
      if (!services.includes(appt.service)) {
        services.push(appt.service);
      }
      const fromDate = current?.from ? current.from : dateOnly;
      const toDate = current?.to ? current.to : dateOnly;
      acc[key] = {
        id: appt.patientId || appt.id,
        key,
        name: appt.patient,
        phone: appt.phone,
        services,
        from: fromDate < dateOnly ? fromDate : dateOnly,
        to: toDate > dateOnly ? toDate : dateOnly,
        doctorNotes: appt.notes || '-',
        history: `${appt.apptType} - ${appt.service}`,
        followUp: followUps[key] || '',
        status: appt.status === 'Cancelled' ? 'Inactive' : 'Active',
      };
      return acc;
    }, {});
    return Object.values(grouped);
  }, [appointments, followUps]);

  const filtered = useMemo(
    () =>
      patients.filter(
        (p) =>
          p.id.toLowerCase().includes(search.toLowerCase()) ||
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.phone.includes(search)
      ),
    [patients, search]
  );

  const patientAppointments = useMemo(() => {
    const grouped: Record<string, Appointment[]> = {};
    appointments.forEach((appt) => {
      const key = `${appt.patient}-${appt.phone}`;
      grouped[key] = grouped[key] ? [...grouped[key], appt] : [appt];
    });
    return grouped;
  }, [appointments]);

  const selectedHistory = historyKey ? patientAppointments[historyKey] || [] : [];
  const sortedHistory = useMemo(() => {
    return [...selectedHistory].sort((a, b) => {
      const da = new Date(a.datetime.replace(' ', 'T')).getTime();
      const db = new Date(b.datetime.replace(' ', 'T')).getTime();
      return db - da;
    });
  }, [selectedHistory]);

  const handleCancel = async (id: string) => {
    if (isReadOnly) return;
    await updateStatus(id, 'Cancelled');
  };

  const handleMessage = (row: Appointment) => {
    window.alert(`Send message to ${row.patient} (${row.phone}) about appointment ${row.id}.`);
  };

  const handlePrint = (row: Appointment) => {
    window.alert(`Print slip for ${row.patient} @ ${row.datetime}`);
  };

  return (
    <div className="stack">
      <div className="panel section">
        <div className="section__header">
          <div>
            <div className="section__title">Booked Appointments (linked to Patients)</div>
            <div className="muted">Actions available for pending bookings</div>
          </div>
        </div>
        <div className="table-wrapper">
          <table className="table table--sticky-actions">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Phone</th>
                <th>ID</th>
                <th>Doctor</th>
                <th>Date & Time</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((row) => (
                <tr key={row.id}>
                  <td>{row.patient}</td>
                  <td className="muted small">{row.phone}</td>
                  <td className="muted small">{row.id}</td>
                  <td>{row.doctor}</td>
                  <td>{row.datetime.replace(' ', ' @ ')}</td>
                  <td>
                    <StatusBadge status={row.status} />
                  </td>
                  <td>
                    <StatusBadge status={row.paymentStatus} />
                  </td>
                  <td className="muted small">{row.notes}</td>
                  <td className="actions-cell">
                    <div className="action-stack">
                      <button className="icon-btn" onClick={() => handlePrint(row)} aria-label="Print" title="Print">
                        <PrintIcon />
                      </button>
                      <button className="icon-btn" onClick={() => handleMessage(row)} aria-label="Send message" title="Send message">
                        <SendIcon />
                      </button>
                      <button
                        className="icon-btn"
                        onClick={() => handleCancel(row.id)}
                        disabled={isReadOnly || row.status !== 'Pending'}
                        aria-label="Cancel"
                        title={row.status !== 'Pending' ? 'Cancel available only for Pending' : 'Cancel'}
                      >
                        <XIcon />
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
            <div className="section__title">Patient / Treatment Module</div>
            <div className="muted">Search by ID, name, or phone; manage schedules & notes</div>
          </div>
          <input
            className="input"
            placeholder="Search Patient ID, Name, Phone"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Phone</th>
                <th>Assigned Services</th>
                <th>Schedule</th>
                <th>Doctor Notes</th>
                <th>History</th>
                <th>Follow-up</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} onClick={() => setHistoryKey(p.key)} style={{ cursor: 'pointer' }}>
                  <td>
                    <div className="strong">{p.name}</div>
                    <div className="muted small">{p.id}</div>
                  </td>
                  <td>{p.phone}</td>
                  <td>
                    <div className="chips">
                      {p.services.map((svc) => (
                        <span key={svc} className="chip">
                          {svc}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <div className="muted small">From: {p.from}</div>
                    <div className="muted small">To: {p.to}</div>
                  </td>
                  <td className="muted small">{p.doctorNotes}</td>
                  <td className="muted small">{p.history}</td>
                  <td>
                    <input
                      type="date"
                      className="input input--tiny"
                      value={followUps[p.key] || ''}
                      onChange={(e) => setFollowUps((prev) => ({ ...prev, [p.key]: e.target.value }))}
                      disabled={isReadOnly}
                    />
                  </td>
                  <td>
                    <StatusBadge status={p.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {historyKey && (
        <div className="modal-backdrop" role="presentation" onClick={() => setHistoryKey(null)}>
          <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <div className="strong">Patient History</div>
              <button className="icon-btn" onClick={() => setHistoryKey(null)} aria-label="Close">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M18.3 5.71 12 12l6.3 6.29-1.41 1.42L10.59 13.4 4.29 19.71 2.88 18.3 9.18 12 2.88 5.71 4.29 4.3l6.3 6.3 6.29-6.3 1.42 1.41z"
                    fill="currentColor"
                  />
                </svg>
              </button>
            </div>
            <div className="table-wrapper">
              <table className="table table--compact">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Service</th>
                    <th>Type</th>
                    <th>Doctor</th>
                    <th>Status</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedHistory.map((appt) => (
                    <tr key={appt.id}>
                      <td className="muted small">{appt.datetime.replace('T', ' @ ')}</td>
                      <td>{appt.service}</td>
                      <td>{appt.apptType}</td>
                      <td>{appt.doctor}</td>
                      <td>
                        <StatusBadge status={appt.status} />
                      </td>
                      <td className="muted small">{appt.notes}</td>
                    </tr>
                  ))}
                  {sortedHistory.length === 0 && (
                    <tr>
                      <td className="muted small" colSpan={6}>
                        No history found for this patient.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
