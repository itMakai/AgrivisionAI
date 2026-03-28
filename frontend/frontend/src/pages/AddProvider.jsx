import { useState, useContext } from 'react';
import { createProvider } from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export default function AddProviderPage() {
  const { user: currentUser } = useContext(AuthContext);
  const isAdmin = !!(currentUser && (currentUser.is_staff || currentUser.is_admin || currentUser.is_superuser || currentUser.role === 'admin'));
  const [name, setName] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [verified, setVerified] = useState(false);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name,
        contact_name: contactName,
        contact_phone: phone,
        email,
        address,
        verified,
      };
      await createProvider(payload);
      // Navigate to providers list or service detail
      navigate('/providers');
    } catch (err) {
      console.error('Create provider failed', err);
      alert('Failed to create provider. Are you logged in?');
    } finally {
      setSaving(false);
    }
  }

  if (!isAdmin) return <div>You are not authorized to add service providers.</div>;

  return (
    <div>
      <h2 className="h4 mb-3">Add Service Provider</h2>
      <div className="card app-card p-3">
        <form onSubmit={onSubmit}>
          <div className="mb-2">
            <label className="form-label small">Name</label>
            <input className="form-control" value={name} onChange={e=>setName(e.target.value)} required />
          </div>
          <div className="mb-2">
            <label className="form-label small">Contact Name</label>
            <input className="form-control" value={contactName} onChange={e=>setContactName(e.target.value)} />
          </div>
          <div className="row g-2">
            <div className="col-md-6 mb-2">
              <label className="form-label small">Phone</label>
              <input className="form-control" value={phone} onChange={e=>setPhone(e.target.value)} />
            </div>
            <div className="col-md-6 mb-2">
              <label className="form-label small">Email</label>
              <input className="form-control" value={email} onChange={e=>setEmail(e.target.value)} />
            </div>
          </div>
          <div className="mb-2">
            <label className="form-label small">Address</label>
            <input className="form-control" value={address} onChange={e=>setAddress(e.target.value)} />
          </div>
          <div className="form-check mb-3">
            <input className="form-check-input" type="checkbox" checked={verified} onChange={e=>setVerified(e.target.checked)} id="provVerified" />
            <label className="form-check-label small" htmlFor="provVerified">Verified</label>
          </div>
          <div className="text-end">
            <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Add Provider'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
