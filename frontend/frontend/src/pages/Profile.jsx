import React, { useEffect, useState, useContext } from 'react';
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

// --- Custom CSS for Profile Polish ---
const profileStyles = `
  .profile-cover {
    height: 160px;
    background: linear-gradient(135deg, #1e7e34 0%, #28a745 100%);
    border-top-left-radius: 1rem;
    border-top-right-radius: 1rem;
    position: relative;
  }
  .profile-avatar-wrapper {
    width: 120px;
    height: 120px;
    border-radius: 50%;
    border: 4px solid white;
    box-shadow: 0 4px 10px rgba(0,0,0,0.1);
    background-color: white;
    position: absolute;
    bottom: -60px;
    left: 2rem;
    overflow: hidden;
    z-index: 2;
  }
  .hover-lift {
    transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
  }
  .hover-lift:hover {
    transform: translateY(-3px);
    box-shadow: 0 10px 20px rgba(0,0,0,0.08) !important;
  }
  .form-control-custom {
    background-color: #f8f9fa;
    border: 1px solid transparent;
    border-radius: 0.5rem;
    padding: 0.6rem 1rem;
  }
  .form-control-custom:focus {
    background-color: #fff;
    border-color: #80bdff;
    box-shadow: 0 0 0 0.2rem rgba(0,123,255,.25);
  }
`;

