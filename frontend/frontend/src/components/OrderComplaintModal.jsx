import React, { useEffect, useState } from 'react';

export default function OrderComplaintModal({ open, onClose, order, onSubmit }) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setSubject(order?.complaint_subject || '');
    setMessage(order?.complaint_message || '');
    setSaving(false);
    setError('');
  }, [open, order]);

  if (!open || !order) return null;

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      await onSubmit({ complaint_subject: subject.trim(), complaint_message: message.trim() });
      onClose();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Could not submit complaint');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div className="d-flex justify-content-between align-items-start gap-3 border-bottom pb-2 mb-3">
          <div>
            <h5 className="mb-1">File complaint</h5>
            <div className="small text-muted">Order for {order.crop} from {order.listing_owner}</div>
          </div>
          <button className="btn btn-sm btn-light" type="button" onClick={onClose}>x</button>
        </div>

        {error ? <div className="alert alert-danger py-2">{error}</div> : null}

        <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
          <div>
            <label className="form-label small">Complaint subject</label>
            <input
              className="form-control"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Short title for the issue"
              required
            />
          </div>
          <div>
            <label className="form-label small">Complaint details</label>
            <textarea
              className="form-control"
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe the problem with this order"
              required
            />
          </div>
          <div className="d-flex justify-content-end gap-2">
            <button className="btn btn-outline-secondary" type="button" onClick={onClose}>Cancel</button>
            <button className="btn btn-warning" type="submit" disabled={saving}>
              {saving ? 'Submitting...' : 'Submit complaint'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1250,
};

const modalStyle = {
  width: 560,
  maxWidth: '96vw',
  background: '#fff',
  borderRadius: 14,
  boxShadow: '0 20px 48px rgba(15, 23, 42, 0.25)',
  padding: 16,
};
