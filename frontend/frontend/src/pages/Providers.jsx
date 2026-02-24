import { useEffect, useState } from 'react';
import { fetchProviders, fetchServices } from '../lib/api';
import { Link } from 'react-router-dom';
import BookingForm from '../components/BookingForm';


export default function ProvidersPage() {
  const [providers, setProviders] = useState([]);
  const [servicesMap, setServicesMap] = useState({});
  const [loading, setLoading] = useState(true);
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
    }).catch(() => setLoading(false));
    return () => { mounted = false; };
  }, []);

  if (loading) return <div>Loading providers…</div>;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="h4 mb-0">Service Providers</h2>
        <div>
          <Link to="/providers/new" className="btn btn-sm btn-success">Add provider</Link>
        </div>
      </div>
      <div className="row g-3">
        {providers.map(p => (
          <div className="col-md-6" key={p.id}>
            <div className="card app-card p-3">
              <div className="d-flex justify-content-between">
                <div>
                  <h5 className="mb-1">{p.name} {p.verified ? <span className="badge bg-success ms-2">Verified</span> : null}</h5>
                  <div className="small text-muted">{p.contact_name} — {p.contact_phone}</div>
                  <div className="mt-1 small">
                    {p.offers_transport ? <span className="badge bg-info me-1">Transport</span> : null}
                    {p.offers_cold_storage ? <span className="badge bg-warning text-dark">Cold storage</span> : null}
                  </div>
                </div>
                <div className="text-end small">
                  <a className="btn btn-sm btn-outline-primary me-1" href={p.contact_phone ? `tel:${p.contact_phone}` : '#'}>Call</a>
                  <Link to="#" className="btn btn-sm btn-outline-success" onClick={(e)=>{e.preventDefault(); /* message via phone by opening tel or modal */ window.location.href = `tel:${p.contact_phone}`;}}>Contact</Link>
                </div>
              </div>
              <div className="mt-2">
                <strong>Services:</strong>
                <ul>
                  {(servicesMap[p.id] || []).map(s => (
                    <li key={s.id} className="d-flex justify-content-between align-items-center py-1">
                      <div><Link to={`/services/${s.id}`}>{s.title}</Link> <div className="small text-muted">{s.description}</div></div>
                      <div>
                        <button className="btn btn-sm btn-outline-primary me-1" onClick={() => { setBookingProvider(p); setBookingService(s); setShowBooking(true); }}>Request</button>
                        <Link to={`/services/${s.id}`} className="btn btn-sm btn-outline-secondary">Details</Link>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="small text-muted">Address: {p.address || '—'}</div>
                <div className="small text-muted">Email: {p.email || '—'}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {showBooking && bookingProvider && bookingService && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card p-3" style={{ width: 'min(720px, 95%)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h5 className="m-0">Request: {bookingService.title} — {bookingProvider.name}</h5>
              <button className="btn btn-sm btn-outline-secondary" onClick={() => setShowBooking(false)}>Close</button>
            </div>
            <BookingForm service={bookingService} provider={bookingProvider} />
          </div>
        </div>
      )}
    </div>
  );
}
