import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../lib/api';
import BookingForm from '../components/BookingForm';

export default function ServiceDetail() {
  const { id } = useParams();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    // fetch single service via services/<id>/ endpoint
    api.get(`services/${id}/`).then(res => {
      if (!mounted) return;
      setService(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
    return () => { mounted = false; };
  }, [id]);

  if (loading) return <div>Loading service…</div>;
  if (!service) return <div>Service not found.</div>;

  return (
    <div>
      <h2 className="h4 mb-3">{service.title}</h2>
      <div className="row g-3">
        <div className="col-md-8">
          <div className="card app-card p-3">
            <div className="small text-muted">Provider</div>
            <div className="fw-bold mb-2">{service.provider?.name}</div>
            <p>{service.description}</p>
            <div><strong>Type:</strong> {service.service_type}</div>
            <div><strong>Unit:</strong> {service.unit}</div>
          </div>
        </div>
        <div className="col-md-4">
          <BookingForm service={service} provider={service.provider} />
        </div>
      </div>
    </div>
  );
}
