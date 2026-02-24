import React, { useState, useEffect } from 'react';

export default function RatingModal({ show, onClose, onSubmit, initial = 0, title = 'Rate user' }) {
  const [value, setValue] = useState(initial);
  const [hover, setHover] = useState(0);
  useEffect(() => { setValue(initial); setHover(0); }, [initial, show]);

  if (!show) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card p-3" style={{ width: 'min(560px, 96%)' }}>
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h5 className="m-0">{title}</h5>
          <button className="btn btn-sm btn-outline-secondary" onClick={onClose}>Close</button>
        </div>

        <div className="mb-3">
          <div className="small text-muted">Click to select a rating (1-5)</div>
          <div style={{ fontSize: 30, marginTop: 8 }}>
            {[1,2,3,4,5].map((n) => (
              <span key={n}
                style={{ cursor: 'pointer', color: (hover || value) >= n ? '#f6c85f' : '#ddd', marginRight: 6 }}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setValue(n)}
                aria-label={`Rate ${n}`}
              >{ ( (hover || value) >= n ) ? '★' : '☆' }</span>
            ))}
          </div>
        </div>

        <div className="mb-3">
          <label className="form-label small">Comment (optional)</label>
          <textarea className="form-control" rows={3} id="rating_comment" placeholder="Say something about this user (optional)"></textarea>
        </div>

        <div className="d-flex justify-content-end gap-2">
          <button className="btn btn-outline-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => {
            const commentEl = document.getElementById('rating_comment');
            const comment = commentEl ? commentEl.value : '';
            onSubmit(value, comment);
          }} disabled={value < 1}>Submit</button>
        </div>
      </div>
    </div>
  );
}
