import React, { useMemo, useState } from 'react';
import { StatusBadge } from '../components/StatusBadge';
import { useProductSales } from '../store/useProductSales';
import { usePayments, type PaymentMethod } from '../store/usePayments';
import logo from '../assets/novo-logo.svg';
import { useAuth } from '../components/AuthProvider';

export const ProductsPage: React.FC = () => {
  const { products, orders, addProduct, addOrder, updateOrder, adjustInventoryForEdit } = useProductSales();
  const { addPayment } = usePayments();
  const { user } = useAuth();
  const isReadOnly = user?.role === 'fdo';
  const [orderId, setOrderId] = useState('');
  const [patientSearch, setPatientSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [location, setLocation] = useState('All');
  const [status, setStatus] = useState('All');
  const [saleOpen, setSaleOpen] = useState(false);
  const [saleError, setSaleError] = useState('');
  const [editingOrder, setEditingOrder] = useState<(typeof orders)[number] | null>(null);
  const [printingOrder, setPrintingOrder] = useState<(typeof orders)[number] | null>(null);
  const [editForm, setEditForm] = useState({
    paid: '',
    status: 'Pending' as 'Pending' | 'Paid' | 'Partial' | 'Cancelled',
    method: 'CASH' as PaymentMethod,
    productName: '',
    qty: 1,
    location: 'Main Branch',
  });
  const [saleForm, setSaleForm] = useState({
    patient: '',
    patientId: '',
    location: 'Main Branch',
    paid: '',
    method: 'CASH' as PaymentMethod,
  });
  const [saleItems, setSaleItems] = useState<Array<{ productName: string; qty: number }>>([
    { productName: '', qty: 1 },
  ]);
  const [productForm, setProductForm] = useState({
    name: '',
    price: '',
    stock: '',
    sold: '',
    notify: false,
  });

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchId = !orderId || o.id.toLowerCase().includes(orderId.toLowerCase());
      const matchPatient = !patientSearch || o.patient.toLowerCase().includes(patientSearch.toLowerCase());
      const matchProduct = !productSearch || o.products.toLowerCase().includes(productSearch.toLowerCase());
      const matchLocation = location === 'All' || o.location === location;
      const matchStatus = status === 'All' || o.status === status;
      return matchId && matchPatient && matchProduct && matchLocation && matchStatus;
    });
  }, [orderId, patientSearch, productSearch, location, status, orders]);

  const handleAddProduct = () => {
    if (isReadOnly) return;
    if (!productForm.name || !productForm.price || !productForm.stock) return;
    addProduct({
      name: productForm.name,
      price: Number(productForm.price),
      stock: Number(productForm.stock),
      sold: Number(productForm.sold) || 0,
      notify: productForm.notify,
    });
    setProductForm({ name: '', price: '', stock: '', sold: '', notify: false });
  };

  const handleCreateSale = () => {
    if (isReadOnly) return;
    setSaleError('');
    if (!saleForm.patient.trim()) {
      setSaleError('Please enter patient name.');
      return;
    }
    const cleanItems = saleItems
      .map((item) => ({
        productName: item.productName,
        qty: Math.floor(item.qty),
      }))
      .filter((item) => item.productName && item.qty > 0);
    if (cleanItems.length === 0) {
      setSaleError('Please add at least one product.');
      return;
    }
    const requiredByName = new Map<string, number>();
    for (const item of cleanItems) {
      requiredByName.set(item.productName, (requiredByName.get(item.productName) || 0) + item.qty);
    }
    for (const [name, qty] of requiredByName.entries()) {
      const product = products.find((p) => p.name === name);
      if (!product) {
        setSaleError('Please select a valid product.');
        return;
      }
      if (product.stock < qty) {
        setSaleError(`Not enough stock for ${name}.`);
        return;
      }
    }
    const items = cleanItems.map((item) => {
      const product = products.find((p) => p.name === item.productName)!;
      return {
        name: product.name,
        qty: item.qty,
        unitPrice: product.price,
      };
    });
    const total = items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);
    const paid = Number(saleForm.paid) || 0;
    const created = addOrder({
      patient: saleForm.patient.trim(),
      patientId: saleForm.patientId.trim() || undefined,
      items,
      location: saleForm.location,
      paid,
      method: saleForm.method,
    });
    if (!created) {
      setSaleError('Unable to create sale.');
      return;
    }
    addPayment({
      date: new Date().toISOString().slice(0, 16).replace('T', ' '),
      patientId: saleForm.patientId.trim() || 'N/A',
      patientName: saleForm.patient.trim(),
      method: saleForm.method,
      amount: total,
      cash: saleForm.method === 'CASH' ? paid : 0,
      card: saleForm.method === 'CARD' ? paid : 0,
      bank: saleForm.method === 'BANK_TRANSFER' ? paid : 0,
      other: saleForm.method === 'OTHER' ? paid : 0,
      source: 'product',
    });
    setSaleForm({
      patient: '',
      patientId: '',
      location: 'Main Branch',
      paid: '',
      method: 'CASH',
    });
    setSaleItems([{ productName: '', qty: 1 }]);
    setSaleOpen(false);
  };

  const addSaleItem = () => {
    setSaleItems((items) => [...items, { productName: '', qty: 1 }]);
  };

  const removeSaleItem = (index: number) => {
    setSaleItems((items) => {
      if (items.length === 1) return items;
      return items.filter((_, idx) => idx !== index);
    });
  };

  const openEdit = (order: (typeof orders)[number]) => {
    if (isReadOnly) return;
    setEditingOrder(order);
    setEditForm({
      paid: String(order.paid ?? 0),
      status: order.status,
      method: order.method || 'CASH',
      productName: order.items && order.items.length === 1 ? order.items[0].name : order.products.split(' x')[0],
      qty: order.items && order.items.length === 1 ? order.items[0].qty : order.qty,
      location: order.location,
    });
  };

  const handleUpdateOrder = () => {
    if (isReadOnly) return;
    if (!editingOrder) return;
    const paid = Number(editForm.paid) || 0;
    const deltaPaid = Math.max(0, paid - editingOrder.paid);
    if (editingOrder.items && editingOrder.items.length > 1) {
      let statusValue = editForm.status;
      if (statusValue !== 'Cancelled') {
        statusValue = paid >= editingOrder.total ? 'Paid' : paid > 0 ? 'Partial' : 'Pending';
      }
      updateOrder(editingOrder.id, {
        paid,
        method: editForm.method,
        status: statusValue,
        location: editForm.location,
      });
      if (deltaPaid > 0) {
        addPayment({
          date: new Date().toISOString().slice(0, 16).replace('T', ' '),
          patientId: editingOrder.patientId || 'N/A',
          patientName: editingOrder.patient,
          method: editForm.method,
          amount: deltaPaid,
          cash: editForm.method === 'CASH' ? deltaPaid : 0,
          card: editForm.method === 'CARD' ? deltaPaid : 0,
          bank: editForm.method === 'BANK_TRANSFER' ? deltaPaid : 0,
          other: editForm.method === 'OTHER' ? deltaPaid : 0,
          source: 'product',
        });
      }
      setEditingOrder(null);
      return;
    }
    const product = products.find((p) => p.name === editForm.productName);
    if (!product) return;
    const prevProductName = editingOrder.products.split(' x')[0];
    const prevProduct = products.find((p) => p.name === prevProductName);
    if (!prevProduct) return;
    if (prevProductName === product.name) {
      const available = prevProduct.stock + editingOrder.qty;
      if (editForm.qty > available) return;
    } else {
      if (product.stock < editForm.qty) return;
    }
    const total = product.price * editForm.qty;
    let statusValue = editForm.status;
    if (statusValue !== 'Cancelled') {
      statusValue = paid >= total ? 'Paid' : paid > 0 ? 'Partial' : 'Pending';
    }
    const nextOrder = {
      ...editingOrder,
      products: `${product.name} x${editForm.qty}`,
      qty: editForm.qty,
      unitPrice: product.price,
      location: editForm.location,
      total,
      paid,
      method: editForm.method,
      status: statusValue,
    };
    adjustInventoryForEdit(editingOrder, nextOrder);
    updateOrder(editingOrder.id, {
      products: nextOrder.products,
      qty: nextOrder.qty,
      unitPrice: nextOrder.unitPrice,
      location: nextOrder.location,
      total: nextOrder.total,
      paid: nextOrder.paid,
      method: nextOrder.method,
      status: nextOrder.status,
    });
    if (deltaPaid > 0) {
      addPayment({
        date: new Date().toISOString().slice(0, 16).replace('T', ' '),
        patientId: editingOrder.patientId || 'N/A',
        patientName: editingOrder.patient,
        method: editForm.method,
        amount: deltaPaid,
        cash: editForm.method === 'CASH' ? deltaPaid : 0,
        card: editForm.method === 'CARD' ? deltaPaid : 0,
        bank: editForm.method === 'BANK_TRANSFER' ? deltaPaid : 0,
        other: editForm.method === 'OTHER' ? deltaPaid : 0,
        source: 'product',
      });
    }
    setEditingOrder(null);
  };

  const handlePrint = (order: (typeof orders)[number]) => {
    setPrintingOrder(order);
  };

  React.useEffect(() => {
    if (!printingOrder) return;
    const handleAfterPrint = () => setPrintingOrder(null);
    window.addEventListener('afterprint', handleAfterPrint);
    window.print();
    return () => {
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, [printingOrder]);

  return (
    <div className="stack">
      <div className="panel section">
        <div className="section__header">
          <div>
            <div className="section__title">Orders</div>
            <div className="muted">Search by order, patient, product, location</div>
          </div>
          <button className="pill" onClick={() => setSaleOpen(true)} disabled={isReadOnly}>
            + New Sale
          </button>
        </div>
        <div className="filter-bar">
          <input
            className="input"
            placeholder="Order Id Search"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
          />
          <input
            className="input"
            placeholder="Patients Search"
            value={patientSearch}
            onChange={(e) => setPatientSearch(e.target.value)}
          />
          <input
            className="input"
            placeholder="Product Search"
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
          />
          <select className="input" value={location} onChange={(e) => setLocation(e.target.value)}>
            <option value="All">All Locations</option>
            <option value="Main Branch">Main Branch</option>
            <option value="Clinic Store">Clinic Store</option>
          </select>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="All">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Paid">Paid</option>
            <option value="Partial">Partial</option>
            <option value="Cancelled">Cancelled</option>
          </select>
          <button className="pill pill--ghost" onClick={() => {}}>
            Search
          </button>
        </div>
        <div className="table-wrapper">
          <table className="table table--compact table--sticky-actions">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Patient</th>
                <th>Products</th>
                <th>Qty</th>
                <th>Location</th>
                <th>Total</th>
                <th>Paid</th>
                <th>Balance</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={10} className="muted small" style={{ textAlign: 'center' }}>
                    No orders found.
                  </td>
                </tr>
              )}
              {filteredOrders.map((o) => {
                const balance = Math.max(0, o.total - o.paid);
                return (
                  <tr key={o.id}>
                    <td className="muted small">{o.id}</td>
                    <td>{o.patient}</td>
                    <td>{o.products}</td>
                    <td>{o.qty}</td>
                    <td>{o.location}</td>
                    <td>PKR {o.total.toLocaleString()}</td>
                    <td>PKR {o.paid.toLocaleString()}</td>
                    <td>PKR {balance.toLocaleString()}</td>
                    <td>
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="actions-cell">
                      <div className="action-stack">
                        <button className="icon-btn" title="View">
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path
                              d="M12 5c-5 0-9 4.5-10 7 1 2.5 5 7 10 7s9-4.5 10-7c-1-2.5-5-7-10-7zm0 12a5 5 0 1 1 5-5 5 5 0 0 1-5 5zm0-8a3 3 0 1 0 3 3 3 3 0 0 0-3-3z"
                              fill="currentColor"
                            />
                          </svg>
                        </button>
                        <button className="icon-btn" title="Print" aria-label="Print" onClick={() => handlePrint(o)}>
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path
                              d="M7 7V3h10v4H7zm10 2h1a3 3 0 0 1 3 3v5h-4v4H7v-4H3v-5a3 3 0 0 1 3-3h11zm-2 10v-4H9v4h6zm4-2h2v-5a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v5h2v-4h8v4h4z"
                              fill="currentColor"
                            />
                          </svg>
                        </button>
                        <button className="icon-btn" title="Update" aria-label="Update" onClick={() => openEdit(o)} disabled={isReadOnly}>
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path
                              d="M3 17.25V21h3.75l11-11-3.75-3.75-11 11zm2.92 2.83H5v-.92l9.06-9.06.92.92L5.92 20.08zM20.71 7.04a1 1 0 0 0 0-1.41L18.37 3.29a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
                              fill="currentColor"
                            />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel section">
        <div className="section__header">
          <div>
            <div className="section__title">Products / Inventory</div>
            <div className="muted">Track stock, sales, and low-stock alerts</div>
          </div>
          <button className="pill" onClick={handleAddProduct} disabled={isReadOnly}>
            Save Product
          </button>
        </div>
        <div className="form-grid">
          <input
            className="input"
            placeholder="Product Name"
            value={productForm.name}
            onChange={(e) => setProductForm((f) => ({ ...f, name: e.target.value }))}
            disabled={isReadOnly}
          />
          <input
            className="input"
            type="number"
            min="0"
            placeholder="Price"
            value={productForm.price}
            onChange={(e) => setProductForm((f) => ({ ...f, price: e.target.value }))}
            disabled={isReadOnly}
          />
          <input
            className="input"
            type="number"
            min="0"
            placeholder="Stock Qty"
            value={productForm.stock}
            onChange={(e) => setProductForm((f) => ({ ...f, stock: e.target.value }))}
            disabled={isReadOnly}
          />
          <input
            className="input"
            type="number"
            min="0"
            placeholder="Sold (optional)"
            value={productForm.sold}
            onChange={(e) => setProductForm((f) => ({ ...f, sold: e.target.value }))}
            disabled={isReadOnly}
          />
          <label className="pill">
            <input
              type="checkbox"
              checked={productForm.notify}
              onChange={(e) => setProductForm((f) => ({ ...f, notify: e.target.checked }))}
              disabled={isReadOnly}
            />
            <span>Enable low-stock alert</span>
          </label>
        </div>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Price</th>
                <th>Stock Qty</th>
                <th>Sale Record</th>
                <th>New Orders</th>
                <th>Low Stock</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.name}>
                  <td>{p.name}</td>
                  <td>PKR {p.price.toLocaleString()}</td>
                  <td>{p.stock}</td>
                  <td>{p.sold} sold</td>
                  <td>
                    <button className="pill pill--ghost">Notify</button>
                  </td>
                  <td>{p.stock < 15 ? <StatusBadge status="Inactive" /> : <StatusBadge status="Active" />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {saleOpen && (
        <div className="modal-backdrop" role="presentation" onClick={() => setSaleOpen(false)}>
          <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <div className="strong">New Product Sale</div>
              <button className="icon-btn" onClick={() => setSaleOpen(false)} aria-label="Close">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M18.3 5.71 12 12l6.3 6.29-1.41 1.42L10.59 13.4 4.29 19.71 2.88 18.3 9.18 12 2.88 5.71 4.29 4.3l6.3 6.3 6.29-6.3 1.42 1.41z"
                    fill="currentColor"
                  />
                </svg>
              </button>
            </div>
            <div className="form-grid">
              <input
                className="input"
                placeholder="Patient Name"
                value={saleForm.patient}
                onChange={(e) => setSaleForm((f) => ({ ...f, patient: e.target.value }))}
                disabled={isReadOnly}
              />
              <input
                className="input"
                placeholder="Patient ID (optional)"
                value={saleForm.patientId}
                onChange={(e) => setSaleForm((f) => ({ ...f, patientId: e.target.value }))}
                disabled={isReadOnly}
              />
              {saleItems.map((item, index) => (
                <React.Fragment key={`sale-item-${index}`}>
                  <select
                    className="input"
                    value={item.productName}
                    onChange={(e) =>
                      setSaleItems((items) =>
                        items.map((row, idx) =>
                          idx === index ? { ...row, productName: e.target.value } : row
                        )
                      )
                    }
                    disabled={isReadOnly}
                  >
                    <option value="">-- Select Product --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.name} (stock: {p.stock})
                      </option>
                    ))}
                  </select>
                  <div className="form-grid" style={{ gridColumn: '1 / -1', gridTemplateColumns: '2fr 1fr auto', gap: 12 }}>
                    <input
                      className="input"
                      type="number"
                      min="1"
                      placeholder="Quantity"
                      value={item.qty}
                      onChange={(e) =>
                        setSaleItems((items) =>
                          items.map((row, idx) =>
                            idx === index ? { ...row, qty: Number(e.target.value) } : row
                          )
                        )
                      }
                      disabled={isReadOnly}
                    />
                    <div className="muted small" style={{ alignSelf: 'center' }}>
                      {item.productName
                        ? `Unit: PKR ${products.find((p) => p.name === item.productName)?.price?.toLocaleString() ?? '-'}`
                        : 'Pick a product'}
                    </div>
                    <button
                      className="pill pill--ghost"
                      type="button"
                      onClick={() => removeSaleItem(index)}
                      disabled={isReadOnly || saleItems.length === 1}
                    >
                      Remove
                    </button>
                  </div>
                </React.Fragment>
              ))}
              <button className="pill pill--ghost" type="button" onClick={addSaleItem} disabled={isReadOnly}>
                + Add Product
              </button>
              <select
                className="input"
                value={saleForm.location}
                onChange={(e) => setSaleForm((f) => ({ ...f, location: e.target.value }))}
                disabled={isReadOnly}
              >
                <option value="Main Branch">Main Branch</option>
                <option value="Clinic Store">Clinic Store</option>
              </select>
              <select
                className="input"
                value={saleForm.method}
                onChange={(e) => setSaleForm((f) => ({ ...f, method: e.target.value as PaymentMethod }))}
                disabled={isReadOnly}
              >
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="OTHER">Other</option>
              </select>
              <input
                className="input"
                type="number"
                min="0"
                placeholder="Paid Amount"
                value={saleForm.paid}
                onChange={(e) => setSaleForm((f) => ({ ...f, paid: e.target.value }))}
                disabled={isReadOnly}
              />
            </div>
            {saleError && <div className="muted small" style={{ marginTop: 10 }}>{saleError}</div>}
            <div className="action-stack" style={{ marginTop: 12 }}>
              <button className="pill" onClick={handleCreateSale} disabled={isReadOnly}>
                Complete Sale
              </button>
              <button className="pill pill--ghost" onClick={() => setSaleOpen(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {editingOrder && (
        <div className="modal-backdrop" role="presentation" onClick={() => setEditingOrder(null)}>
          <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <div className="strong">Update Order</div>
              <button className="icon-btn" onClick={() => setEditingOrder(null)} aria-label="Close">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M18.3 5.71 12 12l6.3 6.29-1.41 1.42L10.59 13.4 4.29 19.71 2.88 18.3 9.18 12 2.88 5.71 4.29 4.3l6.3 6.3 6.29-6.3 1.42 1.41z"
                    fill="currentColor"
                  />
                </svg>
              </button>
            </div>
            <div className="stack">
              <div className="muted small">
                {editingOrder.id} - {editingOrder.patient} - PKR {editingOrder.total.toLocaleString()}
              </div>
              <input
                className="input"
                type="number"
                min="0"
                placeholder="Paid amount"
                value={editForm.paid}
                onChange={(e) => setEditForm((f) => ({ ...f, paid: e.target.value }))}
                disabled={isReadOnly}
              />
              <select
                className="input"
                value={editForm.method}
                onChange={(e) => setEditForm((f) => ({ ...f, method: e.target.value as PaymentMethod }))}
                disabled={isReadOnly}
              >
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="OTHER">Other</option>
              </select>
              {editingOrder.items && editingOrder.items.length > 1 ? (
                <div className="muted small">
                  This order has multiple products. You can update payment, status, and location only.
                </div>
              ) : (
                <>
                  <select
                    className="input"
                    value={editForm.productName}
                    onChange={(e) => setEditForm((f) => ({ ...f, productName: e.target.value }))}
                    disabled={isReadOnly}
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.name} (stock: {p.stock})
                      </option>
                    ))}
                  </select>
                  <input
                    className="input"
                    type="number"
                    min="1"
                    placeholder="Quantity"
                    value={editForm.qty}
                    onChange={(e) => setEditForm((f) => ({ ...f, qty: Number(e.target.value) }))}
                    disabled={isReadOnly}
                  />
                </>
              )}
              <select
                className="input"
                value={editForm.location}
                onChange={(e) => setEditForm((f) => ({ ...f, location: e.target.value }))}
                disabled={isReadOnly}
              >
                <option value="Main Branch">Main Branch</option>
                <option value="Clinic Store">Clinic Store</option>
              </select>
              <select
                className="input"
                value={editForm.status}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, status: e.target.value as typeof editForm.status }))
                }
                disabled={isReadOnly}
              >
                <option value="Pending">Pending</option>
                <option value="Partial">Partial</option>
                <option value="Paid">Paid</option>
                <option value="Cancelled">Cancelled</option>
              </select>
              <div className="action-stack">
                <button className="pill" onClick={handleUpdateOrder} disabled={isReadOnly}>
                  Save Update
                </button>
                <button
                  className="pill pill--ghost"
                  onClick={() => {
                    handlePrint(editingOrder);
                    setEditingOrder(null);
                  }}
                >
                  Print
                </button>
                <button className="pill pill--ghost" onClick={() => setEditingOrder(null)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {printingOrder && (
        <section className="consultation-print">
          <div className="consultation-watermark" aria-hidden="true">
            <img src={logo} alt="" />
          </div>
          <div className="consultation-header">
            <div className="consultation-header__left">
              <div className="consultation-clinic">
                <div className="consultation-clinic__title">Novo Aesthetics</div>
                <div className="consultation-clinic__meta">2-W-101, B-1 Plaza Main Susan Road Faisalabad</div>
                <div className="consultation-clinic__meta">
                  Phone: 0312-1114455 | Email: care@novoaestheticspk.com
                </div>
              </div>
            </div>
            <div className="consultation-header__right">
              <div className="consultation-meta">
                <div>
                  <span>Date:</span>
                  <strong>{new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}</strong>
                </div>
                <div>
                  <span>Order #:</span>
                  <strong>{printingOrder.id}</strong>
                </div>
                <div>
                  <span>Status:</span>
                  <strong className="consultation-status">{printingOrder.status}</strong>
                </div>
                <div>
                  <span>Method:</span>
                  <strong>{printingOrder.method || 'CASH'}</strong>
                </div>
              </div>
            </div>
          </div>
          <h1 className="consultation-title">Product Sale Receipt</h1>
          <div className="consultation-grid">
            <div className="consultation-field">
              <span>Patient</span>
              <div>{printingOrder.patient}</div>
            </div>
            <div className="consultation-field">
              <span>Location</span>
              <div>{printingOrder.location}</div>
            </div>
            <div className="consultation-field consultation-field--wide">
              <span>Products</span>
              <div>{printingOrder.products}</div>
            </div>
            {printingOrder.items && printingOrder.items.length > 1 ? (
              <div className="consultation-field consultation-field--wide">
                <span>Line Items</span>
                <div>
                  {printingOrder.items.map((item) => (
                    <div key={`${item.name}-${item.qty}`} className="muted small">
                      {item.name} x{item.qty} @ PKR {item.unitPrice.toLocaleString()}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div className="consultation-field">
                  <span>Unit Price</span>
                  <div>
                    PKR{' '}
                    {Math.round(
                      (printingOrder.unitPrice || printingOrder.total / Math.max(1, printingOrder.qty)) as number
                    ).toLocaleString()}
                  </div>
                </div>
                <div className="consultation-field">
                  <span>Quantity</span>
                  <div>{printingOrder.qty}</div>
                </div>
              </>
            )}
            <div className="consultation-field">
              <span>Total</span>
              <div>PKR {printingOrder.total.toLocaleString()}</div>
            </div>
            <div className="consultation-field">
              <span>Paid</span>
              <div>PKR {printingOrder.paid.toLocaleString()}</div>
            </div>
            <div className="consultation-field">
              <span>Balance</span>
              <div>PKR {Math.max(0, printingOrder.total - printingOrder.paid).toLocaleString()}</div>
            </div>
          </div>
          <section className="consultation-signatures">
            <div>
              <div className="signature-line" />
              <div className="signature-label">Cashier Signature</div>
            </div>
            <div>
              <div className="signature-line" />
              <div className="signature-label">Patient Signature</div>
            </div>
          </section>
        </section>
      )}
    </div>
  );
};
