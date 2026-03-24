import { create } from 'zustand';
import { clinicalServices as initialServices, type ClinicalService } from '../data/clinicalServices';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';

type ClinicalServicesState = {
  services: ClinicalService[];
  isLoading: boolean;
  error: string | null;
  hydrate: () => Promise<void>;
  addService: (service: Omit<ClinicalService, 'id'>) => Promise<ClinicalService | null>;
  updateService: (id: string, changes: Partial<Omit<ClinicalService, 'id'>>) => Promise<ClinicalService | null>;
  removeService: (id: string) => Promise<void>;
};

const STORAGE_KEY = 'clinic-clinical-services';

const loadServices = (): ClinicalService[] => {
  if (typeof window === 'undefined') return initialServices;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialServices;
    const parsed = JSON.parse(raw) as ClinicalService[];
    return Array.isArray(parsed) ? parsed : initialServices;
  } catch (err) {
    console.error('Failed to load services', err);
    return initialServices;
  }
};

const persistServices = (rows: ClinicalService[]) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  } catch (err) {
    console.error('Failed to persist services', err);
  }
};

const createLocalId = () => `svc-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

export const useClinicalServices = create<ClinicalServicesState>((set, get) => ({
  services: loadServices(),
  isLoading: false,
  error: null,
  hydrate: async () => {
    if (!isSupabaseConfigured || !supabase) {
      set({ services: loadServices(), isLoading: false, error: null });
      return;
    }
    set({ isLoading: true, error: null });
    const { data, error } = await supabase
      .from('clinical_services')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true });
    if (error || !data) {
      set({
        services: loadServices(),
        isLoading: false,
        error: error?.message ?? 'Failed to load services from database.',
      });
      return;
    }
    const mapped = data as ClinicalService[];
    if (mapped.length === 0) {
      const cached = loadServices();
      if (cached.length > 0) {
        const { error: seedError } = await supabase
          .from('clinical_services')
          .upsert(cached, { onConflict: 'id' });
        if (!seedError) {
          persistServices(cached);
          set({ services: cached, isLoading: false, error: null });
          return;
        }
      }
    }
    persistServices(mapped);
    set({ services: mapped, isLoading: false, error: null });
  },
  addService: async (service) => {
    const fallbackId = createLocalId();
    if (!isSupabaseConfigured || !supabase) {
      const created: ClinicalService = { ...service, id: fallbackId };
      set((state) => {
        const next = [created, ...state.services];
        persistServices(next);
        return { services: next };
      });
      return created;
    }
    const payload = { ...service, id: fallbackId };
    const { data, error } = await supabase
      .from('clinical_services')
      .insert(payload)
      .select('*')
      .single();
    if (error || !data) {
      set({ error: error?.message ?? 'Failed to add service.' });
      return null;
    }
    const created = data as ClinicalService;
    set((state) => {
      const next = [created, ...state.services];
      persistServices(next);
      return { services: next, error: null };
    });
    return created;
  },
  updateService: async (id, changes) => {
    const current = get().services.find((service) => service.id === id);
    if (!current) {
      set({ error: 'Service not found.' });
      return null;
    }

    const updated: ClinicalService = { ...current, ...changes, id };

    if (!isSupabaseConfigured || !supabase) {
      set((state) => {
        const next = state.services.map((service) => (service.id === id ? updated : service));
        persistServices(next);
        return { services: next, error: null };
      });
      return updated;
    }

    const { data, error } = await supabase
      .from('clinical_services')
      .upsert(updated, { onConflict: 'id' })
      .select('*')
      .single();
    if (error || !data) {
      set({ error: error?.message ?? 'Failed to update service.' });
      return null;
    }

    const saved = data as ClinicalService;
    set((state) => {
      const next = state.services.map((service) => (service.id === id ? saved : service));
      persistServices(next);
      return { services: next, error: null };
    });
    return saved;
  },
  removeService: async (id) => {
    if (!isSupabaseConfigured || !supabase) {
      set((state) => {
        const next = state.services.filter((s) => s.id !== id);
        persistServices(next);
        return { services: next };
      });
      return;
    }
    const { error } = await supabase.from('clinical_services').delete().eq('id', id);
    if (error) {
      set({ error: error.message });
      return;
    }
    const next = get().services.filter((s) => s.id !== id);
    persistServices(next);
    set({ services: next, error: null });
  },
}));
