import { useState } from 'react';
import { sendMessage } from '../lib/api';

export default function MessagesPage() {
  const [to, setTo] = useState('');
  const [channel, setChannel] = useState('sms');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState(null);

  async function onSend(e) {
    e.preventDefault();
    setError(null);
    if (!to || !body) {
      setError('Please provide a destination number and a message');
      return;
    }
    setLoading(true);
    try {
      // backend should accept { to, channel, body } and return { reply, sid }
      const data = await sendMessage({ to: channel === 'whatsapp' && !to.startsWith('whatsapp:') ? `whatsapp:${to}` : to, channel, body });
      const reply = data.reply || data.message || 'No reply';
      setMessages(prev => [{ outbound: true, body }, { inbound: true, body: reply }].concat(prev));
      setBody('');
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || 'Send failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="">
      <h2 className="h3 fw-bold" style={{ color: 'var(--primary)' }}>Messaging</h2>

      <div className="card app-card mt-3">
        <div className="card-body">
          <form onSubmit={onSend}>
            <div className="row g-2 align-items-end">
              <div className="col-12 col-md-4">
                <label className="form-label small">To (phone)</label>
                <input className="form-control" value={to} onChange={e => setTo(e.target.value)} placeholder="+2547..." />
              </div>
              <div className="col-12 col-md-2">
                <label className="form-label small">Channel</label>
                <select className="form-select" value={channel} onChange={e => setChannel(e.target.value)}>
                  <option value="sms">SMS</option>
                  <option value="whatsapp">WhatsApp</option>
                </select>
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label small">Message</label>
                <input className="form-control" value={body} onChange={e => setBody(e.target.value)} placeholder="Ask: Bei ya mahindi Wote?" />
              </div>
            </div>

            <div className="mt-3 d-flex gap-2">
              <button className="btn btn-primary custom" type="submit" disabled={loading}>{loading ? 'Sending...' : 'Send'}</button>
              <button type="button" className="btn btn-outline-secondary" onClick={() => { setTo(''); setBody(''); setError(null); }}>Clear</button>
            </div>
          </form>

          {error && <div className="alert alert-danger mt-3">{error}</div>}

          <div className="mt-4">
            <h6 className="small muted-text">Recent messages</h6>
            <div style={{ maxHeight: '40vh', overflow: 'auto' }}>
              {messages.length === 0 && <div className="text-muted small">No messages yet. Sent messages will appear here with replies.</div>}
              {messages.map((m, i) => (
                <div key={i} className={`p-2 my-2 ${m.outbound ? 'text-end' : ''}`}>
                  <div className={`d-inline-block p-2 ${m.outbound ? 'bg-primary text-white' : 'bg-light text-dark'} rounded`} style={{ maxWidth: '85%' }}>
                    {m.body}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
