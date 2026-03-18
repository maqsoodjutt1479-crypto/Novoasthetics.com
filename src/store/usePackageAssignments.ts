import { create } from 'zustand';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';

export type PackageAssignment = {
  id: string;
  packageName: string;
  patientName: string;
  phone: string;
  appointmentId?: string;
  assignedAt: string;
};

type PackageAssignmentState = {
  assignments: PackageAssignment[];
  isLoading: boolean;
  error: string | null;
  hydrate: () => Promise<void>;
  addAssignment: (payload: Omit<PackageAssignment, 'id' | 'assignedAt'>) => PackageAssignment;
};

const STORAGE_KEY = 'clinic-package-assignments';

const loadAssignments = (): PackageAssignment[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PackageAssignment[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to load package assignments', err);
    return [];
  }
};

const persistAssignments = (rows: PackageAssignment[]) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  } catch (err) {
    console.error('Failed to persist package assignments', err);
  }
};

type PackageAssignmentRow = {
  id: string;
  package_name: string;
  patient_name: string;
  phone: string;
  appointment_id: string | null;
  assigned_at: string;
};

const toModel = (row: PackageAssignmentRow): PackageAssignment => ({
  id: row.id,
  packageName: row.package_name,
  patientName: row.patient_name,
  phone: row.phone,
  appointmentId: row.appointment_id ?? undefined,
  assignedAt: row.assigned_at,
});

const toRowPayload = (assignment: PackageAssignment) => ({
  id: assignment.id,
  package_name: assignment.packageName,
  patient_name: assignment.patientName,
  phone: assignment.phone,
  appointment_id: assignment.appointmentId ?? null,
  assigned_at: assignment.assignedAt,
});

export const usePackageAssignments = create<PackageAssignmentState>((set) => ({
  assignments: loadAssignments(),
  isLoading: false,
  error: null,
  hydrate: async () => {
    if (!isSupabaseConfigured || !supabase) {
      set({ assignments: loadAssignments(), isLoading: false, error: null });
      return;
    }
    set({ isLoading: true, error: null });
    const { data, error } = await supabase
      .from('package_assignments')
      .select('*')
      .order('assigned_at', { ascending: false });
    if (error || !data) {
      set({
        assignments: loadAssignments(),
        isLoading: false,
        error: error?.message ?? 'Failed to load package assignments.',
      });
      return;
    }
    const mapped = (data as PackageAssignmentRow[]).map(toModel);
    persistAssignments(mapped);
    set({ assignments: mapped, isLoading: false, error: null });
  },
  addAssignment: (payload) => {
    let created: PackageAssignment | null = null;
    set((state) => {
      created = {
        ...payload,
        id: `PKG-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`,
        assignedAt: new Date().toISOString(),
      };
      const next = [created, ...state.assignments];
      persistAssignments(next);
      if (isSupabaseConfigured && supabase) {
        void supabase
          .from('package_assignments')
          .upsert(toRowPayload(created), { onConflict: 'id' })
          .then(({ error }) => {
            if (error) {
              set({ error: error.message });
            }
          });
      }
      return { assignments: next };
    });
    return created!;
  },
}));
