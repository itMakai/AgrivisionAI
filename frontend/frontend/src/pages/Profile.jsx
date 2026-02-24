import { useEffect, useState, useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { fetchProfile, updateProfile, fetchService } from '../lib/api';
import { fetchProfileByUsername } from '../lib/api';
import api from '../lib/api';
import { fetchConversations, getOrCreateConversationWithUser } from '../lib/api';
import RatingModal from '../components/RatingModal';
import MessageModal from '../components/MessageModal';
import { AuthContext } from '../context/AuthContext';
import BookingForm from '../components/BookingForm';
import avatarPlaceholder from '../assets/avatar-placeholder.svg';

function renderStars(val) {
  const v = Math.max(0, Math.min(5, Math.round(val || 0)));
  let out = '';
  for (let i = 1; i <= 5; i++) out += i <= v ? '★' : '☆';
  return <span style={{ color: '#f6c85f', letterSpacing: '0.05em' }}>{out}</span>;
}

export default function ProfilePage({ lang = 'en' }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [emailState, setEmailState] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [produceDescription, setProduceDescription] = useState('');
  const [seasonalityState, setSeasonalityState] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [buyerDescription, setBuyerDescription] = useState('');
  const [hasTransport, setHasTransport] = useState(false);
  const [products, setProducts] = useState([]);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [messagePhone, setMessagePhone] = useState(null);
  const { user: currentUser } = useContext(AuthContext);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    let mounted = true;
    // If query param ?user=username is present, fetch that public profile
    const params = new URLSearchParams(window.location.search);
    const otherUser = params.get('user');
    const loader = otherUser ? fetchProfileByUsername : fetchProfile;
    loader(otherUser).then(data => {
      if (!mounted) return;
      setProfile(data);
      setPhone(data.phone_number || '');
      setName(data.username || '');
      setEmailState(data.email || '');
      setLocation(data.location || '');
      setPreview(data.profile_image || null);
      setProduceDescription(data.produce_description || '');
      setSeasonalityState(data.seasonality || {});
      setBuyerDescription(data.description || '');
      // product list may be stored under `products` or `product_requests` in backend
      const prodList = data.products || data.product_requests || [];
      setProducts(Array.isArray(prodList) ? prodList : []);
      setVerified(!!data.verified);
  setHasTransport(!!data.has_transport);
      setLoading(false);
    }).catch(() => setLoading(false));
    return () => { mounted = false; };
  }, []);

  // quick-book modal state and loaded preferred service
  const [showQuickBook, setShowQuickBook] = useState(false);
  const [preferredService, setPreferredService] = useState(null);
  const [loadingPref, setLoadingPref] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [loadingConvos, setLoadingConvos] = useState(false);
  const [messageModalOpenGlobal, setMessageModalOpenGlobal] = useState(false);
  const [messageConversationIdGlobal, setMessageConversationIdGlobal] = useState(null);

  useEffect(() => {
    if (!profile) return;
    const sid = profile.preferred_service_id || profile.preferred_service || null;
    if (sid) {
      setLoadingPref(true);
      fetchService(sid).then(s => setPreferredService(s)).catch(() => setPreferredService(null)).finally(()=>setLoadingPref(false));
    }
    // If viewing own profile (no ?user param), load conversations
    const params = new URLSearchParams(window.location.search);
    const otherUser = params.get('user');
    if (!otherUser) {
      setLoadingConvos(true);
      fetchConversations().then(d => { setConversations(d || []); }).catch(()=>{}).finally(()=>setLoadingConvos(false));
    }
  }, [profile]);

  async function onSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      // if file selected, send FormData
        if (file) {
        const fd = new FormData();
        fd.append('phone_number', phone);
        if (isAdmin) fd.append('username', name);
        if (isAdmin) fd.append('email', emailState);
        fd.append('location', location);
        fd.append('profile_image', file);
        fd.append('produce_description', produceDescription || '');
        fd.append('seasonality', JSON.stringify(seasonalityState || {}));
        fd.append('description', buyerDescription || '');
        fd.append('has_transport', hasTransport ? 'true' : 'false');
        fd.append('products', JSON.stringify(products || []));
        if (isAdmin) fd.append('verified', verified ? 'true' : 'false');
        await updateProfile(fd);
      } else {
        const body = { phone_number: phone, location, produce_description: produceDescription || '', seasonality: seasonalityState || {}, description: buyerDescription || '', has_transport: hasTransport, products: products || [] };
        if (isAdmin) body.username = name;
        if (isAdmin) body.email = emailState;
        if (isAdmin) body.verified = verified;
        await updateProfile(body);
      }
      // simple re-fetch
      const p = await fetchProfile();
      setProfile(p);
      setPreview(p.profile_image || preview);
      setProduceDescription(p.produce_description || '');
      setSeasonalityState(p.seasonality || {});
  setBuyerDescription(p.description || '');
  setHasTransport(!!p.has_transport);
      // ensure products and contact fields reflect saved values
      const newProducts = p.products || p.product_requests || [];
      setProducts(Array.isArray(newProducts) ? newProducts : []);
      setPhone(p.phone_number || '');
      setLocation(p.location || '');
      setName(p.username || '');
      setEmailState(p.email || '');
      setVerified(!!p.verified);
      // hide the edit form after successful save
      setIsEditing(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div>Loading profile…</div>;
  if (!profile) return <div>No profile available. Try logging in.</div>;
  const isAdmin = !!(currentUser && (currentUser.is_staff || currentUser.is_admin || currentUser.is_superuser || currentUser.role === 'admin'));
  const paramsForView = new URLSearchParams(window.location.search);
  const otherUserParam = paramsForView.get('user');
  const viewingOwnProfile = !otherUserParam;
  // Permission: admins or the owner can edit. Additionally, buyers may update farmer profiles (per request).
  const canEdit = !!(
    isAdmin ||
    (currentUser && viewingOwnProfile) ||
    (currentUser && currentUser.role === 'buyer' && profile && profile.role === 'farmer')
  );

  return (
    <div>
      <h2 className="h4 mb-3">Profile</h2>
      <div className="mb-3">
        <div className="row g-3">
          <div className="col-md-4">
            <div className="card app-card p-3">
              <div className="d-flex align-items-center gap-3">
                <div style={{ width: 96, height: 96 }} className="profile-avatar rounded overflow-hidden">
                  <img src={preview || avatarPlaceholder} alt="avatar" className="w-100 h-100" style={{ objectFit: 'cover' }} />
                </div>
                <div className="flex-grow-1">
                  <div className="d-flex align-items-center gap-2">
                    <h5 className="m-0">{profile.username}</h5>
                    <span className={`badge ${profile.role === 'farmer' ? 'bg-success' : 'bg-primary'}`}>{profile.role}</span>
                  </div>
                  <div className="small text-muted">{profile.location || 'Location not set'}</div>
                  <div className="mt-2">{renderStars(profile.rating)} <small className="text-muted">{profile.rating ? ` (${profile.rating})` : ''}</small></div>
                </div>
              </div>

              <hr />
              <div className="d-flex gap-2 flex-wrap">
                <button className="btn btn-sm btn-outline-primary" onClick={async ()=>{ const otherId = profile.id || profile.user_id || (profile.user && profile.user.id); if (otherId) { try { const conv = await getOrCreateConversationWithUser(otherId); setMessageConversationIdGlobal(conv.id); setMessageModalOpenGlobal(true); return; } catch(e){ /* fallback */ } } setMessagePhone(profile.phone_number); setMessageModalOpen(true); }}>Message</button>
                <NavLink to={profile.preferred_provider_id ? `/providers/${profile.preferred_provider_id}` : '/providers'} className="btn btn-sm btn-success">{lang === 'sw' ? 'Weka Huduma' : 'Book Service'}</NavLink>
                {profile.phone_number ? <a className="btn btn-sm btn-outline-secondary" href={`tel:${profile.phone_number}`}>Call</a> : null}
                {viewingOwnProfile && <NavLink to="/inbox" className="btn btn-sm btn-outline-info">Inbox</NavLink>}
              </div>

              <div className="mt-3">
                <h6 className="small mb-1">About</h6>
                <div className="small text-muted">{profile.description || profile.produce_description || 'No description provided.'}</div>
              </div>

              <div className="mt-3">
                <h6 className="small mb-1">Produce / Listings</h6>
                {products && products.length > 0 ? (
                  <div className="list-group list-group-flush small">
                    {products.slice(0,5).map((p,i) => (
                      <div key={i} className="list-group-item d-flex justify-content-between align-items-start py-1">
                        <div>
                          <div className="fw-bold">{p.name || p.product || '—'}</div>
                          <div className="text-muted small">{p.description || p.note || ''}</div>
                        </div>
                        <div className="text-end small">
                          <div>{p.quantity ?? '—'} {p.unit || 'kg'}</div>
                          <div className="text-muted">{p.price_per_kg ? `KSh ${p.price_per_kg}` : ''}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="small text-muted">No active listings.</div>
                )}
              </div>
            </div>
          </div>
          <div className="col-md-8">
            <div className="card app-card p-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <div>
                  <div className="small text-muted">licenced</div>
                  <div className="fw-bold">{profile.verified ? 'Yes' : 'No'}</div>
                </div>
                <div>
                  <div className="small text-muted">Rating</div>
                    <div className="fw-bold">{renderStars(profile.rating)}</div>
                    <div className="small text-muted">{(profile.rating_count ?? 0)} {((profile.rating_count ?? 0) === 1) ? (lang === 'sw' ? 'kadiria' : 'rating') : (lang === 'sw' ? 'kadiria' : 'ratings')}</div>
                </div>
                <div className="d-flex flex-column align-items-end gap-2">
                  <NavLink to={profile.preferred_provider_id ? `/providers/${profile.preferred_provider_id}` : '/providers'} className="btn btn-sm btn-success">
                    {lang === 'sw' ? 'Weka Huduma' : 'Book Service'}
                  </NavLink>
                  <button
                    className="btn btn-sm btn-outline-success"
                    onClick={() => setShowQuickBook(true)}
                    disabled={!preferredService}
                    title={!preferredService ? (lang === 'sw' ? 'Hakuna huduma iliyopendekezwa' : 'No preferred service available') : ''}
                  >{lang === 'sw' ? 'Haraka - Weka' : 'Quick Book'}</button>
                  {canEdit && <button className="btn btn-sm btn-outline-primary" onClick={() => setIsEditing(true)}>{lang === 'sw' ? 'Hariri Profaili' : 'Edit Profile'}</button>}
                </div>
              </div>

              {/* top summary only shows quick actions and highlights; full buyer details appear below */}
            </div>
          </div>
        </div>
      </div>
      {/* Quick-book modal overlay */}
      {showQuickBook && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card p-3" style={{ width: 'min(720px, 95%)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h5 className="m-0">{lang === 'sw' ? 'Haraka - Weka' : 'Quick Book'}</h5>
              <button className="btn btn-sm btn-outline-secondary" onClick={() => setShowQuickBook(false)}>Close</button>
            </div>
            {loadingPref && <div>Loading…</div>}
            {!loadingPref && preferredService && (
              <div>
                <div className="mb-2"><strong>{preferredService.title}</strong> — {preferredService.provider?.name}</div>
                <BookingForm service={preferredService} provider={preferredService.provider} />
              </div>
            )}
            {!loadingPref && !preferredService && (
              <div>No preferred service found. Please pick a service from Providers.</div>
            )}
          </div>
        </div>
      )}
      <div className="card app-card p-3">
        {/* Inbox (own profile) */}
        {!new URLSearchParams(window.location.search).get('user') && (
          <div className="mb-3">
            <h6>Conversations</h6>
            {loadingConvos ? <div>Loading…</div> : (
              <div className="list-group">
                {conversations.length === 0 ? <div className="text-muted small">No conversations yet.</div> : conversations.map(c => (
                  <div key={c.id} className="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                      <div className="fw-bold">{c.phone}</div>
                      <div className="small text-muted">Participants: {c.participants.map(p=>p.username).join(', ')}</div>
                    </div>
                    <div>
                      <button className="btn btn-sm btn-primary" onClick={() => { setMessageConversationIdGlobal(c.id); setMessageModalOpenGlobal(true); }}>Open</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <MessageModal open={messageModalOpenGlobal} onClose={()=>setMessageModalOpenGlobal(false)} conversationId={messageConversationIdGlobal} displayName={profile.username} />
          </div>
        )}
        <MessageModal open={messageModalOpen} onClose={() => setMessageModalOpen(false)} phone={messagePhone} displayName={profile.username} />
        {!isEditing ? (
          profile.role === 'farmer' ? (
            <div>
              <div className="d-flex justify-content-between align-items-start mb-2">
                <div>
                  <h5 className="m-0">{profile.username}</h5>
                  <div className="small text-muted">{profile.email}</div>
                </div>
                <div>
                  {canEdit && <button className="btn btn-sm btn-primary" onClick={() => setIsEditing(true)}>{lang === 'sw' ? 'Hariri' : 'Edit'}</button>}
                </div>
              </div>

              <div className="mb-2"><strong>Phone:</strong> {profile.phone_number || '—'} {profile.phone_number ? (<button className="btn btn-sm btn-outline-primary ms-2" onClick={async ()=>{ const otherId = profile.id || profile.user_id || (profile.user && profile.user.id); if (otherId) { try { const conv = await getOrCreateConversationWithUser(otherId); setMessageConversationIdGlobal(conv.id); setMessageModalOpenGlobal(true); return; } catch(e){ /* fallback */ } } setMessagePhone(profile.phone_number); setMessageModalOpen(true); }}>Message</button>) : null}</div>
              <div className="mb-2"><strong>Location:</strong> {profile.location || '—'}</div>
              <div className="mb-2"><strong>Produce:</strong> {profile.produce_description || '—'}</div>
              <div className="mb-2"><strong>Seasonality:</strong>
                <div className="mt-1">
                  {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, idx) => {
                    const key = String(idx+1);
                    const ok = profile.seasonality && profile.seasonality[key];
                    return <span key={key} className={`badge me-1 ${ok ? 'bg-success' : 'bg-secondary'}`}>{m}</span>;
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div className="d-flex justify-content-between align-items-start mb-2">
                <div>
                  <h5 className="m-0">{profile.username}</h5>
                  <div className="small text-muted">{profile.email}</div>
                </div>
                <div>
                  {canEdit && <button className="btn btn-sm btn-primary" onClick={() => setIsEditing(true)}>{lang === 'sw' ? 'Hariri' : 'Edit'}</button>}
                </div>
              </div>

              <div className="mb-2"><strong>Phone:</strong> {profile.phone_number || '—'} {profile.phone_number ? (<button className="btn btn-sm btn-outline-primary ms-2" onClick={async ()=>{ const otherId = profile.id || profile.user_id || (profile.user && profile.user.id); if (otherId) { try { const conv = await getOrCreateConversationWithUser(otherId); setMessageConversationIdGlobal(conv.id); setMessageModalOpenGlobal(true); return; } catch(e){ /* fallback */ } } setMessagePhone(profile.phone_number); setMessageModalOpen(true); }}>Message</button>) : null}</div>
              <div className="mb-2"><strong>Location:</strong> {profile.location || '—'}</div>
              <div className="mb-2"><strong>Verified:</strong> {profile.verified ? (lang === 'sw' ? 'Ndiyo' : 'Yes') : (lang === 'sw' ? 'Hapana' : 'No')}</div>
              <div className="mb-2"><strong>Rating:</strong> <span className="fw-bold">{renderStars(profile.rating)}</span> <span className="text-muted">{profile.rating ? ` (${profile.rating})` : ''} • {(profile.rating_count ?? 0)} {(profile.rating_count ?? 0) === 1 ? (lang === 'sw' ? 'kadiria' : 'rating') : (lang === 'sw' ? 'kadiria' : 'ratings')}</span></div>
              <div className="mb-2"><strong>Buyer description:</strong> {profile.description || '—'}</div>
              <div className="mb-2"><strong>Has transport:</strong> {profile.has_transport ? (lang === 'sw' ? 'Ndiyo' : 'Yes') : (lang === 'sw' ? 'Hapana' : 'No')}</div>
              <div className="mb-2"><strong>Transport capacity:</strong> {profile.transport_capacity ? `${profile.transport_capacity}` : '—'} <span className="text-muted">{profile.transport_unit || ''}</span></div>
              {/* show requested products for buyers */}
              {profile.role === 'buyer' && (
                <div className="mb-2">
                  <strong>Products requested</strong>
                  {profile.products && profile.products.length > 0 ? (
                    <div className="table-responsive mt-2">
                      <table className="table table-sm">
                        <thead>
                          <tr><th>Product</th><th>Qty</th><th>Unit</th><th>Price /kg</th></tr>
                        </thead>
                        <tbody>
                          {profile.products.map((p, i) => (
                            <tr key={i}><td>{p.name || p.product || '—'}</td><td>{p.quantity ?? '—'}</td><td>{p.unit || 'kg'}</td><td>{p.price_per_kg ? `KSh ${p.price_per_kg}` : '—'}</td></tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="mt-2 text-muted">No products requested.</div>
                  )}
                </div>
              )}
            </div>
          )
        ) : (
        <form onSubmit={onSave}>
          <div className="mb-3">
            <label className="form-label small">Username</label>
            <div className="form-control-plaintext">{profile.username}</div>
          </div>
          <div className="mb-3">
            <label className="form-label small">Email</label>
            <div className="form-control-plaintext">{profile.email}</div>
          </div>
          <div className="row mb-3">
            <div className="col-md-3 text-center">
              <label className="form-label small d-block">Avatar</label>
              <div className="profile-avatar mb-2">
                <img src={preview || avatarPlaceholder} alt="avatar" className="w-100 h-100" style={{ objectFit: 'cover' }} />
              </div>
              <div className="mt-2">
                <input type="file" accept="image/*" className="form-control form-control-sm" onChange={e => {
                  const f = e.target.files?.[0];
                  setFile(f || null);
                  if (f) {
                    const reader = new FileReader();
                    reader.onload = () => setPreview(reader.result);
                    reader.readAsDataURL(f);
                  }
                }} />
              </div>
            </div>
            <div className="col-md-9">
                <label className="form-label small">Full name</label>
                {isAdmin ? (
                  <input className="form-control mb-2" value={name} onChange={e => setName(e.target.value)} />
                ) : (
                  <div className="form-control-plaintext mb-2">{profile.username}</div>
                )}

              <label className="form-label small">Email</label>
                {isAdmin ? (
                  <input className="form-control mb-2" value={emailState} onChange={e => setEmailState(e.target.value)} />
                ) : (
                  <div className="form-control-plaintext mb-2">{profile.email}</div>
                )}

              <label className="form-label small">Phone</label>
              {isAdmin ? (
                <input className="form-control" value={phone} onChange={e => setPhone(e.target.value)} />
              ) : (
                <div className="form-control-plaintext">{profile.phone_number || '—'}</div>
              )}
              {isAdmin && (
                <div className="form-check form-switch mt-2">
                  <input className="form-check-input" type="checkbox" id="verifiedToggle" checked={verified} onChange={e => setVerified(e.target.checked)} />
                  <label className="form-check-label small" htmlFor="verifiedToggle">Verified (admin only)</label>
                </div>
              )}
            </div>
          </div>
          {/* Buyer-specific inputs */}
          {profile.role === 'buyer' && (
            <>
              <div className="mb-3">
                <label className="form-label small">Buyer description</label>
                <textarea className="form-control" value={buyerDescription} onChange={e => setBuyerDescription(e.target.value)} rows={3} placeholder="What are you looking for? e.g., 'Looking to buy 10 tonnes of maize in July'" />
              </div>
              {/* Products list editor */}
              <div className="mb-3">
                <label className="form-label small">Products (name, quantity, unit, price per kg)</label>
                <div className="table-responsive">
                  <table className="table table-sm">
                    <thead>
                      <tr><th>Product</th><th>Qty</th><th>Unit</th><th>Price/kg</th><th></th></tr>
                    </thead>
                    <tbody>
                      {products.map((p, idx) => (
                        <tr key={idx}>
                          <td><input className="form-control form-control-sm" value={p.name || p.product || ''} onChange={e => {
                            const next = [...products]; next[idx] = { ...(next[idx]||{}), name: e.target.value }; setProducts(next);
                          }} /></td>
                          <td style={{width:120}}><input className="form-control form-control-sm" value={p.quantity || ''} onChange={e => { const next=[...products]; next[idx]={...(next[idx]||{}), quantity: e.target.value}; setProducts(next); }} /></td>
                          <td style={{width:100}}><input className="form-control form-control-sm" value={p.unit || 'kg'} onChange={e => { const next=[...products]; next[idx]={...(next[idx]||{}), unit: e.target.value}; setProducts(next); }} /></td>
                          <td style={{width:140}}><input className="form-control form-control-sm" value={p.price_per_kg || ''} onChange={e => { const next=[...products]; next[idx]={...(next[idx]||{}), price_per_kg: e.target.value}; setProducts(next); }} /></td>
                          <td style={{width:56}}><button type="button" className="btn btn-sm btn-outline-danger" onClick={() => { const next=products.filter((_,i)=>i!==idx); setProducts(next); }}>Remove</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div>
                  <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setProducts([...products, { name: '', quantity: '', unit: 'kg', price_per_kg: '' }])}>Add product</button>
                </div>
              </div>
              <div className="form-check form-switch mb-3">
                <input className="form-check-input" type="checkbox" id="hasTransport" checked={hasTransport} onChange={e => setHasTransport(e.target.checked)} />
                <label className="form-check-label small" htmlFor="hasTransport">Has transport available</label>
              </div>
            </>
          )}
          {/* Produce description and seasonality - farmers only */}
          {profile.role === 'farmer' && (
            <>
              <div className="mb-3">
                <label className="form-label small">Produce description</label>
                <textarea className="form-control" value={produceDescription} onChange={e => setProduceDescription(e.target.value)} rows={3} />
              </div>

              <div className="mb-3">
                <label className="form-label small">Seasonality</label>
                <div className="d-flex flex-wrap gap-2">
                  {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, idx) => {
                    const key = String(idx+1);
                    const checked = !!seasonalityState[key];
                    return (
                      <div className="form-check" key={key} style={{ minWidth: '6rem' }}>
                        <input className="form-check-input" type="checkbox" id={`mon_${key}`} checked={checked} onChange={e => {
                          const next = { ...seasonalityState };
                          if (e.target.checked) next[key] = true; else delete next[key];
                          setSeasonalityState(next);
                        }} />
                        <label className="form-check-label small" htmlFor={`mon_${key}`}>{m}</label>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
          <div className="mb-3">
            <label className="form-label small">Location</label>
            <input className="form-control" value={location} onChange={e => setLocation(e.target.value)} />
          </div>
          <div className="d-flex justify-content-end gap-2">
            <button type="button" className="btn btn-outline-secondary" onClick={() => {
              // cancel edit and reset to profile values
              setPhone(profile.phone_number || '');
              setLocation(profile.location || '');
              setProduceDescription(profile.produce_description || '');
              setSeasonalityState(profile.seasonality || {});
              setFile(null);
              setPreview(profile.profile_image || null);
              setIsEditing(false);
            }}>Cancel</button>
            <button className="btn btn-primary custom" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
}

