import { create } from 'zustand';
import { initialPackageDefinitions } from '../data/packages';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';

export type ClinicPackage = {
  id: string;
  name: string;
  services: string[];
  price: string;
  duration: string;
  active: boolean;
};

type PackagesState = {
  packages: ClinicPackage[];
  isLoading: boolean;
  error: string | null;
  hydrate: () => Promise<void>;
  addPackage: (payload: Omit<ClinicPackage, 'id'>) => Promise<ClinicPackage | null>;
  updatePackage: (id: string, changes: Partial<Omit<ClinicPackage, 'id'>>) => Promise<ClinicPackage | null>;
  removePackage: (id: string) => Promise<void>;
};

const STORAGE_KEY = 'clinic-packages';

const seededPackages: ClinicPackage[] = initialPackageDefinitions.map((pkg, index) => ({
  id: `PK-${String(index + 1).padStart(3, '0')}`,
  ...pkg,
}));

const loadPackages = (): ClinicPackage[] => {
  if (typeof window === 'undefined') return seededPackages;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return seededPackages;
    const parsed = JSON.parse(raw) as ClinicPackage[];
    return Array.isArray(parsed) ? parsed : seededPackages;
  } catch (err) {
    console.error('Failed to load packages', err);
    return seededPackages;
  }
};

const persistPackages = (rows: ClinicPackage[]) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  } catch (err) {
    console.error('Failed to persist packages', err);
  }
};

const createLocalId = () => `pkg-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

type PackageRow = {
  id: string;
  name: string;
  services: string[] | null;
  price: string;
  duration: string;
  active: boolean;
};

const toModel = (row: PackageRow): ClinicPackage => ({
  id: row.id,
  name: row.name,
  services: Array.isArray(row.services) ? row.services : [],
  price: row.price,
  duration: row.duration,
  active: row.active,
});

const toPayload = (pkg: ClinicPackage) => ({
  id: pkg.id,
  name: pkg.name,
  services: pkg.services,
  price: pkg.price,
  duration: pkg.duration,
  active: pkg.active,
});

export const usePackages = create<PackagesState>((set, get) => ({
  packages: loadPackages(),
  isLoading: false,
  error: null,
  hydrate: async () => {
    if (!isSupabaseConfigured || !supabase) {
      set({ packages: loadPackages(), isLoading: false, error: null });
      return;
    }

    set({ isLoading: true, error: null });
    const { data, error } = await supabase.from('packages').select('*').order('name', { ascending: true });
    if (error || !data) {
      set({
        packages: loadPackages(),
        isLoading: false,
        error: error?.message ?? 'Failed to load packages.',
      });
      return;
    }

    const mapped = (data as PackageRow[]).length ? (data as PackageRow[]).map(toModel) : loadPackages();
    persistPackages(mapped);
    set({ packages: mapped, isLoading: false, error: null });
  },
  addPackage: async (payload) => {
    const created: ClinicPackage = { id: createLocalId(), ...payload };
    if (!isSupabaseConfigured || !supabase) {
      set((state) => {
        const next = [created, ...state.packages];
        persistPackages(next);
        return { packages: next, error: null };
      });
      return created;
    }

    const { data, error } = await supabase.from('packages').insert(toPayload(created)).select('*').single();
    if (error || !data) {
      set({ error: error?.message ?? 'Failed to add package.' });
      return null;
    }

    const saved = toModel(data as PackageRow);
    set((state) => {
      const next = [saved, ...state.packages];
      persistPackages(next);
      return { packages: next, error: null };
    });
    return saved;
  },
  updatePackage: async (id, changes) => {
    const current = get().packages.find((pkg) => pkg.id === id);
    if (!current) {
      set({ error: 'Package not found.' });
      return null;
    }

    const updated: ClinicPackage = { ...current, ...changes, id };
    if (!isSupabaseConfigured || !supabase) {
      set((state) => {
        const next = state.packages.map((pkg) => (pkg.id === id ? updated : pkg));
        persistPackages(next);
        return { packages: next, error: null };
      });
      return updated;
    }

    const { data, error } = await supabase
      .from('packages')
      .upsert(toPayload(updated), { onConflict: 'id' })
      .select('*')
      .single();
    if (error || !data) {
      set({ error: error?.message ?? 'Failed to update package.' });
      return null;
    }

    const saved = toModel(data as PackageRow);
    set((state) => {
      const next = state.packages.map((pkg) => (pkg.id === id ? saved : pkg));
      persistPackages(next);
      return { packages: next, error: null };
    });
    return saved;
  },
  removePackage: async (id) => {
    if (!isSupabaseConfigured || !supabase) {
      set((state) => {
        const next = state.packages.filter((pkg) => pkg.id !== id);
        persistPackages(next);
        return { packages: next, error: null };
      });
      return;
    }

    const { error } = await supabase.from('packages').delete().eq('id', id);
    if (error) {
      set({ error: error.message });
      return;
    }

    const next = get().packages.filter((pkg) => pkg.id !== id);
    persistPackages(next);
    set({ packages: next, error: null });
  },
}));
