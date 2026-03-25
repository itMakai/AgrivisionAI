import React, { useContext, useEffect, useState } from 'react';
import { fetchProviders, fetchServices } from '../lib/api';
import { Link } from 'react-router-dom';
import BookingForm from '../components/BookingForm';
import { AuthContext } from '../context/AuthContext';

// --- Custom CSS for Polish ---
const providerStyles = `
  .hover-lift {
    transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
  }
  .hover-lift:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 24px rgba(0,0,0,0.1) !important;
  }
  .provider-avatar {
    width: 56px;
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    font-weight: bold;
    color: white;
    border-radius: 16px;
    background: linear-gradient(135deg, #28a745 0%, #1e7e34 100%);
    flex-shrink: 0;
  }
  .service-list-item {
    transition: background-color 0.2s;
  }
  .service-list-item:hover {
    background-color: #f8f9fa;
  }
`;

export default function ProvidersPage() {
  const { user } = useContext(AuthContext);
  const isAdmin = !!(user && (user.is_staff || user.is_superuser || user?.privileges?.is_admin || user.role === 'admin'));
  const [providers, setProviders] = useState([]);
  const [servicesMap, setServicesMap] = useState({});
  const [loading, setLoading] = useState(true);
  
  // Booking Modal State
  const [bookingProvider, setBookingProvider] = useState(null);
  const [bookingService, setBookingService] = useState(null);
  const [showBooking, setShowBooking] = useState(false);

  useEffect(() => {
    let mounted = true;
    Promise.all([fetchProviders(), fetchServices()]).then(([provRes, svcRes]) => {
      if (!mounted) return;
      setProviders(provRes || []);
      
      // build map of providerId -> services[]
      const map = {};
      (svcRes || []).forEach(s => {
        const pid = s.provider?.id || s.provider;
        if (!map[pid]) map[pid] = [];
        map[pid].push(s);
      });
      setServicesMap(map);
      setLoading(false);
    }).catch(() => {
      if (mounted) setLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return (
      <div className="min-vh-100 d-flex flex-column align-items-center justify-content-center bg-light">
        <div className="spinner-border text-success mb-3" role="status"></div>
        <div className="text-muted fw-semibold">Loading Service Providers...</div>
      </div>
    );
  }

  return (
    <div className="container py-4 pb-5">
      <style>{providerStyles}</style>

      {/* Hero Header */}
      <div className="card border-0 shadow-sm rounded-4 mb-4 overflow-hidden" style={{ backgroundColor: '#1e7e34', color: 'white' }}>
        <div className="card-body p-4 p-md-5 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-4">
          <div>
            <h2 className="display-6 fw-bold mb-2">Logistics & Service Providers</h2>
            <p className="mb-0 fs-5 opacity-75">
              Connect with verified transport partners, storage facilities, and agricultural service experts.
            </p>
          </div>
          <div className="flex-shrink-0">
            {isAdmin ? (
              <Link to="/providers/new" className="btn btn-light text-success btn-lg fw-bold rounded-pill shadow-sm px-4">
                + Add Provider
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      {/* Providers Grid */}
      {providers.length === 0 ? (
        <div className="text-center py-5 bg-white rounded-4 shadow-sm text-muted">
          <div className="fs-1 mb-3">🚚</div>
          <h5>No service providers found.</h5>
          <p>Be the first to add a logistics or storage provider.</p>
        </div>
      ) : (
        <div className="row g-4">
          {providers.map(p => (
            <div className="col-12 col-xl-6" key={p.id}>
              <div className="card border-0 shadow-sm rounded-4 h-100 hover-lift d-flex flex-column">
                
                {/* Card Header (Provider Info) */}
                <div className="card-body p-4 pb-3">
                  <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
                    <div className="d-flex align-items-center gap-3">
                      <div className="provider-avatar shadow-sm">
                        {p.name ? p.name.charAt(0).toUpperCase() : 'P'}
                      </div>
                      <div>
                        <h4 className="fw-bold mb-1 d-flex align-items-center gap-2 text-dark">
                          {p.name}
                          {p.verified && <span className="text-primary fs-5 lh-1" title="Verified Provider">✓</span>}
                        </h4>
                        <div className="text-muted small fw-semibold">
                          {p.contact_name} {p.contact_phone && `• ${p.contact_phone}`}
                        </div>
                      </div>
                    </div>
                    
                    {/* Quick Action Buttons */}
                    <div className="d-flex flex-column flex-sm-row gap-2">
                      {p.contact_phone && (
                        <a href={`tel:${p.contact_phone}`} className="btn btn-sm btn-outline-secondary rounded-pill fw-semibold px-3">
                          Call
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Capabilities Tags */}
                  <div className="d-flex flex-wrap gap-2 mb-3">
                    {p.offers_transport && (
                      <span className="badge bg-info bg-opacity-10 text-info border border-info rounded-pill px-3 py-2 fw-semibold">
                        🚛 Transport Available
                      </span>
                    )}
                    {p.offers_cold_storage && (
                      <span className="badge bg-primary bg-opacity-10 text-primary border border-primary rounded-pill px-3 py-2 fw-semibold">
                        ❄️ Cold Storage
                      </span>
                    )}
                  </div>

                  {/* Contact Details Grid */}
                  <div className="bg-light p-3 rounded-3 small text-secondary">
                    <div className="row g-2">
                      <div className="col-12 col-sm-6 text-truncate">
                        <strong>📍 Address:</strong> {p.address || 'Not provided'}
                      </div>
                      <div className="col-12 col-sm-6 text-truncate">
                        <strong>✉️ Email:</strong> {p.email || 'Not provided'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Footer (Services List) */}
                <div className="card-footer bg-white border-top-0 p-0 mt-auto">
                  {servicesMap[p.id] && servicesMap[p.id].length > 0 ? (
                    <div className="list-group list-group-flush border-top">
                      <div className="px-4 py-2 bg-light text-muted small fw-bold text-uppercase tracking-wide">
                        Available Services
                      </div>
                      {servicesMap[p.id].map(s => (
                        <div key={s.id} className="list-group-item service-list-item px-4 py-3 border-bottom-0 d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3">
                          <div>
                            <Link to={`/services/${s.id}`} className="fw-bold text-dark text-decoration-none d-block mb-1 fs-6">
                              {s.title}
                            </Link>
                            <p className="small text-muted mb-0 lh-sm">{s.description}</p>
                          </div>
                          <div className="flex-shrink-0 d-flex gap-2">
                            <Link to={`/services/${s.id}`} className="btn btn-sm btn-light border rounded-pill fw-semibold px-3">
                              Details
                            </Link>
                            <button 
                              className="btn btn-sm btn-success rounded-pill fw-semibold px-3 shadow-sm" 
                              onClick={() => { setBookingProvider(p); setBookingService(s); setShowBooking(true); }}
                            >
                              Request
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="px-4 py-3 border-top text-muted small text-center">
                      No services currently listed.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Booking Form Modal Overlay */}
      {showBooking && bookingProvider && bookingService && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card border-0 shadow-lg rounded-4 w-100" style={{ maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="card-header bg-white border-bottom-0 p-4 pb-2 d-flex justify-content-between align-items-center">
              <div>
                <h4 className="fw-bold mb-1">Request Service</h4>
                <p className="text-muted small mb-0">{bookingService.title} by {bookingProvider.name}</p>
              </div>
              <button className="btn btn-light rounded-circle text-muted p-2 lh-1 align-self-start" onClick={() => setShowBooking(false)}>✕</button>
            </div>
            <div className="card-body p-4 pt-0">
              <div className="alert alert-success border-0 bg-success bg-opacity-10 text-success rounded-3 mb-4 d-flex align-items-center">
                <i className="bi bi-info-circle-fill me-2 fs-5"></i>
                <span>You are about to submit a request directly to this provider.</span>
              </div>
              <BookingForm service={bookingService} provider={bookingProvider} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
