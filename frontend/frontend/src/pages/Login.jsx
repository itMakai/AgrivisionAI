import React, { useEffect, useState, useContext } from 'react';
import { consumeSessionNotice, loginUser } from '../lib/api';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { setToken } = useContext(AuthContext);

  useEffect(() => {
    const sessionNotice = consumeSessionNotice();
    if (sessionNotice) {
      setError(sessionNotice);
    }
  }, []);

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
        setError('Login succeeded but no token returned.');
      }
    } catch (err) {
      // Safely extract error message
      const errMsg = err?.response?.data?.message || err?.response?.data || err.message || 'An error occurred during login.';
      setError(typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center py-5" style={{ backgroundColor: '#f4f7f5' }}>
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-12 col-xl-10">
            <div className="card border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="row g-0">
                
                {/* Left Side - Image & Branding (Hidden on very small screens) */}
                <div 
                  className="col-md-6 d-none d-md-block" 
                  style={{
                    background: `linear-gradient(rgba(26, 77, 46, 0.75), rgba(40, 167, 69, 0.75)), url('https://images.unsplash.com/photo-1592982537447-6f2da6c0c271?auto=format&fit=crop&w=800&q=80') center/cover`,
                    minHeight: '550px'
                  }}
                >
                  <div className="h-100 d-flex flex-column justify-content-center p-5 text-white">
                    <h2 className="display-6 fw-bold mb-3">Welcome Back</h2>
                    <p className="fs-5 mb-0" style={{ opacity: 0.9 }}>
                      Access your Agritech dashboard to track real-time prices, weather advisories, and connect with verified buyers.
                    </p>
                  </div>
                </div>

                {/* Right Side - Login Form */}
                <div className="col-12 col-md-6 d-flex align-items-center bg-white p-4 p-sm-5">
                  <div className="w-100">
                    <div className="text-center mb-4">
                      <h3 className="fw-bold text-dark mb-1">Sign In</h3>
                      <p className="text-muted">Enter your credentials to continue</p>
                    </div>

                    {error && (
                      <div className="alert alert-danger border-0 rounded-3 small shadow-sm py-2 px-3 mb-4" role="alert">
                        <i className="bi bi-exclamation-circle me-2"></i>
                        {error}
                      </div>
                    )}

                    <form onSubmit={onSubmit}>
                      <div className="mb-4">
                        <label className="form-label fw-semibold text-secondary small mb-1">Username</label>
                        <input 
                          type="text" 
                          className="form-control form-control-lg bg-light border-0" 
                          placeholder="Enter your username"
                          value={username} 
                          onChange={e => setUsername(e.target.value)} 
                          required
                          style={{ fontSize: '1rem' }}
                        />
                      </div>
                      
                      <div className="mb-4">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <label className="form-label fw-semibold text-secondary small mb-0">Password</label>
                          {/* Optional: You can add a forgot password route here later */}
                          <a href="#" className="text-success small text-decoration-none">Forgot password?</a>
                        </div>
                        <input 
                          type="password" 
                          className="form-control form-control-lg bg-light border-0" 
                          placeholder="Enter your password"
                          value={password} 
                          onChange={e => setPassword(e.target.value)} 
                          required
                          style={{ fontSize: '1rem' }}
                        />
                      </div>

                      <button 
                        className="btn btn-success btn-lg w-100 rounded-pill fw-bold shadow-sm mb-4" 
                        type="submit" 
                        disabled={loading || !username || !password}
                        style={{ transition: 'all 0.2s' }}
                      >
                        {loading ? (
                          <span><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Logging in...</span>
                        ) : (
                          'Login Securely'
                        )}
                      </button>

                      <div className="text-center">
                        <p className="text-muted small mb-0">
                          Don't have an account yet?{' '}
                          <Link to="/register" className="text-success fw-bold text-decoration-none">
                            Create an Account
                          </Link>
                        </p>
                      </div>
                    </form>

                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
