import { create } from 'zustand';
import { Appointment } from './useAppointments';

export type Notification = {
  id: string;
  kind: 'booking' | 'reminder';
  message: string;
  createdAt: string;
  appointmentId?: string;
  patient?: string;
  phone?: string;
  doctor?: string;
  datetime?: string;
};

type NotificationState = {
  notifications: Notification[];
  addFromAppointment: (appt: Appointment) => void;
  addReminderFromAppointment: (appt: Appointment) => void;
  syncReminders: (appointments: Appointment[]) => void;
  markRead: (id: string) => void;
  markByAppointment: (appointmentId: string) => void;
};

const STORAGE_KEY = 'clinic-notifications';

const loadNotifications = (): Notification[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Notification[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to load notifications', err);
    return [];
  }
};

const persistNotifications = (rows: Notification[]) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  } catch (err) {
    console.error('Failed to persist notifications', err);
  }
};

const getDatePart = (value: string) => value.split('T')[0]?.split(' ')[0] || value;

export const useNotifications = create<NotificationState>((set) => ({
  notifications: loadNotifications(),
  addFromAppointment: (appt) =>
    set((state) => {
      const id = `NT-${Math.floor(1000 + Math.random() * 9000)}`;
      const createdAt = appt.createdAt || new Date().toISOString();
      const notif: Notification = {
        id,
        kind: 'booking',
        message: `New booking: ${appt.patient} with ${appt.doctor} @ ${appt.datetime}`,
        createdAt,
        appointmentId: appt.id,
        patient: appt.patient,
        phone: appt.phone,
        doctor: appt.doctor,
        datetime: appt.datetime,
      };
      const next = [notif, ...state.notifications];
      persistNotifications(next);
      return { notifications: next };
    }),
  addReminderFromAppointment: (appt) =>
    set((state) => {
      if (state.notifications.some((n) => n.kind === 'reminder' && n.appointmentId === appt.id)) {
        return state;
      }
      const id = `NR-${Math.floor(1000 + Math.random() * 9000)}`;
      const createdAt = new Date().toISOString();
      const notif: Notification = {
        id,
        kind: 'reminder',
        message: `Reminder: ${appt.patient} has appointment on ${appt.datetime}`,
        createdAt,
        appointmentId: appt.id,
        patient: appt.patient,
        phone: appt.phone,
        doctor: appt.doctor,
        datetime: appt.datetime,
      };
      const next = [notif, ...state.notifications];
      persistNotifications(next);
      return { notifications: next };
    }),
  syncReminders: (appointments) =>
    set((state) => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowKey = tomorrow.toLocaleDateString('en-CA');
      const desired = appointments.filter(
        (appt) => getDatePart(appt.datetime) === tomorrowKey && appt.status !== 'Cancelled'
      );
      const desiredMap = new Map(desired.map((appt) => [appt.id, appt]));
      const existingReminders = state.notifications.filter((n) => n.kind === 'reminder');
      const keptReminders = existingReminders
        .filter((n) => n.appointmentId && desiredMap.has(n.appointmentId))
        .map((n) => {
          const appt = n.appointmentId ? desiredMap.get(n.appointmentId) : undefined;
          if (!appt) return n;
          return {
            ...n,
            message: `Reminder: ${appt.patient} has appointment on ${appt.datetime}`,
            patient: appt.patient,
            phone: appt.phone,
            doctor: appt.doctor,
            datetime: appt.datetime,
          };
        });
      const newReminders = desired.filter(
        (appt) => !existingReminders.some((n) => n.appointmentId === appt.id)
      );
      const createdReminders = newReminders.map((appt) => ({
        id: `NR-${Math.floor(1000 + Math.random() * 9000)}`,
        kind: 'reminder' as const,
        message: `Reminder: ${appt.patient} has appointment on ${appt.datetime}`,
        createdAt: new Date().toISOString(),
        appointmentId: appt.id,
        patient: appt.patient,
        phone: appt.phone,
        doctor: appt.doctor,
        datetime: appt.datetime,
      }));
      const nonReminders = state.notifications.filter((n) => n.kind !== 'reminder');
      const next = [...createdReminders, ...keptReminders, ...nonReminders];
      persistNotifications(next);
      return { notifications: next };
    }),
  markRead: (id) =>
    set((state) => {
      const next = state.notifications.filter((n) => n.id !== id);
      persistNotifications(next);
      return { notifications: next };
    }),
  markByAppointment: (appointmentId) =>
    set((state) => {
      const next = state.notifications.filter((n) => n.appointmentId !== appointmentId);
      persistNotifications(next);
      return { notifications: next };
    }),
}));
