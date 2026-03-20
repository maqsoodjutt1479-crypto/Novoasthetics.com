import { create } from 'zustand';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';

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
  isLoading: boolean;
  error: string | null;
  hydrate: () => Promise<void>;
  addAppointment: (appt: Omit<Appointment, 'id' | 'status' | 'createdAt'> & { status?: AppointmentStatus }) => Promise<Appointment | null>;
  updateStatus: (id: string, status: AppointmentStatus) => Promise<Appointment | null>;
  updateAppointment: (id: string, changes: Partial<Appointment>) => Promise<Appointment | null>;
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

type AppointmentRow = {
  id: string;
  patient_id: string | null;
  patient: string;
  phone: string;
  doctor: string;
  datetime: string;
  service: string;
  appt_type: string;
  centre: string;
  status: AppointmentStatus;
  amount: number;
  discount: string;
  notes: string;
  payment_status: PaymentStatus;
  payment_method: 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'OTHER' | null;
  created_at: string | null;
  follow_up_for_id: string | null;
};

const toModel = (row: AppointmentRow): Appointment => ({
  id: row.id,
  patientId: row.patient_id ?? undefined,
  patient: row.patient,
  phone: row.phone,
  doctor: row.doctor,
  datetime: row.datetime,
  service: row.service,
  apptType: row.appt_type,
  centre: row.centre,
  status: row.status,
  amount: row.amount,
  discount: row.discount,
  notes: row.notes,
  paymentStatus: row.payment_status,
  paymentMethod: row.payment_method ?? 'CASH',
  createdAt: row.created_at ?? undefined,
  followUpForId: row.follow_up_for_id ?? undefined,
});

const toRowPayload = (appointment: Appointment) => ({
  id: appointment.id,
  patient_id: appointment.patientId ?? null,
  patient: appointment.patient,
  phone: appointment.phone,
  doctor: appointment.doctor,
  datetime: appointment.datetime,
  service: appointment.service,
  appt_type: appointment.apptType,
  centre: appointment.centre,
  status: appointment.status,
  amount: appointment.amount,
  discount: appointment.discount,
  notes: appointment.notes,
  payment_status: appointment.paymentStatus,
  payment_method: appointment.paymentMethod ?? 'CASH',
  created_at: appointment.createdAt ?? new Date().toISOString(),
  follow_up_for_id: appointment.followUpForId ?? null,
});

export const useAppointments = create<AppointmentState>((set, get) => ({
  appointments: loadAppointments(),
  isLoading: false,
  error: null,
  hydrate: async () => {
    if (!isSupabaseConfigured || !supabase) {
      const cached = loadAppointments();
      set({ appointments: cached, isLoading: false, error: null });
      return;
    }

    set({ isLoading: true, error: null });
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .order('datetime', { ascending: false });

    if (error || !data) {
      set({
        appointments: loadAppointments(),
        isLoading: false,
        error: error?.message ?? 'Failed to load appointments from database.',
      });
      return;
    }

    const mapped = (data as AppointmentRow[]).map(toModel);
    persistAppointments(mapped);
    set({ appointments: mapped, isLoading: false, error: null });
  },
  addAppointment: async (appt) => {
    const id = `PT-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`;
    const createdAt = new Date().toISOString();
    const created: Appointment = {
      ...appt,
      id,
      status: appt.status ?? 'Pending',
      service: appt.service || 'Skin Treatment',
      apptType: appt.apptType || 'Consultation',
      centre: appt.centre || 'BRFSD',
      paymentMethod: appt.paymentMethod || 'CASH',
      createdAt,
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('appointments')
        .upsert(toRowPayload(created), { onConflict: 'id' })
        .select('*')
        .single();
      if (error || !data) {
        set({ error: error?.message ?? 'Failed to save appointment.' });
        return null;
      }
      const saved = toModel(data as AppointmentRow);
      set((state) => {
        const next = [saved, ...state.appointments];
        persistAppointments(next);
        return { appointments: next, error: null };
      });
      return saved;
    }

    set((state) => {
      const next = [created, ...state.appointments];
      persistAppointments(next);
      return { appointments: next, error: null };
    });
    return created;
  },
  updateStatus: async (id, status) => {
    const current = get().appointments.find((appointment) => appointment.id === id);
    if (!current) {
      set({ error: 'Appointment not found.' });
      return null;
    }

    const updated = { ...current, status };
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('appointments')
        .upsert(toRowPayload(updated), { onConflict: 'id' })
        .select('*')
        .single();
      if (error || !data) {
        set({ error: error?.message ?? 'Failed to update appointment status.' });
        return null;
      }
      const saved = toModel(data as AppointmentRow);
      set((state) => {
        const next = state.appointments.map((appointment) => (appointment.id === id ? saved : appointment));
        persistAppointments(next);
        return { appointments: next, error: null };
      });
      return saved;
    }

    set((state) => {
      const next = state.appointments.map((appointment) =>
        appointment.id === id ? updated : appointment
      );
      persistAppointments(next);
      return { appointments: next, error: null };
    });
    return updated;
  },
  updateAppointment: async (id, changes) => {
    const current = get().appointments.find((appointment) => appointment.id === id);
    if (!current) {
      set({ error: 'Appointment not found.' });
      return null;
    }

    const updated = { ...current, ...changes, id };
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('appointments')
        .upsert(toRowPayload(updated), { onConflict: 'id' })
        .select('*')
        .single();
      if (error || !data) {
        set({ error: error?.message ?? 'Failed to update appointment.' });
        return null;
      }
      const saved = toModel(data as AppointmentRow);
      set((state) => {
        const next = state.appointments.map((appointment) => (appointment.id === id ? saved : appointment));
        persistAppointments(next);
        return { appointments: next, error: null };
      });
      return saved;
    }

    set((state) => {
      const next = state.appointments.map((appointment) =>
        appointment.id === id ? updated : appointment
      );
      persistAppointments(next);
      return { appointments: next, error: null };
    });
    return updated;
  },
}));