function renderStars(val) {
  const v = Math.max(0, Math.min(5, Math.round(val || 0)));
  let out = '';
  for (let i = 1; i <= 5; i++) out += i <= v ? '★' : '☆';
  return <span style={{ color: '#f6c85f', letterSpacing: '0.1em', fontSize: '1.1rem' }}>{out}</span>;
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
      const prodList = data.products || data.product_requests || [];
      setProducts(Array.isArray(prodList) ? prodList : []);
      setVerified(!!data.verified);
      setHasTransport(!!data.has_transport);
      setLoading(false);
    }).catch(() => setLoading(false));
    return () => { mounted = false; };
  }, []);

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
      const p = await fetchProfile();
      setProfile(p);
      setPreview(p.profile_image || preview);
      setProduceDescription(p.produce_description || '');
      setSeasonalityState(p.seasonality || {});
      setBuyerDescription(p.description || '');
      setHasTransport(!!p.has_transport);
      const newProducts = p.products || p.product_requests || [];
      setProducts(Array.isArray(newProducts) ? newProducts : []);
      setPhone(p.phone_number || '');
      setLocation(p.location || '');
      setName(p.username || '');
      setEmailState(p.email || '');
      setVerified(!!p.verified);
      setIsEditing(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  const handleMessageUser = async () => {
    const otherId = profile.id || profile.user_id || (profile.user && profile.user.id);
    if (otherId) {
      try {
        const conv = await getOrCreateConversationWithUser(otherId);
        setMessageConversationIdGlobal(conv.id);
        setMessageModalOpenGlobal(true);
        return;
      } catch(e) { /* fallback */ }
    }
    setMessagePhone(profile.phone_number);
    setMessageModalOpen(true);
  };

  if (loading) return (
    <div className="min-vh-100 d-flex flex-column align-items-center justify-content-center bg-light">
      <div className="spinner-border text-success mb-3" role="status"></div>
      <div className="text-muted fw-semibold">Loading profile...</div>
    </div>
  );
  if (!profile) return <div className="container py-5 text-center text-muted">No profile available. Try logging in.</div>;

  const isAdmin = !!(currentUser && (currentUser.is_staff || currentUser.is_admin || currentUser.is_superuser || currentUser.role === 'admin'));
  const paramsForView = new URLSearchParams(window.location.search);
  const otherUserParam = paramsForView.get('user');
  const viewingOwnProfile = !otherUserParam;
  const canEdit = !!(
    isAdmin || (currentUser && viewingOwnProfile) || (currentUser && currentUser.role === 'buyer' && profile && profile.role === 'farmer')
  );

  return (
    <div className="container py-4 pb-5">
      <style>{profileStyles}</style>

      {/* Main Profile Header Card */}
      <div className="card border-0 shadow-sm rounded-4 mb-4">
        <div className="profile-cover">
          <div className="profile-avatar-wrapper">
            <img src={preview || avatarPlaceholder} alt="avatar" className="w-100 h-100" style={{ objectFit: 'cover' }} />
          </div>
        </div>
        <div className="card-body px-4 pb-4" style={{ paddingTop: '70px' }}>
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-start gap-3">
            <div>
              <div className="d-flex align-items-center gap-2 mb-1">
                <h3 className="m-0 fw-bold">{profile.username}</h3>
                {profile.verified && <span className="text-primary fs-5" title="Verified">✓</span>}
                <span className={`badge rounded-pill ${profile.role === 'farmer' ? 'bg-success' : 'bg-primary'}`}>
                  {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
                </span>
              </div>
              <p className="text-muted mb-2"><i className="bi bi-geo-alt-fill me-1"></i>{profile.location || 'Location not set'}</p>
              <div className="d-flex align-items-center gap-2">
                <div>{renderStars(profile.rating)}</div>
                <small className="text-muted fw-semibold">
                  {profile.rating ? `(${profile.rating}) • ` : ''} 
                  {(profile.rating_count ?? 0)} {((profile.rating_count ?? 0) === 1) ? (lang === 'sw' ? 'kadiria' : 'rating') : (lang === 'sw' ? 'kadiria' : 'ratings')}
                </small>
              </div>
            </div>

            <div className="d-flex flex-wrap gap-2">
              {!isEditing && (
                <>
                  <button className="btn btn-outline-primary rounded-pill px-3 fw-semibold shadow-sm" onClick={handleMessageUser}>
                    Message
                  </button>
                  {profile.phone_number && (
                    <a className="btn btn-outline-secondary rounded-pill px-3 fw-semibold shadow-sm" href={`tel:${profile.phone_number}`}>
                      Call
                    </a>
                  )}
                  <button 
                    className="btn btn-outline-success rounded-pill px-3 fw-semibold shadow-sm" 
                    onClick={() => setShowQuickBook(true)} 
                    disabled={!preferredService}
                  >
                    {lang === 'sw' ? 'Haraka - Weka' : 'Quick Book'}
                  </button>
                  <NavLink to={profile.preferred_provider_id ? `/providers/${profile.preferred_provider_id}` : '/providers'} className="btn btn-success rounded-pill px-3 fw-semibold shadow-sm">
                    {lang === 'sw' ? 'Weka Huduma' : 'Book Service'}
                  </NavLink>
                  {viewingOwnProfile && <NavLink to="/inbox" className="btn btn-outline-dark rounded-pill px-3 fw-semibold shadow-sm">Inbox</NavLink>}
                  {canEdit && <button className="btn btn-primary rounded-pill px-3 fw-semibold shadow-sm ms-md-2" onClick={() => setIsEditing(true)}>{lang === 'sw' ? 'Hariri' : 'Edit Profile'}</button>}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        {/* VIEW MODE */}
        {!isEditing ? (
          <>
            {/* Left Column: About & Details */}
            <div className="col-12 col-lg-4 d-flex flex-column gap-4">
              <div className="card border-0 shadow-sm rounded-4 h-100">
                <div className="card-body p-4">
                  <h5 className="fw-bold mb-3">About</h5>
                  <p className="text-muted small lh-lg">
                    {profile.description || profile.produce_description || 'No description provided yet.'}
                  </p>
                  
                  <hr className="my-4" />
                  <h5 className="fw-bold mb-3">Contact Details</h5>
                  <div className="mb-3 d-flex align-items-center gap-3">
                    <div className="bg-light rounded-circle d-flex align-items-center justify-content-center text-success" style={{width:'40px', height:'40px'}}>📞</div>
                    <div>
                      <div className="small text-muted mb-0">Phone</div>
                      <div className="fw-semibold">{profile.phone_number || '—'}</div>
                    </div>
                  </div>
                  <div className="mb-3 d-flex align-items-center gap-3">
                    <div className="bg-light rounded-circle d-flex align-items-center justify-content-center text-primary" style={{width:'40px', height:'40px'}}>✉️</div>
                    <div className="text-truncate">
                      <div className="small text-muted mb-0">Email</div>
                      <div className="fw-semibold text-truncate">{profile.email || '—'}</div>
                    </div>
                  </div>

                  {profile.role === 'buyer' && (
                    <>
                      <hr className="my-4" />
                      <h5 className="fw-bold mb-3">Logistics</h5>
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span className="text-muted small">Has Transport</span>
                        <span className="fw-semibold">{profile.has_transport ? 'Yes' : 'No'}</span>
                      </div>
                      {profile.transport_capacity && (
                        <div className="d-flex justify-content-between align-items-center">
                          <span className="text-muted small">Capacity</span>
                          <span className="fw-semibold">{profile.transport_capacity} {profile.transport_unit || ''}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Listings, Inbox, Seasonality */}
            <div className="col-12 col-lg-8 d-flex flex-column gap-4">
              
              {/* Seasonality (Farmers Only) */}
              {profile.role === 'farmer' && (
                <div className="card border-0 shadow-sm rounded-4">
                  <div className="card-body p-4">
                    <h5 className="fw-bold mb-3">Harvest Seasonality</h5>
                    <div className="d-flex flex-wrap gap-2">
                      {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, idx) => {
                        const key = String(idx+1);
                        const isAvailable = profile.seasonality && profile.seasonality[key];
                        return (
                          <span key={key} className={`badge rounded-pill px-3 py-2 ${isAvailable ? 'bg-success text-white' : 'bg-light text-muted border'}`}>
                            {m}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Products/Listings */}
              <div className="card border-0 shadow-sm rounded-4 flex-grow-1">
                <div className="card-header bg-white border-0 pt-4 px-4 pb-0">
                  <h5 className="fw-bold">{profile.role === 'farmer' ? 'Active Listings' : 'Requested Products'}</h5>
                </div>
                <div className="card-body p-4">
                  {products && products.length > 0 ? (
                    <div className="table-responsive">
                      <table className="table align-middle">
                        <thead className="table-light">
                          <tr>
                            <th className="text-muted small text-uppercase fw-semibold border-0 rounded-start">Product</th>
                            <th className="text-muted small text-uppercase fw-semibold border-0">Quantity</th>
                            <th className="text-end text-muted small text-uppercase fw-semibold border-0 rounded-end">Price / Unit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {products.map((p, i) => (
                            <tr key={i} className="border-bottom">
                              <td className="py-3 border-0">
                                <div className="fw-bold text-dark">{p.name || p.product || '—'}</div>
                                {p.description && <div className="small text-muted">{p.description}</div>}
                              </td>
                              <td className="py-3 border-0">
                                <span className="badge bg-light text-dark border">{p.quantity ?? '—'} {p.unit || 'kg'}</span>
                              </td>
                              <td className="py-3 text-end border-0 fw-semibold text-success">
                                {p.price_per_kg ? `KSh ${p.price_per_kg}` : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-5 bg-light rounded-4 text-muted">
                      No {profile.role === 'farmer' ? 'listings' : 'requests'} currently available.
                    </div>
                  )}
                </div>
              </div>

              {/* Inbox (Only if viewing own profile) */}
              {!otherUserParam && (
                <div className="card border-0 shadow-sm rounded-4">
                  <div className="card-header bg-white border-0 pt-4 px-4 pb-0 d-flex justify-content-between align-items-center">
                    <h5 className="fw-bold m-0">Recent Conversations</h5>
                  </div>
                  <div className="card-body p-4">
                    {loadingConvos ? (
                      <div className="text-muted small text-center">Loading conversations...</div>
                    ) : conversations.length === 0 ? (
                      <div className="text-muted small text-center py-4 bg-light rounded-4">No conversations yet.</div>
                    ) : (
                      <div className="list-group list-group-flush gap-2">
                        {conversations.map(c => (
                          <div key={c.id} className="list-group-item list-group-item-action rounded-4 border-0 bg-light p-3 d-flex justify-content-between align-items-center hover-lift" onClick={() => { setMessageConversationIdGlobal(c.id); setMessageModalOpenGlobal(true); }} style={{cursor: 'pointer'}}>
                            <div>
                              <div className="fw-bold text-dark">{c.phone}</div>
                              <div className="small text-muted mt-1">Participants: {c.participants.map(p=>p.username).join(', ')}</div>
                            </div>
                            <button className="btn btn-sm btn-white border rounded-pill text-primary fw-semibold shadow-sm px-3">Open</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          /* EDIT MODE FORM */
          <div className="col-12">
            <div className="card border-0 shadow-sm rounded-4">
              <div className="card-body p-4 p-md-5">
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h4 className="fw-bold m-0">Edit Profile</h4>
                </div>
                
                <form onSubmit={onSave}>
                  <div className="row g-4 mb-4">
                    <div className="col-12 col-md-4 text-center">
                      <label className="form-label fw-semibold text-muted small d-block">Profile Photo</label>
                      <div className="position-relative d-inline-block mb-3">
                        <div style={{ width: 140, height: 140 }} className="rounded-circle overflow-hidden border border-4 border-white shadow-sm mx-auto">
                          <img src={preview || avatarPlaceholder} alt="avatar" className="w-100 h-100" style={{ objectFit: 'cover' }} />
                        </div>
                      </div>
                      <input type="file" accept="image/*" className="form-control form-control-sm rounded-pill" onChange={e => {
                        const f = e.target.files?.[0];
                        setFile(f || null);
                        if (f) {
                          const reader = new FileReader();
                          reader.onload = () => setPreview(reader.result);
                          reader.readAsDataURL(f);
                        }
                      }} />
                    </div>
                    
                    <div className="col-12 col-md-8">
                      <div className="row g-3">
                        <div className="col-md-6">
                          <label className="form-label fw-semibold text-muted small">Username</label>
                          {isAdmin ? (
                            <input className="form-control form-control-custom" value={name} onChange={e => setName(e.target.value)} />
                          ) : (
                            <div className="form-control form-control-custom bg-light text-muted">{profile.username}</div>
                          )}
                        </div>
                        <div className="col-md-6">
                          <label className="form-label fw-semibold text-muted small">Email</label>
                          {isAdmin ? (
                            <input className="form-control form-control-custom" value={emailState} onChange={e => setEmailState(e.target.value)} />
                          ) : (
                            <div className="form-control form-control-custom bg-light text-muted">{profile.email}</div>
                          )}
                        </div>
                        <div className="col-md-6">
                          <label className="form-label fw-semibold text-muted small">Phone Number</label>
                          <input className="form-control form-control-custom" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+254..." />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label fw-semibold text-muted small">Location</label>
                          <input className="form-control form-control-custom" value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Nairobi, Kenya" />
                        </div>
                      </div>
                      
                      {isAdmin && (
                        <div className="form-check form-switch mt-4 p-3 bg-light rounded-3 d-inline-block">
                          <input className="form-check-input ms-0 me-2" type="checkbox" id="verifiedToggle" checked={verified} onChange={e => setVerified(e.target.checked)} />
                          <label className="form-check-label fw-semibold text-dark mb-0" htmlFor="verifiedToggle">Verified Account (Admin Only)</label>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Role Specific Edit Sections */}
                  {profile.role === 'buyer' && (
                    <div className="bg-light p-4 rounded-4 mb-4 border">
                      <h5 className="fw-bold mb-3">Buyer Details</h5>
                      <div className="mb-4">
                        <label className="form-label fw-semibold text-muted small">What are you looking for?</label>
                        <textarea className="form-control form-control-custom" value={buyerDescription} onChange={e => setBuyerDescription(e.target.value)} rows={3} placeholder="e.g., 'Looking to buy 10 tonnes of maize in July'" />
                      </div>
                      
                      <div className="mb-3">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <label className="form-label fw-semibold text-muted small m-0">Product Requests</label>
                          <button type="button" className="btn btn-sm btn-outline-primary rounded-pill" onClick={() => setProducts([...products, { name: '', quantity: '', unit: 'kg', price_per_kg: '' }])}>+ Add Product</button>
                        </div>
                        {products.map((p, idx) => (
                          <div className="row g-2 align-items-center mb-2" key={idx}>
                            <div className="col-md-4"><input className="form-control form-control-sm" placeholder="Name" value={p.name || p.product || ''} onChange={e => { const next=[...products]; next[idx]={...(next[idx]||{}), name: e.target.value}; setProducts(next); }} /></div>
                            <div className="col-md-2"><input className="form-control form-control-sm" placeholder="Qty" value={p.quantity || ''} onChange={e => { const next=[...products]; next[idx]={...(next[idx]||{}), quantity: e.target.value}; setProducts(next); }} /></div>
                            <div className="col-md-2"><input className="form-control form-control-sm" placeholder="Unit" value={p.unit || 'kg'} onChange={e => { const next=[...products]; next[idx]={...(next[idx]||{}), unit: e.target.value}; setProducts(next); }} /></div>
                            <div className="col-md-3"><input className="form-control form-control-sm" placeholder="Price/kg" value={p.price_per_kg || ''} onChange={e => { const next=[...products]; next[idx]={...(next[idx]||{}), price_per_kg: e.target.value}; setProducts(next); }} /></div>
                            <div className="col-md-1 text-end"><button type="button" className="btn btn-sm btn-light text-danger w-100" onClick={() => setProducts(products.filter((_,i)=>i!==idx))}>✕</button></div>
                          </div>
                        ))}
                      </div>

                      <div className="form-check form-switch mt-3">
                        <input className="form-check-input" type="checkbox" id="hasTransport" checked={hasTransport} onChange={e => setHasTransport(e.target.checked)} />
                        <label className="form-check-label fw-semibold" htmlFor="hasTransport">I have transport available</label>
                      </div>
                    </div>
                  )}

                  {profile.role === 'farmer' && (
                    <div className="bg-light p-4 rounded-4 mb-4 border">
                      <h5 className="fw-bold mb-3">Farm Details</h5>
                      <div className="mb-4">
                        <label className="form-label fw-semibold text-muted small">Produce Description</label>
                        <textarea className="form-control form-control-custom" value={produceDescription} onChange={e => setProduceDescription(e.target.value)} rows={3} placeholder="Describe your farm and produce..." />
                      </div>
                      <div className="mb-3">
                        <label className="form-label fw-semibold text-muted small">Harvest Seasonality</label>
                        <div className="d-flex flex-wrap gap-2">
                          {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, idx) => {
                            const key = String(idx+1);
                            const checked = !!seasonalityState[key];
                            return (
                              <div key={key}>
                                <input type="checkbox" className="btn-check" id={`mon_${key}`} checked={checked} onChange={e => {
                                  const next = { ...seasonalityState };
                                  if (e.target.checked) next[key] = true; else delete next[key];
                                  setSeasonalityState(next);
                                }} />
                                <label className="btn btn-outline-success rounded-pill px-3 py-1 fw-semibold small" htmlFor={`mon_${key}`}>{m}</label>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="d-flex justify-content-end gap-3 pt-3 border-top">
                    <button type="button" className="btn btn-light rounded-pill px-4 fw-semibold border shadow-sm" onClick={() => {
                      setPhone(profile.phone_number || '');
                      setLocation(profile.location || '');
                      setProduceDescription(profile.produce_description || '');
                      setSeasonalityState(profile.seasonality || {});
                      setFile(null);
                      setPreview(profile.profile_image || null);
                      setIsEditing(false);
                    }}>Cancel</button>
                    <button className="btn btn-success rounded-pill px-5 fw-bold shadow-sm" disabled={saving}>
                      {saving ? <><span className="spinner-border spinner-border-sm me-2"></span>Saving...</> : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Global Modals */}
      <MessageModal open={messageModalOpenGlobal} onClose={()=>setMessageModalOpenGlobal(false)} conversationId={messageConversationIdGlobal} displayName={profile.username} />
      <MessageModal open={messageModalOpen} onClose={() => setMessageModalOpen(false)} phone={messagePhone} displayName={profile.username} />
      
      {/* Quick-book modal overlay */}
      {showQuickBook && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)', zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card border-0 shadow-lg rounded-4 w-100" style={{ maxWidth: '720px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="card-header bg-white border-0 p-4 d-flex justify-content-between align-items-center pb-0">
              <h4 className="fw-bold m-0">{lang === 'sw' ? 'Haraka - Weka' : 'Quick Booking'}</h4>
              <button className="btn btn-light rounded-circle text-muted p-2 lh-1" onClick={() => setShowQuickBook(false)}>✕</button>
            </div>
            <div className="card-body p-4 pt-3">
              {loadingPref && <div className="text-center py-5"><div className="spinner-border text-success"></div></div>}
              {!loadingPref && preferredService && (
                <div>
                  <div className="alert alert-success border-0 bg-success bg-opacity-10 text-success rounded-3 mb-4">
                    <i className="bi bi-info-circle-fill me-2"></i>Booking <strong>{preferredService.title}</strong> with {preferredService.provider?.name}
                  </div>
                  <BookingForm service={preferredService} provider={preferredService.provider} />
                </div>
              )}
              {!loadingPref && !preferredService && (
                <div className="text-center py-5 text-muted">
                  No preferred service found. Please select a service from the Providers page.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}