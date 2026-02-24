import { useState, useContext } from 'react';
import { registerUser } from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export default function RegisterPage() {
  const { setToken } = useContext(AuthContext);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('farmer');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await registerUser({ username, password, email, role, phone_number: phone, location });
      // expect { token, user }
      if (data.token) {
        setToken(data.token);
        navigate('/platform');
      } else {
        setError('Registration succeeded but no token returned');
      }
    } catch (err) {
      setError(err?.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  }
  return (
    <div>
      <h2 className="h3 fw-bold" style={{ color: 'var(--primary)' }}>Register</h2>
      <div className="card app-card mt-3">
        <div className="card-body">
          <form onSubmit={onSubmit}>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label small">Username</label>
                <input className="form-control" value={username} onChange={e => setUsername(e.target.value)} />
              </div>
              <div className="col-md-6">
                <label className="form-label small">Email</label>
                <input className="form-control" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div className="col-md-6">
                <label className="form-label small">Password</label>
                <input type="password" className="form-control" value={password} onChange={e => setPassword(e.target.value)} />
              </div>
              <div className="col-md-6">
                <label className="form-label small">Role</label>
                <select className="form-select" value={role} onChange={e => setRole(e.target.value)}>
                  <option value="farmer">Farmer / Seller</option>
                  <option value="buyer">Buyer</option>
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label small">Phone</label>
                <input className="form-control" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+2547..." />
              </div>
              <div className="col-md-6">
                <label className="form-label small">Location</label>
                <input className="form-control" value={location} onChange={e => setLocation(e.target.value)} />
              </div>
            </div>
            <div className="mt-3">
              <button className="btn btn-primary custom" type="submit" disabled={loading}>{loading ? 'Registering...' : 'Register'}</button>
            </div>
          </form>
          {error && <div className="alert alert-danger mt-3">{JSON.stringify(error)}</div>}
        </div>
      </div>
    </div>
  );
}
