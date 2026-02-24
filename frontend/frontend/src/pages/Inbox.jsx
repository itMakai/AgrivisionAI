import React, { useEffect, useState } from 'react';
import { fetchConversations } from '../lib/api';
import MessageModal from '../components/MessageModal';

export default function InboxPage() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openPhone, setOpenPhone] = useState(null);
  const [openName, setOpenName] = useState(null);

  useEffect(() => {
    let mounted = true;
    fetchConversations().then(data => {
      if (!mounted) return;
      setConversations(data || []);
    }).catch(() => {}).finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  if (loading) return <div>Loading conversations…</div>;

  return (
    <div>
      <h2 className="h4 mb-3">Inbox</h2>
      {conversations.length === 0 ? (
        <div className="text-muted">No conversations yet.</div>
      ) : (
        <div className="list-group">
          {conversations.map(c => (
            <div key={c.id} className="list-group-item d-flex justify-content-between align-items-center">
              <div>
                <div className="fw-bold">{c.phone}</div>
                <div className="small text-muted">Participants: {c.participants.map(p=>p.username).join(', ')}</div>
                <div className="small text-muted">Messages: {c.messages?.length ?? 0}</div>
              </div>
              <div>
                <button className="btn btn-sm btn-primary" onClick={() => { setOpenPhone(c.phone); setOpenName(c.participants?.[0]?.username || c.phone); }}>Open</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <MessageModal open={!!openPhone} onClose={() => setOpenPhone(null)} phone={openPhone} displayName={openName} />
    </div>
  );
}
