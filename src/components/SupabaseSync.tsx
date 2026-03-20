import React, { useEffect } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';
import { useAppointments } from '../store/useAppointments';
import { useClinicalServices } from '../store/useClinicalServices';
import { usePackageAssignments } from '../store/usePackageAssignments';
import { usePayments } from '../store/usePayments';
import { useProductSales } from '../store/useProductSales';
import { useStaff } from '../store/useStaff';

export const SupabaseSync: React.FC = () => {
  const { hydrate: hydrateAppointments } = useAppointments();
  const { hydrate: hydratePayments } = usePayments();
  const { hydrate: hydrateStaff } = useStaff();
  const { hydrate: hydrateServices } = useClinicalServices();
  const { hydrate: hydrateAssignments } = usePackageAssignments();
  const { hydrate: hydrateSales } = useProductSales();

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    const pending = new Map<string, number>();
    const scheduleHydrate = (key: string, hydrate: () => Promise<void>) => {
      const current = pending.get(key);
      if (current) {
        window.clearTimeout(current);
      }
      const timeout = window.setTimeout(() => {
        pending.delete(key);
        void hydrate();
      }, 200);
      pending.set(key, timeout);
    };

    const channel = supabase
      .channel('nova-live-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
        scheduleHydrate('appointments', hydrateAppointments);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => {
        scheduleHydrate('payments', hydratePayments);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'staff' }, () => {
        scheduleHydrate('staff', hydrateStaff);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clinical_services' }, () => {
        scheduleHydrate('clinical_services', hydrateServices);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'package_assignments' }, () => {
        scheduleHydrate('package_assignments', hydrateAssignments);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        scheduleHydrate('product_sales', hydrateSales);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_orders' }, () => {
        scheduleHydrate('product_sales', hydrateSales);
      })
      .subscribe();

    return () => {
      pending.forEach((timeout) => window.clearTimeout(timeout));
      void supabase.removeChannel(channel);
    };
  }, [
    hydrateAppointments,
    hydrateAssignments,
    hydratePayments,
    hydrateSales,
    hydrateServices,
    hydrateStaff,
  ]);

  return null;
};
