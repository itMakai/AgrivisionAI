import { useState, useContext } from 'react';
import { loginUser } from '../lib/api';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { setToken } = useContext(AuthContext);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await loginUser({ username, password });
      if (data.token) {
        setToken(data.token);
        // redirect to originally requested page if present
        const redirectTo = location.state?.from?.pathname || '/platform';
        navigate(redirectTo, { replace: true });
      } else {
        setError('Login succeeded but no token returned');
      }
    } catch (err) {
      setError(err?.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 className="h3 fw-bold" style={{ color: 'var(--primary)' }}>Login</h2>
      <div className="card app-card mt-3">
        <div className="card-body">
          <form onSubmit={onSubmit}>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label small">Username</label>
                <input className="form-control" value={username} onChange={e => setUsername(e.target.value)} />
              </div>
              <div className="col-md-6">
                <label className="form-label small">Password</label>
                <input type="password" className="form-control" value={password} onChange={e => setPassword(e.target.value)} />
              </div>
            </div>
            <div className="mt-3">
              <button className="btn btn-primary custom" type="submit" disabled={loading}>{loading ? 'Logging in...' : 'Login'}</button>
            </div>
          </form>
          {error && <div className="alert alert-danger mt-3">{JSON.stringify(error)}</div>}
        </div>
      </div>
    </div>
  );
}
