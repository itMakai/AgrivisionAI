import React, { useContext, useEffect, useMemo, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { createListing, deleteListing, fetchAdminUsers, fetchCrops, fetchListings, fetchMarkets, updateListing } from '../lib/api';
import producePlaceholder from '../assets/produce-placeholder.svg';

function getStatusBadge(active) {
  if (active) {
    return <span className="badge bg-success-subtle text-success border border-success-subtle">Active</span>;
  }
  return <span className="badge bg-secondary-subtle text-secondary border border-secondary-subtle">Sold</span>;
}

export default function MyListingsPage() {
  const { user } = useContext(AuthContext);
  const isAdmin = !!(user && (user.is_staff || user.is_superuser || user?.privileges?.is_admin || user.role === 'admin'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rows, setRows] = useState([]);
  const [crops, setCrops] = useState([]);
  const [markets, setMarkets] = useState([]);
  const [users, setUsers] = useState([]);
  const [ownerFilter, setOwnerFilter] = useState('');

  const [createCrop, setCreateCrop] = useState('');
  const [createMarket, setCreateMarket] = useState('');
  const [selectedOwnerId, setSelectedOwnerId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('kg');
  const [price, setPrice] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [produceImage, setProduceImage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editingListingId, setEditingListingId] = useState(null);
  const [formKey, setFormKey] = useState(0);

  const activeCount = useMemo(() => rows.filter((row) => row.active).length, [rows]);

  async function loadCatalogs() {
    const requests = [fetchCrops(), fetchMarkets()];
    if (isAdmin) {
      requests.push(fetchAdminUsers());
    }
    const [c, m, userRows] = await Promise.all(requests);
    setCrops(c?.results || c || []);
    setMarkets(m?.results || m || []);
    if (isAdmin) {
      setUsers(userRows?.results || userRows || []);
    }
  }

  async function loadListings(nextOwnerFilter = ownerFilter) {
    const params = isAdmin
      ? (nextOwnerFilter ? { owner: nextOwnerFilter } : {})
      : { owner: 'me' };
    const data = await fetchListings(params);
    setRows(data?.results || data || []);
  }

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError('');

    Promise.all([loadCatalogs(), loadListings()])
      .catch((err) => {
        if (!mounted) return;
        setError(err?.response?.data?.detail || 'Failed to load your listings');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  function resetForm(formElement = null) {
    setEditingListingId(null);
    setCreateCrop('');
    setCreateMarket('');
    setSelectedOwnerId('');
    setQuantity('');
    setUnit('kg');
    setPrice('');
    setContactPhone('');
    setProduceImage(null);
    setFormKey((current) => current + 1);
    if (formElement?.reset) {
      formElement.reset();
    }
  }

  function startEdit(listing) {
    setEditingListingId(listing.id);
    setCreateCrop(listing.crop || '');
    setCreateMarket(listing.market || '');
    setSelectedOwnerId(String(listing.owner_id || ''));
    setQuantity(String(listing.quantity ?? ''));
    setUnit(listing.unit || 'kg');
    setPrice(String(listing.price ?? ''));
    setContactPhone(listing.contact_phone || '');
    setProduceImage(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function submitListing(event) {
    event.preventDefault();
    if (!createCrop || !quantity || !price) return;

    setSaving(true);
    setError('');

    try {
      const payload = new FormData();
      payload.append('crop', createCrop);
      payload.append('quantity', quantity);
      payload.append('unit', unit);
      payload.append('price', price);
      if (createMarket) payload.append('market', createMarket);
      if (contactPhone) payload.append('contact_phone', contactPhone);
      if (produceImage) payload.append('produce_image', produceImage);
      if (isAdmin && selectedOwnerId) payload.append('owner_id', selectedOwnerId);

      if (editingListingId) {
        await updateListing(editingListingId, payload);
      } else {
        await createListing(payload);
      }

      resetForm(event.target);
      await Promise.all([loadListings(), loadCatalogs()]);
    } catch (err) {
      setError(err?.response?.data?.detail || (editingListingId ? 'Could not update listing' : 'Could not create listing'));
    } finally {
      setSaving(false);
    }
  }

  async function markAsSold(listingId) {
    setError('');
    try {
      await updateListing(listingId, { active: false });
      if (editingListingId === listingId) {
        resetForm();
      }
      await loadListings();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Could not mark listing as sold');
    }
  }

  async function removeListing(listingId) {
    setError('');
    try {
      await deleteListing(listingId);
      if (editingListingId === listingId) {
        resetForm();
      }
      await loadListings();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Could not delete listing');
    }
  }

  if (loading) return <div>Loading your listings...</div>;

  return (
    <div className="container py-2">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div>
          <h2 className="h4 mb-1">{isAdmin ? 'Platform Listings' : 'My Listings'}</h2>
          <div className="text-muted small">
            {isAdmin
              ? 'Create and manage listings for any user across the platform.'
              : `Create, edit, delete, and track all listings posted under ${user?.username}.`}
          </div>
        </div>
        <div className="text-muted small">Active: {activeCount} | Total: {rows.length}</div>
      </div>

      {error ? <div className="alert alert-danger">{error}</div> : null}

      {isAdmin ? (
        <div className="card app-card mb-3">
          <div className="card-body">
            <div className="row g-2 align-items-end">
              <div className="col-12 col-md-6">
                <label className="form-label small">Filter by owner</label>
                <select
                  className="form-select"
                  value={ownerFilter}
                  onChange={async (e) => {
                    const next = e.target.value;
                    setOwnerFilter(next);
                    setLoading(true);
                    try {
                      await loadListings(next);
                    } catch (err) {
                      setError(err?.response?.data?.detail || 'Failed to filter listings');
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  <option value="">All users</option>
                  {users.map((entry) => (
                    <option key={entry.id} value={entry.username}>
                      {entry.username} ({entry.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="card app-card mb-4">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center gap-2 mb-3">
            <h6 className="mb-0">{editingListingId ? 'Edit listing' : 'Create listing'}</h6>
            {editingListingId ? (
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => resetForm()}>
                Cancel edit
              </button>
            ) : null}
          </div>
          <form key={formKey} onSubmit={submitListing} className="row g-2">
            {isAdmin ? (
              <div className="col-12 col-md-3">
                <label className="form-label small">Listing owner</label>
                <select className="form-select" value={selectedOwnerId} onChange={(e) => setSelectedOwnerId(e.target.value)} required>
                  <option value="">Select user</option>
                  {users.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.username} ({entry.role})
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div className="col-12 col-md-3">
              <label className="form-label small">Crop</label>
              <input
                list="listing-crops"
                className="form-control"
                value={createCrop}
                onChange={(e) => setCreateCrop(e.target.value)}
                placeholder="Select or type a new crop"
                required
              />
              <datalist id="listing-crops">
                {crops.map((c) => <option key={c.id} value={c.name} />)}
              </datalist>
            </div>
            <div className="col-12 col-md-3">
              <label className="form-label small">Market (optional)</label>
              <input
                list="listing-markets"
                className="form-control"
                value={createMarket}
                onChange={(e) => setCreateMarket(e.target.value)}
                placeholder="Select or type a new market"
              />
              <datalist id="listing-markets">
                {markets.map((m) => <option key={m.id} value={m.name} />)}
              </datalist>
            </div>
            <div className="col-6 col-md-2">
              <label className="form-label small">Qty</label>
              <input className="form-control" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
            </div>
            <div className="col-6 col-md-2">
              <label className="form-label small">Unit</label>
              <input className="form-control" value={unit} onChange={(e) => setUnit(e.target.value)} />
            </div>
            <div className="col-12 col-md-2">
              <label className="form-label small">Price</label>
              <input className="form-control" type="number" value={price} onChange={(e) => setPrice(e.target.value)} required />
            </div>
            <div className="col-12 col-md-4">
              <label className="form-label small">Contact phone (optional)</label>
              <input className="form-control" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+2547..." />
            </div>
            <div className="col-12 col-md-4">
              <label className="form-label small">Produce photo (optional)</label>
              <input
                className="form-control"
                type="file"
                accept="image/*"
                onChange={(e) => setProduceImage(e.target.files?.[0] || null)}
              />
            </div>
            <div className="col-12">
              <div className="small text-muted">
                {editingListingId
                  ? 'Leave the image field empty to keep the current photo. Sold listings stay here for your records.'
                  : 'If no image is uploaded, the default produce picture will be shown.'}
              </div>
            </div>
            <div className="col-12 d-grid">
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? (editingListingId ? 'Saving...' : 'Creating...') : (editingListingId ? 'Save changes' : 'Create listing')}
              </button>
            </div>
          </form>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="text-muted">You have not created any listings yet.</div>
      ) : (
        <div className="row g-3">
          {rows.map((r) => (
            <div key={r.id} className="col-12 col-lg-6">
              <div className="card app-card h-100">
                <img
                  src={r.produce_image || producePlaceholder}
                  alt={`${r.crop} produce`}
                  className="card-img-top"
                  style={{ height: 220, objectFit: 'cover' }}
                />
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                    <div>
                      <div className="fw-bold">{r.crop} - {r.quantity} {r.unit}</div>
                      <div className="text-muted small">Market: {r.market || 'N/A'} | Price: {r.price}</div>
                      {isAdmin ? <div className="text-muted small">Owner: {r.owner}</div> : null}
                    </div>
                    {getStatusBadge(r.active)}
                  </div>

                  {r.contact_phone ? <div className="small text-muted mb-3">Contact phone: {r.contact_phone}</div> : null}

                  <div className="d-flex flex-wrap gap-2">
                    <button className="btn btn-sm btn-outline-secondary" onClick={() => startEdit(r)}>
                      Edit
                    </button>
                    {r.active ? (
                      <button className="btn btn-sm btn-outline-success" onClick={() => markAsSold(r.id)}>
                        Mark sold
                      </button>
                    ) : null}
                    <button className="btn btn-sm btn-outline-danger" onClick={() => removeListing(r.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
