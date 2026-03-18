import { create } from 'zustand';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';

export type ProductRow = {
  id: string;
  name: string;
  price: number;
  stock: number;
  sold: number;
  notify: boolean;
};

export type Order = {
  id: string;
  patient: string;
  patientId?: string;
  products: string;
  qty: number;
  unitPrice: number;
  items?: Array<{ name: string; qty: number; unitPrice: number }>;
  location: string;
  total: number;
  paid: number;
  method: 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'OTHER';
  status: 'Pending' | 'Paid' | 'Partial' | 'Cancelled';
  createdAt: string;
};

type ProductSalesState = {
  products: ProductRow[];
  orders: Order[];
  isLoading: boolean;
  error: string | null;
  hydrate: () => Promise<void>;
  addProduct: (product: Omit<ProductRow, 'id'>) => ProductRow;
  updateProduct: (id: string, changes: Partial<Omit<ProductRow, 'id'>>) => void;
  removeProduct: (id: string) => void;
  addOrder: (payload: {
    patient: string;
    patientId?: string;
    items: Array<{ name: string; qty: number; unitPrice: number }>;
    location: string;
    paid: number;
    method: 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'OTHER';
  }) => Order | null;
  updateOrder: (id: string, changes: Partial<Order>) => void;
  adjustInventoryForEdit: (prev: Order, next: Order) => void;
};

const PRODUCTS_KEY = 'clinic-products';
const ORDERS_KEY = 'clinic-product-orders';

const initialProducts: ProductRow[] = [
  { id: 'PD-001', name: 'PRP Kit', price: 3500, stock: 42, sold: 180, notify: false },
  { id: 'PD-002', name: 'Hair Serum', price: 2200, stock: 12, sold: 240, notify: true },
  { id: 'PD-003', name: 'Laser Add-on Voucher', price: 9000, stock: 30, sold: 58, notify: false },
  { id: 'PD-004', name: 'Membership Box', price: 6000, stock: 8, sold: 34, notify: true },
];

const initialOrders: Order[] = [
  { id: 'PO-1054', patient: 'Ali Raza', products: 'Hair Serum x2', qty: 2, unitPrice: 2200, location: 'Main Branch', total: 4400, paid: 4400, method: 'CASH', status: 'Paid', createdAt: new Date().toISOString() },
  { id: 'PO-1055', patient: 'Sara Malik', products: 'PRP Kit', qty: 1, unitPrice: 3500, location: 'Main Branch', total: 3500, paid: 2000, method: 'CASH', status: 'Partial', createdAt: new Date().toISOString() },
  { id: 'PO-1056', patient: 'Hamza Yousaf', products: 'Laser Voucher', qty: 1, unitPrice: 9000, location: 'Clinic Store', total: 9000, paid: 0, method: 'CASH', status: 'Pending', createdAt: new Date().toISOString() },
];

const loadRows = <T,>(key: string, fallback: T[]): T[] => {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as T[];
    return Array.isArray(parsed) ? parsed : fallback;
  } catch (err) {
    console.error(`Failed to load ${key}`, err);
    return fallback;
  }
};

const persistRows = <T,>(key: string, rows: T[]) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(rows));
  } catch (err) {
    console.error(`Failed to persist ${key}`, err);
  }
};

type ProductRowDb = {
  id: string;
  name: string;
  price: number;
  stock: number;
  sold: number;
  notify: boolean;
};

type OrderRowDb = {
  id: string;
  patient: string;
  patient_id: string | null;
  products: string;
  qty: number;
  unit_price: number;
  items: Array<{ name: string; qty: number; unitPrice: number }> | null;
  location: string;
  total: number;
  paid: number;
  method: 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'OTHER';
  status: 'Pending' | 'Paid' | 'Partial' | 'Cancelled';
  created_at: string;
};

const toProductPayload = (row: ProductRow) => ({
  id: row.id,
  name: row.name,
  price: row.price,
  stock: row.stock,
  sold: row.sold,
  notify: row.notify,
});

const toOrderPayload = (row: Order) => ({
  id: row.id,
  patient: row.patient,
  patient_id: row.patientId ?? null,
  products: row.products,
  qty: row.qty,
  unit_price: row.unitPrice,
  items: row.items ?? null,
  location: row.location,
  total: row.total,
  paid: row.paid,
  method: row.method,
  status: row.status,
  created_at: row.createdAt,
});

