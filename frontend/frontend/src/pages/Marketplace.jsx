import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { createOrder, fetchAdminUsers, fetchCrops, fetchListings, fetchMarkets, fetchOrders } from '../lib/api';
import MessageModal from '../components/MessageModal';
import producePlaceholder from '../assets/produce-placeholder.svg';

export default function MarketplacePage() {
  const { user } = useContext(AuthContext);
  const isAdmin = !!(user && (user.is_staff || user.is_superuser || user?.privileges?.is_admin || user.role === 'admin'));

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [q, setQ] = useState('');
  const [crop, setCrop] = useState('');
  const [market, setMarket] = useState('');

  const [rows, setRows] = useState([]);
  const [crops, setCrops] = useState([]);
  const [markets, setMarkets] = useState([]);
  const [orders, setOrders] = useState([]);
  const [orderQty, setOrderQty] = useState({});
  const [users, setUsers] = useState([]);
  const [orderAccountId, setOrderAccountId] = useState('');
  const canCreateListing = !!user?.privileges?.can_create_listing;

  // Messaging modal
  const [open, setOpen] = useState(false);
  const [otherUserId, setOtherUserId] = useState(null);
  const [displayName, setDisplayName] = useState(null);

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

  async function loadOrders() {
    const data = await fetchOrders({ scope: 'buying' });
    setOrders(data || []);
  }

  async function loadListings(next = {}) {
    const data = await fetchListings({ active: true, q: next.q ?? q, crop: next.crop ?? crop, market: next.market ?? market });
    setRows(data?.results || data || []);
  }

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError('');

    const tasks = [loadCatalogs(), loadListings()];
    if (user?.id) tasks.push(loadOrders());
    Promise.all(tasks)
      .catch((err) => {
        if (!mounted) return;
        setError(err?.response?.data?.detail || 'Failed to load marketplace data');
      })
      .finally(() => mounted && setLoading(false));

    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isAdmin]);

  const filteredCount = useMemo(() => rows.length, [rows]);
  const actingBuyerId = useMemo(() => {
    if (isAdmin) {
      return orderAccountId ? Number(orderAccountId) : null;
    }
    return user?.id || null;
  }, [isAdmin, orderAccountId, user]);
  const latestOrderByListing = useMemo(() => {
    const map = {};
    for (const order of orders.filter((item) => actingBuyerId && Number(item.buyer) === Number(actingBuyerId))) {
      if (!map[order.listing_id]) {
        map[order.listing_id] = order;
      }
    }
    return map;
  }, [orders, actingBuyerId]);

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

  function openChat(listing) {
    setOtherUserId(listing?.owner_id || null);
    setDisplayName(listing?.owner || 'User');
    setOpen(true);
  }

  async function handleOrder(listingId, action) {
    setError('');
    const quantity = orderQty[listingId] || '1';
    try {
      const payload = { listing_id: listingId, quantity, action };
      if (isAdmin && orderAccountId) {
        payload.buyer_id = orderAccountId;
      }
      const next = await createOrder(payload);
      setOrders((prev) => [next, ...prev.filter((item) => item.id !== next.id)]);
    } catch (err) {
      setError(err?.response?.data?.detail || `Could not ${action === 'order' ? 'place order' : 'add to cart'}`);
    }
  }

  if (loading) return <div>Loading marketplace...</div>;

  return (
    <div className="container py-2">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div>
          <h2 className="h4 mb-1">Marketplace</h2>
          <div className="text-muted small">
            {isAdmin
              ? 'Browse and manage marketplace activity across the platform. You can place orders on behalf of any selected user.'
              : 'Browse produce listings and message farmers/buyers to negotiate (no payments on-platform).'}
          </div>
        </div>
        <div className="d-flex align-items-center gap-3">
          {canCreateListing ? <Link to="/my-listings" className="btn btn-sm btn-outline-secondary">My Listings</Link> : null}
          {user?.id ? <Link to="/orders" className="btn btn-sm btn-outline-primary">Orders</Link> : null}
          <div className="text-muted small">Results: {filteredCount}</div>
        </div>
      </div>

      {isAdmin ? (
        <div className="card app-card mb-3">
          <div className="card-body">
            <div className="row g-2 align-items-end">
              <div className="col-12 col-md-6">
                <label className="form-label small">Place orders as</label>
                <select className="form-select" value={orderAccountId} onChange={(e) => setOrderAccountId(e.target.value)}>
                  <option value="">Select a user account</option>
                  {users.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.username} ({entry.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      ) : null}

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

      {rows.length === 0 ? (
        <div className="text-muted">No listings found.</div>
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
                  {latestOrderByListing[r.id] && latestOrderByListing[r.id].buyer === user?.id ? (
                    <div className="mb-2">
                      <span className={`badge ${
                        latestOrderByListing[r.id].status === 'approved'
                          ? 'bg-success-subtle text-success border border-success-subtle'
                          : latestOrderByListing[r.id].status === 'pending'
                            ? 'bg-info-subtle text-info border border-info-subtle'
                            : latestOrderByListing[r.id].status === 'cart'
                              ? 'bg-warning-subtle text-warning border border-warning-subtle'
                              : 'bg-secondary-subtle text-secondary border border-secondary-subtle'
                      }`}>
                        {latestOrderByListing[r.id].status_label}
                      </span>
                    </div>
                  ) : null}
                  <div className="d-flex justify-content-between align-items-start gap-2">
                    <div>
                      <div className="fw-bold d-flex flex-wrap align-items-center gap-2">
                        <span>{r.crop} - {r.quantity} {r.unit}</span>
                        {r.owner_id && user?.id === r.owner_id ? (
                          <span className="badge bg-success-subtle text-success border border-success-subtle">Your product</span>
                        ) : null}
                      </div>
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
                  {r.owner_id && user?.id !== r.owner_id ? (
                    <div className="mt-3 border-top pt-3">
                      <div className="row g-2 align-items-end">
                        <div className="col-12 col-md-4">
                          <label className="form-label small">Order quantity</label>
                          <input
                            type="number"
                            className="form-control form-control-sm"
                            min="1"
                            value={orderQty[r.id] ?? '1'}
                            onChange={(e) => setOrderQty((prev) => ({ ...prev, [r.id]: e.target.value }))}
                          />
                        </div>
                        <div className="col-12 col-md-8 d-flex flex-wrap gap-2">
                          <button className="btn btn-sm btn-outline-secondary" onClick={() => handleOrder(r.id, 'cart')}>
                            {isAdmin ? 'Add to cart for user' : 'Add to cart'}
                          </button>
                          <button
                            className="btn btn-sm btn-success"
                            onClick={() => handleOrder(r.id, 'order')}
                            disabled={isAdmin && (!orderAccountId || Number(orderAccountId) === Number(r.owner_id))}
                          >
                            {isAdmin ? 'Order for user' : 'Order'}
                          </button>
                        </div>
                      </div>
                      {isAdmin && !orderAccountId ? (
                        <div className="small text-muted mt-2">Select a user account above to place orders as that user.</div>
                      ) : null}
                      {isAdmin && orderAccountId && Number(orderAccountId) === Number(r.owner_id) ? (
                        <div className="small text-muted mt-2">You cannot place an order on behalf of the listing owner.</div>
                      ) : null}
                    </div>
                  ) : null}
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
