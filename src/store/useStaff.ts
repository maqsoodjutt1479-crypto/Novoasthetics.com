import { create } from 'zustand';
import { hashPassword } from '../utils/password';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';

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
  isLoading: boolean;
  error: string | null;
  hydrate: () => Promise<void>;
  addStaff: (member: Omit<StaffMember, 'id'>) => StaffMember;
  registerStaffAccount: (member: {
    name: string;
    phone: string;
    email: string;
    password: string;
    role: Extract<StaffRole, 'Doctor' | 'FDO'>;
    specialty?: string;
    branch?: string;
  }) => Promise<{ member: StaffMember | null; error: string | null }>;
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

const createStaffId = (role: StaffRole) => {
  const prefix = role === 'Doctor' ? 'D' : 'S';
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
};

type StaffRow = {
  id: string;
  name: string;
  role: StaffRole;
  phone: string;
  email: string;
  specialty: string | null;
  branch: string | null;
  status: 'Active' | 'Inactive';
  password_hash: string | null;
};

const toModel = (row: StaffRow): StaffMember => ({
  id: row.id,
  name: row.name,
  role: row.role,
  phone: row.phone,
  email: row.email,
  specialty: row.specialty ?? undefined,
  branch: row.branch ?? undefined,
  status: row.status,
  passwordHash: row.password_hash ?? undefined,
});

const toRowPayload = (member: StaffMember) => ({
  id: member.id,
  name: member.name,
  role: member.role,
  phone: member.phone,
  email: member.email,
  specialty: member.specialty ?? null,
  branch: member.branch ?? null,
  status: member.status,
  password_hash: member.passwordHash ?? null,
});

export const useStaff = create<StaffState>((set, get) => ({
  staff: loadStaff(),
  isLoading: false,
  error: null,
  hydrate: async () => {
    if (!isSupabaseConfigured || !supabase) {
      const cached = loadStaff();
      set({ staff: cached, isLoading: false, error: null });
      return;
    }
    set({ isLoading: true, error: null });
    const { data, error } = await supabase.from('staff').select('*').order('name', { ascending: true });
    if (error || !data) {
      set({
        staff: loadStaff(),
        isLoading: false,
        error: error?.message ?? 'Failed to load staff from database.',
      });
      return;
    }
    const mapped = (data as StaffRow[]).map(toModel);
    persistStaff(mapped);
    set({ staff: mapped, isLoading: false, error: null });
  },
  addStaff: (member) => {
    let created: StaffMember | null = null;
    set((state) => {
      created = {
        ...member,
        id: createStaffId(member.role),
      };
      const next = [created, ...state.staff];
      persistStaff(next);
      return { staff: next };
    });
    if (created && isSupabaseConfigured && supabase) {
      void supabase.from('staff').upsert(toRowPayload(created), { onConflict: 'id' }).then(({ error }) => {
        if (error) {
          set({ error: error.message });
        }
      });
    }
    return created!;
  },
  registerStaffAccount: async (member) => {
    const email = member.email.trim().toLowerCase();
    const duplicate = get().staff.find((row) => row.email.toLowerCase() === email);
    if (duplicate) {
      return { member: null, error: 'This email is already registered.' };
    }

    const passwordHash = await hashPassword(member.password);
    const created: StaffMember = {
      id: createStaffId(member.role),
      name: member.name.trim(),
      role: member.role,
      phone: member.phone.trim(),
      email,
      specialty: member.specialty?.trim() || undefined,
      branch: member.branch?.trim() || undefined,
      status: 'Active',
      passwordHash,
    };

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('staff').upsert(toRowPayload(created), { onConflict: 'id' });
      if (error) {
        return { member: null, error: error.message };
      }
    }

    set((state) => {
      const next = [created, ...state.staff];
      persistStaff(next);
      return { staff: next, error: null };
    });

    return { member: created, error: null };
  },
  updateStatus: (id, status) =>
    set((state) => {
      const next = state.staff.map((s) => (s.id === id ? { ...s, status } : s));
      persistStaff(next);
      if (isSupabaseConfigured && supabase) {
        void supabase.from('staff').update({ status }).eq('id', id).then(({ error }) => {
          if (error) {
            set({ error: error.message });
          }
        });
      }
      return { staff: next };
    }),
  removeStaff: (id) =>
    set((state) => {
      const next = state.staff.filter((s) => s.id !== id);
      persistStaff(next);
      if (isSupabaseConfigured && supabase) {
        void supabase.from('staff').delete().eq('id', id).then(({ error }) => {
          if (error) {
            set({ error: error.message });
          }
        });
      }
      return { staff: next };
    }),
  verifyStaffCredentials: async (email, password) => {
    const hash = await hashPassword(password);
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .ilike('email', email.trim())
        .eq('password_hash', hash)
        .eq('status', 'Active')
        .maybeSingle();
      if (!error && data) {
        return toModel(data as StaffRow);
      }
    }
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
