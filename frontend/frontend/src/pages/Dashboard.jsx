import { useEffect, useState, useContext } from 'react';
import { fetchInsights, fetchTopPrices, fetchListings, createListing, fetchFarmers, fetchBuyers } from '../lib/api';
import { fetchCrops, fetchMarkets } from '../lib/api';
import { AuthContext } from '../context/AuthContext';
import { getOrCreateConversationWithUser } from '../lib/api';
import MessageModal from '../components/MessageModal';

export default function DashboardPage() {
  const [insights, setInsights] = useState([]);
  const [topPrices, setTopPrices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    Promise.all([fetchInsights(), fetchTopPrices()]).then(([insRes, priceRes]) => {
      if (!mounted) return;
      setInsights(insRes || []);
      setTopPrices(priceRes?.results || priceRes || []);
      setLoading(false);
    }).catch(() => setLoading(false));
    return () => { mounted = false; };
  }, []);

  if (loading) return <div>Loading dashboard…</div>;

  const { user } = useContext(AuthContext);
  const latest = insights[0];

  // role-specific lists
  const [others, setOthers] = useState([]);
  const [moreAvailable, setMoreAvailable] = useState(false);
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [messageConversationId, setMessageConversationId] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function loadOthers() {
      if (!user) return;
      try {
        if (user.role === 'farmer') {
          const buyers = await fetchBuyers();
          if (!mounted) return;
          setOthers(buyers || []);
          setMoreAvailable((buyers || []).length > 5);
        } else if (user.role === 'buyer') {
          const farmers = await fetchFarmers();
          if (!mounted) return;
          setOthers(farmers || []);
          setMoreAvailable((farmers || []).length > 5);
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadOthers();
    return () => { mounted = false; };
  }, [user]);

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
              {topPrices.slice(0,6).map(p => (
                <li key={p.id} className="py-1 border-bottom"><strong>{p.crop}</strong> — {p.market} — KSh {p.predicted_price}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      
      <div className="row g-3 mt-4">
        <div className="col-md-6">
          <div className="card app-card p-3">
            <h5 className="h6">Sell a Crop</h5>
            <SellForm onCreated={() => { setLoading(true); fetchListings({ owner: 'me' }).then(d => { setLoading(false); setListings(d.results || d); }).catch(()=>setLoading(false)); }} />
          </div>
        </div>

        <div className="col-md-6">
          <div className="card app-card p-3">
            <h5 className="h6">My Listings</h5>
            <ListingsList />
          </div>
        </div>
      </div>

      <div className="row g-3 mt-4">
        <div className="col-12">
          <div className="card app-card p-3">
            <h5 className="h6">{user?.role === 'farmer' ? 'Available Buyers' : 'Available Farmers'}</h5>
            <p className="small text-muted">{user?.role === 'farmer' ? 'Request a buyer to get matched with a buyer' : 'Browse farmers and their products. Click "See more" to expand the list.'}</p>
            <div className="list-group">
              {others.slice(0,5).map(o => (
                <div key={o.username} className="list-group-item d-flex justify-content-between align-items-start">
                  <div>
                    <div className="fw-bold">{o.username}</div>
                    <div className="small text-muted">{o.location || o.description || ''}</div>
                    {/* show up to 3 products for buyers-view */}
                    {user?.role === 'buyer' && o.products && o.products.length > 0 && (
                      <div className="small mt-1">
                        {o.products.slice(0,3).map((p,i)=> <div key={i}>{p.name || p.crop || '—'} — {p.quantity ?? '—'}{p.unit || 'kg'} @ {p.price ? `KSh ${p.price}` : '—'}</div>)}
                      </div>
                    )}
                  </div>
                  <div className="d-flex gap-2">
                    <a className="btn btn-sm btn-outline-primary" href={`/profile?user=${encodeURIComponent(o.username)}`}>View profile</a>
                    <button className="btn btn-sm btn-success" onClick={async () => {
                      const otherId = o.id || o.user_id || (o.user && o.user.id);
                      if (otherId) {
                        try {
                          const conv = await getOrCreateConversationWithUser(otherId);
                          setMessageConversationId(conv.id);
                          setMessageModalOpen(true);
                          return;
                        } catch (e) {
                          // fallback to phone if present
                        }
                      }
                      if (o.phone_number) {
                        // fallback to tel link
                        window.location.href = `tel:${o.phone_number}`;
                      } else {
                        alert('Request sent to ' + o.username);
                      }
                    }}>Request</button>
                  </div>
                </div>
              ))}
            </div>
              <MessageModal open={messageModalOpen} onClose={() => setMessageModalOpen(false)} conversationId={messageConversationId} displayName={user?.username || ''} />
            {moreAvailable && <div className="mt-2 text-end"><a className="btn btn-sm btn-link" href="#" onClick={(e)=>{e.preventDefault(); setOthers(prev=>prev.concat([])); alert('See more - implement pagination as next step');}}>See more</a></div>}
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

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Try to post a listing. API expects crop_id and optional market_id — but for convenience
      // we attempt to send names; backend will accept numeric ids if available. If API rejects,
      // the user may need to create crops/markets first via admin.
      const payload = { crop: crop, quantity: quantity, unit, price, market: market, contact_phone: phone };
      await createListing(payload);
      setCrop(''); setQuantity(''); setPrice(''); setPhone('');
      if (onCreated) onCreated();
    } catch (err) {
      console.error('Create listing failed', err);
      // Show server-side validation errors if present
      let msg = 'Failed to create listing. Ensure you are logged in and crops/markets exist on the server.';
      if (err.response && err.response.data) {
        const d = err.response.data;
        // DRF validation errors are often an object of field->list
        if (typeof d === 'object') {
          const parts = [];
          for (const k of Object.keys(d)) {
            try {
              const v = Array.isArray(d[k]) ? d[k].join('; ') : String(d[k]);
              parts.push(`${k}: ${v}`);
            } catch (e) {
              parts.push(`${k}: ${String(d[k])}`);
            }
          }
          if (parts.length) msg = parts.join(' \n');
        } else if (typeof d === 'string') {
          msg = d;
        }
      }
      setErrorMsg(msg);
    } finally {
      setSaving(false);
    }
  };

  // load crops and markets for simple typeahead/datalist
  useEffect(() => {
    let mounted = true;
    fetchCrops().then(d => {
      if (!mounted) return;
      setAvailableCrops(d.results || d || []);
    }).catch(() => {});
    fetchMarkets().then(d => {
      if (!mounted) return;
      setAvailableMarkets(d.results || d || []);
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  return (
    <form onSubmit={submit}>
      {errorMsg && (
        <div className="alert alert-danger">{errorMsg.split('\n').map((line, i) => <div key={i}>{line}</div>)}</div>
      )}
      <div className="mb-2">
        <label className="form-label">Crop (name or id)</label>
        <input list="crops_list" className="form-control" value={crop} onChange={e=>setCrop(e.target.value)} placeholder="Maize" />
        <datalist id="crops_list">
          {availableCrops.map(c => <option key={c.id} value={c.name} />)}
        </datalist>
      </div>
      <div className="row g-2">
        <div className="col-6">
          <label className="form-label">Quantity</label>
          <input className="form-control" value={quantity} onChange={e=>setQuantity(e.target.value)} />
        </div>
        <div className="col-6">
          <label className="form-label">Unit</label>
          <input className="form-control" value={unit} onChange={e=>setUnit(e.target.value)} />
        </div>
      </div>
      <div className="mb-2 mt-2">
        <label className="form-label">Price (KSh)</label>
        <input className="form-control" value={price} onChange={e=>setPrice(e.target.value)} />
      </div>
      <div className="mb-2">
        <label className="form-label">Market (name or id)</label>
        <input list="markets_list" className="form-control" value={market} onChange={e=>setMarket(e.target.value)} />
        <datalist id="markets_list">
          {availableMarkets.map(m => <option key={m.id} value={m.name} />)}
        </datalist>
      </div>
      <div className="mb-2">
        <label className="form-label">Contact phone</label>
        <input className="form-control" value={phone} onChange={e=>setPhone(e.target.value)} />
      </div>
      <div className="text-end">
        <button className="btn btn-success" disabled={saving}>{saving ? 'Posting…' : 'Post Listing'}</button>
      </div>
    </form>
  );
}

function ListingsList() {
  const [listings, setListings] = useState([]);
  const [loadingL, setLoadingL] = useState(true);

  useEffect(()=>{
    let mounted = true;
    fetchListings({ owner: 'me' }).then(d=>{
      if (!mounted) return;
      setListings(d.results || d);
      setLoadingL(false);
    }).catch(()=>setLoadingL(false));
    return ()=>{ mounted = false };
  }, []);

  if (loadingL) return <div>Loading listings…</div>;
  if (!listings || listings.length === 0) return <div>No listings yet.</div>;

  return (
    <ul className="list-unstyled">
      {listings.map(l => (
        <li key={l.id} className="py-2 border-bottom">
          <strong>{l.crop}</strong> — {l.quantity}{l.unit} — KSh {l.price}
          <div className="small text-muted">Market: {l.market || '—'} • Contact: {l.contact_phone || '—'}</div>
        </li>
      ))}
    </ul>
  );
}
