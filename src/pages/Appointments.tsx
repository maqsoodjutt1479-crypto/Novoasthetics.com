import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StatusBadge } from '../components/StatusBadge';
import { useAppointments, type Appointment, type AppointmentStatus } from '../store/useAppointments';
import { useAuth } from '../components/AuthProvider';
import { useNotifications } from '../store/useNotifications';
import { usePackageAssignments } from '../store/usePackageAssignments';
import { usePackages } from '../store/usePackages';
import logo from '../assets/novo-logo.svg';
import { useClinicalServices } from '../store/useClinicalServices';
import { useStaff } from '../store/useStaff';
import { usePayments } from '../store/usePayments';
import { DownloadIcon, FilterXIcon, PlusIcon, TrashIcon } from '../components/UiIcons';

const statusOptions: AppointmentStatus[] = [
  'Pending',
  'Coming Soon',
  'Arrived',
  'Delayed',
  'Confirmed',
  'Cancelled',
];

const fallbackDoctors = ['Dr. Khan', 'Dr. Fatima', 'Dr. Ali'];

const workingSlots = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'];

export const AppointmentsPage: React.FC = () => {
  const {
    appointments,
    error: appointmentsError,
    hydrate: hydrateAppointments,
    addAppointment,
    updateStatus,
    updateAppointment,
    removeAppointment,
  } = useAppointments();
  const { error: paymentsError, upsertPayment, removePaymentsByReferenceId } = usePayments();
  const { addFromAppointment, markByAppointment } = useNotifications();
  const { error: assignmentError, addAssignment } = usePackageAssignments();
  const { packages, hydrate: hydratePackages } = usePackages();
  const { services, hydrate: hydrateServices } = useClinicalServices();
  const { staff, hydrate: hydrateStaff } = useStaff();
  const {
    user,
  } = useAuth();
  const role = user?.role || 'admin';
  const doctorName = user?.doctorName;
  const doctorNameNormalized = doctorName?.trim().toLowerCase();
  const canCreateAppointment = role === 'admin' || role === 'doctor' || role === 'fdo';
  const isReadOnly = !canCreateAppointment;
  const showFinancial = role === 'admin';
  const canPrint = role === 'admin' || role === 'fdo';
  const canEdit = role === 'admin';
  const canUpdateStatus = role === 'admin';
  const canCancel = role === 'admin';
  const canDelete = role === 'admin';
  const canAssignPackage = role === 'admin';
  const [printAppointment, setPrintAppointment] = useState<Appointment | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [assigning, setAssigning] = useState<Appointment | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<string>('');
  const [serviceDropdownOpen, setServiceDropdownOpen] = useState(false);
  const [serviceSearch, setServiceSearch] = useState('');
  const [doctorFilter, setDoctorFilter] = useState('All doctors');
  const [dateFilter, setDateFilter] = useState('');
  const [calendarDate, setCalendarDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [viewRange, setViewRange] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const serviceDropdownRef = useRef<HTMLDivElement | null>(null);
  const doctorOptions = useMemo(() => {
    const list = staff
      .filter((member) => member.role === 'Doctor' && member.status === 'Active')
      .map((member) => member.name);
    return list.length ? list : fallbackDoctors;
  }, [staff]);

  const serviceOptions = useMemo(() => {
    const list = services.filter((svc) => svc.status === 'Active').map((svc) => svc.name);
    return list.length ? list : ['Skin Treatment'];
  }, [services]);

  const servicePriceMap = useMemo(() => {
    const map = new Map<string, number>();
    services.forEach((svc) => {
      if (svc.status === 'Active') {
        map.set(svc.name, svc.price);
      }
    });
    return map;
  }, [services]);

  const [form, setForm] = useState({
    patient: '',
    phone: '',
    doctor: fallbackDoctors[0],
    datetime: '',
    scheduleNext: false,
    nextDatetime: '',
    service: 'Skin Treatment',
    apptType: 'Consultation',
    centre: 'BRFSD',
    amount: '',
    discount: '0%',
    notes: '',
    paymentStatus: 'Unpaid' as Appointment['paymentStatus'],
    paymentMethod: 'CASH' as Appointment['paymentMethod'],
  });
  const [treatments, setTreatments] = useState<Array<{ name: string; price: number }>>([]);
  const filteredServiceOptions = useMemo(
    () => serviceOptions.filter((svc) => svc.toLowerCase().includes(serviceSearch.trim().toLowerCase())),
    [serviceOptions, serviceSearch]
  );

  useEffect(() => {
    void hydrateAppointments();
    void hydratePackages();
    void hydrateServices();
    void hydrateStaff();
  }, [hydrateAppointments, hydratePackages, hydrateServices, hydrateStaff]);

  useEffect(() => {
    if (!serviceDropdownOpen) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (serviceDropdownRef.current?.contains(event.target as Node)) return;
      setServiceDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [serviceDropdownOpen]);

  useEffect(() => {
    if (doctorOptions.length === 0) return;
    if (!doctorOptions.includes(form.doctor)) {
      setForm((f) => ({ ...f, doctor: doctorOptions[0] }));
    }
  }, [doctorOptions, form.doctor]);

  useEffect(() => {
    if (serviceOptions.length === 0) return;
    if (!serviceOptions.includes(form.service)) {
      setForm((f) => ({ ...f, service: serviceOptions[0] }));
    }
  }, [serviceOptions, form.service]);

  useEffect(() => {
    if (!showFinancial) return;
    if (treatments.length > 1) {
      const total = treatments.reduce((sum, item) => sum + item.price, 0);
      setForm((f) => ({ ...f, amount: total ? String(total) : '' }));
      return;
    }
    if (treatments.length === 1) {
      const price = treatments[0]?.price ?? 0;
      setForm((f) => ({ ...f, amount: price ? String(price) : '' }));
      return;
    }
    setForm((f) => ({ ...f, amount: '' }));
  }, [treatments, showFinancial]);

  const handleToggleTreatment = (name: string, checked: boolean) => {
    if (isReadOnly) return;
    if (!checked) {
      setTreatments((prev) => prev.filter((item) => item.name !== name));
      return;
    }
    const price = servicePriceMap.get(name) ?? 0;
    setTreatments((prev) => {
      if (prev.some((item) => item.name === name)) return prev;
      return [...prev, { name, price }];
    });
  };

  const handleRemoveTreatment = (name: string) => {
    if (isReadOnly) return;
    setTreatments((prev) => prev.filter((item) => item.name !== name));
  };

  const parseDate = (dt: string) => new Date(dt.replace(' ', 'T'));
  const getDiscountValue = (discount: string, amount: number) => {
    const raw = (discount || '').trim();
    if (!raw) return 0;
    const numeric = Number(raw.replace(/[^0-9.]/g, ''));
    if (!Number.isFinite(numeric)) return 0;
    if (/%\s*$/.test(raw)) {
      return Math.round((amount * numeric) / 100);
    }
    return Math.round(numeric);
  };

  const referenceDate = useMemo(() => new Date().toLocaleDateString('en-CA'), []);
  const getDatePart = (value: string) => value.split('T')[0]?.split(' ')[0] || value;

  const isInRange = (dt: string) => {
    const date = parseDate(dt);
    const ref = parseDate(`${referenceDate}T00:00`);
    if (viewRange === 'all') return true;
    if (viewRange === 'today') {
      return getDatePart(dt) === referenceDate;
    }
    if (viewRange === 'week') {
      const day = ref.getDay();
      const diffToMonday = (day + 6) % 7;
      const start = new Date(ref);
      start.setDate(ref.getDate() - diffToMonday);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return date >= start && date <= end;
    }
    if (viewRange === 'month') {
      return date.getFullYear() === ref.getFullYear() && date.getMonth() === ref.getMonth();
    }
    return true;
  };

  const filtered = useMemo(
    () =>
      appointments.filter((row) => {
        if (role === 'doctor' && doctorNameNormalized) {
          if (row.doctor.trim().toLowerCase() !== doctorNameNormalized) return false;
        }
        const matchesDoctor = doctorFilter === 'All doctors' || row.doctor === doctorFilter;
        const matchesDate = !dateFilter || getDatePart(row.datetime) === dateFilter;
        const matchesRange = isInRange(row.datetime);
        return matchesDoctor && matchesDate && matchesRange;
      }),
    [appointments, doctorFilter, dateFilter, viewRange, role, doctorNameNormalized]
  );

  const calendarSlots = useMemo(() => {
    const doctorScope = role === 'doctor' && doctorName ? doctorName : doctorFilter === 'All doctors' ? null : doctorFilter;
    const sameDay = appointments.filter((row) => {
      const [datePart] = row.datetime.replace('T', ' ').split(' ');
      if (datePart !== calendarDate) return false;
      if (doctorScope && row.doctor !== doctorScope) return false;
      return true;
    });
    const bookedMap: Record<string, Appointment> = {};
    sameDay.forEach((row) => {
      const parts = row.datetime.replace('T', ' ').split(' ');
      const timePart = parts[1];
      if (timePart) bookedMap[timePart] = row;
    });
    const slots = workingSlots.map((time) => {
      const booked = bookedMap[time];
      if (booked) {
        return { time, status: 'booked' as const, appt: booked };
      }
      return { time, status: 'free' as const, appt: undefined };
    });
    const free = slots.filter((s) => s.status === 'free');
    const booked = slots.filter((s) => s.status === 'booked');
    return { free, booked };
  }, [appointments, calendarDate, doctorFilter, doctorName, role]);

  const chartData = useMemo(() => {
    const grouped: Record<string, number> = {};
    filtered.forEach((row) => {
      const day = getDatePart(row.datetime);
      grouped[day] = (grouped[day] || 0) + 1;
    });
    const entries = Object.entries(grouped).sort((a, b) => (a[0] > b[0] ? 1 : -1));
    const max = entries.reduce((m, [, v]) => Math.max(m, v), 0) || 1;
    return { entries, max };
  }, [filtered]);

  const handleStatusChange = async (id: string, next: AppointmentStatus) => {
    if (!canUpdateStatus) return;
    const updated = await updateStatus(id, next);
    if (updated && next === 'Confirmed') {
      markByAppointment(id);
    }
  };

  const handleCancel = async (id: string) => {
    if (!canCancel) return;
    const updated = await updateStatus(id, 'Cancelled');
    if (updated) {
      markByAppointment(id);
    }
  };

  const handleMessage = (row: Appointment) => {
    window.alert(`Send message to ${row.patient} (${row.phone}) about appointment ${row.id}.`);
  };

  const handleEdit = (row: Appointment) => {
    if (isReadOnly || !canEdit) return;
    const parsedServices = row.service
      .split(' + ')
      .map((part) => part.trim())
      .filter(Boolean);
    const canHydrateTreatments = parsedServices.length > 0 && parsedServices.every((name) => servicePriceMap.has(name));
    if (canHydrateTreatments) {
      setTreatments(parsedServices.map((name) => ({ name, price: servicePriceMap.get(name) ?? 0 })));
    } else {
      setTreatments([]);
    }
    setEditingId(row.id);
    setForm({
      patient: row.patient,
      phone: row.phone,
      doctor: row.doctor,
      datetime: row.datetime,
      scheduleNext: false,
      nextDatetime: '',
      service: row.service,
      apptType: row.apptType,
      centre: row.centre,
      amount: String(row.amount ?? ''),
      discount: row.discount ?? '0%',
      notes: row.notes ?? '',
      paymentStatus: row.paymentStatus,
      paymentMethod: row.paymentMethod ?? 'CASH',
    });
    setServiceDropdownOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrint = (row?: Appointment) => {
    if (!row) return;
    setPrintAppointment(row);
  };

  const handleAssignPackage = (row: Appointment) => {
    if (!canAssignPackage) return;
    setAssigning(row);
    setSelectedPackage('');
  };

  const syncAppointmentPayment = async (appointment: Appointment) => {
    const status = appointment.paymentStatus;
    const paidAmount =
      status === 'Paid'
        ? appointment.amount
        : status === 'Partial'
        ? Math.round(appointment.amount * 0.5)
        : 0;
    const method = appointment.paymentMethod ?? 'CASH';
    await upsertPayment({
      date: appointment.datetime,
      patientId: appointment.patientId || appointment.patient,
      patientName: appointment.patient,
      method,
      amount: appointment.amount,
      discount: appointment.discount,
      notes: appointment.notes,
      cash: method === 'CASH' ? paidAmount : 0,
      card: method === 'CARD' ? paidAmount : 0,
      bank: method === 'BANK_TRANSFER' ? paidAmount : 0,
      other: method === 'OTHER' ? paidAmount : 0,
      source: `Appointment - ${appointment.service} (${appointment.id})`,
    });
  };

  const handleConfirmAssign = async () => {
    if (isReadOnly) return;
    if (!assigning || !selectedPackage) return;
    const created = await addAssignment({
      packageName: selectedPackage,
      patientName: assigning.patient,
      phone: assigning.phone,
      appointmentId: assigning.id,
    });
    if (!created) return;
    setAssigning(null);
    setSelectedPackage('');
  };

  const handleDelete = async (row: Appointment) => {
    if (!canDelete) return;
    if (!window.confirm(`Delete appointment ${row.id} for ${row.patient}?`)) return;
    const removed = await removeAppointment(row.id);
    if (!removed) return;
    await removePaymentsByReferenceId(row.id);
    markByAppointment(row.id);
  };

  const handleExport = () => {
    const baseHeaders = ['Patient', 'Phone', 'ID', 'Doctor', 'DateTime', 'Status', 'Notes'];
    const headers = showFinancial
      ? [...baseHeaders.slice(0, 5), 'Amount', 'Discount', 'Status', 'Payment', 'Notes']
      : baseHeaders;

    const csv = [
      headers.join(','),
      ...filtered.map((row) => {
        if (showFinancial) {
          return [
            row.patient,
            row.phone,
            row.id,
            row.doctor,
            row.datetime,
            row.amount,
            row.discount,
            row.status,
            row.paymentStatus,
            row.notes.replace(/,/g, ';'),
          ].join(',');
        }
        return [
          row.patient,
          row.phone,
          row.id,
          row.doctor,
          row.datetime,
          row.status,
          row.notes.replace(/,/g, ';'),
        ].join(',');
      }),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'appointments.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAdd = async () => {
    if (isReadOnly) return;
    if (!form.patient || !form.phone || !form.datetime) return;
    if (treatments.length === 0) {
      window.alert('Please select at least one treatment/service.');
      return;
    }
    if (form.scheduleNext && !form.nextDatetime) {
      window.alert('Please select a next appointment date/time.');
      return;
    }
    const treatmentNames = treatments.map((t) => t.name);
    const totalTreatments = treatments.reduce((sum, item) => sum + item.price, 0);
    const resolvedService = treatmentNames.join(' + ');
    const fallbackPrice = treatments[0]?.price ?? 0;
    const amountToSave =
      treatments.length > 1 ? totalTreatments : Number(form.amount) || fallbackPrice || 0;
    const doctorValue =
      role === 'doctor' && doctorName ? doctorName.trim() : (form.doctor || '').trim() || doctorOptions[0];
    const payload = {
      patientId: form.patient,
      patient: form.patient,
      phone: form.phone,
      doctor: doctorValue,
      datetime: form.datetime,
      service: resolvedService,
      apptType: form.apptType,
      centre: form.centre,
      amount: showFinancial ? amountToSave : 0,
      discount: showFinancial ? form.discount || '0%' : '0%',
      notes: form.notes || '-',
      paymentStatus: showFinancial ? form.paymentStatus : 'Unpaid',
      paymentMethod: showFinancial ? form.paymentMethod : 'CASH',
    };
    if (editingId) {
      const updated = await updateAppointment(editingId, payload);
      if (!updated) return;
      await syncAppointmentPayment(updated);
      setEditingId(null);
    } else {
      const created = await addAppointment(payload);
      if (!created) return;
      addFromAppointment(created);
      await syncAppointmentPayment(created);
      if (form.scheduleNext && form.nextDatetime) {
        const followUp = await addAppointment({
          ...payload,
          datetime: form.nextDatetime,
          apptType: 'Follow-up',
          amount: 0,
          discount: '0%',
          notes: `Follow-up for ${created.id}`,
          followUpForId: created.id,
        });
        if (followUp) {
          addFromAppointment(followUp);
        }
      }
    }
    setForm({
      patient: '',
      phone: '',
      doctor: doctorOptions[0],
      datetime: '',
      scheduleNext: false,
      nextDatetime: '',
      service: serviceOptions[0] ?? 'Skin Treatment',
      apptType: 'Consultation',
      centre: 'BRFSD',
      amount: '',
      discount: '0%',
      notes: '',
      paymentStatus: 'Unpaid',
      paymentMethod: 'CASH',
    });
    setTreatments([]);
    setServiceDropdownOpen(false);
    setServiceSearch('');
  };

  useEffect(() => {
    if (!printAppointment) return;
    const handleAfterPrint = () => setPrintAppointment(null);
    window.addEventListener('afterprint', handleAfterPrint);
    window.print();
    return () => {
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, [printAppointment]);

  const normalizeDateTime = (value: string) => value.replace('T', ' ');
  const formatDate = (value: string) => {
    const parsed = new Date(normalizeDateTime(value).replace(' ', 'T'));
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  };
  const formatTime = (value: string) => {
    const parsed = new Date(normalizeDateTime(value).replace(' ', 'T'));
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };
  const formatDateTime = (value: string) => `${formatDate(value)} ${formatTime(value)}`;
  const formatMoney = (value?: number) => `PKR ${Math.round(value ?? 0).toLocaleString()}`;
  const now = new Date();
  const todayLabel = now.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
  const timeLabel = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const splitServices = (value: string) =>
    value
      .split(' + ')
      .map((part) => part.trim())
      .filter(Boolean);

  return (
    <>
      <div className="stack no-print">
      <div className="panel section">
        <div className="section__header">
          <div>
            <div className="section__title">Book New Appointment</div>
            <div className="muted">Enter patient, doctor, date/time, amount; status starts Pending</div>
          </div>
          <button className="pill" onClick={handleAdd} disabled={isReadOnly}>
            {editingId ? 'Update Appointment' : <><PlusIcon /> Add Appointment</>}
          </button>
        </div>
        {(appointmentsError || paymentsError || assignmentError) && (
          <div className="muted small" style={{ marginTop: 10, color: '#b91c1c' }}>
            {appointmentsError || paymentsError || assignmentError}
          </div>
        )}
        <div className="form-grid">
          <input
            className="input"
            placeholder="Patient Name / ID"
            value={form.patient}
            onChange={(e) => setForm((f) => ({ ...f, patient: e.target.value }))}
            disabled={isReadOnly}
          />
          <input
            className="input"
            placeholder="Mobile Number"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            disabled={isReadOnly}
          />
          {role === 'doctor' && doctorName ? (
            <div className="pill">Doctor: {doctorName}</div>
          ) : (
            <select
              className="input"
              value={form.doctor}
              onChange={(e) => setForm((f) => ({ ...f, doctor: e.target.value }))}
              disabled={isReadOnly}
            >
              {doctorOptions.map((doc) => (
                <option key={doc} value={doc}>
                  {doc}
                </option>
              ))}
            </select>
          )}
          <input
            type="datetime-local"
            className="input"
            value={form.datetime}
            onChange={(e) => setForm((f) => ({ ...f, datetime: e.target.value }))}
            disabled={isReadOnly}
          />
          <label className="pill pill--ghost" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={form.scheduleNext}
              disabled={isReadOnly || Boolean(editingId)}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  scheduleNext: e.target.checked,
                  nextDatetime: e.target.checked ? f.nextDatetime : '',
                }))
              }
            />
            <span>{editingId ? 'Next appointment disabled while editing' : 'Schedule next appointment'}</span>
          </label>
          {form.scheduleNext && !editingId && (
            <input
              type="datetime-local"
              className="input"
              value={form.nextDatetime}
              onChange={(e) => setForm((f) => ({ ...f, nextDatetime: e.target.value }))}
              disabled={isReadOnly}
            />
          )}
          <div ref={serviceDropdownRef} style={{ gridColumn: '1 / -1', position: 'relative' }}>
            <button
              type="button"
              className="input"
              onClick={() => setServiceDropdownOpen((prev) => !prev)}
              disabled={isReadOnly}
              style={{ textAlign: 'left' }}
            >
              {treatments.length
                ? `${treatments.length} treatment${treatments.length === 1 ? '' : 's'} selected`
                : 'Select treatments/services'}
            </button>
            {serviceDropdownOpen && (
              <div
                className="panel"
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  left: 0,
                  right: 0,
                  zIndex: 20,
                  padding: 12,
                }}
              >
                <div className="muted small" style={{ marginBottom: 8 }}>
                  Search and tick one or more treatments/services
                </div>
                <input
                  className="input"
                  placeholder="Search services..."
                  value={serviceSearch}
                  onChange={(e) => setServiceSearch(e.target.value)}
                />
                <div className="muted small" style={{ marginTop: 8 }}>
                  Showing {filteredServiceOptions.length} of {serviceOptions.length} active services
                </div>
                <div style={{ maxHeight: 280, overflowY: 'auto', display: 'grid', gap: 8, marginTop: 10 }}>
                  {filteredServiceOptions.map((svc) => {
                    const checked = treatments.some((item) => item.name === svc);
                    return (
                      <label
                        key={svc}
                        className={`pill ${checked ? '' : 'pill--ghost'}`}
                        style={{ cursor: isReadOnly ? 'default' : 'pointer' }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => handleToggleTreatment(svc, e.target.checked)}
                          disabled={isReadOnly}
                        />
                        <span>
                          {svc} {servicePriceMap.has(svc) ? `- PKR ${servicePriceMap.get(svc)?.toLocaleString()}` : ''}
                        </span>
                      </label>
                    );
                  })}
                  {filteredServiceOptions.length === 0 && (
                    <div className="muted small">No services match this search.</div>
                  )}
                </div>
              </div>
            )}
          </div>
          {treatments.length > 0 && (
            <div className="panel" style={{ gridColumn: '1 / -1', padding: 12 }}>
              <div className="muted small">Selected treatments</div>
              <div className="action-stack" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {treatments.map((item) => (
                  <div key={item.name} className="pill">
                    <span>
                      {item.name} — PKR {item.price.toLocaleString()}
                    </span>
                    <button
                      type="button"
                      className="pill pill--ghost"
                      onClick={() => handleRemoveTreatment(item.name)}
                      disabled={isReadOnly}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <input
            className="input"
            placeholder="Type (e.g., Consultation)"
            value={form.apptType}
            onChange={(e) => setForm((f) => ({ ...f, apptType: e.target.value }))}
            disabled={isReadOnly}
          />
          <input
            className="input"
            placeholder="Centre (e.g., BRFSD)"
            value={form.centre}
            onChange={(e) => setForm((f) => ({ ...f, centre: e.target.value }))}
            disabled={isReadOnly}
          />
          {showFinancial && (
            <>
              <input
                type="number"
                min="0"
                className="input"
                placeholder="Amount"
                value={form.amount}
                disabled={treatments.length > 1 || isReadOnly}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              />
              <input
                className="input"
                placeholder="Discount (e.g., 10% or 500)"
                value={form.discount}
                onChange={(e) => setForm((f) => ({ ...f, discount: e.target.value }))}
                disabled={isReadOnly}
              />
              <select
                className="input"
                value={form.paymentStatus}
                onChange={(e) =>
                  setForm((f) => ({ ...f, paymentStatus: e.target.value as Appointment['paymentStatus'] }))
                }
                disabled={isReadOnly}
              >
                <option value="Unpaid">Unpaid</option>
                <option value="Partial">Partial</option>
                <option value="Paid">Paid</option>
              </select>
              <select
                className="input"
                value={form.paymentMethod}
                onChange={(e) =>
                  setForm((f) => ({ ...f, paymentMethod: e.target.value as Appointment['paymentMethod'] }))
                }
                disabled={isReadOnly}
              >
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="OTHER">Other</option>
              </select>
            </>
          )}
          <input
            className="input"
            placeholder="Notes"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            disabled={isReadOnly}
          />
        </div>
      </div>

      <div className="panel section">
        <div className="section__header">
          <div>
            <div className="section__title">Appointment / Booking System</div>
            <div className="muted">Filter by date or doctor; admin can change status</div>
          </div>
          <div className="filter-bar">
            <label className="pill">
              <span>View:</span>
              <div className="view-toggle">
                {(['all', 'today', 'week', 'month'] as const).map((range) => (
                  <button
                    key={range}
                    className={`pill ${viewRange === range ? '' : 'pill--ghost'}`}
                    onClick={() => setViewRange(range)}
                    type="button"
                  >
                    {range === 'today'
                      ? 'Today'
                      : range === 'week'
                      ? 'Week'
                      : range === 'month'
                      ? 'Month'
                      : 'All'}
                  </button>
                ))}
              </div>
            </label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="input"
            />
            <input
              type="date"
              value={calendarDate}
              onChange={(e) => setCalendarDate(e.target.value)}
              className="input"
              title="Calendar Date"
            />
            {role === 'doctor' && doctorName ? (
              <div className="pill">Doctor: {doctorName}</div>
            ) : (
              <select
                className="input"
                value={doctorFilter}
                onChange={(e) => setDoctorFilter(e.target.value)}
              >
                {['All doctors', ...doctorOptions].map((doc) => (
                  <option key={doc} value={doc}>
                    {doc}
                  </option>
                ))}
              </select>
            )}
            <button
              className="icon-btn"
              onClick={() => {
                setViewRange('all');
                setDoctorFilter('All doctors');
                setDateFilter('');
              }}
              aria-label="Clear filters"
              title="Clear filters"
            >
              <FilterXIcon />
            </button>
            <button className="icon-btn" onClick={handleExport} aria-label="Export CSV" title="Export CSV">
              <DownloadIcon />
            </button>
          </div>
        </div>
        <div className="chart panel">
          <div className="section__header">
            <div>
              <div className="section__title">Appointments Trend</div>
              <div className="muted">Counts for current view</div>
            </div>
          </div>
          <div className="bar-chart">
            {chartData.entries.map(([day, count]) => (
              <div key={day} className="bar">
                <div
                  className="bar__fill"
                  style={{ height: `${(count / chartData.max) * 100 || 10}%` }}
                />
                <div className="bar__label">{day.slice(5)}</div>
                <div className="bar__count">{count}</div>
              </div>
            ))}
            {chartData.entries.length === 0 && (
              <div className="muted small">No appointments in this view.</div>
            )}
          </div>
        </div>

        <div className="panel section">
          <div className="section__header">
            <div>
              <div className="section__title">Custom Calendar (Free slots first)</div>
              <div className="muted">Date: {calendarDate} | tap free slot to fill booking form</div>
            </div>
          </div>
          <div className="slot-grid" style={{ marginBottom: 12 }}>
            {calendarSlots.free.map((slot) => (
              <button
                key={`free-${slot.time}`}
                className="slot"
                onClick={() =>
                  !isReadOnly && setForm((f) => ({ ...f, datetime: `${calendarDate}T${slot.time}` }))
                }
                disabled={isReadOnly}
              >
                <div className="strong">{slot.time}</div>
                <div className="muted small">Free</div>
              </button>
            ))}
            {calendarSlots.free.length === 0 && <div className="muted small">No free slots for this day.</div>}
          </div>
          <div className="slot-grid">
            {calendarSlots.booked.map((slot) => (
              <div key={`booked-${slot.time}`} className="slot slot--busy">
                <div className="strong">{slot.time}</div>
                <div className="muted small">Booked by {slot.appt?.patient}</div>
                <div className="muted small">{slot.appt?.doctor}</div>
              </div>
            ))}
            {calendarSlots.booked.length === 0 && <div className="muted small">No booked slots on this day.</div>}
          </div>
        </div>

        <div className="table-wrapper">
          <table className="table table--sticky-actions table--compact">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Scheduled</th>
                <th>Service</th>
                <th>Type</th>
                <th>Phone</th>
                <th>ID</th>
                <th>Doctor</th>
                <th>Centre</th>
                {showFinancial && <th>Amount</th>}
                {showFinancial && <th>Discount</th>}
                <th>Status</th>
                {showFinancial && <th>Payment</th>}
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className={getDatePart(row.datetime) === referenceDate ? 'row-today' : ''}>
                  <td>{row.patient}</td>
                  <td className="muted small">{row.datetime.replace('T', ' @ ')}</td>
                  <td>{row.service}</td>
                  <td>{row.apptType}</td>
                  <td className="muted small">{row.phone}</td>
                <td className="muted small">{row.id}</td>
                <td>{row.doctor}</td>
                <td>
                  <span className="badge badge--muted">{row.centre}</span>
                </td>
                {showFinancial && <td>PKR {row.amount.toLocaleString()}</td>}
                {showFinancial && <td>{row.discount}</td>}
                <td>
                    <select
                      className="input input--tiny"
                      value={row.status}
                      onChange={(e) => handleStatusChange(row.id, e.target.value as AppointmentStatus)}
                      disabled={!canUpdateStatus}
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </td>
                  {showFinancial && (
                    <td>
                      <StatusBadge status={row.paymentStatus} />
                    </td>
                  )}
                  <td className="muted small">{row.notes}</td>
                  <td className="actions-cell">
                    <div className="action-stack">
                      {canPrint && (
                        <button className="icon-btn" onClick={() => handlePrint(row)} title="Print slip" aria-label="Print slip">
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path
                              d="M7 7V3h10v4H7zm10 2h1a3 3 0 0 1 3 3v5h-4v4H7v-4H3v-5a3 3 0 0 1 3-3h11zm-2 10v-4H9v4h6zm4-2h2v-5a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v5h2v-4h8v4h4z"
                              fill="currentColor"
                            />
                          </svg>
                        </button>
                      )}
                      <button className="icon-btn" onClick={() => handleMessage(row)} title="Send message" aria-label="Send message">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path
                            d="M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H8l-4 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm0 2v9h2v1.6L7.6 15H20V6H4z"
                            fill="currentColor"
                          />
                        </svg>
                      </button>
                      {canEdit && (
                        <button className="icon-btn" onClick={() => handleEdit(row)} title="Edit appointment" aria-label="Edit appointment">
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path
                              d="M3 17.25V21h3.75l11-11-3.75-3.75-11 11zm2.92 2.83H5v-.92l9.06-9.06.92.92L5.92 20.08zM20.71 7.04a1 1 0 0 0 0-1.41L18.37 3.29a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
                              fill="currentColor"
                            />
                          </svg>
                        </button>
                      )}
                      {canAssignPackage && (
                        <button
                          className="icon-btn"
                          onClick={() => handleAssignPackage(row)}
                          title="Assign package"
                          aria-label="Assign package"
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path
                              d="M12 2 2 7l10 5 10-5-10-5zm0 7 10-5v6l-10 5-10-5V4l10 5zm0 6 10-5v6l-10 5-10-5v-6l10 5z"
                              fill="currentColor"
                            />
                          </svg>
                        </button>
                      )}
                      {canCancel && (
                        <button className="icon-btn" onClick={() => handleCancel(row.id)} title="Cancel booking" aria-label="Cancel booking">
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path
                              d="M18.3 5.71 12 12l6.3 6.29-1.41 1.42L10.59 13.4 4.29 19.71 2.88 18.3 9.18 12 2.88 5.71 4.29 4.3l6.3 6.3 6.29-6.3 1.42 1.41z"
                              fill="currentColor"
                            />
                          </svg>
                        </button>
                      )}
                      {canDelete && (
                        <button className="icon-btn" onClick={() => handleDelete(row)} title="Delete appointment" aria-label="Delete appointment">
                          <TrashIcon />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </div>
      {printAppointment && (
        <section className="consultation-print">
          {(() => {
            const serviceNames = splitServices(printAppointment.service);
            const treatmentRows = serviceNames.map((name) => ({
              name,
              price: servicePriceMap.get(name) ?? 0,
            }));
            const treatmentTotal = treatmentRows.reduce((sum, row) => sum + row.price, 0);
            const baseAmount = Number.isFinite(printAppointment.amount) ? printAppointment.amount : treatmentTotal;
            const discountValue = getDiscountValue(printAppointment.discount, baseAmount);
            const payableAmount = Math.max(0, baseAmount - discountValue);
            const discountLabel = (printAppointment.discount || '0%').trim() || '0%';
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
                  <span>Scheduled:</span>
                  <strong>{formatDateTime(printAppointment.datetime)}</strong>
                </div>
                <div>
                  <span>Consultation Status:</span>
                  <strong className="consultation-status">{printAppointment.status.toUpperCase()}</strong>
                </div>
              </div>
            </div>
          </header>

          <h1 className="consultation-title">{`Consultation Form - ${printAppointment.patient}`}</h1>

          <section className="consultation-grid">
            <div className="consultation-field">
              <span>Name</span>
              <div>{printAppointment.patient}</div>
            </div>
            <div className="consultation-field">
              <span>Contact</span>
              <div>{printAppointment.phone}</div>
            </div>
            <div className="consultation-field">
              <span>Patient Code</span>
              <div>{printAppointment.id}</div>
            </div>
            <div className="consultation-field">
              <span>Consultant</span>
              <div>{printAppointment.doctor}</div>
            </div>
            <div className="consultation-field consultation-field--wide">
              <span>Consultancy / Service</span>
              <div>{printAppointment.service}</div>
            </div>
            <div className="consultation-field">
              <span>Centre</span>
              <div>{printAppointment.centre}</div>
            </div>
          </section>

          {showFinancial && (
            <section className="consultation-block">
              <div className="consultation-block__title">Payment Summary</div>
              <table className="consultation-table">
                <thead>
                  <tr>
                    <th>Amount</th>
                    <th>Discount</th>
                    <th>Payable</th>
                    <th>Status</th>
                    <th>Method</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{formatMoney(baseAmount)}</td>
                    <td>{`${discountLabel} (${formatMoney(discountValue)})`}</td>
                    <td>{formatMoney(payableAmount)}</td>
                    <td>{printAppointment.paymentStatus}</td>
                    <td>{printAppointment.paymentMethod || 'CASH'}</td>
                  </tr>
                </tbody>
              </table>
            </section>
          )}

          {treatmentRows.length > 0 && (
            <section className="consultation-block">
              <div className="consultation-block__title">Selected Treatments</div>
              <table className="consultation-table">
                <thead>
                  <tr>
                    <th>Treatment</th>
                    <th>Price</th>
                  </tr>
                </thead>
                <tbody>
                  {treatmentRows.map((row) => (
                    <tr key={row.name}>
                      <td>{row.name}</td>
                      <td>{formatMoney(row.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {printAppointment.notes && printAppointment.notes !== '-' && (
            <section className="consultation-block">
              <div className="consultation-block__title">Notes</div>
              <div className="consultation-notes" style={{ padding: 8, height: 'auto', minHeight: 70 }}>
                {printAppointment.notes}
              </div>
            </section>
          )}

          <section className="consultation-block">
            <div className="consultation-block__title">Health History (tick all applicable)</div>
            <div className="consultation-checklist">
              {[
                'Illness within 5 years',
                'Anemia',
                'Thyroid disorder',
                'Diabetes',
                'Heart implants/stents',
                'Psychiatric disorders',
                'Seizures/Epilepsy',
                'Hormonal disorders/therapy',
                'Cancer',
                'Any surgeries done',
                'Kidney disease/dialysis',
                'Liver disease',
                'Clotting disorder',
                'Dental implants/bridge/plates',
                'HIV/AIDS',
                'Skin disease',
                'PCOS',
                'Others',
                'Cardiovascular problems',
                'Nervous disorders',
                'Drug/alcohol use',
                'Heart disease',
                'Hernia/Hiatal hernia surgery',
                'Hepatitis',
                'High blood pressure',
                'Pregnancy',
              ].map((item) => (
                <label key={item} className="consultation-check">
                  <span className="check-box" />
                  <span>{item}</span>
                </label>
              ))}
            </div>
          </section>

          <section className="consultation-block">
            <div className="consultation-block__title">Explain marked answers / Current Medications</div>
            <div className="consultation-notes" />
          </section>

          <section className="consultation-block">
            <div className="consultation-block__title">Treatment Recommended</div>
            <table className="consultation-table">
              <thead>
                <tr>
                  <th>Treatment Advised</th>
                  <th>Sessions</th>
                  <th>Retail</th>
                  <th>Disc %</th>
                  <th>Offered Price</th>
                  <th>Client Willing?</th>
                  <th>Converted?</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 3 }).map((_, index) => (
                  <tr key={index}>
                    <td />
                    <td />
                    <td />
                    <td />
                    <td />
                    <td />
                    <td />
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="consultation-signatures">
            <div>
              <div className="signature-line" />
              <div className="signature-label">Consultant Signature</div>
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
      {assigning && (
        <div className="modal-backdrop" role="presentation" onClick={() => setAssigning(null)}>
          <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <div className="strong">Assign Package</div>
              <button className="icon-btn" onClick={() => setAssigning(null)} aria-label="Close">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M18.3 5.71 12 12l6.3 6.29-1.41 1.42L10.59 13.4 4.29 19.71 2.88 18.3 9.18 12 2.88 5.71 4.29 4.3l6.3 6.3 6.29-6.3 1.42 1.41z"
                    fill="currentColor"
                  />
                </svg>
              </button>
            </div>
            <div className="stack">
              <div className="muted small">Patient: {assigning.patient} ({assigning.phone})</div>
              <select
                className="input"
                value={selectedPackage}
                onChange={(e) => setSelectedPackage(e.target.value)}
              >
                <option value="">-- Select Package --</option>
                {packages.filter((pkg) => pkg.active).map((pkg) => (
                  <option key={pkg.name} value={pkg.name}>
                    {pkg.name}
                  </option>
                ))}
              </select>
              <div className="action-stack">
                <button className="pill" onClick={handleConfirmAssign}>
                  Assign
                </button>
                <button className="pill pill--ghost" onClick={() => setAssigning(null)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
