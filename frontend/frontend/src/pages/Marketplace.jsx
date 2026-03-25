import React, { useContext, useEffect, useMemo, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { createListing, fetchCrops, fetchListings, fetchMarkets } from '../lib/api';
import MessageModal from '../components/MessageModal';

export default function MarketplacePage() {
  const { user } = useContext(AuthContext);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [q, setQ] = useState('');
  const [crop, setCrop] = useState('');
  const [market, setMarket] = useState('');

  const [rows, setRows] = useState([]);
  const [crops, setCrops] = useState([]);
  const [markets, setMarkets] = useState([]);

  // Create listing form
  const [createCrop, setCreateCrop] = useState('');
  const [createMarket, setCreateMarket] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('kg');
  const [price, setPrice] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [creating, setCreating] = useState(false);
  const canCreateListing = !!user?.privileges?.can_create_listing;

  // Messaging modal
  const [open, setOpen] = useState(false);
  const [otherUserId, setOtherUserId] = useState(null);
  const [displayName, setDisplayName] = useState(null);

  async function loadCatalogs() {
    const [c, m] = await Promise.all([fetchCrops(), fetchMarkets()]);
    setCrops(c?.results || c || []);
    setMarkets(m?.results || m || []);
  }

  async function loadListings(next = {}) {
    const data = await fetchListings({ active: true, q: next.q ?? q, crop: next.crop ?? crop, market: next.market ?? market });
    setRows(data?.results || data || []);
  }

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError('');

    Promise.all([loadCatalogs(), loadListings()])
      .catch((err) => {
        if (!mounted) return;
        setError(err?.response?.data?.detail || 'Failed to load marketplace data');
      })
      .finally(() => mounted && setLoading(false));

    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredCount = useMemo(() => rows.length, [rows]);

  async function onSearch(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await loadListings({ q, crop, market });
    } catch (err) {
      setError(err?.response?.data?.detail || 'Search failed');
    } finally {
      setLoading(false);
    }
  }

  async function onCreate(e) {
    e.preventDefault();
    if (!createCrop || !quantity || !price) return;

    setCreating(true);
    try {
      await createListing({
        crop: createCrop,
        market: createMarket || undefined,
        quantity,
        unit,
        price,
        contact_phone: contactPhone || undefined,
      });
      setCreateCrop('');
      setCreateMarket('');
      setQuantity('');
      setUnit('kg');
      setPrice('');
      setContactPhone('');
      await loadListings();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Could not create listing');
    } finally {
      setCreating(false);
    }
  }

  function openChat(listing) {
    setOtherUserId(listing?.owner_id || null);
    setDisplayName(listing?.owner || 'User');
    setOpen(true);
  }

  if (loading) return <div>Loading marketplace...</div>;

  return (
    <div className="container py-2">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div>
          <h2 className="h4 mb-1">Marketplace</h2>
          <div className="text-muted small">Browse produce listings and message farmers/buyers to negotiate (no payments on-platform).</div>
        </div>
        <div className="text-muted small">Results: {filteredCount}</div>
      </div>

      {error ? <div className="alert alert-danger">{error}</div> : null}

      <div className="card app-card mb-3">
        <div className="card-body">
          <form onSubmit={onSearch} className="row g-2 align-items-end">
            <div className="col-12 col-md-5">
              <label className="form-label small">Search</label>
              <input className="form-control" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Crop, market or username" />
            </div>
            <div className="col-6 col-md-3">
              <label className="form-label small">Crop</label>
              <select className="form-select" value={crop} onChange={(e) => setCrop(e.target.value)}>
                <option value="">Any</option>
                {crops.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div className="col-6 col-md-3">
              <label className="form-label small">Market</label>
              <select className="form-select" value={market} onChange={(e) => setMarket(e.target.value)}>
                <option value="">Any</option>
                {markets.map((m) => <option key={m.id} value={m.name}>{m.name}</option>)}
              </select>
            </div>
            <div className="col-12 col-md-1 d-grid">
              <button className="btn btn-success" type="submit">Go</button>
            </div>
          </form>
        </div>
      </div>

      {canCreateListing ? (
        <div className="card app-card mb-4">
          <div className="card-body">
            <h6 className="mb-3">Create listing (farmers/buyers)</h6>
            <form onSubmit={onCreate} className="row g-2">
              <div className="col-12 col-md-3">
                <label className="form-label small">Crop</label>
                <select className="form-select" value={createCrop} onChange={(e) => setCreateCrop(e.target.value)} required>
                  <option value="">Select</option>
                  {crops.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="col-12 col-md-3">
                <label className="form-label small">Market (optional)</label>
                <select className="form-select" value={createMarket} onChange={(e) => setCreateMarket(e.target.value)}>
                  <option value="">None</option>
                  {markets.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
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
              <div className="col-12 col-md-8 d-grid align-self-end">
                <button className="btn btn-primary" type="submit" disabled={creating}>{creating ? 'Creating...' : 'Create listing'}</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {rows.length === 0 ? (
        <div className="text-muted">No listings found.</div>
      ) : (
        <div className="row g-3">
          {rows.map((r) => (
            <div key={r.id} className="col-12 col-lg-6">
              <div className="card app-card h-100">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start gap-2">
                    <div>
                      <div className="fw-bold">{r.crop} - {r.quantity} {r.unit}</div>
                      <div className="text-muted small">Market: {r.market || 'N/A'} | Price: {r.price}</div>
                      <div className="text-muted small">Listed by: {r.owner}</div>
                    </div>
                    <div className="d-flex gap-2">
                      {r.owner_id && user?.id !== r.owner_id ? (
                        <button className="btn btn-sm btn-outline-primary" onClick={() => openChat(r)}>Message</button>
                      ) : null}
                    </div>
                  </div>

                  {r.contact_phone ? <div className="small text-muted mt-2">Contact phone: {r.contact_phone}</div> : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <MessageModal
        open={open}
        onClose={() => setOpen(false)}
        displayName={displayName}
        otherUserId={otherUserId}
      />
    </div>
  );
}

