import { useContext, useEffect, useState } from 'react';
import {
  createListing,
  fetchBuyers,
  fetchCrops,
  fetchFarmers,
  fetchInsights,
  fetchListings,
  fetchMarkets,
  fetchTopPrices,
  getOrCreateConversationWithUser,
} from '../lib/api';
import { AuthContext } from '../context/AuthContext';
import MessageModal from '../components/MessageModal';

export default function DashboardPage() {
  const { user } = useContext(AuthContext);
  const [insights, setInsights] = useState([]);
  const [topPrices, setTopPrices] = useState([]);
  const [listings, setListings] = useState([]);
  const [others, setOthers] = useState([]);
  const [moreAvailable, setMoreAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [messageConversationId, setMessageConversationId] = useState(null);

  useEffect(() => {
    let mounted = true;
    Promise.all([fetchInsights(), fetchTopPrices(), fetchListings({ owner: 'me' })])
      .then(([insRes, priceRes, listingRes]) => {
        if (!mounted) return;
        setInsights(insRes || []);
        setTopPrices(priceRes?.results || priceRes || []);
        setListings(listingRes?.results || listingRes || []);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadOthers() {
      if (!user) return;
      try {
        if (user.role === 'farmer') {
          const buyers = await fetchBuyers();
          if (!mounted) return;
          const rows = buyers?.results || buyers || [];
          setOthers(rows);
          setMoreAvailable(rows.length > 5);
        } else if (user.role === 'buyer') {
          const farmers = await fetchFarmers();
          if (!mounted) return;
          const rows = farmers?.results || farmers || [];
          setOthers(rows);
          setMoreAvailable(rows.length > 5);
        } else {
          setOthers([]);
          setMoreAvailable(false);
        }
      } catch (err) {
        console.error(err);
      }
    }

    loadOthers();
    return () => {
      mounted = false;
    };
  }, [user]);

  function reloadListings() {
    setLoading(true);
    fetchListings({ owner: 'me' })
      .then((data) => setListings(data?.results || data || []))
      .finally(() => setLoading(false));
  }

  const latest = insights[0];

  if (loading) return <div>Loading dashboard…</div>;

  return (
    <div>
      <h2 className="h4 mb-3">Marketplace Dashboard</h2>
      <div className="row g-3">
        <div className="col-md-6">
          <div className="card app-card p-3">
            <h5 className="h6">Latest Insight</h5>
            {latest ? (
              <div>
                <div className="small text-muted">{latest.source} • {new Date(latest.created_at).toLocaleString()}</div>
                <h6 className="mt-2">{latest.title}</h6>
                <p className="mb-0">{latest.content}</p>
              </div>
            ) : (
              <div>No insights yet. Run the insights generator.</div>
            )}
          </div>
        </div>
        <div className="col-md-6">
          <div className="card app-card p-3">
            <h5 className="h6">Top Market Prices</h5>
            <ul className="list-unstyled">
              {topPrices.slice(0, 6).map((price) => (
                <li key={price.id} className="py-1 border-bottom">
                  <strong>{price.crop}</strong> — {price.market} — KSh {price.predicted_price}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="row g-3 mt-4">
        <div className="col-md-6">
          <div className="card app-card p-3">
            <h5 className="h6">Sell a Crop</h5>
            <SellForm onCreated={reloadListings} />
          </div>
        </div>

        <div className="col-md-6">
          <div className="card app-card p-3">
            <h5 className="h6">My Listings</h5>
            <ListingsList listings={listings} />
          </div>
        </div>
      </div>

      <div className="row g-3 mt-4">
        <div className="col-12">
          <div className="card app-card p-3">
            <h5 className="h6">{user?.role === 'farmer' ? 'Available Buyers' : 'Available Farmers'}</h5>
            <p className="small text-muted">
              {user?.role === 'farmer'
                ? 'Request a buyer to get matched with a buyer'
                : 'Browse farmers and their products. Click "See more" to expand the list.'}
            </p>
            <div className="list-group">
              {others.slice(0, 5).map((entry) => (
                <div key={entry.username} className="list-group-item d-flex justify-content-between align-items-start">
                  <div>
                    <div className="fw-bold">{entry.username}</div>
                    <div className="small text-muted">{entry.location || entry.description || ''}</div>
                    {user?.role === 'buyer' && entry.products && entry.products.length > 0 ? (
                      <div className="small mt-1">
                        {entry.products.slice(0, 3).map((product, index) => (
                          <div key={index}>
                            {product.name || product.crop || '—'} — {product.quantity ?? '—'}{product.unit || 'kg'} @ {product.price ? `KSh ${product.price}` : '—'}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="d-flex gap-2">
                    <a className="btn btn-sm btn-outline-primary" href={`/profile?user=${encodeURIComponent(entry.username)}`}>View profile</a>
                    <button
                      className="btn btn-sm btn-success"
                      onClick={async () => {
                        const otherId = entry.id || entry.user_id || (entry.user && entry.user.id);
                        if (otherId) {
                          try {
                            const conv = await getOrCreateConversationWithUser(otherId);
                            setMessageConversationId(conv.id);
                            setMessageModalOpen(true);
                            return;
                          } catch {
                            // Fall back to phone if present.
                          }
                        }
                        if (entry.phone_number) {
                          window.location.href = `tel:${entry.phone_number}`;
                        } else {
                          alert(`Request sent to ${entry.username}`);
                        }
                      }}
                    >
                      Request
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <MessageModal
              open={messageModalOpen}
              onClose={() => setMessageModalOpen(false)}
              conversationId={messageConversationId}
              displayName={user?.username || ''}
            />
            {moreAvailable ? (
              <div className="mt-2 text-end">
                <a
                  className="btn btn-sm btn-link"
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();
                    alert('See more - implement pagination as next step');
                  }}
                >
                  See more
                </a>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function SellForm({ onCreated }) {
  const [crop, setCrop] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('kg');
  const [price, setPrice] = useState('');
  const [market, setMarket] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [availableCrops, setAvailableCrops] = useState([]);
  const [availableMarkets, setAvailableMarkets] = useState([]);

  useEffect(() => {
    let mounted = true;
    fetchCrops().then((data) => {
      if (!mounted) return;
      setAvailableCrops(data.results || data || []);
    }).catch(() => {});
    fetchMarkets().then((data) => {
      if (!mounted) return;
      setAvailableMarkets(data.results || data || []);
    }).catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await createListing({ crop, quantity, unit, price, market, contact_phone: phone });
      setCrop('');
      setQuantity('');
      setPrice('');
      setPhone('');
      if (onCreated) onCreated();
    } catch (err) {
      console.error('Create listing failed', err);
      let msg = 'Failed to create listing. Ensure you are logged in and crops/markets exist on the server.';
      if (err.response && err.response.data) {
        const payload = err.response.data;
        if (typeof payload === 'object') {
          const parts = [];
          for (const key of Object.keys(payload)) {
            try {
              const value = Array.isArray(payload[key]) ? payload[key].join('; ') : String(payload[key]);
              parts.push(`${key}: ${value}`);
            } catch {
              parts.push(`${key}: ${String(payload[key])}`);
            }
          }
          if (parts.length) msg = parts.join(' \n');
        } else if (typeof payload === 'string') {
          msg = payload;
        }
      }
      setErrorMsg(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit}>
      {errorMsg ? (
        <div className="alert alert-danger">{errorMsg.split('\n').map((line, index) => <div key={index}>{line}</div>)}</div>
      ) : null}
      <div className="mb-2">
        <label className="form-label">Crop (name or id)</label>
        <input list="crops_list" className="form-control" value={crop} onChange={(event) => setCrop(event.target.value)} placeholder="Maize" />
        <datalist id="crops_list">
          {availableCrops.map((entry) => <option key={entry.id} value={entry.name} />)}
        </datalist>
      </div>
      <div className="row g-2">
        <div className="col-6">
          <label className="form-label">Quantity</label>
          <input className="form-control" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
        </div>
        <div className="col-6">
          <label className="form-label">Unit</label>
          <input className="form-control" value={unit} onChange={(event) => setUnit(event.target.value)} />
        </div>
      </div>
      <div className="mb-2 mt-2">
        <label className="form-label">Price (KSh)</label>
        <input className="form-control" value={price} onChange={(event) => setPrice(event.target.value)} />
      </div>
      <div className="mb-2">
        <label className="form-label">Market (name or id)</label>
        <input list="markets_list" className="form-control" value={market} onChange={(event) => setMarket(event.target.value)} />
        <datalist id="markets_list">
          {availableMarkets.map((entry) => <option key={entry.id} value={entry.name} />)}
        </datalist>
      </div>
      <div className="mb-2">
        <label className="form-label">Contact phone</label>
        <input className="form-control" value={phone} onChange={(event) => setPhone(event.target.value)} />
      </div>
      <div className="text-end">
        <button className="btn btn-success" disabled={saving}>{saving ? 'Posting…' : 'Post Listing'}</button>
      </div>
    </form>
  );
}

function ListingsList({ listings }) {
  if (!listings || listings.length === 0) return <div>No listings yet.</div>;

  return (
    <ul className="list-unstyled">
      {listings.map((listing) => (
        <li key={listing.id} className="py-2 border-bottom">
          <strong>{listing.crop}</strong> — {listing.quantity}{listing.unit} — KSh {listing.price}
          <div className="small text-muted">Market: {listing.market || '—'} • Contact: {listing.contact_phone || '—'}</div>
        </li>
      ))}
    </ul>
  );
}
