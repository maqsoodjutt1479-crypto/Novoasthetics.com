import { create } from 'zustand';

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
  addProduct: (product: Omit<ProductRow, 'id'>) => ProductRow;
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

export const useProductSales = create<ProductSalesState>((set) => ({
  products: loadRows(PRODUCTS_KEY, initialProducts),
  orders: loadRows(ORDERS_KEY, initialOrders),
  addProduct: (product) => {
    let created: ProductRow | null = null;
    set((state) => {
      created = {
        ...product,
        id: `PD-${Math.floor(100 + Math.random() * 900)}`,
      };
      const next = [created, ...state.products];
      persistRows(PRODUCTS_KEY, next);
      return { products: next };
    });
    return created!;
  },
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
      return { products: nextProducts, orders: nextOrders };
    });
    return created;
  },
  updateOrder: (id, changes) =>
    set((state) => {
      const next = state.orders.map((order) => (order.id === id ? { ...order, ...changes } : order));
      persistRows(ORDERS_KEY, next);
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
      return { products: nextProducts };
    }),
}));
