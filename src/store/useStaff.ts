import { create } from 'zustand';
import { hashPassword } from '../utils/password';

export type StaffRole = 'Doctor' | 'Nurse' | 'Reception' | 'Admin' | 'Technician' | 'FDO';

export type StaffMember = {
  id: string;
  name: string;
  role: StaffRole;
  phone: string;
  email: string;
  specialty?: string;
  branch?: string;
  status: 'Active' | 'Inactive';
  /** Hashed password for staff login; never stored in plain text */
  passwordHash?: string;
};

type StaffState = {
  staff: StaffMember[];
  addStaff: (member: Omit<StaffMember, 'id'>) => StaffMember;
  updateStatus: (id: string, status: StaffMember['status']) => void;
  removeStaff: (id: string) => void;
  /** Verify staff by email + password; returns member if valid, null otherwise */
  verifyStaffCredentials: (email: string, password: string) => Promise<StaffMember | null>;
};

const STORAGE_KEY = 'clinic-staff';

const initialStaff: StaffMember[] = [
  { id: 'D-001', name: 'Dr. Khan', role: 'Doctor', phone: '0300-1112233', email: 'dr.khan@clinic.pk', specialty: 'Hair Transplant', branch: 'Main', status: 'Active' },
  { id: 'D-002', name: 'Dr. Fatima', role: 'Doctor', phone: '0301-5556677', email: 'dr.fatima@clinic.pk', specialty: 'Laser & Aesthetics', branch: 'Main', status: 'Active' },
  { id: 'S-101', name: 'Ayesha', role: 'Reception', phone: '0333-2020202', email: 'ayesha@clinic.pk', specialty: 'Front Desk', branch: 'Main', status: 'Active' },
  { id: 'S-102', name: 'Bilal', role: 'Technician', phone: '0321-9090909', email: 'bilal@clinic.pk', specialty: 'Laser Technician', branch: 'Clinic Store', status: 'Inactive' },
];

const loadStaff = (): StaffMember[] => {
  if (typeof window === 'undefined') return initialStaff;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialStaff;
    const parsed = JSON.parse(raw) as StaffMember[];
    return Array.isArray(parsed) ? parsed : initialStaff;
  } catch (err) {
    console.error('Failed to load staff', err);
    return initialStaff;
  }
};

const persistStaff = (rows: StaffMember[]) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  } catch (err) {
    console.error('Failed to persist staff', err);
  }
};

export const useStaff = create<StaffState>((set) => ({
  staff: loadStaff(),
  addStaff: (member) => {
    let created: StaffMember | null = null;
    set((state) => {
      const idPrefix = member.role === 'Doctor' ? 'D' : 'S';
      created = {
        ...member,
        id: `${idPrefix}-${Math.floor(100 + Math.random() * 900)}`,
      };
      const next = [created, ...state.staff];
      persistStaff(next);
      return { staff: next };
    });
    return created!;
  },
  updateStatus: (id, status) =>
    set((state) => {
      const next = state.staff.map((s) => (s.id === id ? { ...s, status } : s));
      persistStaff(next);
      return { staff: next };
    }),
  removeStaff: (id) =>
    set((state) => {
      const next = state.staff.filter((s) => s.id !== id);
      persistStaff(next);
      return { staff: next };
    }),
  verifyStaffCredentials: async (email, password) => {
    const hash = await hashPassword(password);
    const state = useStaff.getState();
    const member = state.staff.find(
      (s) =>
        s.email.toLowerCase() === email.trim().toLowerCase() &&
        s.passwordHash === hash &&
        s.status === 'Active'
    );
    return member ?? null;
  },
}));
