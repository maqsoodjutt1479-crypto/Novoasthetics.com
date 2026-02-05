import { create } from 'zustand';

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

export const usePackageAssignments = create<PackageAssignmentState>((set) => ({
  assignments: loadAssignments(),
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
      return { assignments: next };
    });
    return created!;
  },
}));
