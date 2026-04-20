import React, { useEffect, useState } from 'react';

export default function AdminOrderResolutionModal({ open, onClose, order, onSubmit }) {
  const [resolution, setResolution] = useState('');
  const [accountAction, setAccountAction] = useState('none');
  const [targetUserId, setTargetUserId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !order) return;
    setResolution(order.complaint_resolution || '');
    setAccountAction('none');
    setTargetUserId(order.complaint_filed_by || order.seller || '');
    setSaving(false);
    setError('');
  }, [open, order]);

  if (!open || !order) return null;

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      await onSubmit({
        resolution: resolution.trim(),
        account_action: accountAction,
        target_user_id: accountAction === 'none' ? undefined : targetUserId,
      });
      onClose();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Could not resolve complaint');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div className="d-flex justify-content-between align-items-start gap-3 border-bottom pb-2 mb-3">
          <div>
            <h5 className="mb-1">Resolve complaint</h5>
            <div className="small text-muted">
              Order #{order.id} for {order.crop} | Buyer: {order.buyer_username} | Seller: {order.listing_owner}
            </div>
          </div>
          <button className="btn btn-sm btn-light" type="button" onClick={onClose}>x</button>
        </div>

        <div className="alert alert-light border small">
          <div><strong>Subject:</strong> {order.complaint_subject || 'Complaint'}</div>
          <div className="mt-1"><strong>Filed by:</strong> {order.complaint_filed_by_username || 'Unknown'}</div>
          <div className="mt-2">{order.complaint_message}</div>
        </div>

        {error ? <div className="alert alert-danger py-2">{error}</div> : null}

        <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
          <div>
            <label className="form-label small">Admin decision</label>
            <textarea
              className="form-control"
              rows={4}
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              placeholder="Enter the decision made by admin"
              required
            />
          </div>
          <div className="row g-3">
            <div className="col-12 col-md-6">
              <label className="form-label small">Account action</label>
              <select className="form-select" value={accountAction} onChange={(e) => setAccountAction(e.target.value)}>
                <option value="none">No account action</option>
                <option value="activate">Activate account</option>
                <option value="warn">Send warning</option>
                <option value="delete">Delete account</option>
              </select>
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label small">Apply action to</label>
              <select
                className="form-select"
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                disabled={accountAction === 'none'}
              >
                <option value={order.buyer}>{order.buyer_username} (Buyer)</option>
                <option value={order.seller}>{order.listing_owner} (Seller)</option>
              </select>
            </div>
          </div>
          <div className="small text-muted">
            Both buyer and seller will receive a notification about the complaint decision. Warning and delete actions apply to the selected user.
          </div>
          <div className="d-flex justify-content-end gap-2">
            <button className="btn btn-outline-secondary" type="button" onClick={onClose}>Cancel</button>
            <button className="btn btn-success" type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Resolve complaint'}
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
  width: 640,
  maxWidth: '96vw',
  background: '#fff',
  borderRadius: 14,
  boxShadow: '0 20px 48px rgba(15, 23, 42, 0.25)',
  padding: 16,
};
