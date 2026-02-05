import { create } from 'zustand';

export type PaymentMethod = 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'OTHER';

export type Payment = {
  id: string;
  date: string;
  patientId: string;
  patientName: string;
  method: PaymentMethod;
  amount: number;
  cash: number;
  card: number;
  bank: number;
  other: number;
  source: string;
};

type PaymentState = {
  payments: Payment[];
  addPayment: (payment: Omit<Payment, 'id'>) => void;
  upsertPayment: (payment: Omit<Payment, 'id'>) => void;
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

export const usePayments = create<PaymentState>((set) => ({
  payments: loadPayments(),
  addPayment: (payment) =>
    set((state) => {
      const id = `${Math.floor(100 + Math.random() * 900)}`;
      const next = [{ ...payment, id }, ...state.payments];
      persistPayments(next);
      return { payments: next };
    }),
  upsertPayment: (payment) =>
    set((state) => {
      const index = state.payments.findIndex((row) => row.source === payment.source);
      if (index === -1) {
        const id = `${Math.floor(100 + Math.random() * 900)}`;
        const next = [{ ...payment, id }, ...state.payments];
        persistPayments(next);
        return { payments: next };
      }
      const next = state.payments.map((row, i) => (i === index ? { ...row, ...payment } : row));
      persistPayments(next);
      return { payments: next };
    }),
}));
