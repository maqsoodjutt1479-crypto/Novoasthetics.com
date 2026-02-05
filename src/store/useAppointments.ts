import { create } from 'zustand';

export type AppointmentStatus = 'Pending' | 'Coming Soon' | 'Arrived' | 'Delayed' | 'Confirmed' | 'Cancelled';
export type PaymentStatus = 'Paid' | 'Partial' | 'Unpaid';

export type Appointment = {
  id: string;
  patientId?: string;
  patient: string;
  phone: string;
  doctor: string;
  datetime: string;
  service: string;
  apptType: string;
  centre: string;
  status: AppointmentStatus;
  amount: number;
  discount: string;
  notes: string;
  paymentStatus: PaymentStatus;
  paymentMethod?: 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'OTHER';
  createdAt?: string;
  followUpForId?: string;
};

type AppointmentState = {
  appointments: Appointment[];
  addAppointment: (appt: Omit<Appointment, 'id' | 'status' | 'createdAt'> & { status?: AppointmentStatus }) => Appointment;
  updateStatus: (id: string, status: AppointmentStatus) => void;
  updateAppointment: (id: string, changes: Partial<Appointment>) => void;
};

const STORAGE_KEY = 'clinic-appointments';

const loadAppointments = (): Appointment[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Appointment[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to load appointments', err);
    return [];
  }
};

const persistAppointments = (rows: Appointment[]) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  } catch (err) {
    console.error('Failed to persist appointments', err);
  }
};

export const useAppointments = create<AppointmentState>((set) => ({
  appointments: loadAppointments(),
  addAppointment: (appt) => {
    let created: Appointment | null = null;
    set((state) => {
      const id = `PT-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`;
      const createdAt = new Date().toISOString();
      created = {
        ...appt,
        id,
        status: appt.status ?? 'Pending',
        service: appt.service || 'Skin Treatment',
        apptType: appt.apptType || 'Consultation',
        centre: appt.centre || 'BRFSD',
        paymentMethod: appt.paymentMethod || 'CASH',
        createdAt,
      };
      const next = [created, ...state.appointments];
      persistAppointments(next);
      return { appointments: next };
    });
    return created!;
  },
  updateStatus: (id, status) =>
    set((state) => {
      const next = state.appointments.map((a) => (a.id === id ? { ...a, status } : a));
      persistAppointments(next);
      return { appointments: next };
    }),
  updateAppointment: (id, changes) =>
    set((state) => {
      const next = state.appointments.map((a) => (a.id === id ? { ...a, ...changes } : a));
      persistAppointments(next);
      return { appointments: next };
    }),
}));
