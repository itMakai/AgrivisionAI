import { useState } from 'react';
import { createBooking } from '../lib/api';

export default function BookingForm({ service, provider }) {
  const [quantity, setQuantity] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        provider: provider.id,
        service: service.id,
        // not requiring market here; optional
        scheduled_date: scheduledDate || null,
        quantity: quantity || null,
      };
      const res = await createBooking(payload);
      setSuccess(res);
    } catch (err) {
      console.error(err);
      setSuccess({ error: true });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card app-card p-3">
      <h6>Book this service</h6>
      {success && !success.error && <div className="alert alert-success">Booking created (id: {success.id || success.booking_id || '—'})</div>}
      {success && success.error && <div className="alert alert-danger">Could not create booking</div>}
      <form onSubmit={onSubmit}>
        <div className="mb-2">
          <label className="form-label small">Quantity</label>
          <input className="form-control form-control-sm" value={quantity} onChange={e => setQuantity(e.target.value)} />
        </div>
        <div className="mb-2">
          <label className="form-label small">Scheduled date</label>
          <input type="date" className="form-control form-control-sm" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} />
        </div>
        <div>
          <button className="btn btn-primary custom btn-sm" disabled={loading}>{loading ? 'Booking…' : 'Book'}</button>
        </div>
      </form>
    </div>
  );
}
