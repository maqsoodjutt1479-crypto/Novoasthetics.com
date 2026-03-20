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
  addProduct: (product: Omit<ProductRow, 'id'>) => Promise<ProductRow | null>;
  updateProduct: (id: string, changes: Partial<Omit<ProductRow, 'id'>>) => Promise<ProductRow | null>;
  removeProduct: (id: string) => Promise<boolean>;
  addOrder: (payload: {
    patient: string;
    patientId?: string;
    items: Array<{ name: string; qty: number; unitPrice: number }>;
    location: string;
    paid: number;
    method: 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'OTHER';
  }) => Promise<Order | null>;
  updateOrder: (id: string, changes: Partial<Order>) => Promise<Order | null>;
  updateOrderWithInventory: (prev: Order, next: Order) => Promise<Order | null>;
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

const orderItems = (order: Order) =>
  order.items?.length
    ? order.items
    : [{ name: order.products.split(' x')[0], qty: order.qty, unitPrice: order.unitPrice || order.total / Math.max(1, order.qty) }];

const calculateEditedProducts = (products: ProductRow[], prev: Order, next: Order): ProductRow[] | null => {
  const prevItems = orderItems(prev);
  const nextItems = orderItems(next);
  if (prevItems.length !== 1 || nextItems.length !== 1) {
    return null;
  }

  const prevItem = prevItems[0];
  const nextItem = nextItems[0];
  const prevProductIndex = products.findIndex((product) => product.name === prevItem.name);
  const nextProductIndex = products.findIndex((product) => product.name === nextItem.name);
  if (prevProductIndex === -1 || nextProductIndex === -1) {
    return null;
  }

  const nextProducts = [...products];
  if (prevItem.name === nextItem.name) {
    const delta = nextItem.qty - prevItem.qty;
    const product = nextProducts[prevProductIndex];
    if (delta > 0 && product.stock < delta) {
      return null;
    }
    nextProducts[prevProductIndex] = {
      ...product,
      stock: Math.max(0, product.stock - delta),
      sold: Math.max(0, product.sold + delta),
    };
    return nextProducts;
  }

  const previousProduct = nextProducts[prevProductIndex];
  const replacementProduct = nextProducts[nextProductIndex];
  if (replacementProduct.stock < nextItem.qty) {
    return null;
  }
  nextProducts[prevProductIndex] = {
    ...previousProduct,
    stock: previousProduct.stock + prevItem.qty,
    sold: Math.max(0, previousProduct.sold - prevItem.qty),
  };
  nextProducts[nextProductIndex] = {
    ...replacementProduct,
    stock: Math.max(0, replacementProduct.stock - nextItem.qty),
    sold: replacementProduct.sold + nextItem.qty,
  };
  return nextProducts;
};

