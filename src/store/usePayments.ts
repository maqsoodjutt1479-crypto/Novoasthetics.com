import { create } from 'zustand';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';

export type PaymentMethod = 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'OTHER';

export type Payment = {
  id: string;
  date: string;
  patientId: string;
  patientName: string;
  method: PaymentMethod;
  amount: number;
  discount?: string;
  notes?: string;
  cash: number;
  card: number;
  bank: number;
  other: number;
  source: string;
};

type PaymentState = {
  payments: Payment[];
  isLoading: boolean;
  error: string | null;
  hydrate: () => Promise<void>;
  addPayment: (payment: Omit<Payment, 'id'>) => Promise<Payment | null>;
  upsertPayment: (payment: Omit<Payment, 'id'>) => Promise<Payment | null>;
};

const STORAGE_KEY = 'clinic-payments';

const loadPayments = (): Payment[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Payment[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to load payments', err);
    return [];
  }
};

const persistPayments = (rows: Payment[]) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  } catch (err) {
    console.error('Failed to persist payments', err);
  }
};

type PaymentRow = {
  id: string;
  date: string;
  patient_id: string;
  patient_name: string;
  method: PaymentMethod;
  amount: number;
  discount: string | null;
  notes?: string | null;
  cash: number;
  card: number;
  bank: number;
  other: number;
  source: string;
};

const toModel = (row: PaymentRow): Payment => ({
  id: row.id,
  date: row.date,
  patientId: row.patient_id,
  patientName: row.patient_name,
  method: row.method,
  amount: row.amount,
  discount: row.discount ?? undefined,
  notes: row.notes ?? undefined,
  cash: row.cash,
  card: row.card,
  bank: row.bank,
  other: row.other,
  source: row.source,
});

const toRowPayload = (payment: Payment) => ({
  id: payment.id,
  date: payment.date,
  patient_id: payment.patientId,
  patient_name: payment.patientName,
  method: payment.method,
  amount: payment.amount,
  discount: payment.discount ?? null,
  notes: payment.notes ?? null,
  cash: payment.cash,
  card: payment.card,
  bank: payment.bank,
  other: payment.other,
  source: payment.source,
});

export const usePayments = create<PaymentState>((set, get) => ({
  payments: loadPayments(),
  isLoading: false,
  error: null,
  hydrate: async () => {
    if (!isSupabaseConfigured || !supabase) {
      set({ payments: loadPayments(), isLoading: false, error: null });
      return;
    }
    set({ isLoading: true, error: null });
    const { data, error } = await supabase.from('payments').select('*').order('date', { ascending: false });
    if (error || !data) {
      set({
        payments: loadPayments(),
        isLoading: false,
        error: error?.message ?? 'Failed to load payments from database.',
      });
      return;
    }
    const mapped = (data as PaymentRow[]).map(toModel);
    persistPayments(mapped);
    set({ payments: mapped, isLoading: false, error: null });
  },
  addPayment: async (payment) => {
    const created: Payment = {
      ...payment,
      id: `PM-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`,
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('payments')
        .upsert(toRowPayload(created), { onConflict: 'id' })
        .select('*')
        .single();
      if (error || !data) {
        set({ error: error?.message ?? 'Failed to save payment.' });
        return null;
      }
      const saved = toModel(data as PaymentRow);
      set((state) => {
        const next = [saved, ...state.payments];
        persistPayments(next);
        return { payments: next, error: null };
      });
      return saved;
    }

    set((state) => {
      const next = [created, ...state.payments];
      persistPayments(next);
      return { payments: next, error: null };
    });
    return created;
  },
  upsertPayment: async (payment) => {
    const current = get().payments.find((row) => row.source === payment.source);
    const nextPayment: Payment = current
      ? { ...current, ...payment, id: current.id }
      : { ...payment, id: `PM-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}` };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('payments')
        .upsert(toRowPayload(nextPayment), { onConflict: 'id' })
        .select('*')
        .single();
      if (error || !data) {
        set({ error: error?.message ?? 'Failed to save payment.' });
        return null;
      }
      const saved = toModel(data as PaymentRow);
      set((state) => {
        const exists = state.payments.some((row) => row.id === saved.id);
        const next = exists
          ? state.payments.map((row) => (row.id === saved.id ? saved : row))
          : [saved, ...state.payments];
        persistPayments(next);
        return { payments: next, error: null };
      });
      return saved;
    }

    set((state) => {
      const exists = state.payments.some((row) => row.id === nextPayment.id);
      const next = exists
        ? state.payments.map((row) => (row.id === nextPayment.id ? nextPayment : row))
        : [nextPayment, ...state.payments];
      persistPayments(next);
      return { payments: next, error: null };
    });
    return nextPayment;
  },
}));