const toOrderModel = (row: OrderRowDb): Order => ({
  id: row.id,
  patient: row.patient,
  patientId: row.patient_id ?? undefined,
  products: row.products,
  qty: row.qty,
  unitPrice: row.unit_price,
  items: row.items ?? undefined,
  location: row.location,
  total: row.total,
  paid: row.paid,
  method: row.method,
  status: row.status,
  createdAt: row.created_at,
});

export const useProductSales = create<ProductSalesState>((set) => ({
  products: loadRows(PRODUCTS_KEY, initialProducts),
  orders: loadRows(ORDERS_KEY, initialOrders),
  isLoading: false,
  error: null,
  hydrate: async () => {
    if (!isSupabaseConfigured || !supabase) {
      set({
        products: loadRows(PRODUCTS_KEY, initialProducts),
        orders: loadRows(ORDERS_KEY, initialOrders),
        isLoading: false,
        error: null,
      });
      return;
    }

    set({ isLoading: true, error: null });
    const [productsResp, ordersResp] = await Promise.all([
      supabase.from('products').select('*').order('name', { ascending: true }),
      supabase.from('product_orders').select('*').order('created_at', { ascending: false }),
    ]);

    const productsError = productsResp.error;
    const ordersError = ordersResp.error;
    if (productsError || ordersError) {
      set({
        products: loadRows(PRODUCTS_KEY, initialProducts),
        orders: loadRows(ORDERS_KEY, initialOrders),
        isLoading: false,
        error: productsError?.message || ordersError?.message || 'Failed to load product sales data.',
      });
      return;
    }

    const productsData = (productsResp.data as ProductRowDb[]) ?? [];
    const ordersData = (ordersResp.data as OrderRowDb[]) ?? [];
    const mappedProducts = productsData;
    const mappedOrders = ordersData.map(toOrderModel);
    persistRows(PRODUCTS_KEY, mappedProducts);
    persistRows(ORDERS_KEY, mappedOrders);
    set({ products: mappedProducts, orders: mappedOrders, isLoading: false, error: null });
  },
  addProduct: (product) => {
    let created: ProductRow | null = null;
    set((state) => {
      created = {
        ...product,
        id: `PD-${Math.floor(100 + Math.random() * 900)}`,
      };
      const next = [created, ...state.products];
      persistRows(PRODUCTS_KEY, next);
      if (isSupabaseConfigured && supabase) {
        void supabase.from('products').upsert(toProductPayload(created), { onConflict: 'id' }).then(({ error }) => {
          if (error) {
            set({ error: error.message });
          }
        });
      }
      return { products: next };
    });
    return created!;
  },
  updateProduct: (id, changes) =>
    set((state) => {
      const next = state.products.map((product) =>
        product.id === id ? { ...product, ...changes } : product
      );
      persistRows(PRODUCTS_KEY, next);
      if (isSupabaseConfigured && supabase) {
        const updated = next.find((product) => product.id === id);
        if (updated) {
          void supabase.from('products').upsert(toProductPayload(updated), { onConflict: 'id' }).then(({ error }) => {
            if (error) {
              set({ error: error.message });
            }
          });
        }
      }
      return { products: next };
    }),
  removeProduct: (id) =>
    set((state) => {
      const target = state.products.find((product) => product.id === id);
      if (!target) return state;
      const inUse = state.orders.some((order) =>
        (order.items ?? []).some((item) => item.name === target.name)
      );
      if (inUse) {
        return { ...state, error: 'This product exists in sales history and cannot be deleted.' };
      }
      const next = state.products.filter((product) => product.id !== id);
      persistRows(PRODUCTS_KEY, next);
      if (isSupabaseConfigured && supabase) {
        void supabase.from('products').delete().eq('id', id).then(({ error }) => {
          if (error) {
            set({ error: error.message });
          }
        });
      }
      return { products: next, error: null };
    }),
  addOrder: (payload) => {
    let created: Order | null = null;
    set((state) => {
      const items = payload.items
        .filter((item) => item.name && item.qty > 0)
        .map((item) => ({ ...item, qty: Math.floor(item.qty) }));
      if (items.length === 0) return state;
      const requiredByName = new Map<string, number>();
      for (const item of items) {
        requiredByName.set(item.name, (requiredByName.get(item.name) || 0) + item.qty);
      }
      for (const [name, qty] of requiredByName.entries()) {
        const product = state.products.find((p) => p.name === name);
        if (!product) return state;
        if (product.stock < qty) return state;
      }
      const total = items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);
      const status =
        payload.paid >= total
          ? 'Paid'
          : payload.paid > 0
          ? 'Partial'
          : 'Pending';
      created = {
        patient: payload.patient,
        patientId: payload.patientId,
        items,
        products: items.map((item) => `${item.name} x${item.qty}`).join(', '),
        qty: items.reduce((sum, item) => sum + item.qty, 0),
        unitPrice: items.length === 1 ? items[0].unitPrice : 0,
        id: `PO-${Math.floor(1000 + Math.random() * 9000)}`,
        status,
        createdAt: new Date().toISOString(),
        location: payload.location,
        total,
        paid: payload.paid,
        method: payload.method,
      };
      const nextProducts = state.products.map((product) => {
        const used = requiredByName.get(product.name);
        if (!used) return product;
        return {
          ...product,
          stock: Math.max(0, product.stock - used),
          sold: product.sold + used,
        };
      });
      const nextOrders = [created, ...state.orders];
      persistRows(PRODUCTS_KEY, nextProducts);
      persistRows(ORDERS_KEY, nextOrders);
      if (isSupabaseConfigured && supabase) {
        void Promise.all([
          supabase.from('product_orders').upsert(toOrderPayload(created), { onConflict: 'id' }),
          supabase.from('products').upsert(nextProducts.map(toProductPayload), { onConflict: 'id' }),
        ]).then((results) => {
          const error = results.find((r) => r.error)?.error;
          if (error) {
            set({ error: error.message });
          }
        });
      }
      return { products: nextProducts, orders: nextOrders };
    });
    return created;
  },
  updateOrder: (id, changes) =>
    set((state) => {
      const next = state.orders.map((order) => (order.id === id ? { ...order, ...changes } : order));
      persistRows(ORDERS_KEY, next);
      if (isSupabaseConfigured && supabase) {
        const updated = next.find((order) => order.id === id);
        if (updated) {
          void supabase
            .from('product_orders')
            .upsert(toOrderPayload(updated), { onConflict: 'id' })
            .then(({ error }) => {
              if (error) {
                set({ error: error.message });
              }
            });
        }
      }
      return { orders: next };
    }),
  adjustInventoryForEdit: (prev, next) =>
    set((state) => {
      if ((prev.items && prev.items.length > 1) || (next.items && next.items.length > 1)) {
        return state;
      }
      const [prevName] = prev.products.split(' x');
      const [nextName] = next.products.split(' x');
      const prevProductIndex = state.products.findIndex((p) => p.name === prevName);
      const nextProductIndex = state.products.findIndex((p) => p.name === nextName);
      if (prevProductIndex === -1 || nextProductIndex === -1) return state;
      const nextProducts = [...state.products];
      if (prevName === nextName) {
        const delta = next.qty - prev.qty;
        const product = nextProducts[prevProductIndex];
        if (product.stock < delta) return state;
        nextProducts[prevProductIndex] = {
          ...product,
          stock: Math.max(0, product.stock - delta),
          sold: product.sold + delta,
        };
      } else {
        const prevProduct = nextProducts[prevProductIndex];
        const nextProduct = nextProducts[nextProductIndex];
        if (nextProduct.stock < next.qty) return state;
        nextProducts[prevProductIndex] = {
          ...prevProduct,
          stock: prevProduct.stock + prev.qty,
          sold: Math.max(0, prevProduct.sold - prev.qty),
        };
        nextProducts[nextProductIndex] = {
          ...nextProduct,
          stock: Math.max(0, nextProduct.stock - next.qty),
          sold: nextProduct.sold + next.qty,
        };
      }
      persistRows(PRODUCTS_KEY, nextProducts);
      if (isSupabaseConfigured && supabase) {
        void supabase.from('products').upsert(nextProducts.map(toProductPayload), { onConflict: 'id' }).then(({ error }) => {
          if (error) {
            set({ error: error.message });
          }
        });
      }
      return { products: nextProducts };
    }),
}));