export const useProductSales = create<ProductSalesState>((set, get) => ({
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
  addProduct: async (product) => {
    const created: ProductRow = {
      ...product,
      id: `PD-${Math.floor(100 + Math.random() * 900)}`,
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('products')
        .upsert(toProductPayload(created), { onConflict: 'id' })
        .select('*')
        .single();
      if (error || !data) {
        set({ error: error?.message ?? 'Failed to save product.' });
        return null;
      }
      const saved = data as ProductRow;
      set((state) => {
        const next = [saved, ...state.products];
        persistRows(PRODUCTS_KEY, next);
        return { products: next, error: null };
      });
      return saved;
    }

    set((state) => {
      const next = [created, ...state.products];
      persistRows(PRODUCTS_KEY, next);
      return { products: next, error: null };
    });
    return created;
  },
  updateProduct: async (id, changes) => {
    const current = get().products.find((product) => product.id === id);
    if (!current) {
      set({ error: 'Product not found.' });
      return null;
    }

    const updated: ProductRow = { ...current, ...changes, id };
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('products')
        .upsert(toProductPayload(updated), { onConflict: 'id' })
        .select('*')
        .single();
      if (error || !data) {
        set({ error: error?.message ?? 'Failed to update product.' });
        return null;
      }
      const saved = data as ProductRow;
      set((state) => {
        const next = state.products.map((product) => (product.id === id ? saved : product));
        persistRows(PRODUCTS_KEY, next);
        return { products: next, error: null };
      });
      return saved;
    }

    set((state) => {
      const next = state.products.map((product) => (product.id === id ? updated : product));
      persistRows(PRODUCTS_KEY, next);
      return { products: next, error: null };
    });
    return updated;
  },
  removeProduct: async (id) => {
    const state = get();
    const target = state.products.find((product) => product.id === id);
    if (!target) {
      set({ error: 'Product not found.' });
      return false;
    }
    const inUse = state.orders.some((order) =>
      (order.items ?? []).some((item) => item.name === target.name)
    );
    if (inUse) {
      set({ error: 'This product exists in sales history and cannot be deleted.' });
      return false;
    }

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) {
        set({ error: error.message });
        return false;
      }
    }

    set((current) => {
      const next = current.products.filter((product) => product.id !== id);
      persistRows(PRODUCTS_KEY, next);
      return { products: next, error: null };
    });
    return true;
  },
  addOrder: async (payload) => {
    const state = get();
    const items = payload.items
      .filter((item) => item.name && item.qty > 0)
      .map((item) => ({ ...item, qty: Math.floor(item.qty) }));
    if (items.length === 0) {
      set({ error: 'Please add at least one valid product.' });
      return null;
    }

    const requiredByName = new Map<string, number>();
    for (const item of items) {
      requiredByName.set(item.name, (requiredByName.get(item.name) || 0) + item.qty);
    }
    for (const [name, qty] of requiredByName.entries()) {
      const product = state.products.find((row) => row.name === name);
      if (!product) {
        set({ error: `${name} was not found in stock.` });
        return null;
      }
      if (product.stock < qty) {
        set({ error: `Not enough stock for ${name}.` });
        return null;
      }
    }

    const total = items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);
    const status =
      payload.paid >= total
        ? 'Paid'
        : payload.paid > 0
        ? 'Partial'
        : 'Pending';
    const created: Order = {
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

    if (isSupabaseConfigured && supabase) {
      const [orderResult, productsResult] = await Promise.all([
        supabase.from('product_orders').upsert(toOrderPayload(created), { onConflict: 'id' }).select('*').single(),
        supabase.from('products').upsert(nextProducts.map(toProductPayload), { onConflict: 'id' }),
      ]);
      const error = orderResult.error || productsResult.error;
      if (error || !orderResult.data) {
        set({ error: error?.message ?? 'Failed to create sale.' });
        return null;
      }
      const saved = toOrderModel(orderResult.data as OrderRowDb);
      set((current) => {
        const nextOrders = [saved, ...current.orders];
        persistRows(PRODUCTS_KEY, nextProducts);
        persistRows(ORDERS_KEY, nextOrders);
        return { products: nextProducts, orders: nextOrders, error: null };
      });
      return saved;
    }

    set((current) => {
      const nextOrders = [created, ...current.orders];
      persistRows(PRODUCTS_KEY, nextProducts);
      persistRows(ORDERS_KEY, nextOrders);
      return { products: nextProducts, orders: nextOrders, error: null };
    });
    return created;
  },
  updateOrder: async (id, changes) => {
    const current = get().orders.find((order) => order.id === id);
    if (!current) {
      set({ error: 'Order not found.' });
      return null;
    }

    const updated = { ...current, ...changes, id };
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('product_orders')
        .upsert(toOrderPayload(updated), { onConflict: 'id' })
        .select('*')
        .single();
      if (error || !data) {
        set({ error: error?.message ?? 'Failed to update order.' });
        return null;
      }
      const saved = toOrderModel(data as OrderRowDb);
      set((state) => {
        const next = state.orders.map((order) => (order.id === id ? saved : order));
        persistRows(ORDERS_KEY, next);
        return { orders: next, error: null };
      });
      return saved;
    }

    set((state) => {
      const next = state.orders.map((order) => (order.id === id ? updated : order));
      persistRows(ORDERS_KEY, next);
      return { orders: next, error: null };
    });
    return updated;
  },
  updateOrderWithInventory: async (prev, next) => {
    const state = get();
    const nextProducts = calculateEditedProducts(state.products, prev, next);
    if (!nextProducts) {
      set({ error: 'Unable to update stock for this order change.' });
      return null;
    }

    if (isSupabaseConfigured && supabase) {
      const [orderResult, productsResult] = await Promise.all([
        supabase.from('product_orders').upsert(toOrderPayload(next), { onConflict: 'id' }).select('*').single(),
        supabase.from('products').upsert(nextProducts.map(toProductPayload), { onConflict: 'id' }),
      ]);
      const error = orderResult.error || productsResult.error;
      if (error || !orderResult.data) {
        set({ error: error?.message ?? 'Failed to update order.' });
        return null;
      }
      const saved = toOrderModel(orderResult.data as OrderRowDb);
      set((current) => {
        const nextOrders = current.orders.map((order) => (order.id === saved.id ? saved : order));
        persistRows(PRODUCTS_KEY, nextProducts);
        persistRows(ORDERS_KEY, nextOrders);
        return { products: nextProducts, orders: nextOrders, error: null };
      });
      return saved;
    }

    set((current) => {
      const nextOrders = current.orders.map((order) => (order.id === next.id ? next : order));
      persistRows(PRODUCTS_KEY, nextProducts);
      persistRows(ORDERS_KEY, nextOrders);
      return { products: nextProducts, orders: nextOrders, error: null };
    });
    return next;
  },
}));
