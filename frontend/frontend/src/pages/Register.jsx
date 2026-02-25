import React, { useState, useContext } from 'react';
import { registerUser } from '../lib/api';
import { useNavigate, Link } from 'react-router-dom';
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
        setError('Registration succeeded but no token returned. Please log in.');
      }
    } catch (err) {
      // Safely extract error message
      const errMsg = err?.response?.data?.message || err?.response?.data || err.message || 'An error occurred during registration.';
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
                
                {/* Left Side - Image & Branding (Hidden on small screens) */}
                <div 
                  className="col-md-5 d-none d-md-block" 
                  style={{
                    background: `linear-gradient(rgba(26, 77, 46, 0.8), rgba(40, 167, 69, 0.8)), url('https://images.unsplash.com/photo-1523741543316-beb7fc7023d8?auto=format&fit=crop&w=800&q=80') center/cover`,
                    minHeight: '650px'
                  }}
                >
                  <div className="h-100 d-flex flex-column justify-content-center p-5 text-white">
                    <span className="badge bg-white text-success rounded-pill align-self-start px-3 py-2 mb-4 fw-bold shadow-sm">Join the Network</span>
                    <h2 className="display-6 fw-bold mb-3">Empower Your Agriculture</h2>
                    <p className="fs-5 mb-0" style={{ opacity: 0.9 }}>
                      Create an account to track market prices, coordinate logistics, and connect directly with verified buyers and farmers.
                    </p>
                  </div>
                </div>

                {/* Right Side - Registration Form */}
                <div className="col-12 col-md-7 d-flex align-items-center bg-white p-4 p-sm-5">
                  <div className="w-100">
                    <div className="mb-4">
                      <h3 className="fw-bold text-dark mb-1">Create an Account</h3>
                      <p className="text-muted">Fill in your details to get started with AgriVisionAI.</p>
                    </div>

                    {error && (
                      <div className="alert alert-danger border-0 rounded-3 small shadow-sm py-2 px-3 mb-4" role="alert">
                        <i className="bi bi-exclamation-circle me-2"></i>
                        {error}
                      </div>
                    )}

                    <form onSubmit={onSubmit}>
                      <div className="row g-3 mb-4">
                        
                        {/* Username & Email */}
                        <div className="col-12 col-sm-6">
                          <label className="form-label fw-semibold text-secondary small mb-1">Username <span className="text-danger">*</span></label>
                          <input 
                            type="text" 
                            className="form-control form-control-lg bg-light border-0" 
                            placeholder="e.g. johndoe"
                            value={username} 
                            onChange={e => setUsername(e.target.value)} 
                            required
                            style={{ fontSize: '0.95rem' }}
                          />
                        </div>
                        <div className="col-12 col-sm-6">
                          <label className="form-label fw-semibold text-secondary small mb-1">Email Address <span className="text-danger">*</span></label>
                          <input 
                            type="email" 
                            className="form-control form-control-lg bg-light border-0" 
                            placeholder="name@example.com"
                            value={email} 
                            onChange={e => setEmail(e.target.value)} 
                            required
                            style={{ fontSize: '0.95rem' }}
                          />
                        </div>

                        {/* Password & Role */}
                        <div className="col-12 col-sm-6">
                          <label className="form-label fw-semibold text-secondary small mb-1">Password <span className="text-danger">*</span></label>
                          <input 
                            type="password" 
                            className="form-control form-control-lg bg-light border-0" 
                            placeholder="Create a password"
                            value={password} 
                            onChange={e => setPassword(e.target.value)} 
                            required
                            style={{ fontSize: '0.95rem' }}
                          />
                        </div>
                        <div className="col-12 col-sm-6">
                          <label className="form-label fw-semibold text-secondary small mb-1">Account Type <span className="text-danger">*</span></label>
                          <select 
                            className="form-select form-select-lg bg-light border-0" 
                            value={role} 
                            onChange={e => setRole(e.target.value)}
                            style={{ fontSize: '0.95rem', cursor: 'pointer' }}
                          >
                            <option value="farmer">Farmer / Seller</option>
                            <option value="buyer">Verified Buyer</option>
                          </select>
                        </div>

                        {/* Phone & Location */}
                        <div className="col-12 col-sm-6">
                          <label className="form-label fw-semibold text-secondary small mb-1">Phone Number</label>
                          <input 
                            type="tel" 
                            className="form-control form-control-lg bg-light border-0" 
                            placeholder="+254 7XX XXX XXX"
                            value={phone} 
                            onChange={e => setPhone(e.target.value)} 
                            style={{ fontSize: '0.95rem' }}
                          />
                        </div>
                        <div className="col-12 col-sm-6">
                          <label className="form-label fw-semibold text-secondary small mb-1">Location</label>
                          <input 
                            type="text" 
                            className="form-control form-control-lg bg-light border-0" 
                            placeholder="e.g. Makueni, Kenya"
                            value={location} 
                            onChange={e => setLocation(e.target.value)} 
                            style={{ fontSize: '0.95rem' }}
                          />
                        </div>

                      </div>

                      <button 
                        className="btn btn-success btn-lg w-100 rounded-pill fw-bold shadow-sm mb-4" 
                        type="submit" 
                        disabled={loading || !username || !password || !email}
                        style={{ transition: 'all 0.2s' }}
                      >
                        {loading ? (
                          <span><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Registering...</span>
                        ) : (
                          'Create Account'
                        )}
                      </button>

                      <div className="text-center">
                        <p className="text-muted small mb-0">
                          Already have an account?{' '}
                          <Link to="/login" className="text-success fw-bold text-decoration-none">
                            Sign In Here
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