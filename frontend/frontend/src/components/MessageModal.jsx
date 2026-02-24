import React, { useEffect, useState, useRef } from 'react';
import { fetchConversation, fetchConversationById, sendMessage, getOrCreateConversationWithUser } from '../lib/api';

export default function MessageModal({ open, onClose, phone, displayName, conversationId: propConversationId, otherUserId }) {
  const [messages, setMessages] = useState([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef(null);
  const [conversationId, setConversationId] = useState(propConversationId || null);

  // Keep internal conversationId in sync when parent changes the prop
  useEffect(() => {
    setConversationId(propConversationId || null);
    setMessages([]);
  }, [propConversationId]);

  useEffect(() => {
    if (!open) return;
    let mounted = true;
    setLoading(true);

    async function load() {
      try {
        // If otherUserId provided but no conversationId, resolve via API
        if (otherUserId && !conversationId) {
          const conv = await getOrCreateConversationWithUser(otherUserId);
          if (!mounted) return;
          setConversationId(conv.id);
        }

        // Determine source: conversationId preferred, then phone
        if (conversationId) {
          const data = await fetchConversationById(conversationId);
          if (!mounted) return;
          setMessages(data.messages || []);
        } else if (phone) {
          const data = await fetchConversation(phone);
          if (!mounted) return;
          setMessages(data.messages || []);
        } else {
          setMessages([]);
        }
      } catch (e) {
        // ignore
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    const iv = setInterval(() => {
      (async () => {
        try {
          if (conversationId) {
            const data = await fetchConversationById(conversationId);
            if (!mounted) return;
            setMessages(data.messages || []);
          } else if (phone) {
            const data = await fetchConversation(phone);
            if (!mounted) return;
            setMessages(data.messages || []);
          }
        } catch (err) {
          // ignore
        }
      })();
    }, 3000);

    return () => {
      mounted = false;
      clearInterval(iv);
    };
  }, [open, phone, conversationId, otherUserId]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  async function handleSend(e) {
    e?.preventDefault();
    if (!body) return;
    try {
      let payload = { body };
      if (conversationId) payload.conversation_id = conversationId;
      else if (otherUserId) payload.to_user = otherUserId;
      else if (phone) payload.to = phone;
      else return;

      await sendMessage(payload);
      // refresh after sending
      if (conversationId) {
        const data = await fetchConversationById(conversationId);
        setMessages(data.messages || []);
      } else if (phone) {
        const data = await fetchConversation(phone);
        setMessages(data.messages || []);
      }
      setBody('');
    } catch (err) {
      console.error(err);
      // optimistic append as fallback
      const newMsg = {
        id: Math.random().toString(36).slice(2),
        inbound: false,
        body,
        created_at: new Date().toISOString(),
      };
      setMessages((m) => [...m, newMsg]);
      setBody('');
    }
  }

  if (!open) return null;

  return (
    <div className="message-modal-overlay" style={overlayStyle}>
      <div className="message-modal" style={modalStyle}>
        <div style={headerStyle}>
          <strong>Conversation</strong>
          <div>{displayName || phone}</div>
          <button className="btn btn-sm btn-light" onClick={onClose}>Close</button>
        </div>
        <div ref={listRef} style={listStyle}>
          {loading ? <div className="text-muted">Loading...</div> : null}
          {messages.map((m) => (
            <div key={m.id} style={m.inbound ? inboundStyle : outboundStyle}>
              <div style={{ fontSize: 12, color: '#666' }}>{m.inbound ? displayName : 'You'}</div>
              <div>{m.body}</div>
              <div style={{ fontSize: 11, color: '#888' }}>{new Date(m.created_at).toLocaleString()}</div>
            </div>
          ))}
        </div>
        <form onSubmit={handleSend} style={composerStyle}>
          <input
            className="form-control"
            placeholder="Write a message..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <div style={{ marginTop: 8, textAlign: 'right' }}>
            <button className="btn btn-primary btn-sm" type="submit">Send</button>
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
  zIndex: 1200,
};
const modalStyle = {
  width: '420px',
  maxHeight: '80vh',
  background: '#fff',
  borderRadius: 8,
  display: 'flex',
  flexDirection: 'column',
  padding: 12,
};
const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 };
const listStyle = { flex: 1, overflowY: 'auto', marginTop: 12, padding: 8, background: '#fafafa', borderRadius: 6 };
const composerStyle = { marginTop: 8 };
const inboundStyle = { background: '#fff', padding: 8, marginBottom: 8, borderRadius: 6, textAlign: 'left' };
const outboundStyle = { background: '#e7f3ff', padding: 8, marginBottom: 8, borderRadius: 6, textAlign: 'right' };
