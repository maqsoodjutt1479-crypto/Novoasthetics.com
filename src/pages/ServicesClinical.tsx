import React, { useEffect, useMemo, useState } from 'react';
import { StatusBadge } from '../components/StatusBadge';
import { useClinicalServices } from '../store/useClinicalServices';
import type { ClinicalService } from '../data/clinicalServices';

export const ServicesClinicalPage: React.FC = () => {
  const { services, addService, removeService, hydrate, isLoading, error } = useClinicalServices();
  const [categories, setCategories] = useState<string[]>(() => {
    const base = ['Body Contouring', 'Chemical Peel', 'Laser', 'Facials'];
    const fromServices = services.map((svc) => svc.category);
    return Array.from(new Set([...base, ...fromServices]));
  });
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [newCategory, setNewCategory] = useState('');
  const [form, setForm] = useState({
    category: '',
    name: '',
    code: '',
    duration: 30,
    color: '#0ea5e9',
    price: 0,
    status: 'Active' as typeof services[number]['status'],
  });
  const [search, setSearch] = useState('');

  const filtered = useMemo(
    () => services.filter((s) => selectedCategory === 'All' || s.category === selectedCategory),
    [services, selectedCategory]
  );

  useEffect(() => {
    const fromServices = services.map((svc) => svc.category);
    setCategories((prev) => Array.from(new Set([...prev, ...fromServices])));
  }, [services]);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const searched = useMemo(
    () =>
      filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          s.category.toLowerCase().includes(search.toLowerCase()) ||
          (s.code || '').toLowerCase().includes(search.toLowerCase())
      ),
    [filtered, search]
  );

  const handleAddCategory = () => {
    if (!newCategory.trim()) return;
    if (!categories.includes(newCategory.trim())) {
      setCategories((prev) => [...prev, newCategory.trim()]);
    }
    setNewCategory('');
  };

  const handleAddService = async () => {
    if (!form.name || !form.category) return;
    await addService({
      category: form.category,
      name: form.name,
      code: form.code || undefined,
      duration: Number(form.duration) || 0,
      color: form.color || '#0ea5e9',
      price: Number(form.price) || 0,
      status: form.status,
    });
    setForm({
      category: '',
      name: '',
      code: '',
      duration: 30,
      color: '#0ea5e9',
      price: 0,
      status: 'Active',
    });
  };

  const handleDelete = async (id: string) => {
    await removeService(id);
  };

  return (
    <div className="stack">
      <div className="services-top">
        <div className="panel section">
          <div className="section__header">
            <div>
              <div className="section__title">Service Categories</div>
              <div className="muted">Edit/Delete or add new categories</div>
            </div>
            <div className="filter-bar">
              <input
                className="input"
                placeholder="New Category"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
              />
              <button className="pill" onClick={handleAddCategory}>
                + New Category
              </button>
              <button className="pill pill--ghost" onClick={() => setSelectedCategory('All')}>
                Refresh
              </button>
            </div>
          </div>
          <div className="table-wrapper">
            <table className="table table--compact">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat} className={selectedCategory === cat ? 'row-today' : ''}>
                    <td>{cat}</td>
                    <td>
                      <div className="action-stack">
                        <button
                          className="icon-btn"
                          onClick={() => setSelectedCategory(cat)}
                          title="Select category"
                          aria-label="Select category"
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path
                              d="M9.55 17.54 4.5 12.5l1.41-1.41 3.64 3.64 8.54-8.54 1.41 1.41-9.95 9.95z"
                              fill="currentColor"
                            />
                          </svg>
                        </button>
                        <button
                          className="icon-btn"
                          onClick={() => setNewCategory(cat)}
                          title="Edit category"
                          aria-label="Edit category"
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path
                              d="M3 17.25V21h3.75l11-11-3.75-3.75-11 11zm2.92 2.83H5v-.92l9.06-9.06.92.92L5.92 20.08zM20.71 7.04a1 1 0 0 0 0-1.41L18.37 3.29a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
                              fill="currentColor"
                            />
                          </svg>
                        </button>
                        <button
                          className="icon-btn"
                          onClick={() => setCategories((prev) => prev.filter((c) => c !== cat))}
                          title="Delete category"
                          aria-label="Delete category"
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path
                              d="M9 3h6l1 2h4v2H4V5h4l1-2zm1 6h2v9h-2V9zm4 0h2v9h-2V9zM7 9h2v9H7V9z"
                              fill="currentColor"
                            />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel section">
          <div className="section__header">
            <div>
              <div className="section__title">New Service</div>
              <div className="muted">Select category, set duration, price, status</div>
            </div>
          </div>
          <div className="form-grid">
            <select
              className="input"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            >
              <option value="">-- Select Category --</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <input
              className="input"
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <input
              className="input"
              placeholder="Code (optional)"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
            />
            <input
              className="input"
              type="number"
              min="0"
              placeholder="Duration (minutes)"
              value={form.duration}
              onChange={(e) => setForm((f) => ({ ...f, duration: Number(e.target.value) }))}
            />
            <input
              className="input"
              type="color"
              value={form.color}
              onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
            />
            <input
              className="input"
              type="number"
              min="0"
              placeholder="Price"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))}
            />
            <select
              className="input"
              value={form.status}
              onChange={(e) =>
                setForm((f) => ({ ...f, status: e.target.value as ClinicalService['status'] }))
              }
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
            <button className="pill" onClick={handleAddService}>
              Save Service
            </button>
          </div>
        </div>
      </div>

      <div className="panel section">
        <div className="section__header">
          <div>
            <div className="section__title">Services</div>
            <div className="muted">Filtered by category</div>
            {isLoading ? <div className="muted small">Loading from database…</div> : null}
            {error ? (
              <div className="muted small" style={{ color: '#b91c1c' }}>
                {error}
              </div>
            ) : null}
          </div>
          <div className="filter-bar">
            <input
              className="input"
              placeholder="Search by service, category, code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button className="pill pill--ghost" onClick={() => setSearch('')}>
              Clear Filter
            </button>
            <select
              className="input"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="All">All</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="table-wrapper">
          <table className="table table--compact table--sticky-actions">
            <thead>
              <tr>
                <th>Sr</th>
                <th>Category</th>
                <th>Name</th>
                <th>Code</th>
                <th>Duration</th>
                <th>Color</th>
                <th>Price</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {searched.map((svc, idx) => (
                <tr key={svc.id}>
                  <td className="muted small">{idx + 1}</td>
                  <td>
                    <div className="strong">{svc.category}</div>
                    <div className="muted small">Category</div>
                  </td>
                  <td>{svc.name}</td>
                  <td className="muted small">{svc.code || '-'}</td>
                  <td>
                    {String(Math.floor(svc.duration / 60)).padStart(2, '0')}:
                    {String(svc.duration % 60).padStart(2, '0')}
                  </td>
                  <td>
                    <span className="chip" style={{ background: svc.color, color: '#0b1220' }}>
                      {svc.color}
                    </span>
                  </td>
                  <td>PKR {svc.price.toLocaleString()}</td>
                  <td>
                    <StatusBadge status={svc.status} />
                  </td>
                  <td className="actions-cell">
                    <div className="action-stack">
                      <button className="icon-btn" title="Edit" aria-label="Edit service">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path
                            d="M3 17.25V21h3.75l11-11-3.75-3.75-11 11zm2.92 2.83H5v-.92l9.06-9.06.92.92L5.92 20.08zM20.71 7.04a1 1 0 0 0 0-1.41L18.37 3.29a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
                            fill="currentColor"
                          />
                        </svg>
                      </button>
                      <button
                        className="icon-btn"
                        title="Delete"
                        aria-label="Delete service"
                        onClick={() => handleDelete(svc.id)}
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path
                            d="M9 3h6l1 2h4v2H4V5h4l1-2zm1 6h2v9h-2V9zm4 0h2v9h-2V9zM7 9h2v9H7V9z"
                            fill="currentColor"
                          />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
