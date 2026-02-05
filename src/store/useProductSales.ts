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
  addOrder: (payload: Omit<Order, 'id' | 'status' | 'createdAt'>) => Order | null;
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
      const productName = payload.products.split(' x')[0];
      const productIndex = state.products.findIndex((p) => p.name === productName);
      if (productIndex === -1) return state;
      const product = state.products[productIndex];
      if (product.stock < payload.qty) return state;
      const status =
        payload.paid >= payload.total
          ? 'Paid'
          : payload.paid > 0
          ? 'Partial'
          : 'Pending';
      created = {
        ...payload,
        id: `PO-${Math.floor(1000 + Math.random() * 9000)}`,
        status,
        createdAt: new Date().toISOString(),
      };
      const nextProducts = [...state.products];
      nextProducts[productIndex] = {
        ...product,
        stock: Math.max(0, product.stock - payload.qty),
        sold: product.sold + payload.qty,
      };
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
