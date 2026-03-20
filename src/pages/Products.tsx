import React, { useEffect, useMemo, useState } from 'react';
import { StatusBadge } from '../components/StatusBadge';
import { useProductSales, type Order, type ProductRow } from '../store/useProductSales';
import { usePayments, type PaymentMethod } from '../store/usePayments';
import logo from '../assets/novo-logo.svg';
import { useAuth } from '../components/AuthProvider';
import { EditIcon, FilterXIcon, PlusIcon, PowerIcon, PrintIcon, TrashIcon, XIcon } from '../components/UiIcons';

const orderItems = (order: Order) =>
  order.items?.length
    ? order.items
    : [{ name: order.products, qty: order.qty, unitPrice: order.unitPrice || order.total / Math.max(1, order.qty) }];

export const ProductsPage: React.FC = () => {
  const { products, orders, error, hydrate: hydrateSales, addProduct, updateProduct, removeProduct, addOrder, updateOrder, adjustInventoryForEdit } = useProductSales();
  const { hydrate: hydratePayments, addPayment } = usePayments();
  const { user } = useAuth();
  const canManageProducts = user?.role === 'admin' || user?.role === 'fdo';
  const isReadOnly = !canManageProducts;
  const [orderId, setOrderId] = useState('');
  const [patientSearch, setPatientSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [location, setLocation] = useState('All');
  const [status, setStatus] = useState('All');
  const [saleOpen, setSaleOpen] = useState(false);
  const [saleError, setSaleError] = useState('');
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [printingOrder, setPrintingOrder] = useState<Order | null>(null);
  const [editForm, setEditForm] = useState({ paid: '', status: 'Pending' as Order['status'], method: 'CASH' as PaymentMethod, productName: '', qty: 1, location: 'Main Branch' });
  const [saleForm, setSaleForm] = useState({ patient: '', patientId: '', location: 'Main Branch', paid: '', method: 'CASH' as PaymentMethod });
  const [saleItems, setSaleItems] = useState<Array<{ productName: string; qty: number }>>([{ productName: '', qty: 1 }]);
  const [productForm, setProductForm] = useState({ editingId: '', name: '', price: '', stock: '', sold: '', notify: false });

  useEffect(() => { void hydrateSales(); void hydratePayments(); }, [hydrateSales, hydratePayments]);
  useEffect(() => {
    if (!printingOrder) return;
    const handleAfterPrint = () => setPrintingOrder(null);
    window.addEventListener('afterprint', handleAfterPrint);
    window.print();
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, [printingOrder]);

  const filteredOrders = useMemo(() => orders.filter((order) => {
    const matchId = !orderId || order.id.toLowerCase().includes(orderId.toLowerCase());
    const matchPatient = !patientSearch || order.patient.toLowerCase().includes(patientSearch.toLowerCase());
    const matchProduct = !productSearch || order.products.toLowerCase().includes(productSearch.toLowerCase());
    const matchLocation = location === 'All' || order.location === location;
    const matchStatus = status === 'All' || order.status === status;
    return matchId && matchPatient && matchProduct && matchLocation && matchStatus;
  }), [orders, orderId, patientSearch, productSearch, location, status]);

  const orderTotals = useMemo(() => filteredOrders.reduce((acc, order) => {
    acc.total += order.total;
    acc.received += order.paid;
    acc.balance += Math.max(0, order.total - order.paid);
    return acc;
  }, { total: 0, received: 0, balance: 0 }), [filteredOrders]);

  const inventoryTotals = useMemo(() => products.reduce((acc, product) => {
    acc.remaining += product.stock;
    acc.sold += product.sold;
    if (product.notify) acc.alerts += 1;
    return acc;
  }, { remaining: 0, sold: 0, alerts: 0 }), [products]);

  const resetProductForm = () => setProductForm({ editingId: '', name: '', price: '', stock: '', sold: '', notify: false });

  const saveProduct = () => {
    if (isReadOnly || !productForm.name.trim() || !productForm.price || !productForm.stock) return;
    const payload = { name: productForm.name.trim(), price: Number(productForm.price), stock: Number(productForm.stock), sold: Number(productForm.sold) || 0, notify: productForm.notify };
    productForm.editingId ? updateProduct(productForm.editingId, payload) : addProduct(payload);
    resetProductForm();
  };

  const editProduct = (product: ProductRow) => {
    if (isReadOnly) return;
    setProductForm({ editingId: product.id, name: product.name, price: String(product.price), stock: String(product.stock), sold: String(product.sold), notify: product.notify });
  };

  const deleteProduct = (product: ProductRow) => {
    if (isReadOnly || !window.confirm(`Delete ${product.name}?`)) return;
    removeProduct(product.id);
  };

  const createSale = () => {
    if (isReadOnly || !saleForm.patient.trim()) { setSaleError('Please enter patient name.'); return; }
    const cleanItems = saleItems.map((item) => ({ productName: item.productName, qty: Math.floor(item.qty) })).filter((item) => item.productName && item.qty > 0);
    if (!cleanItems.length) { setSaleError('Please add at least one product.'); return; }
    try {
      const items = cleanItems.map((item) => {
        const product = products.find((row) => row.name === item.productName);
        if (!product || product.stock < item.qty) throw new Error(`Not enough stock for ${item.productName}.`);
        return { name: product.name, qty: item.qty, unitPrice: product.price };
      });
      const total = items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);
      const paid = Number(saleForm.paid) || 0;
      const created = addOrder({ patient: saleForm.patient.trim(), patientId: saleForm.patientId.trim() || undefined, items, location: saleForm.location, paid, method: saleForm.method });
      if (!created) throw new Error('Unable to create sale.');
      addPayment({ date: new Date().toISOString().slice(0, 16).replace('T', ' '), patientId: saleForm.patientId.trim() || 'N/A', patientName: saleForm.patient.trim(), method: saleForm.method, amount: total, notes: items.map((item) => `${item.name} x${item.qty}`).join(', '), cash: saleForm.method === 'CASH' ? paid : 0, card: saleForm.method === 'CARD' ? paid : 0, bank: saleForm.method === 'BANK_TRANSFER' ? paid : 0, other: saleForm.method === 'OTHER' ? paid : 0, source: `Product Sale - ${created.products} (${created.id})` });
      setSaleForm({ patient: '', patientId: '', location: 'Main Branch', paid: '', method: 'CASH' });
      setSaleItems([{ productName: '', qty: 1 }]);
      setSaleOpen(false);
      setSaleError('');
    } catch (err) {
      setSaleError(err instanceof Error ? err.message : 'Unable to create sale.');
    }
  };

  const openEditOrder = (order: Order) => {
    if (isReadOnly) return;
    setEditingOrder(order);
    setEditForm({ paid: String(order.paid ?? 0), status: order.status, method: order.method, productName: order.items?.length === 1 ? order.items[0].name : order.products.split(' x')[0], qty: order.items?.length === 1 ? order.items[0].qty : order.qty, location: order.location });
  };

  const saveOrderUpdate = () => {
    if (isReadOnly || !editingOrder) return;
    const paid = Number(editForm.paid) || 0;
    const deltaPaid = Math.max(0, paid - editingOrder.paid);
    if (editingOrder.items && editingOrder.items.length > 1) {
      const statusValue = editForm.status === 'Cancelled' ? 'Cancelled' : paid >= editingOrder.total ? 'Paid' : paid > 0 ? 'Partial' : 'Pending';
      updateOrder(editingOrder.id, { paid, method: editForm.method, status: statusValue, location: editForm.location });
      if (deltaPaid > 0) addPayment({ date: new Date().toISOString().slice(0, 16).replace('T', ' '), patientId: editingOrder.patientId || 'N/A', patientName: editingOrder.patient, method: editForm.method, amount: deltaPaid, notes: editingOrder.products, cash: editForm.method === 'CASH' ? deltaPaid : 0, card: editForm.method === 'CARD' ? deltaPaid : 0, bank: editForm.method === 'BANK_TRANSFER' ? deltaPaid : 0, other: editForm.method === 'OTHER' ? deltaPaid : 0, source: `Product Balance - ${editingOrder.products} (${editingOrder.id})` });
      setEditingOrder(null);
      return;
    }
    const product = products.find((row) => row.name === editForm.productName);
    const prevProduct = products.find((row) => row.name === editingOrder.products.split(' x')[0]);
    if (!product || !prevProduct) return;
    if (prevProduct.name === product.name) {
      if (editForm.qty > prevProduct.stock + editingOrder.qty) return;
    } else if (product.stock < editForm.qty) return;
    const total = product.price * editForm.qty;
    const statusValue = editForm.status === 'Cancelled' ? 'Cancelled' : paid >= total ? 'Paid' : paid > 0 ? 'Partial' : 'Pending';
    const nextOrder: Order = { ...editingOrder, products: `${product.name} x${editForm.qty}`, qty: editForm.qty, unitPrice: product.price, location: editForm.location, total, paid, method: editForm.method, status: statusValue, items: [{ name: product.name, qty: editForm.qty, unitPrice: product.price }] };
    adjustInventoryForEdit(editingOrder, nextOrder);
    updateOrder(editingOrder.id, nextOrder);
    if (deltaPaid > 0) addPayment({ date: new Date().toISOString().slice(0, 16).replace('T', ' '), patientId: editingOrder.patientId || 'N/A', patientName: editingOrder.patient, method: editForm.method, amount: deltaPaid, notes: nextOrder.products, cash: editForm.method === 'CASH' ? deltaPaid : 0, card: editForm.method === 'CARD' ? deltaPaid : 0, bank: editForm.method === 'BANK_TRANSFER' ? deltaPaid : 0, other: editForm.method === 'OTHER' ? deltaPaid : 0, source: `Product Balance - ${nextOrder.products} (${editingOrder.id})` });
    setEditingOrder(null);
  };

  return (
    <div className="stack">
      <div className="panel section"><div className="card-grid">
        <div className="stat-card panel"><div className="stat-card__label">Sales Total</div><div className="stat-card__value">PKR {orderTotals.total.toLocaleString()}</div><div className="stat-card__trend">Filtered sales orders</div></div>
        <div className="stat-card panel"><div className="stat-card__label">Received</div><div className="stat-card__value">PKR {orderTotals.received.toLocaleString()}</div><div className="stat-card__trend success">Collected from sales</div></div>
        <div className="stat-card panel"><div className="stat-card__label">Outstanding</div><div className="stat-card__value">PKR {orderTotals.balance.toLocaleString()}</div><div className="stat-card__trend warning">Remaining sales balance</div></div>
        <div className="stat-card panel"><div className="stat-card__label">Remaining Stock</div><div className="stat-card__value">{inventoryTotals.remaining}</div><div className="stat-card__trend">{inventoryTotals.alerts} alert-enabled products</div></div>
      </div></div>

      <div className="panel section">
        <div className="section__header"><div><div className="section__title">Sales Orders</div><div className="muted">Filter sales history by order, patient, product, location, and status.</div></div><button className="pill" onClick={() => setSaleOpen(true)} disabled={isReadOnly}><PlusIcon /> New Sale</button></div>
        <div className="filter-bar">
          <input className="input" placeholder="Order ID" value={orderId} onChange={(e) => setOrderId(e.target.value)} />
          <input className="input" placeholder="Patient" value={patientSearch} onChange={(e) => setPatientSearch(e.target.value)} />
          <input className="input" placeholder="Product" value={productSearch} onChange={(e) => setProductSearch(e.target.value)} />
          <select className="input" value={location} onChange={(e) => setLocation(e.target.value)}><option value="All">All Locations</option><option value="Main Branch">Main Branch</option><option value="Clinic Store">Clinic Store</option></select>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}><option value="All">All Status</option><option value="Pending">Pending</option><option value="Paid">Paid</option><option value="Partial">Partial</option><option value="Cancelled">Cancelled</option></select>
          <button className="icon-btn" type="button" onClick={() => { setOrderId(''); setPatientSearch(''); setProductSearch(''); setLocation('All'); setStatus('All'); }} aria-label="Clear filters" title="Clear filters"><FilterXIcon /></button>
        </div>
        <div className="table-wrapper"><table className="table table--compact table--sticky-actions"><thead><tr><th>Order #</th><th>Patient</th><th>Products</th><th>Qty</th><th>Location</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th><th>Actions</th></tr></thead><tbody>
          {filteredOrders.length === 0 && <tr><td colSpan={10} className="muted small" style={{ textAlign: 'center' }}>No orders found.</td></tr>}
          {filteredOrders.map((order) => <tr key={order.id}><td className="muted small">{order.id}</td><td>{order.patient}</td><td>{order.products}</td><td>{order.qty}</td><td>{order.location}</td><td>PKR {order.total.toLocaleString()}</td><td>PKR {order.paid.toLocaleString()}</td><td>PKR {Math.max(0, order.total - order.paid).toLocaleString()}</td><td><StatusBadge status={order.status} /></td><td className="actions-cell"><div className="action-stack"><button className="icon-btn" title="Print" aria-label="Print" onClick={() => setPrintingOrder(order)}><PrintIcon /></button><button className="icon-btn" title="Edit" aria-label="Edit" onClick={() => openEditOrder(order)} disabled={isReadOnly}><EditIcon /></button></div></td></tr>)}
        </tbody></table></div>
      </div>

      <div className="panel section">
        <div className="section__header"><div><div className="section__title">Product Inventory</div><div className="muted">Edit, delete, and review remaining stocks.</div></div><div className="action-stack">{productForm.editingId && <button className="pill pill--ghost" type="button" onClick={resetProductForm}>Cancel Edit</button>}<button className="pill" onClick={saveProduct} disabled={isReadOnly}>{productForm.editingId ? 'Update Product' : 'Save Product'}</button></div></div>
        <div className="form-grid">
          <input className="input" placeholder="Product Name" value={productForm.name} onChange={(e) => setProductForm((current) => ({ ...current, name: e.target.value }))} disabled={isReadOnly} />
          <input className="input" type="number" min="0" placeholder="Price" value={productForm.price} onChange={(e) => setProductForm((current) => ({ ...current, price: e.target.value }))} disabled={isReadOnly} />
          <input className="input" type="number" min="0" placeholder="Remaining Stock" value={productForm.stock} onChange={(e) => setProductForm((current) => ({ ...current, stock: e.target.value }))} disabled={isReadOnly} />
          <input className="input" type="number" min="0" placeholder="Lifetime Sold" value={productForm.sold} onChange={(e) => setProductForm((current) => ({ ...current, sold: e.target.value }))} disabled={isReadOnly} />
          <label className="pill"><input type="checkbox" checked={productForm.notify} onChange={(e) => setProductForm((current) => ({ ...current, notify: e.target.checked }))} disabled={isReadOnly} /><span>Alert status active</span></label>
        </div>
        {error && <div className="muted small" style={{ marginTop: 10 }}>{error}</div>}
        <div className="table-wrapper"><table className="table table--compact"><thead><tr><th>Product</th><th>Price</th><th>Remaining Stock</th><th>Lifetime Sold</th><th>Alert Status</th><th>Stock Level</th><th>Actions</th></tr></thead><tbody>
          {products.map((product) => <tr key={product.id}><td>{product.name}</td><td>PKR {product.price.toLocaleString()}</td><td>{product.stock}</td><td>{product.sold}</td><td><div className="action-stack"><StatusBadge status={product.notify ? 'Active' : 'Inactive'} /><button className="icon-btn" type="button" onClick={() => updateProduct(product.id, { notify: !product.notify })} disabled={isReadOnly} aria-label={product.notify ? 'Disable alert' : 'Enable alert'} title={product.notify ? 'Disable alert' : 'Enable alert'}><PowerIcon /></button></div></td><td>{product.stock < 15 ? <StatusBadge status="Inactive" /> : <StatusBadge status="Active" />}</td><td><div className="action-stack"><button className="icon-btn" type="button" onClick={() => editProduct(product)} disabled={isReadOnly} aria-label="Edit" title="Edit"><EditIcon /></button><button className="icon-btn" type="button" onClick={() => deleteProduct(product)} disabled={isReadOnly} aria-label="Delete" title="Delete"><TrashIcon /></button></div></td></tr>)}
        </tbody></table></div>
      </div>

      {saleOpen && <div className="modal-backdrop" role="presentation" onClick={() => setSaleOpen(false)}><div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}><div className="modal__header"><div className="strong">New Product Sale</div><button className="icon-btn" onClick={() => setSaleOpen(false)} aria-label="Close"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.3 5.71 12 12l6.3 6.29-1.41 1.42L10.59 13.4 4.29 19.71 2.88 18.3 9.18 12 2.88 5.71 4.29 4.3l6.3 6.3 6.29-6.3 1.42 1.41z" fill="currentColor" /></svg></button></div><div className="form-grid">
        <input className="input" placeholder="Patient Name" value={saleForm.patient} onChange={(e) => setSaleForm((current) => ({ ...current, patient: e.target.value }))} disabled={isReadOnly} />
        <input className="input" placeholder="Patient ID (optional)" value={saleForm.patientId} onChange={(e) => setSaleForm((current) => ({ ...current, patientId: e.target.value }))} disabled={isReadOnly} />
        {saleItems.map((item, index) => <React.Fragment key={`sale-item-${index}`}><select className="input" value={item.productName} onChange={(e) => setSaleItems((items) => items.map((row, idx) => idx === index ? { ...row, productName: e.target.value } : row))} disabled={isReadOnly}><option value="">-- Select Product --</option>{products.map((product) => <option key={product.id} value={product.name}>{product.name} (remaining: {product.stock})</option>)}</select><div className="form-grid" style={{ gridColumn: '1 / -1', gridTemplateColumns: '2fr 1fr auto', gap: 12 }}><input className="input" type="number" min="1" placeholder="Quantity" value={item.qty} onChange={(e) => setSaleItems((items) => items.map((row, idx) => idx === index ? { ...row, qty: Number(e.target.value) } : row))} disabled={isReadOnly} /><div className="muted small" style={{ alignSelf: 'center' }}>{item.productName ? `Unit: PKR ${products.find((product) => product.name === item.productName)?.price?.toLocaleString() ?? '-'}` : 'Pick a product'}</div><button className="pill pill--ghost" type="button" onClick={() => setSaleItems((items) => items.length === 1 ? items : items.filter((_, idx) => idx !== index))} disabled={isReadOnly || saleItems.length === 1}>Remove</button></div></React.Fragment>)}
        <button className="pill pill--ghost" type="button" onClick={() => setSaleItems((items) => [...items, { productName: '', qty: 1 }])} disabled={isReadOnly}><PlusIcon /> Add Product</button>
        <select className="input" value={saleForm.location} onChange={(e) => setSaleForm((current) => ({ ...current, location: e.target.value }))} disabled={isReadOnly}><option value="Main Branch">Main Branch</option><option value="Clinic Store">Clinic Store</option></select>
        <select className="input" value={saleForm.method} onChange={(e) => setSaleForm((current) => ({ ...current, method: e.target.value as PaymentMethod }))} disabled={isReadOnly}><option value="CASH">Cash</option><option value="CARD">Card</option><option value="BANK_TRANSFER">Bank Transfer</option><option value="OTHER">Other</option></select>
        <input className="input" type="number" min="0" placeholder="Paid Amount" value={saleForm.paid} onChange={(e) => setSaleForm((current) => ({ ...current, paid: e.target.value }))} disabled={isReadOnly} />
      </div>{saleError && <div className="muted small" style={{ marginTop: 10 }}>{saleError}</div>}<div className="action-stack" style={{ marginTop: 12 }}><button className="pill" onClick={createSale} disabled={isReadOnly}>Complete Sale</button><button className="icon-btn" onClick={() => setSaleOpen(false)} aria-label="Cancel" title="Cancel"><XIcon /></button></div></div></div>}

      {editingOrder && <div className="modal-backdrop" role="presentation" onClick={() => setEditingOrder(null)}><div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}><div className="modal__header"><div className="strong">Update Order</div><button className="icon-btn" onClick={() => setEditingOrder(null)} aria-label="Close"><XIcon /></button></div><div className="stack"><div className="muted small">{editingOrder.id} - {editingOrder.patient} - PKR {editingOrder.total.toLocaleString()}</div><input className="input" type="number" min="0" placeholder="Paid amount" value={editForm.paid} onChange={(e) => setEditForm((current) => ({ ...current, paid: e.target.value }))} disabled={isReadOnly} /><select className="input" value={editForm.method} onChange={(e) => setEditForm((current) => ({ ...current, method: e.target.value as PaymentMethod }))} disabled={isReadOnly}><option value="CASH">Cash</option><option value="CARD">Card</option><option value="BANK_TRANSFER">Bank Transfer</option><option value="OTHER">Other</option></select>{editingOrder.items && editingOrder.items.length > 1 ? <div className="muted small">This order has multiple products. You can update payment, status, and location only.</div> : <><select className="input" value={editForm.productName} onChange={(e) => setEditForm((current) => ({ ...current, productName: e.target.value }))} disabled={isReadOnly}>{products.map((product) => <option key={product.id} value={product.name}>{product.name} (remaining: {product.stock})</option>)}</select><input className="input" type="number" min="1" placeholder="Quantity" value={editForm.qty} onChange={(e) => setEditForm((current) => ({ ...current, qty: Number(e.target.value) }))} disabled={isReadOnly} /></>}<select className="input" value={editForm.location} onChange={(e) => setEditForm((current) => ({ ...current, location: e.target.value }))} disabled={isReadOnly}><option value="Main Branch">Main Branch</option><option value="Clinic Store">Clinic Store</option></select><select className="input" value={editForm.status} onChange={(e) => setEditForm((current) => ({ ...current, status: e.target.value as Order['status'] }))} disabled={isReadOnly}><option value="Pending">Pending</option><option value="Partial">Partial</option><option value="Paid">Paid</option><option value="Cancelled">Cancelled</option></select><div className="action-stack"><button className="pill" onClick={saveOrderUpdate} disabled={isReadOnly}>Save Update</button><button className="icon-btn" onClick={() => { setPrintingOrder(editingOrder); setEditingOrder(null); }} aria-label="Print" title="Print"><PrintIcon /></button><button className="icon-btn" onClick={() => setEditingOrder(null)} aria-label="Cancel" title="Cancel"><XIcon /></button></div></div></div></div>}

      {printingOrder && <section className="consultation-print"><div className="consultation-watermark" aria-hidden="true"><img src={logo} alt="" /></div><div className="consultation-header"><div className="consultation-header__left"><div className="consultation-clinic"><div className="consultation-clinic__title">Novo Aesthetics</div><div className="consultation-clinic__meta">2-W-101, B-1 Plaza Main Susan Road Faisalabad</div><div className="consultation-clinic__meta">Phone: 0312-1114455 | Email: care@novoaestheticspk.com</div></div></div><div className="consultation-header__right"><div className="consultation-meta"><div><span>Date:</span><strong>{new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}</strong></div><div><span>Order #:</span><strong>{printingOrder.id}</strong></div><div><span>Status:</span><strong className="consultation-status">{printingOrder.status}</strong></div><div><span>Method:</span><strong>{printingOrder.method || 'CASH'}</strong></div></div></div></div><h1 className="consultation-title">Product Sale Receipt</h1><div className="consultation-grid"><div className="consultation-field"><span>Patient</span><div>{printingOrder.patient}</div></div><div className="consultation-field"><span>Location</span><div>{printingOrder.location}</div></div><div className="consultation-field consultation-field--wide"><span>Products</span><div>{printingOrder.products}</div></div></div><section className="consultation-block"><div className="consultation-block__title">Sold Items</div><table className="consultation-table"><thead><tr><th>Product</th><th>Qty</th><th>Unit Price</th><th>Line Total</th></tr></thead><tbody>{orderItems(printingOrder).map((item) => <tr key={`${item.name}-${item.qty}`}><td>{item.name}</td><td>{item.qty}</td><td>PKR {item.unitPrice.toLocaleString()}</td><td>PKR {(item.unitPrice * item.qty).toLocaleString()}</td></tr>)}</tbody></table></section><div className="consultation-grid"><div className="consultation-field"><span>Total</span><div>PKR {printingOrder.total.toLocaleString()}</div></div><div className="consultation-field"><span>Paid</span><div>PKR {printingOrder.paid.toLocaleString()}</div></div><div className="consultation-field"><span>Balance</span><div>PKR {Math.max(0, printingOrder.total - printingOrder.paid).toLocaleString()}</div></div></div><section className="consultation-signatures"><div><div className="signature-line" /><div className="signature-label">Cashier Signature</div></div><div><div className="signature-line" /><div className="signature-label">Patient Signature</div></div></section></section>}
    </div>
  );
};
